import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { PartnerPersonType, PartnerType } from '../partner.entity';

export class CreatePartnerDto {
  @IsEnum(PartnerPersonType)
  personType: PartnerPersonType;

  @ValidateIf((o) => o.personType === PartnerPersonType.INDIVIDUAL)
  @IsString()
  @MinLength(2)
  name?: string;

  @ValidateIf((o) => o.personType === PartnerPersonType.COMPANY)
  @IsString()
  @MinLength(2)
  legalName?: string;

  @ValidateIf((o) => o.personType === PartnerPersonType.COMPANY)
  @IsString()
  @MinLength(2)
  tradeName?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsEnum(PartnerType)
  type: PartnerType;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
