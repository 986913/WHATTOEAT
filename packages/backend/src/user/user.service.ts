import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { LogEntity } from 'src/log/entities/log.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>, // 👈 使用依赖注入的方式，自动注入users表的数据库操作对象（Repository）
    @InjectRepository(LogEntity)
    private readonly logRepository: Repository<LogEntity>, // 👈 使用依赖注入的方式，自动注入logs表的数据库操作对象（Repository）
  ) {}

  findAll() {
    return this.userRepository.find();
  }

  findByUserName(username: string) {
    return this.userRepository.findOne({ where: { username } });
  }

  findById(userId: number) {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  findProfile(userId: number) {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: {
        profile: true,
      },
    });
  }

  async findLogs(userId: number) {
    const user = (await this.findById(userId)) || {
      id: -1,
      username: 'not found',
    }; // 如果用户不存在，使用一个不存在的id，避免报错

    return this.logRepository.find({
      where: { user },
      relations: {
        user: true,
      },
    });
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
