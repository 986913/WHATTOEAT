import {
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
  IsArray,
  ArrayUnique,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProfileDTO } from './update-profile.dto';

export class UpdateUserDTO {
  @IsString()
  username: string;

  // @IsString()
  // password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDTO)
  profile?: UpdateProfileDTO;

  // roles: 可选数组，支持前端传 '2'/'3' 或 2/3，会被转换为 number 并验证为正整数
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number) // 把 '2'/'3' 字符串转换为数字 2/3
  @IsInt({ each: true })
  @IsIn([1, 2, 3], { each: true }) //数组中每一项都必须是 1 或 2 或 3
  roles?: number[];
}
