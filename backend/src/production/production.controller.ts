import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductionService } from './production.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

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

  @Get(':id/requirements')
  getRequirements(@Param('id') id: string) {
    return this.productionService.getRequirements(id);
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Post()
  create(@Body() dto: CreateProductionOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.productionService.create(dto, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productionService.complete(id, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_PRODUCTION)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productionService.cancel(id, { id: actor.id, username: actor.username });
  }
}
