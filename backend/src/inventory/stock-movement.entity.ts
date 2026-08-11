import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum MovementReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  PRODUCTION_CONSUME = 'PRODUCTION_CONSUME',
  PRODUCTION_OUTPUT = 'PRODUCTION_OUTPUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

// Ledger imutável de movimentações de estoque — toda entrada/saída passa por
// aqui, permitindo reconstituir o histórico de qualquer produto.
@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'enum', enum: MovementReason })
  reason: MovementReason;

  @Column('numeric', { precision: 14, scale: 4, transformer: DecimalTransformer })
  quantity: number;

  @Column({ type: 'varchar', name: 'reference_type', nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', name: 'reference_id', nullable: true })
  referenceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
