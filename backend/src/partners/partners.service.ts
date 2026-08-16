import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { AuditLogService } from '../audit/audit-log.service';

type Actor = { id: string; username: string };

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner) private readonly repo: Repository<Partner>,
    private readonly auditLogService: AuditLogService,
  ) {}

  findAll(): Promise<Partner[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Partner> {
    const partner = await this.repo.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Cliente/fornecedor não encontrado.');
    }
    return partner;
  }

  async create(dto: CreatePartnerDto, actor?: Actor): Promise<Partner> {
    const saved = await this.repo.save(this.repo.create(dto));
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PARTNER_CREATED',
        targetType: 'Partner',
        targetId: saved.id,
        details: saved.name,
      });
    }
    return saved;
  }

  async update(id: string, dto: UpdatePartnerDto, actor?: Actor): Promise<Partner> {
    const partner = await this.findById(id);
    Object.assign(partner, dto);
    const saved = await this.repo.save(partner);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PARTNER_UPDATED',
        targetType: 'Partner',
        targetId: saved.id,
        details: saved.name,
      });
    }
    return saved;
  }

  async remove(id: string, actor?: Actor): Promise<void> {
    const partner = await this.findById(id);
    await this.repo.remove(partner);
    if (actor) {
      await this.auditLogService.record({
        actorUserId: actor.id,
        actorUsername: actor.username,
        action: 'PARTNER_DELETED',
        targetType: 'Partner',
        targetId: id,
        details: partner.name,
      });
    }
  }
}
