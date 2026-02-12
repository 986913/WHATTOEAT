import { IsNotEmpty, IsString, Length } from 'class-validator';

export class SigninUserDTO {
  @IsString()
  @IsNotEmpty()
  @Length(3, 10, {
    message: `Username must be between $constraint1 and $constraint2 characters, but your username input is $value`,
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 10, {
    message: `Password must be between $constraint1 and $constraint2 characters, but your password input is $value`,
  })
  password: string;
}
