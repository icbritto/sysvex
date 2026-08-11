import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SecurityService } from './security.service';
import { CreateEmergencyAccessDto } from './dto/create-emergency-access.dto';
import { AppsService } from '../apps/apps.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt.strategy';
import { UserRole } from '../users/user.entity';

// Endpoints de segurança/compliance (matriz de acesso, acesso emergencial e
// auditoria) são restritos a ADMIN e SX_SECURITY.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SX_SECURITY)
@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly appsService: AppsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('sod-analysis')
  async sodAnalysis() {
    const apps = await this.appsService.findAllForAdmin();
    return this.securityService.analyzeSoD(apps);
  }

  @Get('emergency-access')
  listGrants() {
    return this.securityService.listGrants();
  }

  @Post('emergency-access')
  grantAccess(@Body() dto: CreateEmergencyAccessDto, @CurrentUser() user: AuthenticatedUser) {
    return this.securityService.grantEmergencyAccess(dto, { id: user.id, username: user.username });
  }

  @Patch('emergency-access/:id/revoke')
  revokeAccess(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.securityService.revokeGrant(id, { id: user.id, username: user.username });
  }

  @Get('audit-logs')
  auditLogs() {
    return this.auditLogService.findRecent();
  }
}
