import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductionOrder, ProductionStatus } from './production-order.entity';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { BomItem } from '../bom/bom-item.entity';
import { Product } from '../products/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { MovementReason, MovementType } from '../inventory/stock-movement.entity';

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionOrder) private readonly repo: Repository<ProductionOrder>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
  ) {}

  findAll(): Promise<ProductionOrder[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ProductionOrder> {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Ordem de produção não encontrada.');
    }
    return order;
  }

  create(dto: CreateProductionOrderDto): Promise<ProductionOrder> {
    const order = this.repo.create({
      orderNumber: `OP-${Date.now()}`,
      productId: dto.productId,
      quantity: dto.quantity,
      plannedDate: dto.plannedDate,
      status: ProductionStatus.PLANNED,
    });
    return this.repo.save(order);
  }

  // Apontamento de produção: consome os insumos previstos na ficha técnica
  // (BOM), dá entrada no produto acabado e calcula o custo de produção.
  async complete(id: string): Promise<ProductionOrder> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ProductionOrder, { where: { id } });
      if (!order) {
        throw new NotFoundException('Ordem de produção não encontrada.');
      }
      if (order.status !== ProductionStatus.PLANNED) {
        throw new BadRequestException('Apenas ordens de produção planejadas podem ser concluídas.');
      }

      const bomItems = await manager.find(BomItem, {
        where: { finishedProductId: order.productId },
        relations: ['rawMaterial'],
      });
      if (bomItems.length === 0) {
        throw new BadRequestException('Este produto não possui ficha técnica (BOM) cadastrada.');
      }

      let totalCost = 0;
      for (const bomItem of bomItems) {
        const requiredQty = bomItem.quantity * order.quantity;
        await this.inventoryService.recordMovement(manager, {
          productId: bomItem.rawMaterialId,
          type: MovementType.OUT,
          reason: MovementReason.PRODUCTION_CONSUME,
          quantity: requiredQty,
          referenceType: 'PRODUCTION_ORDER',
          referenceId: order.id,
        });
        totalCost += requiredQty * bomItem.rawMaterial.costPrice;
      }

      await this.inventoryService.recordMovement(manager, {
        productId: order.productId,
        type: MovementType.IN,
        reason: MovementReason.PRODUCTION_OUTPUT,
        quantity: order.quantity,
        referenceType: 'PRODUCTION_ORDER',
        referenceId: order.id,
      });

      const productRepo = manager.getRepository(Product);
      const finishedProduct = await productRepo.findOne({ where: { id: order.productId } });
      if (finishedProduct) {
        finishedProduct.costPrice = totalCost / order.quantity;
        await productRepo.save(finishedProduct);
      }

      order.status = ProductionStatus.COMPLETED;
      order.completedDate = new Date().toISOString().slice(0, 10);
      order.totalCost = totalCost;
      return manager.save(order);
    });
  }

  async cancel(id: string): Promise<ProductionOrder> {
    const order = await this.findById(id);
    if (order.status === ProductionStatus.COMPLETED) {
      throw new BadRequestException('Não é possível cancelar uma ordem de produção já concluída.');
    }
    order.status = ProductionStatus.CANCELLED;
    return this.repo.save(order);
  }
}
