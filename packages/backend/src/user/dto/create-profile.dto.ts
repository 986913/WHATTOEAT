/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsOptional, IsString, IsIn, IsUrl } from 'class-validator';

export class CreateProfileDTO {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(['1', '2'])
  gender?: '1' | '2';

  @IsOptional()
  @IsUrl({}, { message: 'photo must be a valid URL' })
  photo?: string;
}
