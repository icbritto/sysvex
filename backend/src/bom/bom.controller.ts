import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BomService } from './bom.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { CreateBomRecipeDto } from './dto/create-bom-recipe.dto';
import { UpdateBomRecipeDto } from './dto/update-bom-recipe.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('bom')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('product/:finishedProductId')
  listRecipesForProduct(@Param('finishedProductId') finishedProductId: string) {
    return this.bomService.listRecipesForProduct(finishedProductId);
  }

  @Post('recipes')
  createRecipe(@Body() dto: CreateBomRecipeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.createRecipe(dto, { id: actor.id, username: actor.username });
  }

  @Patch('recipes/:id')
  renameRecipe(@Param('id') id: string, @Body() dto: UpdateBomRecipeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.renameRecipe(id, dto, { id: actor.id, username: actor.username });
  }

  @Patch('recipes/:id/set-default')
  setDefaultRecipe(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.setDefaultRecipe(id, { id: actor.id, username: actor.username });
  }

  @Delete('recipes/:id')
  removeRecipe(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.removeRecipe(id, { id: actor.id, username: actor.username });
  }

  @Post('items')
  addItem(@Body() dto: CreateBomItemDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.addItem(dto, { id: actor.id, username: actor.username });
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.bomService.removeItem(id, { id: actor.id, username: actor.username });
  }
}
