import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TypeEntity } from './type.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { IngredientEntity } from './ingredient.entity';

//@Entity(meals)装饰器告诉 TypeORM：这是一个数据库的表, 表名为meals
@Entity('meals') // 表名为复数
export class MealEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  url: string;

  /*
    @ManyToOne 多条日志记录对应一个用户：
      第一个参数： 告诉 TypeORM, 关联的是哪个实体（这里是 UserEntity)
      第二个参数： 告诉 TypeORM, UserEntity实体中是通过哪个字段反向关联回来的 (这里是UserEntity里定义的meals字段）
   */
  @ManyToOne(() => UserEntity, (user) => user.meals)
  @JoinColumn({ name: 'user_id' }) // 👈 在当前表meals中添加外键字段(user_id)，指向users表的主键, 多对一关系
  user: UserEntity;

  /*
      @ManyToMany 一个meal可以有多个type:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 TypeEntity)
        第二个参数: 告诉 TypeORM TypeEntity实体中是通过哪个字段反向关联回来的 (这里是TypeEntity里定义的meals字段）
     */
  @ManyToMany(() => TypeEntity, (type) => type.meals)
  types: TypeEntity[];

  /*
      @ManyToMany 一个meal可以有多个type:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 IngredientEntity)
        第二个参数: 告诉 TypeORM IngredientEntity实体中是通过哪个字段反向关联回来的 (这里是IngredientEntity里定义的meals字段）
     */
  @ManyToMany(() => IngredientEntity, (type) => type.meals)
  ingredients: IngredientEntity[];
}
