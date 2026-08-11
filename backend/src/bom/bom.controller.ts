import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BomService } from './bom.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bom')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('product/:finishedProductId')
  findForProduct(@Param('finishedProductId') finishedProductId: string) {
    return this.bomService.findForProduct(finishedProductId);
  }

  @Post()
  create(@Body() dto: CreateBomItemDto) {
    return this.bomService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bomService.remove(id);
  }
}
