import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from './entities/type.entity';
import { IngredientEntity } from './entities/ingredient.entity';
import { GetMealsDTO } from './dto/get-meals.dto';

@Injectable()
export class MealService {
  constructor(
    @InjectRepository(MealEntity)
    private mealRepo: Repository<MealEntity>,
    @InjectRepository(TypeEntity)
    private typeRepo: Repository<TypeEntity>,
    @InjectRepository(IngredientEntity)
    private ingredientRepo: Repository<IngredientEntity>,
  ) {}

  async findAll() {
    return this.mealRepo.find({
      relations: {
        types: true,
        ingredients: true,
      },
    });
  }

  async findById(mealId: number) {
    return this.mealRepo.findOne({
      where: {
        id: mealId,
      },
      relations: {
        types: true,
        ingredients: true,
      },
    });
  }

  async findAllMatch(query: GetMealsDTO): Promise<any> {
    const { page = 1, limit = 10, type } = query;

    const queryBuilder = this.mealRepo
      .createQueryBuilder('mealsTable')
      .leftJoinAndSelect('mealsTable.types', 'types')
      .leftJoinAndSelect('mealsTable.ingredients', 'ingredients');
    // 后面的.where会替换前面的.where, 所以要用.andWhere
    if (type) {
      queryBuilder.where('types.name = :typeName', { typeName: type });
    }

    const [data, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      meals: data,
      mealsTotalCount: total,
      currPage: Number(query.page ?? 1),
      currLimit: Number(query.limit ?? 10),
    };
  }
}
