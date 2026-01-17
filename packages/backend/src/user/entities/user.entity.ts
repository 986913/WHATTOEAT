import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { LogEntity } from 'src/log/entities/log.entity';
import { RoleEntity } from 'src/role/entities/role.entity';

//@Entity(users)装饰器告诉 TypeORM：这是一个数据库的表, 表名为users
@Entity('users') // 表名为复数
export class UserEntity {
  //创建一个主键列，值由数据库自动生成（通常是自增的整数）
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  /*
    @OneToOne 一个用户只对应一个用户资料:
      第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 ProfileEntity)
      第二个参数: 告诉 TypeORM ProfileEntity实体中是通过哪个字段反向关联回来的 (这里是ProfileEntity里定义的user字段）
   */
  @OneToOne(() => ProfileEntity, (profile) => profile.user)
  profile: ProfileEntity;

  /*
    @OneToMany 一个用户可以有多条日志记录:
      第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 LogEntity)
      第二个参数: 告诉 TypeORM LogEntity实体中是通过哪个字段反向关联回来的 (这里是LogEntity里定义的user字段）
   */
  @OneToMany(() => LogEntity, (log) => log.user)
  logs: LogEntity[];

  /*
    @ManyToMany 一个用户可以有多个角色:
      第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 RoleEntity)
      第二个参数: 告诉 TypeORM RoleEntity实体中是通过哪个字段反向关联回来的 (这里是RoleEntity里定义的users字段）
   */
  @ManyToMany(() => RoleEntity, (role) => role.users)
  roles: RoleEntity[];
}
