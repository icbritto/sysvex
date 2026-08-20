import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';
import { Partner } from '../partners/partner.entity';

export enum ProductType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  FINISHED_GOOD = 'FINISHED_GOOD',
}

export enum ProductUnit {
  UNIDADE = 'un',
  QUILOGRAMA = 'kg',
  GRAMA = 'g',
  LITRO = 'L',
  MILILITRO = 'mL',
  DUZIA = 'dz',
  CAIXA = 'cx',
  PACOTE = 'pct',
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

  // Guardada como texto (não como enum nativo do Postgres) para que a lista de
  // unidades possa evoluir sem exigir uma migração destrutiva de coluna — a
  // validação da lista fixa acontece no DTO (`@IsEnum(ProductUnit)`).
  @Column({ default: ProductUnit.UNIDADE })
  unit: ProductUnit;

  // Quantidade de `unit` contida em uma embalagem de compra (ex.: 0.2 para um
  // tablete de manteiga de 200g quando `unit` é kg). Usado só como referência
  // para calcular custo/estoque a partir do preço pago no pacote — não afeta
  // a Ficha Técnica, que sempre usa a unidade-base do insumo.
  @Column('numeric', {
    precision: 14,
    scale: 4,
    name: 'package_qty',
    nullable: true,
    transformer: DecimalTransformer,
  })
  packageQty: number | null;

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

  // Fornecedor sugerido ao gerar um pedido de compra automático por falta de
  // estoque deste insumo (sempre pode ser trocado no pedido gerado).
  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'default_supplier_id' })
  defaultSupplier: Partner | null;

  @Column({ name: 'default_supplier_id', nullable: true })
  defaultSupplierId: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
