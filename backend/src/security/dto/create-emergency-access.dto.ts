import { IsEnum, IsInt, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class CreateEmergencyAccessDto {
  @IsUUID()
  targetUserId: string;

  @IsEnum(UserRole)
  grantedRole: UserRole;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;
}
