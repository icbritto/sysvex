import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  findAll() {
    return this.partnersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partnersService.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePartnerDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.partnersService.create(dto, { id: actor.id, username: actor.username });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.partnersService.update(id, dto, { id: actor.id, username: actor.username });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.partnersService.remove(id, { id: actor.id, username: actor.username });
  }
}
