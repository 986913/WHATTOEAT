import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('profiles')
export class ProfileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gender: string;

  @Column()
  photo: string;

  @Column()
  address: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' }) // 👈 在当前表profiles中添加外键字段(user_id)，指向users表的主键, 一对一关系
  user: UserEntity;
}
