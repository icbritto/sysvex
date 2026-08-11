import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { FinanceEntryType } from '../finance-entry.entity';

export class CreateFinanceEntryDto {
  @IsEnum(FinanceEntryType)
  type: FinanceEntryType;

  @IsString()
  @MinLength(2)
  description: string;

  @IsUUID()
  @IsOptional()
  partnerId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  dueDate: string;
}
