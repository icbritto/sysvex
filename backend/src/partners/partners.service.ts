import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(@InjectRepository(Partner) private readonly repo: Repository<Partner>) {}

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

  create(dto: CreatePartnerDto): Promise<Partner> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findById(id);
    Object.assign(partner, dto);
    return this.repo.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.findById(id);
    await this.repo.remove(partner);
  }
}
