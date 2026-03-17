import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { UserService } from 'src/user/user.service';
import { MailService } from 'src/mail/mail.service';
import { SlackService } from 'src/slack/slack.service';

// ── helpers ──────────────────────────────────────────────
function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    username: 'testuser',
    password: 'hashed_password',
    googleId: null,
    email: 'test@test.com',
    resetPasswordToken: null,
    resetPasswordExpires: null,
    roles: [{ id: 2, roleName: 'user' }],
    ...overrides,
  };
}

function makeAdminUser(overrides: Record<string, any> = {}) {
  return makeUser({
    roles: [{ id: 1, roleName: 'admin' }],
    ...overrides,
  });
}

// ── suite ────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;
  let userService: Record<string, jest.Mock>;
  let mailService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userService = {
      findByUserName: jest.fn(),
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByResetToken: jest.fn(),
      create: jest.fn(),
      saveResetToken: jest.fn(),
      resetPassword: jest.fn(),
      bindGoogleId: jest.fn(),
    };

    mailService = {
      sendPasswordResetEmail: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: MailService, useValue: mailService },
        { provide: SlackService, useValue: { notify: jest.fn() } },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─────────────────────────────────────────────────
  // signin
  // ─────────────────────────────────────────────────
  describe('signin', () => {
    it('should return access_token when credentials are valid', async () => {
      const hashedPw = await argon2.hash('correct_password');
      const user = makeUser({ password: hashedPw });
      userService.findByUserName.mockResolvedValue(user);

      const result = await service.signin('testuser', 'correct_password');

      expect(result).toEqual({ access_token: 'mock.jwt.token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 1,
          username: 'testuser',
        }),
      );
    });

    it('should set isAdmin=true when user has admin role', async () => {
      const hashedPw = await argon2.hash('password');
      const admin = makeAdminUser({ password: hashedPw });
      userService.findByUserName.mockResolvedValue(admin);

      await service.signin('testuser', 'password');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: true }),
      );
    });

    it('should set isAdmin=false for non-admin users', async () => {
      const hashedPw = await argon2.hash('password');
      const user = makeUser({ password: hashedPw });
      userService.findByUserName.mockResolvedValue(user);

      await service.signin('testuser', 'password');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ isAdmin: false }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userService.findByUserName.mockResolvedValue(null);

      await expect(service.signin('nobody', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for Google-only user (no password)', async () => {
      const googleUser = makeUser({ password: null, googleId: 'google123' });
      userService.findByUserName.mockResolvedValue(googleUser);

      await expect(service.signin('testuser', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const hashedPw = await argon2.hash('correct_password');
      userService.findByUserName.mockResolvedValue(
        makeUser({ password: hashedPw }),
      );

      await expect(
        service.signin('testuser', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────────
  // signup
  // ─────────────────────────────────────────────────
  describe('signup', () => {
    it('should create a new user when username is available', async () => {
      userService.findByUserName.mockResolvedValue(null);
      userService.create.mockResolvedValue(makeUser());

      const result = await service.signup(
        'newuser',
        'password',
        'new@test.com',
      );

      expect(userService.create).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password',
        email: 'new@test.com',
      });
      expect(result).toBeDefined();
    });

    it('should return ForbiddenException when username already exists', async () => {
      userService.findByUserName.mockResolvedValue(makeUser());

      const result = await service.signup(
        'testuser',
        'password',
        'email@test.com',
      );

      expect(result).toBeInstanceOf(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────
  // forgotPassword
  // ─────────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should send reset email when user has email', async () => {
      userService.findByUserName.mockResolvedValue(
        makeUser({ email: 'user@test.com' }),
      );
      mailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.forgotPassword('testuser');

      expect(userService.saveResetToken).toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@test.com',
        'testuser',
        expect.any(String), // reset token
        expect.any(String), // frontend url
      );
      expect(result.message).toContain('sent to your email');
    });

    it('should return token directly when email sending fails (dev mode)', async () => {
      userService.findByUserName.mockResolvedValue(
        makeUser({ email: 'user@test.com' }),
      );
      mailService.sendPasswordResetEmail.mockResolvedValue(false);

      const result = await service.forgotPassword('testuser');

      expect(result).toHaveProperty('resetToken');
    });

    it('should throw BadRequestException when user not found', async () => {
      userService.findByUserName.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for Google-only user', async () => {
      userService.findByUserName.mockResolvedValue(
        makeUser({ googleId: 'google123', password: null }),
      );

      await expect(service.forgotPassword('testuser')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when user has no email', async () => {
      userService.findByUserName.mockResolvedValue(makeUser({ email: null }));

      await expect(service.forgotPassword('testuser')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────────────
  // resetPassword
  // ─────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset password when token is valid and not expired', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      userService.findByResetToken.mockResolvedValue(
        makeUser({ resetPasswordExpires: futureDate }),
      );

      const result = await service.resetPassword('valid_token', 'new_password');

      expect(userService.resetPassword).toHaveBeenCalledWith(
        1,
        expect.any(String), // argon2 hashed password
      );
      expect(result.message).toContain('successfully');
    });

    it('should throw BadRequestException when token is invalid', async () => {
      userService.findByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('bad_token', 'new_password'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000);
      userService.findByResetToken.mockResolvedValue(
        makeUser({ resetPasswordExpires: pastDate }),
      );

      await expect(
        service.resetPassword('expired_token', 'new_password'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────
  // googleLogin
  // ─────────────────────────────────────────────────
  describe('googleLogin', () => {
    const googleUser = {
      googleId: 'google123',
      displayName: 'Test User',
      email: 'google@test.com',
      photo: 'http://photo.url',
    };

    it('should return token for existing user (by googleId)', async () => {
      const existingUser = makeUser({ googleId: 'google123' });
      userService.findByGoogleId.mockResolvedValue(existingUser);

      const result = await service.googleLogin(googleUser);

      expect(result).toEqual({ access_token: 'mock.jwt.token' });
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should bind googleId to existing email user', async () => {
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(
        makeUser({ id: 5, email: 'google@test.com' }),
      );

      await service.googleLogin(googleUser);

      expect(userService.bindGoogleId).toHaveBeenCalledWith(5, 'google123');
    });

    it('should create new user when no existing account', async () => {
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUserName.mockResolvedValue(null); // username not taken
      userService.create.mockResolvedValue(makeUser({ id: 10 }));
      userService.findById.mockResolvedValue(makeUser({ id: 10 }));

      await service.googleLogin(googleUser);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'Test User',
          googleId: 'google123',
          email: 'google@test.com',
        }),
      );
    });

    it('should append suffix when displayName is already taken', async () => {
      userService.findByGoogleId.mockResolvedValue(null);
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUserName.mockResolvedValue(makeUser()); // username taken
      userService.create.mockResolvedValue(makeUser({ id: 10 }));
      userService.findById.mockResolvedValue(makeUser({ id: 10 }));

      await service.googleLogin(googleUser);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: expect.stringMatching(/^Test User_/) as unknown as string,
          googleId: 'google123',
          email: 'google@test.com',
        }),
      );
    });

    it('should throw UnauthorizedException when Google account has no email', async () => {
      await expect(
        service.googleLogin({ ...googleUser, email: undefined }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────────
  // getMeProfile
  // ─────────────────────────────────────────────────
  describe('getMeProfile', () => {
    it('should return user profile by ID from token', async () => {
      const user = makeUser();
      userService.findById.mockResolvedValue(user);

      const result = await service.getMeProfile({
        userID: 1,
        userNAME: 'testuser',
        roles: [],
        isAdmin: false,
      });

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });
  });
});
