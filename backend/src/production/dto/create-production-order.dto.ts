import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsDateString()
  plannedDate: string;
}
