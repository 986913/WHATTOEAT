import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { LogService } from 'src/log/log.service';

// ── helpers ──────────────────────────────────────────────
function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    username: 'testuser',
    password: 'hashed',
    email: 'test@test.com',
    roles: [],
    profile: null,
    ...overrides,
  };
}

// ── suite ────────────────────────────────────────────────
describe('UserService', () => {
  let service: UserService;
  let userRepo: Record<string, jest.Mock>;
  let logService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userRepo = {
      findById: jest.fn(),
      findByUserName: jest.fn(),
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      findByResetToken: jest.fn(),
      findUserProfile: jest.fn(),
      findUsersWithFilters: jest.fn(),
      createAndSave: jest.fn(),
      deepUpdate: jest.fn(),
      removeUser: jest.fn(),
      saveResetToken: jest.fn(),
      resetPassword: jest.fn(),
      update: jest.fn(),
    };
    logService = {
      findUserLogs: jest.fn(),
      getUserLogStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepo },
        { provide: LogService, useValue: logService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // ─────────────────────────────────────────────────
  // Delegating methods
  // ─────────────────────────────────────────────────
  describe('findByUserName', () => {
    it('should delegate to repository', async () => {
      const user = makeUser();
      userRepo.findByUserName.mockResolvedValue(user);

      const result = await service.findByUserName('testuser');

      expect(userRepo.findByUserName).toHaveBeenCalledWith('testuser');
      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should delegate to repository', async () => {
      const user = makeUser();
      userRepo.findById.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(userRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });
  });

  // ─────────────────────────────────────────────────
  // ensureUserExists (tested through remove/findProfile/findLogs)
  // ─────────────────────────────────────────────────
  describe('remove', () => {
    it('should remove an existing user', async () => {
      const user = makeUser();
      userRepo.findById.mockResolvedValue(user);

      await service.remove(1);

      expect(userRepo.removeUser).toHaveBeenCalledWith(user);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findProfile', () => {
    it('should return user profile when user exists', async () => {
      const user = makeUser();
      userRepo.findById.mockResolvedValue(user);
      userRepo.findUserProfile.mockResolvedValue(user);

      const result = await service.findProfile(1);

      expect(userRepo.findUserProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.findProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLogs', () => {
    it('should return logs when user exists', async () => {
      userRepo.findById.mockResolvedValue(makeUser());
      logService.findUserLogs.mockResolvedValue([{ id: 1 }]);

      const result = await service.findLogs(1);

      expect(logService.findUserLogs).toHaveBeenCalledWith(1);
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepo.findById.mockResolvedValue(null);

      await expect(service.findLogs(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users with correct structure', async () => {
      userRepo.findUsersWithFilters.mockResolvedValue({
        data: [makeUser()],
        total: 1,
      });

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(result).toEqual({
        users: [expect.any(Object)],
        usersTotalCount: 1,
        currPage: 1,
        currLimit: 10,
      });
    });
  });

  describe('create', () => {
    it('should delegate to repository', async () => {
      userRepo.createAndSave.mockResolvedValue(makeUser());

      await service.create({
        username: 'new',
        password: 'pw',
        email: 'e@e.com',
      } as any);

      expect(userRepo.createAndSave).toHaveBeenCalledWith({
        username: 'new',
        password: 'pw',
        email: 'e@e.com',
      });
    });
  });

  describe('bindGoogleId', () => {
    it('should delegate to repository update', async () => {
      await service.bindGoogleId(1, 'google123');

      expect(userRepo.update).toHaveBeenCalledWith(1, {
        googleId: 'google123',
      });
    });
  });
});
