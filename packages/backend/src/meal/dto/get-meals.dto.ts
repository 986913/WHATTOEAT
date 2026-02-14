import { MealType } from '../../type/entities/type.entity';
import { IsOptional, IsNotEmpty, IsEnum, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMealsDTO {
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  page: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsEnum(MealType, {
    message: `type must be one of: ${Object.values(MealType).join(', ')}`,
  })
  type?: MealType; // 前端呈现的select下拉框, 值是 “breakfast”， “lunch”， “dinner”, "snack"
}
