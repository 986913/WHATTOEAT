import { MealType } from '../../type/entities/type.entity';
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUrl,
  IsArray,
  ArrayUnique,
  IsEnum,
  ArrayNotEmpty,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMealDTO {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUrl()
  @IsOptional()
  url?: string;

  // types 必须是非空数组，且数组每个元素必须是 MealType 枚举中的值
  @IsNotEmpty()
  @IsArray()
  @ArrayUnique()
  @IsEnum(MealType, { each: true })
  types: MealType[]; // enum safe

  // ingredientIds 必须是非空数组，且每个元素为整数（使用 class-transformer 将字符串转为 number）
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  ingredientIds: number[]; // ✅关键：引用已有 ingredient
}
