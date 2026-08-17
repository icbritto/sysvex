import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  @IsOptional()
  recipeId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsDateString()
  plannedDate: string;
}
