import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { UserRole } from '../../users/user.entity';

export class UpdateAppDto {
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  @IsOptional()
  allowedRoles?: UserRole[];

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
