import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  SX_ADMIN = 'SX_ADMIN',
  SX_FINANCE = 'SX_FINANCE',
  SX_PURCHASING = 'SX_PURCHASING',
  SX_SALES = 'SX_SALES',
  SX_PRODUCTION = 'SX_PRODUCTION',
  SX_SYSTEM = 'SX_SYSTEM',
  SX_SECURITY = 'SX_SECURITY',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SX_SALES })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
