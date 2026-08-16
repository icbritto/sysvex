import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Get()
  findAll() {
    return this.purchasingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasingService.findById(id);
  }

  @Roles(UserRole.SX_PURCHASING)
  @Post()
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.purchasingService.create(dto, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_PURCHASING)
  @Patch(':id/receive')
  receive(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.purchasingService.receive(id, { id: actor.id, username: actor.username });
  }

  @Roles(UserRole.SX_PURCHASING)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.purchasingService.cancel(id, { id: actor.id, username: actor.username });
  }
}
