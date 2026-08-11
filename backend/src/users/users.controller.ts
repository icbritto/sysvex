import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from './user.entity';

// Administração de usuários e roles é restrita a SX_ADMIN e SX_SECURITY,
// refletindo o conceito de "Business User" com IDs e roles próprias do
// SAP S/4HANA e a responsabilidade de gestão de acessos da role de segurança.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SX_ADMIN, UserRole.SX_SECURITY)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll().then((users) => users.map(this.toSafeUser));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.toSafeUser(await this.usersService.findById(id));
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.toSafeUser(await this.usersService.create(dto));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.toSafeUser(await this.usersService.update(id, dto, { id: actor.id, username: actor.username }));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  private toSafeUser(user: import('./user.entity').User) {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
