import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaymentMethod } from '../../common/payment-method.enum';

class SalesOrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateSalesOrderDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  orderDate: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items: SalesOrderItemDto[];
}
