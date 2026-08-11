import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Partner } from '../partners/partner.entity';
import { DecimalTransformer } from '../common/transformers/decimal.transformer';

export enum FinanceEntryType {
  PAYABLE = 'PAYABLE',
  RECEIVABLE = 'RECEIVABLE',
}

export enum FinanceEntryStatus {
  OPEN = 'OPEN',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('finance_entries')
export class FinanceEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: FinanceEntryType })
  type: FinanceEntryType;

  @Column()
  description: string;

  @ManyToOne(() => Partner, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partner_id' })
  partner: Partner | null;

  @Column({ type: 'varchar', name: 'partner_id', nullable: true })
  partnerId: string | null;

  @Column('numeric', { precision: 14, scale: 2, transformer: DecimalTransformer })
  amount: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'enum', enum: FinanceEntryStatus, default: FinanceEntryStatus.OPEN })
  status: FinanceEntryStatus;

  @Column({ name: 'paid_date', type: 'date', nullable: true })
  paidDate: string | null;

  @Column({ type: 'varchar', name: 'reference_type', nullable: true })
  referenceType: string | null;

  @Column({ type: 'varchar', name: 'reference_id', nullable: true })
  referenceId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
