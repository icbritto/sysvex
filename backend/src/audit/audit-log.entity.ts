import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_user_id' })
  actorUserId: string;

  @Column({ name: 'actor_username' })
  actorUsername: string;

  @Column()
  action: string;

  @Column({ name: 'target_type' })
  targetType: string;

  @Column({ name: 'target_id', nullable: true })
  targetId?: string;

  @Column({ type: 'text', nullable: true })
  details?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
