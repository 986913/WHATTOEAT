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

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  address: string;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' }) // 👈 在当前表profiles中添加外键字段(user_id)，指向users表的主键, 一对一关系
  user: UserEntity;
}
