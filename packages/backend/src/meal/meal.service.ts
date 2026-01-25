import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { IngredientEntity } from 'src/ingredient/entities/ingredient.entity';
import { GetMealsDTO } from './dto/get-meals.dto';
import { CreateMealDTO } from './dto/create-meal.dto';

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

  private async ensureUserExists(mealId: number): Promise<MealEntity> {
    const exists = await this.findById(mealId);
    if (!exists) {
      throw new NotFoundException(`Meal id with ${mealId} 不存在`);
    }
    return exists;
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
      .leftJoinAndSelect('mealsTable.user', 'users')
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

  async findOptionsByType(typeId?: number): Promise<MealEntity[]> {
    const queryBuilder = this.mealRepo
      .createQueryBuilder('meal')
      .select(['meal.id', 'meal.name'])
      .leftJoin('meal.types', 'type');

    if (typeId) {
      queryBuilder.where('type.id = :typeId', { typeId });
    }

    return queryBuilder.getMany();
  }

  async create(dto: CreateMealDTO) {
    const { name, url, types, ingredientIds } = dto;

    // 1. Types enum → entity
    const typeEntities = await this.typeRepo.find({
      where: types.map((t) => ({ name: t })),
    });

    // 2. Ingredient ids → entity
    const ingredientEntities = await this.ingredientRepo.findBy({
      id: In(ingredientIds),
    });

    // 3. Create Meal
    const meal = this.mealRepo.create({
      name,
      url,
      types: typeEntities,
      ingredients: ingredientEntities,
    });

    return this.mealRepo.save(meal);
  }

  async remove(mealId: number) {
    const foundMeal = await this.ensureUserExists(mealId);
    // 使用 remove 方法（而不是 delete）以触发 TypeORM 的级联逻辑
    return this.mealRepo.remove(foundMeal);
  }
}
