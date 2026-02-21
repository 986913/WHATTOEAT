import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { CreatePlanDTO } from './dto/create-plan.dto';
import { DraftPlan } from './model/draft-plan.type';
import { WeeklyCommitDTO } from './dto/create-weekly-plan.dto';

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
    private dataSource: DataSource,
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

  async findAllGroupedByUser() {
    const plans = await this.planRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.user', 'user')
      .leftJoinAndSelect('plan.type', 'type')
      .leftJoinAndSelect('plan.meal', 'meal')
      .orderBy('user.id', 'ASC')
      .addOrderBy('plan.date', 'DESC')
      .getMany();

    const grouped = new Map<
      number,
      { user: UserEntity; plans: PlanEntity[] }
    >();

    for (const plan of plans) {
      const userId = plan.user.id;
      let group = grouped.get(userId);
      if (!group) {
        group = {
          user: plan.user,
          plans: [],
        };
        grouped.set(userId, group);
      }
      group.plans.push(plan);
    }

    return Array.from(grouped.values());
  }

  findByUser(userId: number) {
    return this.planRepo
      .createQueryBuilder('plan')
      .leftJoinAndSelect('plan.type', 'type')
      .leftJoinAndSelect('plan.meal', 'meal')
      .leftJoinAndSelect('meal.ingredients', 'ingredients')
      .where('plan.user_id = :userId', { userId })
      .orderBy('plan.date', 'DESC')
      .addOrderBy('type.id', 'ASC')
      .getMany();
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

  async commitWeeklyPlans(userId: number, dto: WeeklyCommitDTO) {
    const { plans } = dto;
    if (!plans || plans.length === 0) {
      throw new BadRequestException('No weekly plans provided');
    }

    return await this.dataSource.transaction(async (manager) => {
      /** =========================
     * 1. Resolve user
     ========================= */
      const currUserId = userId ?? plans[0].userId;
      const user = await manager.findOne(UserEntity, {
        where: { id: currUserId },
      });
      if (!user) {
        throw new BadRequestException(`User ${userId} not found`);
      }

      /** =========================
     * 2. Resolve date range
     ========================= */
      const dates = plans.map((p) => p.date).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      /** =========================
     * 3. Replace-week (delete old)
     ========================= */
      await manager
        .createQueryBuilder()
        .delete()
        .from(PlanEntity)
        .where('user_id = :userId', { userId })
        .andWhere('date BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .execute();

      /** =========================
     * 4. Preload types & meals
     ========================= */
      const typeIds = [...new Set(plans.map((p) => p.typeId))];
      const mealIds = [...new Set(plans.map((p) => p.mealId))];

      const types = await manager.find(TypeEntity, {
        where: typeIds.map((id) => ({ id })),
      });

      const meals = await manager.find(MealEntity, {
        where: mealIds.map((id) => ({ id })),
        relations: { types: true },
      });

      const typeMap = new Map(types.map((t) => [t.id, t]));
      const mealMap = new Map(meals.map((m) => [m.id, m]));

      /** =========================
     * 5. Build Plan entities
     ========================= */
      const entities: PlanEntity[] = [];

      for (const p of plans) {
        const type = typeMap.get(p.typeId);
        const meal = mealMap.get(p.mealId);

        if (!type || !meal) {
          throw new BadRequestException(
            `Invalid typeId or mealId (${p.typeId}, ${p.mealId})`,
          );
        }

        // restriction check
        const allowed = meal.types.some((t) => t.id === type.id);
        if (!allowed) {
          throw new BadRequestException(
            `Meal "${meal.name}" not allowed for type "${type.name}"`,
          );
        }

        entities.push(
          manager.create(PlanEntity, {
            date: p.date,
            user,
            type,
            meal,
          }),
        );
      }

      /** =========================
     * 6. Bulk save
     ========================= */
      await manager.save(entities);

      /** =========================
     * 7. Fetch saved plans (for UI)
     ========================= */
      const savedPlans = await manager
        .createQueryBuilder(PlanEntity, 'plan')
        .leftJoinAndSelect('plan.type', 'type')
        .leftJoinAndSelect('plan.meal', 'meal')
        .leftJoinAndSelect('meal.ingredients', 'ingredients') //也就是plan.meal.ingredients
        .where('plan.user_id = :userId', { userId })
        .andWhere('plan.date BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .orderBy('plan.date', 'ASC')
        .addOrderBy('type.id', 'ASC')
        .getMany();

      return {
        count: entities.length,
        plans: savedPlans,
        startDate,
        endDate,
      };
    });
  }
}
