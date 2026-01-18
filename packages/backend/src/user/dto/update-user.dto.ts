/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
  IsArray,
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

  @IsOptional()
  @IsArray()
  @IsIn(['2', '3'], { each: true }) // 数组中每一项都必须是 '2' 或 '3'
  roles?: ('2' | '3')[];
}
