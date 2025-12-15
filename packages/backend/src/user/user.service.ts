import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getUsers(): any {
    return {
      code: 0,
      data: [{ name: 'Ming Liu', age: 31 }],
      message: 'Success',
    };
  }

  addUser(): any {
    return {
      code: 0,
      data: {},
      message: '添加用户成功!',
    };
  }
}
