import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthenticationGuard } from '../src/guards/jwt.guard';

// ── mock auth service ────────────────────────────────────
const mockAuthService = {
  signin: jest.fn(),
  signup: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  getMeProfile: jest.fn(),
  googleLogin: jest.fn(),
};

// ── mock JWT guard (always pass + inject user) ───────────
const mockJwtGuard = {
  canActivate: jest.fn((context) => {
    const req = context.switchToHttp().getRequest();
    req.user = { userID: 1, userNAME: 'testuser', roles: [], isAdmin: false };
    return true;
  }),
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue(mockJwtGuard)
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
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/auth/signin
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/auth/signin', () => {
    it('should return 201 with access_token on valid credentials', async () => {
      mockAuthService.signin.mockResolvedValue({ access_token: 'jwt.token.here' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: 'testuser', password: 'password123' })
        .expect(201);

      expect(res.body).toEqual({ access_token: 'jwt.token.here' });
      expect(mockAuthService.signin).toHaveBeenCalledWith('testuser', 'password123');
    });

    it('should return 400 when username is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({ username: 'testuser' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/auth/signup
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/auth/signup', () => {
    it('should return 201 on successful signup', async () => {
      mockAuthService.signup.mockResolvedValue({ id: 1, username: 'newuser' });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ username: 'newuser', password: 'password123', email: 'new@test.com' })
        .expect(201);

      expect(res.body).toHaveProperty('username', 'newuser');
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ username: 'newuser', password: 'password123' })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────
  // GET /api/v1/auth/me (protected)
  // ─────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      mockAuthService.getMeProfile.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(200);

      expect(res.body).toHaveProperty('username', 'testuser');
    });

    it('should return 403 when JWT guard rejects', async () => {
      mockJwtGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/auth/forgot-password
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return success message', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'A password reset link has been sent to your email.',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ username: 'testuser' })
        .expect(201);

      expect(res.body.message).toContain('reset');
    });
  });

  // ─────────────────────────────────────────────────
  // POST /api/v1/auth/reset-password
  // ─────────────────────────────────────────────────
  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password has been reset successfully',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'valid_token', password: 'new_password123' })
        .expect(201);

      expect(res.body.message).toContain('successfully');
    });
  });
});
