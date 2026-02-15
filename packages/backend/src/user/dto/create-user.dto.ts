import {
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
  IsInt,
  IsArray,
  ArrayUnique,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileDTO } from './create-profile.dto';

export class CreateUserDTO {
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileDTO)
  profile?: CreateProfileDTO;

  // roles: 可选数组，支持前端传 '2'/'3' 或 2/3，会被转换为 number 并验证为正整数
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number) // 把 '2'/'3' 字符串转换为数字 2/3
  @IsInt({ each: true })
  @IsIn([2, 3], { each: true }) //数组中每一项都必须是 2 或 3
  roles?: number[];
}
