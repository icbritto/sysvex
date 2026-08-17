import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ProductType } from '../product.entity';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  costPrice: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQty?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
