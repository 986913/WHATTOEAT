import { MealType } from '../../type/entities/type.entity';

export class CreateMealDTO {
  name: string;
  url?: string;

  types: MealType[]; // enum safe
  ingredientIds: number[]; // ✅关键：引用已有 ingredient
}
