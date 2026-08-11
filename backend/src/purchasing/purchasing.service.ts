import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { InventoryService } from '../inventory/inventory.service';
import { MovementReason, MovementType } from '../inventory/stock-movement.entity';
import { FinanceService } from '../finance/finance.service';
import { FinanceEntryType } from '../finance/finance-entry.entity';

@Injectable()
export class PurchasingService {
  constructor(
    @InjectRepository(PurchaseOrder) private readonly repo: Repository<PurchaseOrder>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly financeService: FinanceService,
  ) {}

  findAll(): Promise<PurchaseOrder[]> {
    return this.repo.find({ order: { createdAt: 'DESC' }, relations: ['supplier'] });
  }

  async findById(id: string): Promise<PurchaseOrder> {
    const po = await this.repo.findOne({ where: { id }, relations: ['supplier'] });
    if (!po) {
      throw new NotFoundException('Pedido de compra não encontrado.');
    }
    return po;
  }

  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const orderNumber = `PC-${Date.now()}`;
    const po = this.repo.create({
      orderNumber,
      supplierId: dto.supplierId,
      orderDate: dto.orderDate,
      status: PurchaseOrderStatus.DRAFT,
      totalAmount,
      items: dto.items.map((i) =>
        Object.assign(new PurchaseOrderItem(), {
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }),
      ),
    });
    return this.repo.save(po);
  }

  // Confirma o recebimento físico da mercadoria: dá entrada no estoque de
  // insumos e gera automaticamente o título de contas a pagar (AP).
  async receive(id: string): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const po = await manager.findOne(PurchaseOrder, { where: { id }, relations: ['items', 'supplier'] });
      if (!po) {
        throw new NotFoundException('Pedido de compra não encontrado.');
      }
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('Este pedido de compra já foi recebido.');
      }
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Não é possível receber um pedido de compra cancelado.');
      }

      for (const item of po.items) {
        await this.inventoryService.recordMovement(manager, {
          productId: item.productId,
          type: MovementType.IN,
          reason: MovementReason.PURCHASE,
          quantity: item.quantity,
          referenceType: 'PURCHASE_ORDER',
          referenceId: po.id,
        });
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await this.financeService.createWithManager(manager, {
        type: FinanceEntryType.PAYABLE,
        description: `Compra ${po.orderNumber}`,
        partnerId: po.supplierId,
        amount: po.totalAmount,
        dueDate: dueDate.toISOString().slice(0, 10),
        referenceType: 'PURCHASE_ORDER',
        referenceId: po.id,
      });

      po.status = PurchaseOrderStatus.RECEIVED;
      return manager.save(po);
    });
  }

  async cancel(id: string): Promise<PurchaseOrder> {
    const po = await this.findById(id);
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Não é possível cancelar um pedido já recebido.');
    }
    po.status = PurchaseOrderStatus.CANCELLED;
    return this.repo.save(po);
  }
}
