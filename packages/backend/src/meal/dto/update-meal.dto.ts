import { MealType } from 'src/type/entities/type.entity';
import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsUrl,
  IsArray,
  ArrayUnique,
  IsEnum,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMealDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(MealType, {
    each: true,
    message: `type must be one of: ${Object.values(MealType).join(', ')}`,
  })
  types?: MealType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true, message: 'Each ingredientId must be an integer' })
  ingredientIds?: number[];
}
