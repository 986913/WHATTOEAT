import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateIngredientDTO {
  @IsNotEmpty()
  @IsString()
  name: string;
}
