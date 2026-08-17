import { IsOptional, IsString } from 'class-validator';

export class UpdateDeliveryDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
