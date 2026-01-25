import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngredientEntity } from './entities/ingredient.entity';
import { IngredientService } from './ingredient.service';
import { IngredientController } from './ingredient.controller';

@Module({
  //请 TypeORM 帮我在当前模块中注册IngredientEntity实体的repository，否则我在IngredientService里就没法用@InjectRepository(IngredientEntity)
  imports: [TypeOrmModule.forFeature([IngredientEntity])],
  controllers: [IngredientController],
  providers: [IngredientService],
  exports: [IngredientService],
})
export class IngredientModule {}
