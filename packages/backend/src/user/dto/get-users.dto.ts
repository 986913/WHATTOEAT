import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';

export class GetUsersDTO {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  username?: string;

  // 前端呈现的select下拉框, 前端传 "1" | "2" | "3"（也允许数字）
  @IsOptional()
  @Type(() => Number) // 把 '1'/'2'/'3' 字符串转换为数字 1/2/3
  @IsInt({ each: true })
  @IsIn([1, 2, 3], { each: true }) //数组中每一项都必须是 1 或 2 或 3
  role?: 1 | 2 | 3;

  // 前端传 "1" | "2"（也允许数字）
  @IsOptional()
  @IsIn(['1', '2'], { each: true }) //数组中每一项都必须是 '1' 或 '2'
  gender?: '1' | '2';
}
