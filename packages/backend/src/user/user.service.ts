import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>, // 👈 使用依赖注入的方式，自动注入users表的数据库操作对象（Repository）
  ) {}

  findAll() {
    return this.userRepository.find();
  }

  findByUserName(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }

  async create(user: UserEntity) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  update(id: number, user: Partial<UserEntity>) {
    return this.userRepository.update(id, user);
  }

  remove(id: number) {
    return this.userRepository.delete(id);
  }
}
