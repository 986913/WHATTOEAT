export class CreatePlanDTO {
  date: string;
  typeId: string; // 前端呈现的select下拉框, 值是 “1”， “2”， “3”, "4", 分别对应数据table中的 “breakfast”， “lunch”， “dinner”, "snack"
  mealId: string;
  userId?: string;
}
