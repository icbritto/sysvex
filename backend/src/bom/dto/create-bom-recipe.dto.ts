import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateBomRecipeDto {
  @IsUUID()
  finishedProductId: string;

  @IsString()
  @MinLength(1)
  name: string;
}
