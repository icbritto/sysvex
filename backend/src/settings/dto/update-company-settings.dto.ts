import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  city?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  address?: string | null;

  @IsString()
  @MinLength(1)
  @IsOptional()
  pixKey?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  bankName?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  bankAccountHolder?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  bankAccountInfo?: string;
}
