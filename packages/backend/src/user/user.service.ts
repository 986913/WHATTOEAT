import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { GetUsersDTO } from './dto/get-user.dto';
import { LogService } from 'src/log/log.service';
import { UserRepository } from './user.repository';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logService: LogService,
  ) {}

  findByUserName(username: string) {
    return this.userRepository.findByUserName(username);
  }

  findById(userId: number) {
    return this.userRepository.findById(userId);
  }

  async findAll(query: GetUsersDTO) {
    const { data, total } =
      await this.userRepository.findUsersWithFilters(query);
    return {
      users: data,
      usersTotalCount: total,
      currPage: Number(query.page ?? 1),
      currLimit: Number(query.limit ?? 10),
    };
  }

  create(user: UserEntity) {
    return this.userRepository.createAndSave(user);
  }

  async update(userId: number, user: Partial<UserEntity>) {
    const foundUser = await this.findProfile(userId);
    return this.userRepository.deepUpdate(foundUser!, user);

    //下面只适合单模型的update, 不适合有关系的模型update:
    // return this.userRepository.update(userId, user);
  }

  async remove(userId: number) {
    await this.ensureUserExists(userId);
    return this.userRepository.deleteById(userId);
  }

  /**** 通过关联查询，获取用户及其profile信息 ****/
  async findProfile(userId: number) {
    await this.ensureUserExists(userId);
    return this.userRepository.findUserProfile(userId);
  }
  /**** 通过关联查询，获取用户的所有logs信息 ****/
  async findLogs(userId: number) {
    await this.ensureUserExists(userId);
    return this.logService.findUserLogs(userId);
  }

  /**** 通过聚合查询 ****/
  async findLogsGroupedByResult(userId: number) {
    await this.ensureUserExists(userId);
    return this.logService.getUserLogStatistics(userId);
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const exists = await this.userRepository.findById(userId);
    if (!exists) {
      throw new NotFoundException(`用户 id with ${userId} 不存在`);
    }
  }
}
