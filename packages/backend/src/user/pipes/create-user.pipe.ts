import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { CreateUserDTO } from '../dto/create-user.dto';

/* Pipe 用于在 Controller 接收请求数据之前，对数据进行预处理(转换)或验证 */
@Injectable()
export class CreateUserPipe implements PipeTransform {
  transform(value: CreateUserDTO, metadata: ArgumentMetadata) {
    value.username = value.username.trim();
    value.password = value.password.trim();
    // 对用户传来的 username 和 password 进行trim操作，去除前后空格，确保数据的规范性。
    return value;
  }
}
