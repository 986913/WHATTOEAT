import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { IngredientEntity } from 'src/ingredient/entities/ingredient.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { GetMealsDTO } from './dto/get-meals.dto';
import { CreateMealDTO } from './dto/create-meal.dto';
import { UpdateMealDTO } from './dto/update-meal.dto';

@Injectable()
export class MealService {
  constructor(
    @InjectRepository(MealEntity)
    private mealRepo: Repository<MealEntity>,
    @InjectRepository(TypeEntity)
    private typeRepo: Repository<TypeEntity>,
    @InjectRepository(IngredientEntity)
    private ingredientRepo: Repository<IngredientEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  private async ensureMealExists(mealId: number): Promise<MealEntity> {
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
      .leftJoinAndSelect('mealsTable.types', 'types')
      .leftJoinAndSelect('mealsTable.ingredients', 'ingredients');
    // 后面的.where会替换前面的.where, 所以要用.andWhere
    if (type) {
      queryBuilder.andWhere('types.name = :typeName', { typeName: type });
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
    const { name, videoUrl, imageUrl, types, ingredientIds } = dto;

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
      videoUrl,
      imageUrl,
      types: typeEntities,
      ingredients: ingredientEntities,
    });

    return this.mealRepo.save(meal);
  }

  async update(mealId: number, dto: UpdateMealDTO) {
    const meal = await this.ensureMealExists(mealId);

    const { name, videoUrl, imageUrl, types, ingredientIds } = dto;

    // ===== update basic fields =====
    if (name !== undefined) meal.name = name;
    if (videoUrl !== undefined) meal.videoUrl = videoUrl;
    if (imageUrl !== undefined) meal.imageUrl = imageUrl;

    // ===== update types =====
    if (types) {
      const typeEntities = await this.typeRepo.find({
        where: types.map((t) => ({ name: t })),
      });
      meal.types = typeEntities;
    }

    // ===== update ingredients =====
    if (ingredientIds) {
      const ingredientEntities = await this.ingredientRepo.find({
        where: { id: In(ingredientIds) },
      });
      meal.ingredients = ingredientEntities;
    }

    return this.mealRepo.save(meal);
  }

  async remove(mealId: number) {
    const foundMeal = await this.ensureMealExists(mealId);
    // 使用 remove 方法（而不是 delete）以触发 TypeORM 的级联逻辑
    return this.mealRepo.remove(foundMeal);
  }

  // ================================
  // User-scoped meal methods
  // ================================

  /** Find meals visible to a user: public meals + user's own private meals */
  async findVisibleMeals(
    userId: number,
    typeId?: number,
  ): Promise<MealEntity[]> {
    const qb = this.mealRepo
      .createQueryBuilder('meal')
      .leftJoin('meal.types', 'type')
      .leftJoinAndSelect('meal.ingredients', 'ingredients')
      .where('(meal.creator_id IS NULL OR meal.creator_id = :userId)', {
        userId,
      });

    if (typeId) {
      qb.andWhere('type.id = :typeId', { typeId });
    }

    return qb
      .select([
        'meal.id',
        'meal.name',
        'meal.videoUrl',
        'meal.imageUrl',
        'ingredients.id',
        'ingredients.name',
      ])
      .getMany();
  }

  /** Find only the user's own created meals with pagination */
  async findMyMeals(userId: number, query: GetMealsDTO) {
    const { page = 1, limit = 10, type } = query;

    const qb = this.mealRepo
      .createQueryBuilder('meal')
      .leftJoinAndSelect('meal.types', 'types')
      .leftJoinAndSelect('meal.ingredients', 'ingredients')
      .where('meal.creator_id = :userId', { userId });

    if (type) {
      qb.andWhere('types.name = :typeName', { typeName: type });
    }

    const [data, total] = await qb
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      meals: data,
      mealsTotalCount: total,
      currPage: Number(page),
      currLimit: Number(limit),
    };
  }

  /** Create a meal owned by a user */
  async createUserMeal(userId: number, dto: CreateMealDTO) {
    const { name, videoUrl, imageUrl, types, ingredientIds } = dto;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const typeEntities = await this.typeRepo.find({
      where: types.map((t) => ({ name: t })),
    });

    const ingredientEntities = await this.ingredientRepo.findBy({
      id: In(ingredientIds),
    });

    const meal = this.mealRepo.create({
      name,
      videoUrl,
      imageUrl,
      types: typeEntities,
      ingredients: ingredientEntities,
      creator: user,
    });

    return this.mealRepo.save(meal);
  }

  /** Update a meal only if the user owns it */
  async updateUserMeal(userId: number, mealId: number, dto: UpdateMealDTO) {
    const meal = await this.mealRepo.findOne({
      where: { id: mealId },
      relations: { creator: true, types: true, ingredients: true },
    });
    if (!meal) throw new NotFoundException(`Meal ${mealId} not found`);
    if (!meal.creator || meal.creator.id !== userId) {
      throw new ForbiddenException('You can only edit your own meals');
    }

    const { name, videoUrl, imageUrl, types, ingredientIds } = dto;
    if (name !== undefined) meal.name = name;
    if (videoUrl !== undefined) meal.videoUrl = videoUrl;
    if (imageUrl !== undefined) meal.imageUrl = imageUrl;

    if (types) {
      meal.types = await this.typeRepo.find({
        where: types.map((t) => ({ name: t })),
      });
    }
    if (ingredientIds) {
      meal.ingredients = await this.ingredientRepo.find({
        where: { id: In(ingredientIds) },
      });
    }

    return this.mealRepo.save(meal);
  }

  /** Delete a meal only if the user owns it */
  async removeUserMeal(userId: number, mealId: number) {
    const meal = await this.mealRepo.findOne({
      where: { id: mealId },
      relations: { creator: true },
    });
    if (!meal) throw new NotFoundException(`Meal ${mealId} not found`);
    if (!meal.creator || meal.creator.id !== userId) {
      throw new ForbiddenException('You can only delete your own meals');
    }

    return this.mealRepo.remove(meal);
  }
}
