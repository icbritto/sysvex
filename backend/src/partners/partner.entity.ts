import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// "BOTH" não é mais oferecido na criação/edição (ver CreatePartnerDto), mas
// continua um valor válido do enum do banco para não quebrar quem já tinha
// parceiros cadastrados assim — remover um valor de um enum nativo do
// Postgres via `synchronize: true` derruba a inicialização do backend
// inteiro caso exista alguma linha usando o valor removido.
export enum PartnerType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

export enum PartnerPersonType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: PartnerPersonType, default: PartnerPersonType.INDIVIDUAL })
  personType: PartnerPersonType;

  // Só preenchidos para Pessoa Jurídica; `name` (usado em listagens, pedidos
  // e recibos) é derivado automaticamente do Nome Fantasia nesse caso.
  @Column({ type: 'varchar', nullable: true })
  legalName: string | null;

  @Column({ type: 'varchar', nullable: true })
  tradeName: string | null;

  @Column({ type: 'varchar', nullable: true })
  document: string | null;

  @Column({ type: 'enum', enum: PartnerType })
  type: PartnerType;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
