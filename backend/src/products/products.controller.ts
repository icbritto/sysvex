import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('low-stock')
  findLowStock() {
    return this.productsService.findLowStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.create(dto, { id: actor.id, username: actor.username });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.update(id, dto, { id: actor.id, username: actor.username });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.productsService.remove(id, { id: actor.id, username: actor.username });
  }
}
