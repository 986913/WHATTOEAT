import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { MealEntity } from './meal.entity';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACK = 'snack',
}

//@Entity(types)装饰器告诉 TypeORM：这是一个数据库的表, 表名为types
@Entity('types') // 表名为复数
export class TypeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: MealType, unique: true })
  name: MealType;

  /*
      @ManyToMany 一个角色可以有多个用户:
        第一个参数: 告诉 TypeORM 关联的是哪个实体（这里是 MealEntity)
        第二个参数: 告诉 TypeORM MealEntity实体中是通过哪个字段反向关联回来的 (这里是MealEntity里定义的types字段）
     */
  @ManyToMany(() => MealEntity, (meal) => meal.types)
  @JoinTable({ name: 'meals_types' }) // 👈 在多对多关系中, 需要在其中一张表中使用@JoinTable装饰器来指定关联表的名称
  meals: MealEntity[];
}
