import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
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

  async create(dto: CreateProductDto, actor?: Actor): Promise<Product> {
    const existing = await this.repo.findOne({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException('Já existe um produto com este SKU.');
    }
    const saved = await this.repo.save(this.repo.create(dto));
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
