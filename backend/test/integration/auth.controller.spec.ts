import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../../src/infrastructure/http/controllers/auth.controller';
import { UserService } from '../../src/application/services/user.service';
import { User } from '../../src/domain/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = new User({
    id: 'user-123',
    phone: '+18091234567',
    email: 'test@example.com',
    name: 'Test User',
  });

  const mockUserService = {
    createUser: jest.fn(),
    getUserById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-123');

      const result = await controller.register({
        phone: '+18091234567',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result.user.id).toBe('user-123');
      expect(result.user.phone).toBe('+18091234567');
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');
      expect(result.expiresIn).toBe(3600);
    });

    it('should call userService.createUser with correct params', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      await controller.register({
        phone: '+18091234567',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        phone: '+18091234567',
        email: 'test@example.com',
        name: 'Test User',
      });
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      mockUserService.createUser.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-123');

      const result = await controller.login({
        phone: '+18091234567',
      });

      expect(result.user.id).toBe('user-123');
      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-123');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUserService.createUser.mockRejectedValue(new Error('User error'));

      await expect(
        controller.login({
          phone: 'invalid',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        phone: '+18091234567',
        email: 'test@example.com',
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await controller.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(controller.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
