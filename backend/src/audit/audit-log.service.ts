import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface RecordAuditEntryParams {
  actorUserId: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
}

@Injectable()
export class AuditLogService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>) {}

  async record(params: RecordAuditEntryParams): Promise<void> {
    const entry = this.auditLogRepo.create(params);
    await this.auditLogRepo.save(entry);
  }

  findRecent(limit = 300): Promise<AuditLog[]> {
    return this.auditLogRepo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
