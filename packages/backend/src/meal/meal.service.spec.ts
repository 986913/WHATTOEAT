import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MealService } from './meal.service';
import { MealEntity } from './entities/meal.entity';
import { TypeEntity } from 'src/type/entities/type.entity';
import { IngredientEntity } from 'src/ingredient/entities/ingredient.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { MealType } from 'src/type/entities/type.entity';
import { SlackService } from 'src/slack/slack.service';

// ── helpers ──────────────────────────────────────────────
function createMockQueryBuilder(resultData: any[] = []) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resultData),
    getManyAndCount: jest
      .fn()
      .mockResolvedValue([resultData, resultData.length]),
  };
}

// ── suite ────────────────────────────────────────────────
describe('MealService', () => {
  let service: MealService;
  let mealRepo: Record<string, jest.Mock>;
  let typeRepo: Record<string, jest.Mock>;
  let ingredientRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let cacheManager: Record<string, jest.Mock>;

  beforeEach(async () => {
    mealRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
      findBy: jest.fn(),
    };
    typeRepo = {
      find: jest.fn(),
    };
    ingredientRepo = {
      findBy: jest.fn(),
      find: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    cacheManager = {
      get: jest.fn().mockResolvedValue(null), // cache miss by default
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MealService,
        { provide: getRepositoryToken(MealEntity), useValue: mealRepo },
        { provide: getRepositoryToken(TypeEntity), useValue: typeRepo },
        {
          provide: getRepositoryToken(IngredientEntity),
          useValue: ingredientRepo,
        },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: SlackService, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service = module.get<MealService>(MealService);
  });

  // ─────────────────────────────────────────────────
  // createUserMeal
  // ─────────────────────────────────────────────────
  describe('createUserMeal', () => {
    it('should create a meal with creator set to the user', async () => {
      const user = { id: 1, username: 'testuser' };
      userRepo.findOne.mockResolvedValue(user);
      typeRepo.find.mockResolvedValue([{ id: 1, name: MealType.BREAKFAST }]);
      ingredientRepo.findBy.mockResolvedValue([{ id: 1, name: 'Oats' }]);

      await service.createUserMeal(1, {
        name: 'Oatmeal',
        videoUrl: 'http://video',
        imageUrl: 'http://image',
        types: [MealType.BREAKFAST],
        ingredientIds: [1],
      });

      expect(mealRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ creator: user }),
      );
      expect(mealRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createUserMeal(999, {
          name: 'Meal',
          videoUrl: '',
          imageUrl: '',
          types: [MealType.BREAKFAST],
          ingredientIds: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────
  // updateUserMeal (ownership check)
  // ─────────────────────────────────────────────────
  describe('updateUserMeal', () => {
    it('should update when user is the owner', async () => {
      const meal = {
        id: 1,
        name: 'Old',
        creator: { id: 1 },
        types: [],
        ingredients: [],
      };
      mealRepo.findOne.mockResolvedValue(meal);

      await service.updateUserMeal(1, 1, { name: 'New' } as any);

      expect(mealRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New' }),
      );
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const meal = { id: 1, creator: { id: 99 }, types: [], ingredients: [] };
      mealRepo.findOne.mockResolvedValue(meal);

      await expect(
        service.updateUserMeal(1, 1, { name: 'New' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when meal has no creator (public meal)', async () => {
      const meal = { id: 1, creator: null, types: [], ingredients: [] };
      mealRepo.findOne.mockResolvedValue(meal);

      await expect(
        service.updateUserMeal(1, 1, { name: 'New' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when meal does not exist', async () => {
      mealRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateUserMeal(1, 999, { name: 'New' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────
  // removeUserMeal (ownership check)
  // ─────────────────────────────────────────────────
  describe('removeUserMeal', () => {
    it('should remove when user is the owner', async () => {
      const meal = { id: 1, creator: { id: 1 } };
      mealRepo.findOne.mockResolvedValue(meal);

      await service.removeUserMeal(1, 1);

      expect(mealRepo.remove).toHaveBeenCalledWith(meal);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const meal = { id: 1, creator: { id: 99 } };
      mealRepo.findOne.mockResolvedValue(meal);

      await expect(service.removeUserMeal(1, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when meal does not exist', async () => {
      mealRepo.findOne.mockResolvedValue(null);

      await expect(service.removeUserMeal(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─────────────────────────────────────────────────
  // findAllMatch (admin listing with pagination)
  // ─────────────────────────────────────────────────
  describe('findAllMatch', () => {
    it('should return paginated results', async () => {
      const meals = [{ id: 1 }, { id: 2 }];
      const qb = createMockQueryBuilder(meals);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllMatch({ page: 1, limit: 10 });

      expect(result.meals).toHaveLength(2);
      expect(result.mealsTotalCount).toBe(2);
      expect(result.currPage).toBe(1);
      expect(result.currLimit).toBe(10);
    });

    it('should filter by type when provided', async () => {
      const qb = createMockQueryBuilder([]);
      mealRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllMatch({ type: MealType.BREAKFAST } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('types.name = :typeName', {
        typeName: MealType.BREAKFAST,
      });
    });
  });

  // ─────────────────────────────────────────────────
  // create (admin)
  // ─────────────────────────────────────────────────
  describe('create', () => {
    it('should create a public meal (no creator)', async () => {
      typeRepo.find.mockResolvedValue([{ id: 1, name: MealType.LUNCH }]);
      ingredientRepo.findBy.mockResolvedValue([{ id: 1, name: 'Chicken' }]);

      await service.create({
        name: 'Chicken Bowl',
        videoUrl: 'http://v',
        imageUrl: 'http://i',
        types: [MealType.LUNCH],
        ingredientIds: [1],
      });

      expect(mealRepo.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ creator: expect.anything() }),
      );
      expect(mealRepo.save).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────
  // remove (admin)
  // ─────────────────────────────────────────────────
  describe('remove', () => {
    it('should remove an existing meal', async () => {
      const meal = { id: 1, types: [], ingredients: [] } as any;
      mealRepo.findOne.mockResolvedValue(meal);

      await service.remove(1);

      expect(mealRepo.remove).toHaveBeenCalledWith(meal);
    });

    it('should throw NotFoundException when meal does not exist', async () => {
      mealRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────
  // Caching behavior
  // ─────────────────────────────────────────────────
  describe('caching', () => {
    it('findOptionsByType should return cached data on cache hit', async () => {
      const cachedOptions = [{ id: 1, name: 'Option' }];
      cacheManager.get.mockResolvedValue(cachedOptions);

      const result = await service.findOptionsByType(1);

      expect(result).toEqual(cachedOptions);
      expect(mealRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('findOptionsByType should query DB and set cache on miss', async () => {
      cacheManager.get.mockResolvedValue(null);
      const dbOptions = [{ id: 1, name: 'Rice Bowl' }];
      mealRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder(dbOptions));

      const result = await service.findOptionsByType(1);

      expect(result).toEqual(dbOptions);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'meals:options:type:1',
        dbOptions,
        expect.any(Number),
      );
    });

    it('should invalidate cache on create', async () => {
      typeRepo.find.mockResolvedValue([{ id: 1, name: MealType.LUNCH }]);
      ingredientRepo.findBy.mockResolvedValue([]);

      await service.create({
        name: 'New',
        videoUrl: '',
        imageUrl: '',
        types: [MealType.LUNCH],
        ingredientIds: [],
      });

      expect(cacheManager.clear).toHaveBeenCalled();
    });

    it('should invalidate cache on remove', async () => {
      const meal = { id: 1, types: [], ingredients: [] } as any;
      mealRepo.findOne.mockResolvedValue(meal);

      await service.remove(1);

      expect(cacheManager.clear).toHaveBeenCalled();
    });
  });
});
