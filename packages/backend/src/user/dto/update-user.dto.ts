/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateProfileDTO } from './update-profile.dto';

export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileDTO)
  profile?: UpdateProfileDTO;
}
