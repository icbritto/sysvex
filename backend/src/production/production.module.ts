import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from './production-order.entity';
import { BomItem } from '../bom/bom-item.entity';
import { Product } from '../products/product.entity';
import { ProductionService } from './production.service';
import { ProductionController } from './production.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionOrder, BomItem, Product]), InventoryModule, AuditModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
