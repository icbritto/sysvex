import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-orders')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Roles(UserRole.SX_SALES)
  @Post()
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.salesService.create(dto, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_SALES)
  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.salesService.confirm(id, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_SALES)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.salesService.cancel(id, { id: actor.id, username: actor.username });
  }
}
