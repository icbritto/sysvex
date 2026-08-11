import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, IsNull, Repository } from 'typeorm';
import { EmergencyAccessGrant } from './emergency-access-grant.entity';
import { CreateEmergencyAccessDto } from './dto/create-emergency-access.dto';
import { UserRole } from '../users/user.entity';
import { App } from '../apps/app.entity';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';

export interface SoDConflict {
  role: UserRole;
  appAKey: string;
  appATitle: string;
  appBKey: string;
  appBTitle: string;
  description: string;
}

// Pares de linhas de negócio que, se concedidas à mesma role, configuram um
// conflito clássico de segregação de funções (SoD).
const SOD_CONFLICT_RULES: Array<{ appA: string; appB: string; description: string }> = [
  {
    appA: 'compras',
    appB: 'financeiro',
    description: 'Quem cria pedidos de compra não deveria também aprovar/pagar contas.',
  },
  {
    appA: 'vendas',
    appB: 'financeiro',
    description: 'Quem registra pedidos de venda não deveria também conciliar o caixa/DRE.',
  },
  {
    appA: 'administracao',
    appB: 'seguranca_compliance',
    description: 'Quem administra usuários não deveria também controlar a auditoria de acessos.',
  },
];

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(EmergencyAccessGrant) private readonly grantsRepo: Repository<EmergencyAccessGrant>,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  getActiveGrantsForUser(userId: string): Promise<EmergencyAccessGrant[]> {
    return this.grantsRepo.find({
      where: { targetUserId: userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
  }

  async getEffectiveRoles(userId: string, baseRole: UserRole): Promise<UserRole[]> {
    const activeGrants = await this.getActiveGrantsForUser(userId);
    const roles = new Set<UserRole>([baseRole, ...activeGrants.map((grant) => grant.grantedRole)]);
    return Array.from(roles);
  }

  async grantEmergencyAccess(
    dto: CreateEmergencyAccessDto,
    grantedBy: { id: string; username: string },
  ): Promise<EmergencyAccessGrant> {
    const targetUser = await this.usersService.findById(dto.targetUserId);
    const expiresAt = new Date(Date.now() + dto.durationMinutes * 60_000);
    const grant = this.grantsRepo.create({
      targetUserId: dto.targetUserId,
      grantedRole: dto.grantedRole,
      reason: dto.reason,
      grantedByUserId: grantedBy.id,
      expiresAt,
    });
    const saved = await this.grantsRepo.save(grant);
    await this.auditLogService.record({
      actorUserId: grantedBy.id,
      actorUsername: grantedBy.username,
      action: 'EMERGENCY_ACCESS_GRANTED',
      targetType: 'User',
      targetId: targetUser.id,
      details: `Role ${dto.grantedRole} concedida a ${targetUser.username} por ${dto.durationMinutes} min. Motivo: ${dto.reason}`,
    });
    return saved;
  }

  async revokeGrant(id: string, revokedBy: { id: string; username: string }): Promise<EmergencyAccessGrant> {
    const grant = await this.grantsRepo.findOne({ where: { id } });
    if (!grant) {
      throw new NotFoundException('Acesso emergencial não encontrado.');
    }
    if (grant.revokedAt) {
      throw new BadRequestException('Este acesso emergencial já foi revogado.');
    }
    grant.revokedAt = new Date();
    grant.revokedByUserId = revokedBy.id;
    const saved = await this.grantsRepo.save(grant);
    await this.auditLogService.record({
      actorUserId: revokedBy.id,
      actorUsername: revokedBy.username,
      action: 'EMERGENCY_ACCESS_REVOKED',
      targetType: 'User',
      targetId: grant.targetUserId,
      details: `Role ${grant.grantedRole} revogada antecipadamente.`,
    });
    return saved;
  }

  async listGrants(): Promise<Array<EmergencyAccessGrant & { targetUsername: string; grantedByUsername: string }>> {
    const grants = await this.grantsRepo.find({ order: { createdAt: 'DESC' } });
    const userIds = new Set<string>();
    grants.forEach((grant) => {
      userIds.add(grant.targetUserId);
      userIds.add(grant.grantedByUserId);
    });
    const usernameById = new Map<string, string>();
    await Promise.all(
      Array.from(userIds).map(async (id) => {
        try {
          const user = await this.usersService.findById(id);
          usernameById.set(id, user.username);
        } catch {
          usernameById.set(id, '(usuário removido)');
        }
      }),
    );
    return grants.map((grant) => ({
      ...grant,
      targetUsername: usernameById.get(grant.targetUserId) ?? '—',
      grantedByUsername: usernameById.get(grant.grantedByUserId) ?? '—',
    }));
  }

  analyzeSoD(apps: App[]): SoDConflict[] {
    const appByKey = new Map(apps.map((app) => [app.key, app]));
    const conflicts: SoDConflict[] = [];
    for (const rule of SOD_CONFLICT_RULES) {
      const appA = appByKey.get(rule.appA);
      const appB = appByKey.get(rule.appB);
      if (!appA || !appB) continue;
      const rolesWithBoth = appA.allowedRoles.filter((role) => appB.allowedRoles.includes(role));
      for (const role of rolesWithBoth) {
        conflicts.push({
          role,
          appAKey: appA.key,
          appATitle: appA.title,
          appBKey: appB.key,
          appBTitle: appB.title,
          description: rule.description,
        });
      }
    }
    return conflicts;
  }
}
