import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateBomItemDto {
  @IsUUID()
  finishedProductId: string;

  @IsUUID()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.000001)
  quantity: number;
}
