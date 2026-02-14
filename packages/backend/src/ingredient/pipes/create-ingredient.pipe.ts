import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { CreateIngredientDTO } from '../dto/create-ingredient.dto';

/* Pipe 用于在 Controller 接收请求数据之前，对数据进行预处理(转换)或验证 */
@Injectable()
export class CreateIngredientPipe implements PipeTransform {
  transform(value: CreateIngredientDTO, metadata: ArgumentMetadata) {
    value.name = value.name.trim();
    // 对用户传来的 name 进行trim操作，去除前后空格，确保数据的规范性。
    return value;
  }
}
