import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class SignupUserDTO {
  @IsString()
  @IsNotEmpty()
  @Length(3, 20, {
    message: `Username must be between $constraint1 and $constraint2 characters, but your username input is $value`,
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 20, {
    message: `Password must be between $constraint1 and $constraint2 characters, but your password input is $value`,
  })
  password: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;
}
