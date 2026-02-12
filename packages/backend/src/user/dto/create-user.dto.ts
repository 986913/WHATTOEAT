/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
  IsArray,
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

  @IsOptional()
  @IsArray()
  @IsIn(['2', '3'], { each: true }) // 数组中每一项都必须是 '2' 或 '3'
  roles?: ('2' | '3')[];
}
