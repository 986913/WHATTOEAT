import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { TypeEntity } from '../../type/entities/type.entity';
import { IngredientEntity } from 'src/ingredient/entities/ingredient.entity';
import { PlanEntity } from '../../plan/entities/plan.entity';

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
      @ManyToMany 一个meal可以有多个types:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 TypeEntity)
        第二个参数: 告诉 TypeORM TypeEntity实体中是通过哪个字段反向关联回来的 (这里是TypeEntity里定义的meals字段）
     */
  @ManyToMany(() => TypeEntity, (type) => type.meals)
  types: TypeEntity[];

  /*
      @ManyToMany 一个meal可以有多个ingredients:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 IngredientEntity)
        第二个参数: 告诉 TypeORM IngredientEntity实体中是通过哪个字段反向关联回来的 (这里是IngredientEntity里定义的meals字段）
     */
  @ManyToMany(() => IngredientEntity, (type) => type.meals)
  ingredients: IngredientEntity[];

  /*
      @OneToMany 一个meal可以有多个plans:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 PlanEntity)
        第二个参数: 告诉 TypeORM PlanEntity 实体中是通过哪个字段反向关联回来的 (这里是 PlanEntity 里定义的meal字段）
     */
  @OneToMany(() => PlanEntity, (plan) => plan.meal)
  plans: PlanEntity[];
}
