import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PlanService } from './plan.service';
import { PlanEntity } from './entities/plan.entity';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { MealType } from 'src/type/entities/type.entity';

// ── helpers ──────────────────────────────────────────────
function makeMeal(overrides: Partial<MealEntity> = {}): MealEntity {
  return {
    id: 1,
    name: 'Test Meal',
    videoUrl: 'http://video.url',
    imageUrl: 'http://image.url',
    creator: undefined,
    types: [],
    ingredients: [],
    plans: [],
    ...overrides,
  } as MealEntity;
}

function makeType(overrides: Partial<TypeEntity> = {}): TypeEntity {
  return {
    id: 1,
    name: MealType.BREAKFAST,
    meals: [],
    plans: [],
    ...overrides,
  } as TypeEntity;
}

function makeUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 1,
    username: 'testuser',
    password: 'hashed',
    googleId: null,
    email: 'test@test.com',
    resetPasswordToken: null,
    resetPasswordExpires: null,
    profile: null,
    logs: [],
    plans: [],
    roles: [],
    ...overrides,
  } as UserEntity;
}

// ── mock query builder ───────────────────────────────────
function createMockQueryBuilder(resultData: any[] = []) {
  const qb = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resultData),
    getManyAndCount: jest.fn().mockResolvedValue([resultData, resultData.length]),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return qb;
}

