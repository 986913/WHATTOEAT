import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

//@Entity(users)装饰器告诉 TypeORM：这是一个数据库的表, 表名为users
@Entity('users') // 表名为复数
export class UserEntity {
  //创建一个主键列，值由数据库自动生成（通常是自增的整数）
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;
}
