import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
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

  // "BOTH" segue sendo um valor válido no banco (dados legados), mas não é
  // mais aceito em cadastros/edições novos — cada tela cria só o tipo dela.
  @IsIn([PartnerType.CUSTOMER, PartnerType.SUPPLIER], { message: 'Tipo deve ser Cliente ou Fornecedor.' })
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
