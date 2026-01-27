import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
// import { WeeklyCommitDTO } from './dto/create-weekly-plan.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreatePlanDTO } from './dto/create-plan.dto';
import { DraftPlan } from './model/draft-plan.type';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(PlanEntity)
    private planRepo: Repository<PlanEntity>,
    @InjectRepository(MealEntity)
    private mealRepo: Repository<MealEntity>,
    @InjectRepository(TypeEntity)
    private typeRepo: Repository<TypeEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  private async ensurePlanExists(planId: number): Promise<PlanEntity> {
    const exists = await this.findById(planId);
    if (!exists) {
      throw new NotFoundException(`Plan with ${planId} 不存在`);
    }
    return exists;
  }

  private getNext7Days(): string[] {
    const today = new Date();
    const dates: string[] = [];

    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i); // 从今天开始
      dates.push(nextDate.toISOString().slice(0, 10)); // yyyy-mm-dd
    }

    return dates;
  }

  findById(planId: number) {
    return this.planRepo.findOne({
      where: { id: planId },
    });
  }

  findAll() {
    return this.planRepo.find({
      relations: {
        type: true,
        user: true,
        meal: true,
      },
      order: {
        date: 'DESC',
        type: {
          id: 'ASC',
        },
      },
    });
  }

  async create(plan: CreatePlanDTO) {
    // userId 将来一定要改成 current user
    const { date, mealId, typeId, userId = 1 } = plan;

    // 1. type must exist
    const typeEntity = await this.typeRepo.findOne({
      where: { id: Number(typeId) },
    });
    if (!typeEntity) {
      throw new NotFoundException(`type id ${typeId} 不存在`);
    }

    // 2. meal must exist + load its types
    const mealEntity = await this.mealRepo.findOne({
      where: { id: Number(mealId) },
      relations: {
        types: true, // ✅关键
      },
    });
    if (!mealEntity) {
      throw new NotFoundException(`meal id ${mealId} 不存在`);
    }

    // 3. user must exist
    const userEntity = await this.userRepo.findOne({
      where: { id: Number(userId) },
    });
    if (!userEntity) {
      throw new NotFoundException(`user id ${userId} 不存在`);
    }

    // 4. ✅ restriction check
    const allowed = mealEntity.types.some((t) => t.id === typeEntity.id);

    if (!allowed) {
      throw new BadRequestException(
        `Meal "${mealEntity.name}" 不属于 type "${typeEntity.name}"`,
      );
    }
    const existing = await this.planRepo.findOne({
      where: {
        date,
        type: typeEntity,
        user: userEntity,
      },
    });
    if (existing) {
      throw new ConflictException(
        `For User (${userEntity.username}), Plan already exists for ${date} (${typeEntity.name})`,
      );
    }

    // 5. create plan
    const newPlan = this.planRepo.create({
      date,
      type: typeEntity,
      meal: mealEntity,
      user: userEntity,
    });
    return this.planRepo.save(newPlan);
  }

  async remove(planId: number) {
    const foundPlan = await this.ensurePlanExists(planId);
    // 使用 remove 方法（而不是 delete）以触发 TypeORM 的级联逻辑
    return this.planRepo.remove(foundPlan);
  }

  // ================================
  // Weekly Preview (Draft Only)
  // ================================
  async generateWeeklyPreview(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException(`User ${userId} not found`);
    }

    const dates = this.getNext7Days();
    const mealTypeIds = [1, 2, 3]; // breakfast/lunch/dinner
    const draftPlans: DraftPlan[] = [];

    for (const date of dates) {
      for (const typeId of mealTypeIds) {
        // 1. fetch meals allowed for this type
        const meals = await this.mealRepo
          .createQueryBuilder('meal')
          .leftJoin('meal.types', 'type')
          .where('type.id = :typeId', { typeId })
          .select(['meal.id', 'meal.name'])
          .getMany();
        if (meals.length === 0) {
          throw new BadRequestException(
            `No meals available for type ${typeId}`,
          );
        }

        // 2. random pick
        const randomMeal = meals[Math.floor(Math.random() * meals.length)];
        draftPlans.push({
          date,
          typeId,
          mealId: randomMeal.id,
          mealName: randomMeal.name, // optional for UI preview
        });
      }
    }

    return {
      userId,
      draftPlans,
      total: draftPlans.length,
    };
  }
}
