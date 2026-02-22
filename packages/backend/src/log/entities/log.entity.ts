import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('logs')
export class LogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  path: string;

  @Column()
  method: string;

  @Column()
  data: string;

  @Column()
  result: number;

  /*
    @ManyToOne 多条日志记录对应一个用户：
      第一个参数： 告诉 TypeORM, 关联的是哪个实体（这里是 UserEntity)
      第二个参数： 告诉 TypeORM, UserEntity实体中是通过哪个字段反向关联回来的 (这里是UserEntity里定义的logs字段）
   */
  @ManyToOne(() => UserEntity, (user) => user.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' }) // 👈 在当前表logs中添加外键字段(user_id)，指向users表的主键, 多对一关系
  user: UserEntity;
}
