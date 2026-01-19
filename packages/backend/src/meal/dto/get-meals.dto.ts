import { MealType } from '../entities/type.entity';

export interface GetMealsDTO {
  page: number;
  limit?: number;
  type?: MealType; // 前端呈现的select下拉框, 值是 “breakfast”， “lunch”， “dinner”, "snack"
}
