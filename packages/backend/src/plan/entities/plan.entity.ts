import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TypeEntity } from '../../type/entities/type.entity';
import { MealEntity } from '../../meal/entities/meal.entity';
import { UserEntity } from 'src/user/entities/user.entity';

@Index(['user', 'date', 'type'], { unique: true }) // 同一个用户，在同一天，同一餐，只能有一个 plan
@Entity('plans') // 表名为复数，@Entity(plans)装饰器告诉 TypeORM：这是一个数据库的表, 表名为plans, 其中的一条记录 = 某人 + 某一天 + 某一餐(type) + 某个meal (某天，谁吃了哪个type的meal)
export class PlanEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  /*
    @ManyToOne 多个plans对应一个用户：
      第一个参数： 告诉 TypeORM, 关联的是哪个实体（这里是 UserEntity)
      第二个参数： 告诉 TypeORM, UserEntity 实体中是通过哪个字段反向关联回来的 (这里是 UserEntity 里定义的plans字段）
   */
  @ManyToOne(() => UserEntity, (user) => user.plans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' }) // 👈 在当前表plans中添加外键字段(user_id)，指向users表的主键, 多对一关系
  user: UserEntity;

  /*
    @ManyToOne 多个plans对应一个meal：
      第一个参数： 告诉 TypeORM, 关联的是哪个实体（这里是 MealEntity)
      第二个参数： 告诉 TypeORM, MealEntity 实体中是通过哪个字段反向关联回来的 (这里是 MealEntity 里定义的plans字段）
   */
  @ManyToOne(() => MealEntity, (meal) => meal.plans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meal_id' }) // 👈 在当前表plans中添加外键字段(meal_id)，指向meals表的主键, 多对一关系
  meal: MealEntity;

  /*
    @ManyToOne 多个plans对应一个type：
      第一个参数： 告诉 TypeORM, 关联的是哪个实体（这里是 TypeEntity)
      第二个参数： 告诉 TypeORM, TypeEntity 实体中是通过哪个字段反向关联回来的 (这里是 TypeEntity 里定义的plans字段）
   */
  @ManyToOne(() => TypeEntity, (type) => type.plans)
  @JoinColumn({ name: 'type_id' }) // 👈 在当前表plans中添加外键字段(meal_id)，指向meals表的主键, 多对一关系
  type: TypeEntity;
}
