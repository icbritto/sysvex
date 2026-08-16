import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/company')
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  get() {
    return this.companySettingsService.get();
  }

  @Roles(UserRole.SX_ADMIN)
  @Patch()
  update(@Body() dto: UpdateCompanySettingsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.companySettingsService.update(dto, { id: actor.id, username: actor.username });
  }
}
