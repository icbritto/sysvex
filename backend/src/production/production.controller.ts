import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('production-orders')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  findAll() {
    return this.productionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productionService.findById(id);
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Post()
  create(@Body() dto: CreateProductionOrderDto) {
    return this.productionService.create(dto);
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.productionService.complete(id);
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.productionService.cancel(id);
  }
}
