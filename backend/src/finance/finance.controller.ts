import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateFinanceEntryDto } from './dto/create-finance-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { FinanceEntryStatus, FinanceEntryType } from './finance-entry.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('entries')
  findAll(@Query('type') type?: FinanceEntryType, @Query('status') status?: FinanceEntryStatus) {
    return this.financeService.findAll(type, status);
  }

  @Roles(UserRole.SX_FINANCE)
  @Post('entries')
  create(@Body() dto: CreateFinanceEntryDto) {
    return this.financeService.create(dto);
  }

  @Roles(UserRole.SX_FINANCE)
  @Patch('entries/:id/pay')
  markPaid(@Param('id') id: string) {
    return this.financeService.markPaid(id);
  }

  @Roles(UserRole.SX_FINANCE)
  @Patch('entries/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.financeService.cancel(id);
  }

  @Get('cash-flow')
  cashFlow(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.financeService.getCashFlow(startDate, endDate);
  }

  @Get('dre')
  dre(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.financeService.getDre(startDate, endDate);
  }
}
