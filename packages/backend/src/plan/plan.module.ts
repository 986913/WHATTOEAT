import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { TypeEntity } from 'src/meal/entities/type.entity';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { IngredientEntity } from 'src/meal/entities/ingredient.entity';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';

@Module({
  //请 TypeORM 帮我在当前模块中注册PlanEntity实体的repository，否则我在PlanService里就没法用@InjectRepository(PlanEntity)
  imports: [
    TypeOrmModule.forFeature([
      PlanEntity,
      MealEntity,
      TypeEntity,
      UserEntity,
      IngredientEntity,
    ]),
  ],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
