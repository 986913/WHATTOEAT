import { IsString, IsNotEmpty } from 'class-validator';

export class CreateIngredientDTO {
  @IsNotEmpty()
  @IsString()
  name: string;
}
