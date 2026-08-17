import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BomItem } from './bom-item.entity';
import { BomRecipe } from './bom-recipe.entity';
import { Product } from '../products/product.entity';
import { BomService } from './bom.service';
import { BomController } from './bom.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([BomRecipe, BomItem, Product]), AuditModule],
  controllers: [BomController],
  providers: [BomService],
  exports: [BomService],
})
export class BomModule {}
