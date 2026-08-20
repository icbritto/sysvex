import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateBomRecipeDto {
  @IsUUID()
  finishedProductId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  outputQuantity?: number;
}
