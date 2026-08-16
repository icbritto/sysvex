import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_settings')
export class CompanySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_name', default: 'SYSVEX Indústria e Comércio Ltda' })
  companyName: string;

  @Column({ default: '/logo.png' })
  logoUrl: string;

  @Column({ default: 'São Paulo' })
  city: string;

  @Column({ default: 'SP' })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ name: 'pix_key', default: '00.000.000/0001-00' })
  pixKey: string;

  @Column({ name: 'bank_name', default: 'Banco SYSVEX S.A.' })
  bankName: string;

  @Column({ name: 'bank_account_holder', default: 'SYSVEX Indústria e Comércio Ltda' })
  bankAccountHolder: string;

  @Column({ name: 'bank_account_info', default: 'Agência 0001 / Conta 12345-6' })
  bankAccountInfo: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
