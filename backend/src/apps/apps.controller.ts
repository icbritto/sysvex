import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AppsService } from './apps.service';
import { UpdateAppDto } from './dto/update-app.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../users/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  // Qualquer usuário autenticado só vê os Apps ativos e permitidos para as
  // suas roles efetivas (inclui roles concedidas via acesso emergencial).
  @Get()
  findVisible(@CurrentUser() user: AuthenticatedUser) {
    return this.appsService.findVisibleFor(user.effectiveRoles);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SX_ADMIN, UserRole.SX_SECURITY)
  @Get('admin')
  findAllForAdmin() {
    return this.appsService.findAllForAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SX_ADMIN, UserRole.SX_SECURITY)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appsService.update(id, dto, { id: user.id, username: user.username });
  }
}
