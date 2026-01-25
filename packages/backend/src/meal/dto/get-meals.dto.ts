import { MealType } from '../../type/entities/type.entity';

export class GetMealsDTO {
  page: number;
  limit?: number;
  type?: MealType; // 前端呈现的select下拉框, 值是 “breakfast”， “lunch”， “dinner”, "snack"
}
