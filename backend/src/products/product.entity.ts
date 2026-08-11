import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

export enum ProductType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  FINISHED_GOOD = 'FINISHED_GOOD',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProductType, name: 'type' })
  type: ProductType;

  @Column({ default: 'un' })
  unit: string;

  @Column('numeric', { precision: 12, scale: 4, name: 'cost_price', transformer: DecimalTransformer })
  costPrice: number;

  @Column('numeric', {
    precision: 12,
    scale: 4,
    name: 'sale_price',
    nullable: true,
    transformer: DecimalTransformer,
  })
  salePrice: number | null;

  @Column('numeric', { precision: 14, scale: 4, name: 'stock_qty', default: 0, transformer: DecimalTransformer })
  stockQty: number;

  @Column('numeric', { precision: 14, scale: 4, name: 'min_stock', default: 0, transformer: DecimalTransformer })
  minStock: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
