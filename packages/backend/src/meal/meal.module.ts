import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from './entities/type.entity';
import { IngredientEntity } from './entities/ingredient.entity';
import { MealService } from './meal.service';
import { MealController } from './meal.controller';

@Module({
  //请 TypeORM 帮我在当前模块中注册MealEntity实体的repository，否则我在MealService里就没法用@InjectRepository(MealEntity)
  imports: [
    TypeOrmModule.forFeature([MealEntity, TypeEntity, IngredientEntity]),
  ],
  controllers: [MealController],
  providers: [MealService],
  exports: [MealService],
})
export class MealModule {}
