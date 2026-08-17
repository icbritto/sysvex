import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../products/product.entity';
import { BomItem } from './bom-item.entity';

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

  @OneToMany(() => BomItem, (item) => item.recipe, { cascade: true, eager: true })
  items: BomItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
