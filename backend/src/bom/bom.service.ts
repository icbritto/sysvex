import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BomItem } from './bom-item.entity';
import { BomRecipe } from './bom-recipe.entity';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { CreateBomRecipeDto } from './dto/create-bom-recipe.dto';
import { UpdateBomRecipeDto } from './dto/update-bom-recipe.dto';
import { Product, ProductType } from '../products/product.entity';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class BomService {
  constructor(
    @InjectRepository(BomRecipe) private readonly recipesRepo: Repository<BomRecipe>,
    @InjectRepository(BomItem) private readonly itemsRepo: Repository<BomItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly auditLogService: AuditLogService,
  ) {}

  listRecipesForProduct(finishedProductId: string): Promise<BomRecipe[]> {
    return this.recipesRepo.find({
      where: { finishedProductId },
      relations: ['items', 'items.rawMaterial'],
      order: { createdAt: 'ASC' },
    });
  }

  getDefaultRecipe(finishedProductId: string): Promise<BomRecipe | null> {
    return this.recipesRepo.findOne({
      where: { finishedProductId, isDefault: true },
      relations: ['items', 'items.rawMaterial'],
    });
  }

  async createRecipe(dto: CreateBomRecipeDto, actor?: Actor): Promise<BomRecipe> {
    const finishedProduct = await this.productsRepo.findOne({ where: { id: dto.finishedProductId } });
    if (!finishedProduct) {
      throw new NotFoundException('Produto acabado não encontrado.');
    }
    if (finishedProduct.type !== ProductType.FINISHED_GOOD) {
      throw new BadRequestException('Receitas só podem ser criadas para um produto acabado.');
    }
    const existingCount = await this.recipesRepo.count({ where: { finishedProductId: dto.finishedProductId } });
    const recipe = this.recipesRepo.create({
      finishedProductId: dto.finishedProductId,
      name: dto.name,
      isDefault: existingCount === 0,
      outputQuantity: dto.outputQuantity ?? 1,
    });
    const saved = await this.recipesRepo.save(recipe);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_RECIPE_CREATED',
        targetType: 'BomRecipe',
        targetId: saved.id,
        details: `${finishedProduct.name}: ${saved.name}`,
      });
    }
    return saved;
  }

  async renameRecipe(id: string, dto: UpdateBomRecipeDto, actor?: Actor): Promise<BomRecipe> {
    const recipe = await this.findRecipeOrThrow(id);
    recipe.name = dto.name;
    if (dto.outputQuantity != null) {
      recipe.outputQuantity = dto.outputQuantity;
    }
    const saved = await this.recipesRepo.save(recipe);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_RECIPE_RENAMED',
        targetType: 'BomRecipe',
        targetId: saved.id,
        details: saved.name,
      });
    }
    return saved;
  }

  async setDefaultRecipe(id: string, actor?: Actor): Promise<BomRecipe> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.recipesRepo.update({ finishedProductId: recipe.finishedProductId }, { isDefault: false });
    recipe.isDefault = true;
    const saved = await this.recipesRepo.save(recipe);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_RECIPE_SET_DEFAULT',
        targetType: 'BomRecipe',
        targetId: saved.id,
        details: saved.name,
      });
    }
    return saved;
  }

  async removeRecipe(id: string, actor?: Actor): Promise<void> {
    const recipe = await this.findRecipeOrThrow(id);
    await this.recipesRepo.remove(recipe);
    if (recipe.isDefault) {
      const nextRecipe = await this.recipesRepo.findOne({
        where: { finishedProductId: recipe.finishedProductId },
        order: { createdAt: 'ASC' },
      });
      if (nextRecipe) {
        nextRecipe.isDefault = true;
        await this.recipesRepo.save(nextRecipe);
      }
    }
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_RECIPE_DELETED',
        targetType: 'BomRecipe',
        targetId: id,
        details: recipe.name,
      });
    }
  }

  async addItem(dto: CreateBomItemDto, actor?: Actor): Promise<BomItem> {
    const recipe = await this.recipesRepo.findOne({ where: { id: dto.recipeId }, relations: ['finishedProduct'] });
    const rawMaterial = await this.productsRepo.findOne({ where: { id: dto.rawMaterialId } });
    if (!recipe || !rawMaterial) {
      throw new NotFoundException('Receita ou insumo não encontrado.');
    }
    if (rawMaterial.type !== ProductType.RAW_MATERIAL) {
      throw new BadRequestException('O componente da ficha técnica deve ser um insumo (matéria-prima).');
    }
    const item = this.itemsRepo.create({
      recipeId: dto.recipeId,
      rawMaterialId: dto.rawMaterialId,
      quantity: dto.quantity,
    });
    const saved = await this.itemsRepo.save(item);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_ITEM_CREATED',
        targetType: 'BomItem',
        targetId: saved.id,
        details: `${recipe.finishedProduct.name} (${recipe.name}) <- ${rawMaterial.name} (${dto.quantity})`,
      });
    }
    return saved;
  }

  async removeItem(id: string, actor?: Actor): Promise<void> {
    const item = await this.itemsRepo.findOne({
      where: { id },
      relations: ['recipe', 'recipe.finishedProduct', 'rawMaterial'],
    });
    if (!item) {
      throw new NotFoundException('Item da ficha técnica não encontrado.');
    }
    await this.itemsRepo.remove(item);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_ITEM_DELETED',
        targetType: 'BomItem',
        targetId: id,
        details: `${item.recipe?.finishedProduct?.name ?? ''} (${item.recipe?.name ?? item.recipeId}) <- ${item.rawMaterial?.name ?? item.rawMaterialId}`,
      });
    }
  }

  private async findRecipeOrThrow(id: string): Promise<BomRecipe> {
    const recipe = await this.recipesRepo.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException('Receita não encontrada.');
    }
    return recipe;
  }
}
