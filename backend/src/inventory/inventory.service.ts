import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { StockMovement, MovementReason, MovementType } from './stock-movement.entity';
import { Product } from '../products/product.entity';

interface RecordMovementInput {
  productId: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
}

@Injectable()
export class InventoryService {
  constructor(@InjectRepository(StockMovement) private readonly repo: Repository<StockMovement>) {}

  findAll(productId?: string): Promise<StockMovement[]> {
    return this.repo.find({
      where: productId ? { productId } : {},
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  // Registra a movimentação e atualiza o saldo do produto na mesma transação,
  // garantindo que o estoque nunca fique inconsistente com o ledger.
  async recordMovement(manager: EntityManager, input: RecordMovementInput): Promise<StockMovement> {
    const productRepo = manager.getRepository(Product);
    const product = await productRepo.findOne({ where: { id: input.productId } });
    if (!product) {
      throw new BadRequestException('Produto não encontrado para movimentação de estoque.');
    }

    if (input.type === MovementType.OUT && product.stockQty < input.quantity) {
      throw new BadRequestException(
        `Estoque insuficiente para "${product.name}". Disponível: ${product.stockQty} ${product.unit}, solicitado: ${input.quantity} ${product.unit}.`,
      );
    }

    product.stockQty =
      input.type === MovementType.IN ? product.stockQty + input.quantity : product.stockQty - input.quantity;
    await productRepo.save(product);

    const movementRepo = manager.getRepository(StockMovement);
    const movement = movementRepo.create({
      productId: input.productId,
      type: input.type,
      reason: input.reason,
      quantity: input.quantity,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
    });
    return movementRepo.save(movement);
  }
}
