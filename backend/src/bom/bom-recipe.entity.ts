import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { BomItem } from './bom-item.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

// Uma receita nomeada para um produto acabado. Um produto pode ter várias
// receitas (ex.: "Padrão", "Sem lactose"), mas apenas uma é a padrão —
// usada automaticamente quando uma ordem de produção não escolhe outra.
@Entity('bom_recipes')
export class BomRecipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'finished_product_id' })
  finishedProduct: Product;

  @Column({ name: 'finished_product_id' })
  finishedProductId: string;

  @Column()
  name: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  // Quantas unidades do produto acabado essa receita rende de uma vez (ex.:
  // a "Receita X" rende 12 unidades por rodada). Os itens da ficha técnica
  // (BomItem.quantity) são definidos para a receita inteira, não por
  // unidade — production.service.ts escala pela proporção de rodadas
  // (order.quantity / outputQuantity). Também usado para pré-preencher a
  // quantidade a produzir na Ordem de Produção (continua editável lá).
  @Column('numeric', { precision: 14, scale: 4, name: 'output_quantity', default: 1, transformer: DecimalTransformer })
  outputQuantity: number;

  @OneToMany(() => BomItem, (item) => item.recipe, { cascade: true, eager: true })
  items: BomItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
