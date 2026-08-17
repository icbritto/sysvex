import { IsString, MinLength } from 'class-validator';

export class UpdateBomRecipeDto {
  @IsString()
  @MinLength(1)
  name: string;
}
