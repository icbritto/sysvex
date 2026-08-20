import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { BomRecipe } from './bom-recipe.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

// Ficha técnica: quantidade de um insumo (rawMaterial) necessária para
// produzir a receita inteira (que rende `recipe.outputQuantity` unidades do
// produto acabado), não por unidade individual — a produção escala essa
// quantidade pela proporção de rodadas da receita (order.quantity /
// recipe.outputQuantity).
@Entity('bom_items')
export class BomItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BomRecipe, (recipe) => recipe.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: BomRecipe;

  @Column({ name: 'recipe_id' })
  recipeId: string;

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
