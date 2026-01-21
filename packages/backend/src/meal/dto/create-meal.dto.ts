import { MealType } from '../entities/type.entity';

export class CreateMealDTO {
  name: string;
  url?: string;
  types: MealType[]; // ['lunch', 'dinner']
  ingredients: string[]; // ['egg', 'rice']
}
