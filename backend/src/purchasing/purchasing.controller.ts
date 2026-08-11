import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

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
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.purchasingService.create(dto);
  }

  @Roles(UserRole.SX_PURCHASING)
  @Patch(':id/receive')
  receive(@Param('id') id: string) {
    return this.purchasingService.receive(id);
  }

  @Roles(UserRole.SX_PURCHASING)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.purchasingService.cancel(id);
  }
}
