import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from './app.entity';
import { UpdateAppDto } from './dto/update-app.dto';
import { UserRole } from '../users/user.entity';
import { AuditLogService } from '../audit/audit-log.service';

interface DefaultApp {
  key: string;
  title: string;
  icon: string;
  color: string;
  allowedRoles: UserRole[];
  sortOrder: number;
}

// As 7 linhas de negócio do SYSVEX, cada uma modelada como um "App" que pode
// ser ativado/desativado e restrito a roles específicas, espelhando o
// conceito de Business Catalog / apps do SAP Fiori Launchpad.
const DEFAULT_APPS: DefaultApp[] = [
  {
    key: 'financeiro',
    title: 'Financeiro',
    icon: '💰',
    color: '#0f6bab',
    allowedRoles: [UserRole.FINANCE, UserRole.ADMIN],
    sortOrder: 1,
  },
  {
    key: 'compras',
    title: 'Compras',
    icon: '🛒',
    color: '#c0388b',
    allowedRoles: [UserRole.PURCHASING, UserRole.ADMIN],
    sortOrder: 2,
  },
  {
    key: 'vendas',
    title: 'Vendas',
    icon: '🧾',
    color: '#c9701c',
    allowedRoles: [UserRole.SALES, UserRole.ADMIN],
    sortOrder: 3,
  },
  {
    key: 'estoque_producao',
    title: 'Estoque & Produção',
    icon: '📦',
    color: '#6a3fa0',
    allowedRoles: [UserRole.PRODUCTION, UserRole.ADMIN],
    sortOrder: 4,
  },
  {
    key: 'administracao',
    title: 'Administração',
    icon: '👤',
    color: '#b3261e',
    allowedRoles: [UserRole.ADMIN, UserRole.SX_SECURITY],
    sortOrder: 5,
  },
  {
    key: 'seguranca_compliance',
    title: 'Segurança & Compliance',
    icon: '🛡️',
    color: '#1a7f8e',
    allowedRoles: [UserRole.SX_SECURITY, UserRole.ADMIN],
    sortOrder: 6,
  },
  {
    key: 'administracao_sistema',
    title: 'Administração de Sistema',
    icon: '🖥️',
    color: '#3a4750',
    allowedRoles: [UserRole.SX_SYSTEM, UserRole.ADMIN],
    sortOrder: 7,
  },
];

@Injectable()
export class AppsService implements OnModuleInit {
  constructor(
    @InjectRepository(App) private readonly appsRepo: Repository<App>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const defaultApp of DEFAULT_APPS) {
      const existing = await this.appsRepo.findOne({ where: { key: defaultApp.key } });
      if (!existing) {
        await this.appsRepo.save(this.appsRepo.create(defaultApp));
      }
    }
  }

  findVisibleFor(effectiveRoles: UserRole[]): Promise<App[]> {
    return this.appsRepo
      .find({ where: { active: true }, order: { sortOrder: 'ASC' } })
      .then((apps) => apps.filter((app) => app.allowedRoles.some((role) => effectiveRoles.includes(role))));
  }

  findAllForAdmin(): Promise<App[]> {
    return this.appsRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async update(id: string, dto: UpdateAppDto, actor: { id: string; username: string }): Promise<App> {
    const app = await this.appsRepo.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException('App não encontrado.');
    }
    const before = { active: app.active, allowedRoles: [...app.allowedRoles] };
    Object.assign(app, dto);
    const saved = await this.appsRepo.save(app);
    await this.auditLogService.record({
      actorUserId: actor.id,
      actorUsername: actor.username,
      action: 'APP_PERMISSION_UPDATED',
      targetType: 'App',
      targetId: saved.id,
      details: `${saved.title}: ${JSON.stringify(before)} -> ${JSON.stringify({
        active: saved.active,
        allowedRoles: saved.allowedRoles,
      })}`,
    });
    return saved;
  }
}
