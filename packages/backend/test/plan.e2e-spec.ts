import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PlanController } from '../src/plan/plan.controller';
import { PlanService } from '../src/plan/plan.service';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { JwtAuthenticationGuard } from '../src/guards/jwt.guard';
import { AdminGuard } from '../src/guards/admin.guard';

// ── mock plan service ────────────────────────────────────
const mockPlanService = {
  findAll: jest.fn(),
  findAllGroupedByUser: jest.fn(),
  findByUser: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  generateWeeklyPreview: jest.fn(),
  getRandomReplacementMeal: jest.fn(),
  commitWeeklyPlans: jest.fn(),
};

// ── mock guards ──────────────────────────────────────────
const mockJwtGuard = {
  canActivate: jest.fn((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { userID: 1, userNAME: 'testuser', roles: [], isAdmin: true };
    return true;
  }),
};

const mockAdminGuard = { canActivate: jest.fn(() => true) };

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

describe('PlanController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanController],
      providers: [
        { provide: PlanService, useValue: mockPlanService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: WINSTON_MODULE_NEST_PROVIDER, useValue: mockLogger },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-enable guards by default
    mockJwtGuard.canActivate.mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = { userID: 1, userNAME: 'testuser', roles: [], isAdmin: true };
      return true;
    });
    mockAdminGuard.canActivate.mockReturnValue(true);
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/plans/weekly-preview
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/plans/weekly-preview', () => {
    it('should return draft weekly plan', async () => {
      const draftResult = {
        userId: 1,
        draftPlans: Array.from({ length: 21 }, (_, i) => ({
          date: '2026-03-16',
          typeId: (i % 3) + 1,
          mealId: i + 1,
          mealName: `Meal ${i}`,
        })),
        total: 21,
      };
      mockPlanService.generateWeeklyPreview.mockResolvedValue(draftResult);

      const res = await request(app.getHttpServer())
        .post('/api/v1/plans/weekly-preview')
        .send({ startDate: '2026-03-16' })
        .expect(201);

      expect(res.body.total).toBe(21);
      expect(res.body.draftPlans).toHaveLength(21);
      expect(mockPlanService.generateWeeklyPreview).toHaveBeenCalledWith(
        1,
        '2026-03-16',
      );
    });
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/plans/replace-meal
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/plans/replace-meal', () => {
    it('should return a replacement meal', async () => {
      mockPlanService.getRandomReplacementMeal.mockResolvedValue({
        typeId: 1,
        mealId: 42,
        mealName: 'Replacement Meal',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/plans/replace-meal')
        .send({ typeId: 1, excludeMealId: 5 })
        .expect(201);

      expect(res.body.mealId).toBe(42);
      expect(mockPlanService.getRandomReplacementMeal).toHaveBeenCalledWith(
        1,
        5,
        1,
      );
    });

    it('should return 400 when typeId is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/plans/replace-meal')
        .send({})
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/plans/weekly-commit
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/plans/weekly-commit', () => {
    it('should commit weekly plans', async () => {
      const commitResult = {
        count: 3,
        plans: [],
        startDate: '2026-03-16',
        endDate: '2026-03-22',
      };
      mockPlanService.commitWeeklyPlans.mockResolvedValue(commitResult);

      const res = await request(app.getHttpServer())
        .post('/api/v1/plans/weekly-commit')
        .send({
          plans: [
            { date: '2026-03-16', typeId: 1, mealId: 1 },
            { date: '2026-03-16', typeId: 2, mealId: 2 },
            { date: '2026-03-16', typeId: 3, mealId: 3 },
          ],
        })
        .expect(201);

      expect(res.body.count).toBe(3);
      expect(mockPlanService.commitWeeklyPlans).toHaveBeenCalledWith(1, {
        plans: expect.arrayContaining([
          expect.objectContaining({ date: '2026-03-16', typeId: 1, mealId: 1 }),
        ]),
      });
    });

    it('should return 400 when plans array is empty', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/plans/weekly-commit')
        .send({ plans: [] })
        .expect(400);
    });

    it('should return 400 when plans have invalid data', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/plans/weekly-commit')
        .send({
          plans: [{ date: 'not-a-date', typeId: 'abc', mealId: -1 }],
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────
  // GET /api/v1/plans/me
  // ─────────────────────────────────────────────────
  describe('GET /api/v1/plans/me', () => {
    it('should return user plans with query filters', async () => {
      mockPlanService.findByUser.mockResolvedValue({
        data: [{ id: 1 }],
        total: 1,
        page: 1,
        limit: 10,
      });

      const res = await request(app.getHttpServer())
        .get(
          '/api/v1/plans/me?from=2026-03-01&to=2026-03-31&sort=DESC&page=1&limit=10',
        )
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(mockPlanService.findByUser).toHaveBeenCalledWith(
        1,
        '2026-03-01',
        '2026-03-31',
        'DESC',
        1,
        10,
        undefined,
      );
    });
  });

  // ─────────────────────────────────────────────────
  // GET /api/v1/plans (admin only)
  // ─────────────────────────────────────────────────
  describe('GET /api/v1/plans', () => {
    it('should return all plans for admin', async () => {
      mockPlanService.findAll.mockResolvedValue([{ id: 1 }]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/plans')
        .expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('should return 403 when admin guard rejects', async () => {
      mockAdminGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer()).get('/api/v1/plans').expect(403);
    });
  });

  // ─────────────────────────────────────────────────
  // DELETE /api/v1/plans/:id
  // ─────────────────────────────────────────────────
  describe('DELETE /api/v1/plans/:id', () => {
    it('should delete a plan by id', async () => {
      mockPlanService.remove.mockResolvedValue({ id: 1 });

      await request(app.getHttpServer()).delete('/api/v1/plans/1').expect(200);

      expect(mockPlanService.remove).toHaveBeenCalledWith(1);
    });

    it('should return 400 for non-numeric id', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/plans/abc')
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────
  // Auth guard rejection
  // ─────────────────────────────────────────────────
  describe('Authentication', () => {
    it('should return 403 when JWT guard rejects', async () => {
      mockJwtGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer()).get('/api/v1/plans/me').expect(403);
    });
  });
});
