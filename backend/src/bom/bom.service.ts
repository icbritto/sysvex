import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BomItem } from './bom-item.entity';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { Product, ProductType } from '../products/product.entity';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class BomService {
  constructor(
    @InjectRepository(BomItem) private readonly repo: Repository<BomItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findForProduct(finishedProductId: string): Promise<BomItem[]> {
    return this.repo.find({
      where: { finishedProductId },
      relations: ['rawMaterial'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateBomItemDto, actor?: Actor): Promise<BomItem> {
    const finishedProduct = await this.productsRepo.findOne({ where: { id: dto.finishedProductId } });
    const rawMaterial = await this.productsRepo.findOne({ where: { id: dto.rawMaterialId } });
    if (!finishedProduct || !rawMaterial) {
      throw new NotFoundException('Produto acabado ou insumo não encontrado.');
    }
    if (finishedProduct.type !== ProductType.FINISHED_GOOD) {
      throw new BadRequestException('A ficha técnica só pode ser criada para um produto acabado.');
    }
    if (rawMaterial.type !== ProductType.RAW_MATERIAL) {
      throw new BadRequestException('O componente da ficha técnica deve ser um insumo (matéria-prima).');
    }
    const item = this.repo.create({
      finishedProductId: dto.finishedProductId,
      rawMaterialId: dto.rawMaterialId,
      quantity: dto.quantity,
    });
    const saved = await this.repo.save(item);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_ITEM_CREATED',
        targetType: 'BomItem',
        targetId: saved.id,
        details: `${finishedProduct.name} <- ${rawMaterial.name} (${dto.quantity})`,
      });
    }
    return saved;
  }

  async remove(id: string, actor?: Actor): Promise<void> {
    const item = await this.repo.findOne({ where: { id }, relations: ['finishedProduct', 'rawMaterial'] });
    if (!item) {
      throw new NotFoundException('Item da ficha técnica não encontrado.');
    }
    await this.repo.remove(item);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'BOM_ITEM_DELETED',
        targetType: 'BomItem',
        targetId: id,
        details: `${item.finishedProduct?.name ?? item.finishedProductId} <- ${item.rawMaterial?.name ?? item.rawMaterialId}`,
      });
    }
  }
}
