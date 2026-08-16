import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BomService } from './bom.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('bom')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('product/:finishedProductId')
  findForProduct(@Param('finishedProductId') finishedProductId: string) {
    return this.bomService.findForProduct(finishedProductId);
  }

  @Post()
  create(@Body() dto: CreateBomItemDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.create(dto, { id: actor.id, username: actor.username });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.remove(id, { id: actor.id, username: actor.username });
  }
}
