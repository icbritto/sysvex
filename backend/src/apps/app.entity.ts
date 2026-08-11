import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../users/user.entity';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  title: string;

  @Column()
  icon: string;

  @Column()
  color: string;

  @Column({ name: 'allowed_roles', type: 'simple-array' })
  allowedRoles: UserRole[];

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
