import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettings } from './company-settings.entity';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class CompanySettingsService {
  constructor(
    @InjectRepository(CompanySettings) private readonly repo: Repository<CompanySettings>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // Configuração da empresa é um registro único (singleton); criado com os
  // valores padrão da entidade na primeira leitura, caso ainda não exista.
  async get(): Promise<CompanySettings> {
    const existing = await this.repo.find({ take: 1 });
    if (existing.length > 0) {
      return existing[0];
    }
    return this.repo.save(this.repo.create());
  }

  async update(dto: UpdateCompanySettingsDto, actor?: Actor): Promise<CompanySettings> {
    const settings = await this.get();
    Object.assign(settings, dto);
    const saved = await this.repo.save(settings);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'COMPANY_SETTINGS_UPDATED',
        targetType: 'CompanySettings',
        targetId: saved.id,
      });
    }
    return saved;
  }
}
