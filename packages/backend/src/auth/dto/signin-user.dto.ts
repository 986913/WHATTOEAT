import { IsNotEmpty, IsString, Length } from 'class-validator';

// DTO 只是数据结构描述，真正抛 400 的是 ValidationPipe，最终由 Nest 的默认 Exception Filter 统一处理。
export class SigninUserDTO {
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
}
