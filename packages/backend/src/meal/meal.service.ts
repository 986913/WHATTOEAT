import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from './entities/type.entity';
import { IngredientEntity } from './entities/ingredient.entity';
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
  async create(meal: CreateMealDTO) {
    const { name, url, types, ingredients } = meal;

    // ===== 1. 处理 types =====
    const typeEntities: TypeEntity[] = [];
    for (const typeName of types) {
      let type = await this.typeRepo.findOne({
        where: { name: typeName },
      });

      if (!type) {
        type = this.typeRepo.create({ name: typeName });
        await this.typeRepo.save(type);
      }
      typeEntities.push(type);
    }

    // ===== 2. 处理 ingredients =====
    const ingredientEntities: IngredientEntity[] = [];
    for (const ingName of ingredients) {
      const normalized = ingName.trim().replace(/\s+/g, ' ').toLowerCase();
      // 查找数据库里有没有对应的 ingredient（用 LOWER() 比较大小写）
      let ingredient = await this.ingredientRepo
        .createQueryBuilder('ingredients')
        .where('LOWER(ingredients.name) = :name', { name: normalized })
        .getOne();

      if (!ingredient) {
        ingredient = this.ingredientRepo.create({ name: ingName }); // 保留原始大小写存入数据库
        await this.ingredientRepo.save(ingredient);
      }
      ingredientEntities.push(ingredient);
    }

    // ===== 3. 创建 Meal =====
    const newMeal = this.mealRepo.create({
      name,
      url,
      types: typeEntities,
      ingredients: ingredientEntities,
      // 暂时不关心谁创造的meal，可以先不设置 user
      // user: someUserEntity,
    });

    return await this.mealRepo.save(newMeal);
  }

  async remove(mealId: number) {
    const foundMeal = await this.ensureUserExists(mealId);
    // 使用 remove 方法（而不是 delete）以触发 TypeORM 的级联逻辑
    return this.mealRepo.remove(foundMeal);
  }
}
