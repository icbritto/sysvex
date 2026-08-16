import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesOrder, SalesOrderStatus } from './sales-order.entity';
import { SalesOrderItem } from './sales-order-item.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { MovementReason, MovementType } from '../inventory/stock-movement.entity';
import { FinanceService } from '../finance/finance.service';
import { FinanceEntryType } from '../finance/finance-entry.entity';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder) private readonly repo: Repository<SalesOrder>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly financeService: FinanceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<SalesOrder[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: ['customer'] });
  }

  async findById(id: string): Promise<SalesOrder> {
    const so = await this.repo.findOne({ where: { id }, relations: ['customer'] });
    if (!so) {
      throw new NotFoundException('Pedido de venda não encontrado.');
    }
    return so;
  }

  async create(dto: CreateSalesOrderDto, actor?: Actor): Promise<SalesOrder> {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const orderNumber = `PV-${Date.now()}`;
    const so = this.repo.create({
      orderNumber,
      customerId: dto.customerId,
      orderDate: dto.orderDate,
      status: SalesOrderStatus.DRAFT,
      totalAmount,
      items: dto.items.map((i) =>
        Object.assign(new SalesOrderItem(), {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }),
      ),
    });
    const saved = await this.repo.save(so);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_CREATED',
        targetType: 'SalesOrder',
        targetId: saved.id,
        details: `${saved.orderNumber} - R$ ${saved.totalAmount.toFixed(2)}`,
      });
    }
    return saved;
  }

  // Confirma a venda: baixa o estoque do(s) produto(s) acabado(s) e gera
  // automaticamente o título de contas a receber (AR).
  async confirm(id: string, actor?: Actor): Promise<SalesOrder> {
    const result = await this.dataSource.transaction(async (manager) => {
      const so = await manager.findOne(SalesOrder, { where: { id }, relations: ['items', 'customer'] });
      if (!so) {
        throw new NotFoundException('Pedido de venda não encontrado.');
      }
      if (so.status === SalesOrderStatus.CONFIRMED) {
        throw new BadRequestException('Este pedido de venda já foi confirmado.');
      }
      if (so.status === SalesOrderStatus.CANCELLED) {
        throw new BadRequestException('Não é possível confirmar um pedido de venda cancelado.');
      }

      for (const item of so.items) {
        await this.inventoryService.recordMovement(manager, {
          productId: item.productId,
          type: MovementType.OUT,
          reason: MovementReason.SALE,
          quantity: item.quantity,
          referenceType: 'SALES_ORDER',
          referenceId: so.id,
        });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await this.financeService.createWithManager(manager, {
        type: FinanceEntryType.RECEIVABLE,
        description: `Venda ${so.orderNumber}`,
        partnerId: so.customerId,
        amount: so.totalAmount,
        dueDate: dueDate.toISOString().slice(0, 10),
        referenceType: 'SALES_ORDER',
        referenceId: so.id,
      });

      so.status = SalesOrderStatus.CONFIRMED;
      return manager.save(so);
    });
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_CONFIRMED',
        targetType: 'SalesOrder',
        targetId: result.id,
        details: result.orderNumber,
      });
    }
    return result;
  }

  async cancel(id: string, actor?: Actor): Promise<SalesOrder> {
    const so = await this.findById(id);
    if (so.status === SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException('Não é possível cancelar um pedido já confirmado.');
    }
    so.status = SalesOrderStatus.CANCELLED;
    const saved = await this.repo.save(so);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_CANCELLED',
        targetType: 'SalesOrder',
        targetId: saved.id,
        details: saved.orderNumber,
      });
    }
    return saved;
  }
}
