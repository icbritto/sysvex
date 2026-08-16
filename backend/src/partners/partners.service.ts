import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner, PartnerPersonType } from './partner.entity';
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

  // Pessoa Jurídica não digita um "nome" — ele é derivado do Nome Fantasia,
  // que é o que aparece em listagens, pedidos e recibos. Razão
  // Social/Nome Fantasia também são normalizados para caixa alta aqui como
  // segurança extra, independente da formatação já aplicada no front-end.
  private normalize(dto: CreatePartnerDto | UpdatePartnerDto, existing?: Partner) {
    const personType = dto.personType ?? existing?.personType;
    if (personType === PartnerPersonType.COMPANY) {
      const legalName = (dto.legalName ?? existing?.legalName ?? '').toUpperCase();
      const tradeName = (dto.tradeName ?? existing?.tradeName ?? '').toUpperCase();
      return { ...dto, legalName, tradeName, name: tradeName };
    }
    if (personType === PartnerPersonType.INDIVIDUAL) {
      return { ...dto, legalName: null, tradeName: null };
    }
    return dto;
  }

  async create(dto: CreatePartnerDto, actor?: Actor): Promise<Partner> {
    const saved = await this.repo.save(this.repo.create(this.normalize(dto)));
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
    Object.assign(partner, this.normalize(dto, partner));
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
