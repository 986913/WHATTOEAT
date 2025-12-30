import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Entity('roles') // 表名为复数
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roleName: string;

  /*
    @ManyToMany 一个角色可以有多个用户:
      第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 UserEntity)
      第二个参数: 告诉 TypeORM UserEntity实体中是通过哪个字段反向关联回来的 (这里是UserEntity里定义的roles字段）
   */
  @ManyToMany(() => UserEntity, (user) => user.roles)
  @JoinTable({ name: 'users_roles' }) // 👈 在多对多关系中, 需要在其中一张表中使用@JoinTable装饰器来指定关联表的名称
  users: UserEntity[];
}
