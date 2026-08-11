import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../users/user.entity';

@Entity('emergency_access_grants')
export class EmergencyAccessGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_user_id' })
  targetUserId: string;

  @Column({ name: 'granted_role', type: 'enum', enum: UserRole })
  grantedRole: UserRole;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'granted_by_user_id' })
  grantedByUserId: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoked_by_user_id', nullable: true })
  revokedByUserId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
