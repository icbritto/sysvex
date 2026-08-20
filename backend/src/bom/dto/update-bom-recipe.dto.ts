import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateBomRecipeDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0.0001)
  @IsOptional()
  outputQuantity?: number;
}
