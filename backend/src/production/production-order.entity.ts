import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

export enum ProductionStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('production_orders')
export class ProductionOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number' })
  orderNumber: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @Column('numeric', { precision: 14, scale: 4, transformer: DecimalTransformer })
  quantity: number;

  @Column({ type: 'enum', enum: ProductionStatus, default: ProductionStatus.PLANNED })
  status: ProductionStatus;

  @Column({ name: 'planned_date', type: 'date' })
  plannedDate: string;

  @Column({ name: 'completed_date', type: 'date', nullable: true })
  completedDate: string | null;

  @Column('numeric', {
    precision: 14,
    scale: 2,
    name: 'total_cost',
    nullable: true,
    transformer: DecimalTransformer,
  })
  totalCost: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
