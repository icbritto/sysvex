import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { FinanceEntry, FinanceEntryStatus, FinanceEntryType } from './finance-entry.entity';
import { CreateFinanceEntryDto } from './dto/create-finance-entry.dto';

export interface CashFlowSummary {
  startDate: string;
  endDate: string;
  totalReceived: number;
  totalPaid: number;
  netCashFlow: number;
  openReceivables: number;
  openPayables: number;
}

export interface DreSummary {
  startDate: string;
  endDate: string;
  revenue: number;
  costOfGoods: number;
  grossResult: number;
}

@Injectable()
export class FinanceService {
  constructor(@InjectRepository(FinanceEntry) private readonly repo: Repository<FinanceEntry>) {}

  findAll(type?: FinanceEntryType, status?: FinanceEntryStatus): Promise<FinanceEntry[]> {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    return this.repo.find({ where, relations: ['partner'], order: { dueDate: 'ASC' } });
  }

  create(dto: CreateFinanceEntryDto): Promise<FinanceEntry> {
    const entry = this.repo.create({
      type: dto.type,
      description: dto.description,
      partnerId: dto.partnerId ?? null,
      amount: dto.amount,
      dueDate: dto.dueDate,
    });
    return this.repo.save(entry);
  }

  async createWithManager(
    manager: EntityManager,
    input: {
      type: FinanceEntryType;
      description: string;
      partnerId?: string | null;
      amount: number;
      dueDate: string;
      referenceType?: string;
      referenceId?: string;
    },
  ): Promise<FinanceEntry> {
    const repo = manager.getRepository(FinanceEntry);
    const entry = repo.create({
      type: input.type,
      description: input.description,
      partnerId: input.partnerId ?? null,
      amount: input.amount,
      dueDate: input.dueDate,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
    });
    return repo.save(entry);
  }

  async markPaid(id: string, paidDate?: string): Promise<FinanceEntry> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Lançamento financeiro não encontrado.');
    }
    entry.status = FinanceEntryStatus.PAID;
    entry.paidDate = paidDate ?? new Date().toISOString().slice(0, 10);
    return this.repo.save(entry);
  }

  async cancel(id: string): Promise<FinanceEntry> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Lançamento financeiro não encontrado.');
    }
    entry.status = FinanceEntryStatus.CANCELLED;
    return this.repo.save(entry);
  }

  async getCashFlow(startDate: string, endDate: string): Promise<CashFlowSummary> {
    const paidInRange = await this.repo
      .createQueryBuilder('e')
      .where('e.status = :status', { status: FinanceEntryStatus.PAID })
      .andWhere('e.paid_date BETWEEN :start AND :end', { start: startDate, end: endDate })
      .getMany();

    const totalReceived = paidInRange
      .filter((e) => e.type === FinanceEntryType.RECEIVABLE)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = paidInRange
      .filter((e) => e.type === FinanceEntryType.PAYABLE)
      .reduce((sum, e) => sum + e.amount, 0);

    const open = await this.repo.find({ where: { status: FinanceEntryStatus.OPEN } });
    const openReceivables = open
      .filter((e) => e.type === FinanceEntryType.RECEIVABLE)
      .reduce((sum, e) => sum + e.amount, 0);
    const openPayables = open
      .filter((e) => e.type === FinanceEntryType.PAYABLE)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      startDate,
      endDate,
      totalReceived,
      totalPaid,
      netCashFlow: totalReceived - totalPaid,
      openReceivables,
      openPayables,
    };
  }

  // DRE simplificado: receita = contas a receber criadas no período (regime de
  // competência), custo = contas a pagar de compras/produção no mesmo período.
  async getDre(startDate: string, endDate: string): Promise<DreSummary> {
    const entries = await this.repo
      .createQueryBuilder('e')
      .where('e.due_date BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('e.status != :cancelled', { cancelled: FinanceEntryStatus.CANCELLED })
      .getMany();

    const revenue = entries.filter((e) => e.type === FinanceEntryType.RECEIVABLE).reduce((s, e) => s + e.amount, 0);
    const costOfGoods = entries
      .filter((e) => e.type === FinanceEntryType.PAYABLE)
      .reduce((s, e) => s + e.amount, 0);

    return {
      startDate,
      endDate,
      revenue,
      costOfGoods,
      grossResult: revenue - costOfGoods,
    };
  }
}
