import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDTO {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Length(3, 20)
  password: string;
}
