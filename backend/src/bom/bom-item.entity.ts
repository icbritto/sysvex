import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

// Ficha técnica: quantidade de um insumo (rawMaterial) necessária para
// produzir 1 unidade do produto acabado (finishedProduct).
@Entity('bom_items')
export class BomItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'finished_product_id' })
  finishedProduct: Product;

  @Column({ name: 'finished_product_id' })
  finishedProductId: string;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'raw_material_id' })
  rawMaterial: Product;

  @Column({ name: 'raw_material_id' })
  rawMaterialId: string;

  @Column('numeric', { precision: 14, scale: 6, transformer: DecimalTransformer })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
