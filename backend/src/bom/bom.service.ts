import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BomItem } from './bom-item.entity';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { Product, ProductType } from '../products/product.entity';

@Injectable()
export class BomService {
  constructor(
    @InjectRepository(BomItem) private readonly repo: Repository<BomItem>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) {}

  findForProduct(finishedProductId: string): Promise<BomItem[]> {
    return this.repo.find({
      where: { finishedProductId },
      relations: ['rawMaterial'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateBomItemDto): Promise<BomItem> {
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
    return this.repo.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item da ficha técnica não encontrado.');
    }
    await this.repo.remove(item);
  }
}
