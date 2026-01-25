import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanEntity } from './entities/plan.entity';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { CreatePlanDTO } from './dto/create-plan.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserEntity } from 'src/user/entities/user.entity';

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
}
