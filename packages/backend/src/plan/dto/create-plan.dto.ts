import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsDateString, Min } from 'class-validator';

export class CreatePlanDTO {
  @IsDateString(
    {},
    {
      message: 'date must be a valid ISO date string (YYYY-MM-DD or full ISO)',
    },
  )
  date: string;

  // 前端发送的是字符串 id ("1"), 在 DTO 层转成 number 并验证,
  // 前端呈现的select下拉框, 值是 “1”， “2”， “3”, "4", 分别对应数据table中的 “breakfast”， “lunch”， “dinner”, "snack"
  @Type(() => Number)
  @IsInt({ message: 'typeId must be an integer' })
  @Min(1)
  typeId: number;

  @Type(() => Number)
  @IsInt({ message: 'mealId must be an integer' })
  @Min(1)
  mealId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'userId must be an integer' })
  @Min(1)
  userId?: number;
}