// ── suite ────────────────────────────────────────────────
describe('PlanService', () => {
  let service: PlanService;
  let planRepo: Record<string, jest.Mock>;
  let mealRepo: Record<string, jest.Mock>;
  let typeRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  beforeEach(async () => {
    planRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };
    mealRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    typeRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        { provide: getRepositoryToken(PlanEntity), useValue: planRepo },
        { provide: getRepositoryToken(MealEntity), useValue: mealRepo },
        { provide: getRepositoryToken(TypeEntity), useValue: typeRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PlanService>(PlanService);
  });

  // ─────────────────────────────────────────────────
  // generateWeeklyPreview
  // ─────────────────────────────────────────────────
  describe('generateWeeklyPreview', () => {
    it('should return 21 draft plans (7 days x 3 meal types)', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);

      const meals = [
        makeMeal({ id: 1, name: 'Oatmeal', ingredients: [{ id: 1, name: 'Oats' }] as any }),
        makeMeal({ id: 2, name: 'Pancakes', ingredients: [{ id: 2, name: 'Flour' }] as any }),
      ];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateWeeklyPreview(1, '2026-03-16');

      expect(result.userId).toBe(1);
      expect(result.total).toBe(21);
      expect(result.draftPlans).toHaveLength(21);
      // 7 unique dates
      const dates = [...new Set(result.draftPlans.map((p) => p.date))];
      expect(dates).toHaveLength(7);
      // each date has 3 type slots
      for (const date of dates) {
        const slots = result.draftPlans.filter((p) => p.date === date);
        expect(slots).toHaveLength(3);
        expect(slots.map((s) => s.typeId).sort()).toEqual([1, 2, 3]);
      }
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.generateWeeklyPreview(999)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if no meals available for a type', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      const qb = createMockQueryBuilder([]);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.generateWeeklyPreview(1, '2026-03-16'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark isOwnMeal=true when meal has a creator', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const creator = makeUser({ id: 1 });
      const meals = [makeMeal({ id: 1, creator })];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateWeeklyPreview(1, '2026-03-16');
      expect(result.draftPlans.every((p) => p.isOwnMeal === true)).toBe(true);
    });

    it('should mark isOwnMeal=false when meal has no creator', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const meals = [makeMeal({ id: 1, creator: undefined })];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.generateWeeklyPreview(1, '2026-03-16');
      expect(result.draftPlans.every((p) => p.isOwnMeal === false)).toBe(true);
    });

    it('should generate consecutive dates starting from the given startDate', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      const meals = [makeMeal()];
      mealRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(meals));

      const result = await service.generateWeeklyPreview(1, '2026-01-01');
      const dates = [...new Set(result.draftPlans.map((p) => p.date))].sort();
      expect(dates).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
        '2026-01-05',
        '2026-01-06',
        '2026-01-07',
      ]);
    });
  });

  // ─────────────────────────────────────────────────
  // getRandomReplacementMeal
  // ─────────────────────────────────────────────────
  describe('getRandomReplacementMeal', () => {
    it('should return a meal for the given typeId', async () => {
      const meals = [
        makeMeal({ id: 5, name: 'Salad', ingredients: [{ id: 3, name: 'Lettuce' }] as any }),
      ];
      mealRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(meals));

      const result = await service.getRandomReplacementMeal(2);

      expect(result.typeId).toBe(2);
      expect(result.mealId).toBe(5);
      expect(result.mealName).toBe('Salad');
    });

    it('should exclude the specified meal', async () => {
      const meals = [makeMeal({ id: 10 })];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRandomReplacementMeal(1, 5);

      // verify andWhere was called with excludeMealId
      expect(qb.andWhere).toHaveBeenCalledWith(
        'meal.id != :excludeMealId',
        { excludeMealId: 5 },
      );
    });

    it('should filter by userId when provided', async () => {
      const meals = [makeMeal({ id: 10 })];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getRandomReplacementMeal(1, undefined, 42);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(meal.creator_id IS NULL OR meal.creator_id = :userId)',
        { userId: 42 },
      );
    });

    it('should throw BadRequestException when no meals available', async () => {
      mealRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]));

      await expect(service.getRandomReplacementMeal(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not have a date field in the result', async () => {
      const meals = [makeMeal({ id: 1 })];
      mealRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(meals));

      const result = await service.getRandomReplacementMeal(1);

      expect(result).not.toHaveProperty('date');
      expect(result).toHaveProperty('typeId');
      expect(result).toHaveProperty('mealId');
    });
  });

  // ─────────────────────────────────────────────────
  // create (single plan)
  // ─────────────────────────────────────────────────
  describe('create', () => {
    const breakfast = makeType({ id: 1, name: MealType.BREAKFAST });
    const meal = makeMeal({ id: 1, types: [breakfast] });
    const user = makeUser({ id: 1 });

    it('should create a plan when all validations pass', async () => {
      typeRepo.findOne.mockResolvedValue(breakfast);
      mealRepo.findOne.mockResolvedValue(meal);
      userRepo.findOne.mockResolvedValue(user);
      planRepo.findOne.mockResolvedValue(null); // no existing plan

      await service.create({
        date: '2026-03-16',
        typeId: 1,
        mealId: 1,
        userId: 1,
      });

      expect(planRepo.create).toHaveBeenCalled();
      expect(planRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when type does not exist', async () => {
      typeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ date: '2026-03-16', typeId: 999, mealId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when meal does not exist', async () => {
      typeRepo.findOne.mockResolvedValue(breakfast);
      mealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ date: '2026-03-16', typeId: 1, mealId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      typeRepo.findOne.mockResolvedValue(breakfast);
      mealRepo.findOne.mockResolvedValue(meal);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ date: '2026-03-16', typeId: 1, mealId: 1, userId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when meal type restriction fails', async () => {
      const dinner = makeType({ id: 3, name: MealType.DINNER });
      const breakfastOnlyMeal = makeMeal({ id: 1, types: [breakfast] });

      typeRepo.findOne.mockResolvedValue(dinner); // trying to assign as dinner
      mealRepo.findOne.mockResolvedValue(breakfastOnlyMeal); // but meal is breakfast-only
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.create({ date: '2026-03-16', typeId: 3, mealId: 1, userId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when plan already exists for that slot', async () => {
      typeRepo.findOne.mockResolvedValue(breakfast);
      mealRepo.findOne.mockResolvedValue(meal);
      userRepo.findOne.mockResolvedValue(user);
      planRepo.findOne.mockResolvedValue({ id: 99 }); // existing plan

      await expect(
        service.create({ date: '2026-03-16', typeId: 1, mealId: 1, userId: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────
  // commitWeeklyPlans
  // ─────────────────────────────────────────────────
  describe('commitWeeklyPlans', () => {
    it('should throw BadRequestException when plans array is empty', async () => {
      await expect(
        service.commitWeeklyPlans(1, { plans: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute within a transaction', async () => {
      const breakfast = makeType({ id: 1, name: MealType.BREAKFAST });
      const meal = makeMeal({ id: 1, types: [breakfast] });
      const user = makeUser({ id: 1 });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(user),
        find: jest.fn()
          .mockResolvedValueOnce([breakfast]) // types
          .mockResolvedValueOnce([meal]),      // meals
        createQueryBuilder: jest.fn(),
        create: jest.fn((_, data) => data),
        save: jest.fn().mockResolvedValue([]),
      };
      const savedQb = createMockQueryBuilder([]);
      mockManager.createQueryBuilder
        .mockReturnValueOnce({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        })
        .mockReturnValueOnce(savedQb);

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      const result = await service.commitWeeklyPlans(1, {
        plans: [
          { date: '2026-03-16', typeId: 1, mealId: 1 },
        ],
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid typeId or mealId', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValue(makeUser()),
        find: jest.fn()
          .mockResolvedValueOnce([]) // no matching types
          .mockResolvedValueOnce([]), // no matching meals
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
        create: jest.fn((_, data) => data),
        save: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      await expect(
        service.commitWeeklyPlans(1, {
          plans: [{ date: '2026-03-16', typeId: 999, mealId: 999 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for meal-type restriction violation', async () => {
      const breakfast = makeType({ id: 1, name: MealType.BREAKFAST });
      const dinner = makeType({ id: 3, name: MealType.DINNER });
      const breakfastOnlyMeal = makeMeal({ id: 1, types: [breakfast] });

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(makeUser()),
        find: jest.fn()
          .mockResolvedValueOnce([dinner])             // requested type = dinner
          .mockResolvedValueOnce([breakfastOnlyMeal]), // but meal only supports breakfast
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        }),
        create: jest.fn((_, data) => data),
        save: jest.fn(),
      };

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      await expect(
        service.commitWeeklyPlans(1, {
          plans: [{ date: '2026-03-16', typeId: 3, mealId: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete old plans in the date range before inserting', async () => {
      const breakfast = makeType({ id: 1, name: MealType.BREAKFAST });
      const meal = makeMeal({ id: 1, types: [breakfast] });

      const deleteQb = {
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      const selectQb = createMockQueryBuilder([]);

      const mockManager = {
        findOne: jest.fn().mockResolvedValue(makeUser()),
        find: jest.fn()
          .mockResolvedValueOnce([breakfast])
          .mockResolvedValueOnce([meal]),
        createQueryBuilder: jest.fn()
          .mockReturnValueOnce(deleteQb)
          .mockReturnValueOnce(selectQb),
        create: jest.fn((_, data) => data),
        save: jest.fn().mockResolvedValue([]),
      };

      dataSource.transaction.mockImplementation(async (cb) => cb(mockManager));

      await service.commitWeeklyPlans(1, {
        plans: [{ date: '2026-03-16', typeId: 1, mealId: 1 }],
      });

      expect(deleteQb.delete).toHaveBeenCalled();
      expect(deleteQb.execute).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────
  // remove
  // ─────────────────────────────────────────────────
  describe('remove', () => {
    it('should remove an existing plan', async () => {
      const plan = { id: 1 } as PlanEntity;
      planRepo.findOne.mockResolvedValue(plan);

      await service.remove(1);

      expect(planRepo.remove).toHaveBeenCalledWith(plan);
    });

    it('should throw NotFoundException when plan does not exist', async () => {
      planRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────
  // findByUser
  // ─────────────────────────────────────────────────
  describe('findByUser', () => {
    it('should return paginated results when page and limit are provided', async () => {
      const plans = [{ id: 1, meal: { creator: null } }] as any[];
      const qb = createMockQueryBuilder(plans);
      planRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByUser(1, undefined, undefined, 'DESC', 1, 10);

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
    });

    it('should apply date range filters', async () => {
      const qb = createMockQueryBuilder([]);
      planRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findByUser(1, '2026-01-01', '2026-01-31');

      expect(qb.andWhere).toHaveBeenCalledWith('plan.date >= :from', { from: '2026-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('plan.date <= :to', { to: '2026-01-31' });
    });

    it('should apply meal name filter', async () => {
      const qb = createMockQueryBuilder([]);
      planRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findByUser(1, undefined, undefined, undefined, undefined, undefined, 'chicken');

      expect(qb.andWhere).toHaveBeenCalledWith('meal.name LIKE :mealName', {
        mealName: '%chicken%',
      });
    });
  });
});
