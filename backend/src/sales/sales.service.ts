import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SalesOrder, SalesOrderStatus, DeliveryStatus } from './sales-order.entity';
import { PaymentMethod } from '../common/payment-method.enum';
import { SalesOrderItem } from './sales-order-item.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { MovementReason, MovementType } from '../inventory/stock-movement.entity';
import { FinanceService } from '../finance/finance.service';
import { FinanceEntryType } from '../finance/finance-entry.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { SequenceService } from '../common/sequence.service';
import { sumLineAmounts } from '../common/money';

type Actor = { id: string; username: string };

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder) private readonly repo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderItem) private readonly itemRepo: Repository<SalesOrderItem>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly financeService: FinanceService,
    private readonly auditLogService: AuditLogService,
    private readonly sequenceService: SequenceService,
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
    const totalAmount = sumLineAmounts(dto.items);
    const seq = await this.sequenceService.next('sales_order');
    const orderNumber = `PV-${String(seq).padStart(4, '0')}`;
    const so = this.repo.create({
      orderNumber,
      customerId: dto.customerId,
      orderDate: dto.orderDate,
      status: SalesOrderStatus.DRAFT,
      paymentMethod: dto.paymentMethod ?? PaymentMethod.PIX,
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

  async update(id: string, dto: UpdateSalesOrderDto, actor?: Actor): Promise<SalesOrder> {
    const so = await this.findById(id);
    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Só é possível editar pedidos de venda em rascunho.');
    }

    if (dto.customerId !== undefined) so.customerId = dto.customerId;
    if (dto.orderDate !== undefined) so.orderDate = dto.orderDate;
    if (dto.paymentMethod !== undefined) so.paymentMethod = dto.paymentMethod;

    if (dto.items) {
      await this.itemRepo.delete({ salesOrderId: id });
      so.items = dto.items.map((i) =>
        Object.assign(new SalesOrderItem(), {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }),
      );
      so.totalAmount = sumLineAmounts(dto.items);
    }

    const saved = await this.repo.save(so);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_UPDATED',
        targetType: 'SalesOrder',
        targetId: saved.id,
        details: `${saved.orderNumber} - R$ ${saved.totalAmount.toFixed(2)}`,
      });
    }
    return saved;
  }

  async ship(id: string, notes: string | undefined, actor?: Actor): Promise<SalesOrder> {
    const so = await this.findById(id);
    if (so.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException('Só é possível marcar como enviado um pedido confirmado.');
    }
    if (so.deliveryStatus !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Este pedido já foi enviado.');
    }
    so.deliveryStatus = DeliveryStatus.SHIPPED;
    so.shippedAt = new Date();
    if (notes !== undefined) so.deliveryNotes = notes;
    const saved = await this.repo.save(so);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_SHIPPED',
        targetType: 'SalesOrder',
        targetId: saved.id,
        details: saved.orderNumber,
      });
    }
    return saved;
  }

  async deliver(id: string, notes: string | undefined, actor?: Actor): Promise<SalesOrder> {
    const so = await this.findById(id);
    if (so.deliveryStatus !== DeliveryStatus.SHIPPED) {
      throw new BadRequestException('Só é possível marcar como entregue um pedido já enviado.');
    }
    so.deliveryStatus = DeliveryStatus.DELIVERED;
    so.deliveredAt = new Date();
    if (notes !== undefined) so.deliveryNotes = notes;
    const saved = await this.repo.save(so);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'SALES_ORDER_DELIVERED',
        targetType: 'SalesOrder',
        targetId: saved.id,
        details: saved.orderNumber,
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
