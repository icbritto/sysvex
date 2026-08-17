import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<Product[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado.');
    }
    return product;
  }

  // Gera o próximo SKU sequencial por tipo (MP-001, MP-002... / PA-001,
  // PA-002...), seguindo a convenção já usada nos dados de exemplo.
  private async generateSku(type: ProductType): Promise<string> {
    const prefix = type === ProductType.RAW_MATERIAL ? 'MP' : 'PA';
    const products = await this.repo
      .createQueryBuilder('product')
      .where('product.sku LIKE :pattern', { pattern: `${prefix}-%` })
      .getMany();
    const nextSeq =
      products.reduce((max, p) => {
        const match = p.sku.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0) + 1;
    return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  }

  async create(dto: CreateProductDto, actor?: Actor): Promise<Product> {
    const sku = await this.generateSku(dto.type);
    const saved = await this.repo.save(this.repo.create({ ...dto, sku }));
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCT_CREATED',
        targetType: 'Product',
        targetId: saved.id,
        details: `${saved.sku} - ${saved.name}`,
      });
    }
    return saved;
  }

  async update(id: string, dto: UpdateProductDto, actor?: Actor): Promise<Product> {
    const product = await this.findById(id);
    Object.assign(product, dto);
    const saved = await this.repo.save(product);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCT_UPDATED',
        targetType: 'Product',
        targetId: saved.id,
        details: `${saved.sku} - ${saved.name}`,
      });
    }
    return saved;
  }

  async remove(id: string, actor?: Actor): Promise<void> {
    const product = await this.findById(id);
    await this.repo.remove(product);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PRODUCT_DELETED',
        targetType: 'Product',
        targetId: id,
        details: `${product.sku} - ${product.name}`,
      });
    }
  }

  async findLowStock(): Promise<Product[]> {
    const products = await this.findAll();
    return products.filter((p) => p.active && p.stockQty <= p.minStock);
  }
}
