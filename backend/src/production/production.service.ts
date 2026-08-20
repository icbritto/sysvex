import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductionOrder, ProductionStatus } from './production-order.entity';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { BomItem } from '../bom/bom-item.entity';
import { BomRecipe } from '../bom/bom-recipe.entity';
import { Product } from '../products/product.entity';
import { InventoryService } from '../inventory/inventory.service';
import { MovementReason, MovementType } from '../inventory/stock-movement.entity';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class ProductionService {
  constructor(
    @InjectRepository(ProductionOrder) private readonly repo: Repository<ProductionOrder>,
    @InjectRepository(BomRecipe) private readonly recipesRepo: Repository<BomRecipe>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<ProductionOrder[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<ProductionOrder> {
    const order = await this.repo.findOne({
      where: { id },
      relations: ['recipe.items.rawMaterial'],
    });
    if (!order) {
      throw new NotFoundException('Ordem de produção não encontrada.');
    }
    return order;
  }

  // Requisitos de insumos, custo e lucro estimados para a ordem — usados na
  // tela de detalhes pra saber se dá pra concluir e o que falta comprar.
  async getRequirements(id: string): Promise<{
    items: {
      rawMaterialId: string;
      rawMaterialName: string;
      unit: string;
      requiredQty: number;
      availableQty: number;
      shortfall: number;
      costPrice: number;
    }[];
    canComplete: boolean;
    blockedReason: string | null;
    estimatedCost: number;
    estimatedRevenue: number | null;
    estimatedProfit: number | null;
  }> {
    const order = await this.findById(id);
    if (!order.recipeId || !order.recipe) {
      return {
        items: [],
        canComplete: false,
        blockedReason: 'Este produto não possui uma receita (ficha técnica) definida.',
        estimatedCost: 0,
        estimatedRevenue: null,
        estimatedProfit: null,
      };
    }
    if (order.recipe.items.length === 0) {
      return {
        items: [],
        canComplete: false,
        blockedReason: 'A receita escolhida não possui insumos cadastrados.',
        estimatedCost: 0,
        estimatedRevenue: null,
        estimatedProfit: null,
      };
    }

    const items = order.recipe.items.map((bomItem) => {
      const requiredQty = bomItem.quantity * order.quantity;
      const availableQty = bomItem.rawMaterial.stockQty;
      return {
        rawMaterialId: bomItem.rawMaterialId,
        rawMaterialName: bomItem.rawMaterial.name,
        unit: bomItem.rawMaterial.unit,
        requiredQty,
        availableQty,
        shortfall: Math.max(0, requiredQty - availableQty),
        costPrice: bomItem.rawMaterial.costPrice,
      };
    });
    const estimatedCost = items.reduce((sum, item) => sum + item.requiredQty * item.costPrice, 0);
    const estimatedRevenue = order.product.salePrice != null ? order.product.salePrice * order.quantity : null;
    const hasShortfall = items.some((item) => item.shortfall > 0);
    const canComplete = order.status === 'PLANNED' && !hasShortfall;

    return {
      items,
      canComplete,
      blockedReason: order.status === 'PLANNED' && hasShortfall ? 'Estoque insuficiente para um ou mais insumos desta receita.' : null,
      estimatedCost,
      estimatedRevenue,
      estimatedProfit: estimatedRevenue != null ? estimatedRevenue - estimatedCost : null,
    };
  }

  async create(dto: CreateProductionOrderDto, actor?: Actor): Promise<ProductionOrder> {
    let recipeId: string | null = null;
    if (dto.recipeId) {
      const recipe = await this.recipesRepo.findOne({ where: { id: dto.recipeId } });
      if (!recipe || recipe.finishedProductId !== dto.productId) {
        throw new BadRequestException('A receita escolhida não pertence a este produto.');
      }
      recipeId = recipe.id;
    } else {
      const defaultRecipe = await this.recipesRepo.findOne({
        where: { finishedProductId: dto.productId, isDefault: true },
      });
      recipeId = defaultRecipe?.id ?? null;
    }

    const order = this.repo.create({
      orderNumber: `OP-${Date.now()}`,
      productId: dto.productId,
      recipeId,
      quantity: dto.quantity,
      plannedDate: dto.plannedDate,
      status: ProductionStatus.PLANNED,
    });
    const saved = await this.repo.save(order);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCTION_ORDER_CREATED',
        targetType: 'ProductionOrder',
        targetId: saved.id,
        details: `${saved.orderNumber} - ${saved.quantity} un.`,
      });
    }
    return saved;
  }

  // Apontamento de produção: consome os insumos previstos na ficha técnica
  // (BOM), dá entrada no produto acabado e calcula o custo de produção.
  async complete(id: string, actor?: Actor): Promise<ProductionOrder> {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ProductionOrder, { where: { id } });
      if (!order) {
        throw new NotFoundException('Ordem de produção não encontrada.');
      }
      if (order.status !== ProductionStatus.PLANNED) {
        throw new BadRequestException('Apenas ordens de produção planejadas podem ser concluídas.');
      }

      if (!order.recipeId) {
        throw new BadRequestException('Este produto não possui uma receita (ficha técnica) definida.');
      }
      const bomItems = await manager.find(BomItem, {
        where: { recipeId: order.recipeId },
        relations: ['rawMaterial'],
      });
      if (bomItems.length === 0) {
        throw new BadRequestException('A receita escolhida não possui insumos cadastrados.');
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
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCTION_ORDER_COMPLETED',
        targetType: 'ProductionOrder',
        targetId: result.id,
        details: `${result.orderNumber} - custo total R$ ${result.totalCost?.toFixed(2)}`,
      });
    }
    return result;
  }

  async cancel(id: string, actor?: Actor): Promise<ProductionOrder> {
    const order = await this.findById(id);
    if (order.status === ProductionStatus.COMPLETED) {
      throw new BadRequestException('Não é possível cancelar uma ordem de produção já concluída.');
    }
    order.status = ProductionStatus.CANCELLED;
    const saved = await this.repo.save(order);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCTION_ORDER_CANCELLED',
        targetType: 'ProductionOrder',
        targetId: saved.id,
        details: saved.orderNumber,
      });
    }
    return saved;
  }
}
