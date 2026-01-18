import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { LogEntity } from './entities/log.entity';

@Injectable()
export class LogRepository {
  private readonly repo: Repository<LogEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(LogEntity);
  }

  findByUserId(userId: number) {
    return this.repo.find({
      where: { user: { id: userId } },
      relations: { user: true },
    });
  }

  countGroupedByResult(userId: number) {
    return (
      this.repo
        .createQueryBuilder('logsTable') // 为logs表指定别名：在后续表达式中使用该别名，如 logsTable.result
        // 注意：此处的列名 user_id 必须与实体上 @JoinColumn 或数据库实际列名一致
        .where('logsTable.user_id = :userId', { userId })
        // 选择非聚合列：必须在 groupBy 中出现（这里给出别名 'resultCode'，getRawMany() 返回时会包含该别名字段）
        .select('logsTable.result', 'resultCode')
        // 追加聚合列：COUNT 返回聚合结果并用别名 'count'，通常与 groupBy 一起使用
        .addSelect('COUNT(logsTable.result)', 'count')
        // 对非聚合列进行分组：SQL 要求在 SELECT 同时出现非聚合列和聚合函数时对非聚合列做 GROUP BY
        .groupBy('logsTable.result')
        .orderBy('logsTable.result', 'ASC')
        .getRawMany()
    );
    /*
      上面的queryBuilder等价于下面的原生SQL查询：
        return this.logRepository.query(
          `SELECT 
            logs.result AS resultCode, 
            COUNT(*) AS count 
          FROM logs 
          WHERE logs.user_id = ?
          GROUP BY logs.result 
          ORDER BY logs.result ASC`,
          [userId], // 参数绑定，避免SQL注入
        );
     */
  }
}
