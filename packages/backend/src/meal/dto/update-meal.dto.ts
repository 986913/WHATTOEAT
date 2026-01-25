import { MealType } from 'src/type/entities/type.entity';

export class UpdateMealDTO {
  name?: string;
  url?: string;

  types?: MealType[];
  ingredientIds?: number[];
}
