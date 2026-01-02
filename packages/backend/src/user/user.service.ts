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

  async create(user: UserEntity) {
    const newUser = this.userRepository.create(user);
    return this.userRepository.save(newUser);
  }

  async update(userId: number, user: Partial<UserEntity>) {
    const foundUser = await this.findById(userId);
    if (!foundUser) throw new Error(`用户 id ${userId} 不存在`);

    return this.userRepository.update(userId, user);
  }

  async remove(userId: number) {
    const foundUser = await this.findById(userId);
    if (!foundUser) throw new Error(`用户 id ${userId} 不存在`);

    return this.userRepository.delete(userId);
  }

  /**** 通过关联查询，获取用户及其profile信息 ****/
  async findProfile(userId: number) {
    const foundUser = await this.findById(userId);
    if (!foundUser) throw new Error(`用户 id ${userId} 不存在`);

    return this.userRepository.findOne({
      where: { id: userId },
      relations: {
        profile: true,
      },
    });
  }
  /**** 通过关联查询，获取用户的所有logs信息 ****/
  async findLogs(userId: number) {
    const foundUser = await this.findById(userId);
    if (!foundUser) throw new Error(`用户 id ${userId} 不存在`);

    return this.logRepository.find({
      where: { user: foundUser },
      relations: {
        user: true,
      },
    });
  }

  /**** 通过聚合查询 ****
    SELECT logs.result as result,  COUNT (logs.result) as count from logs,
    user WHERE user.id = logs.userId AND user.id = 2 GROUP BY logs.result
  */
  async findLogsGroupedByResult(userId: number) {
    const foundUser = await this.findById(userId);
    if (!foundUser) throw new Error(`用户 id ${userId} 不存在`);

    return (
      this.logRepository
        .createQueryBuilder('logsTable') // 为logs表指定别名：在后续表达式中使用该别名，如 logsTable.result
        // 注意：此处的列名 user_Id 必须与实体上 @JoinColumn 或数据库实际列名一致
        .where('logsTable.user_Id = :userId', { userId })
        // 选择非聚合列：必须在 groupBy 中出现（这里给出别名 'resultCode'，getRawMany() 返回时会包含该别名字段）
        .select('logsTable.result', 'resultCode')
        // 追加聚合列：COUNT 返回聚合结果并用别名 'count'，通常与 groupBy 一起使用
        .addSelect('COUNT(logsTable.result)', 'count')
        // 对非聚合列进行分组：SQL 要求在 SELECT 同时出现非聚合列和聚合函数时对非聚合列做 GROUP BY
        .groupBy('logsTable.result')
        .orderBy('logsTable.result', 'ASC')
        .getRawMany()
    );
  }
}
