import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../src/application/services/user.service';
import { UserRepository, USER_REPOSITORY } from '../../src/domain/repositories/user.repository';
import { User } from '../../src/domain/entities/user.entity';
import { CreateUserDto, ChargeWalletDto } from '../../src/application/dtos/user.dto';
import { NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUserRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByPhone: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(USER_REPOSITORY);
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      phone: '+18091234567',
      email: 'test@example.com',
      name: 'Test User',
    };

    it('should create a new user when phone does not exist', async () => {
      userRepository.findByPhone.mockResolvedValue(null);
      userRepository.save.mockImplementation(async (user: User) => user);

      const result = await service.createUser(createUserDto);

      expect(result.phone).toBe(createUserDto.phone);
      expect(result.email).toBe(createUserDto.email);
      expect(result.name).toBe(createUserDto.name);
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should return existing user if phone already exists (idempotency)', async () => {
      const existingUser = new User({
        phone: createUserDto.phone,
        email: createUserDto.email,
        name: createUserDto.name,
      });

      userRepository.findByPhone.mockResolvedValue(existingUser);

      const result = await service.createUser(createUserDto);

      expect(result.id).toBe(existingUser.id);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const user = new User({
        id: 'user-123',
        phone: '+18091234567',
        name: 'Test User',
      });

      userRepository.findById.mockResolvedValue(user);

      const result = await service.getUserById('user-123');

      expect(result.id).toBe('user-123');
      expect(result.phone).toBe('+18091234567');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('chargeWallet', () => {
    it('should charge wallet and return response', async () => {
      const user = new User({
        id: 'user-123',
        phone: '+18091234567',
        walletBalance: 100,
      });

      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockImplementation(async (u: User) => u);

      const chargeDto: ChargeWalletDto = {
        amount: 50,
        method: 'card',
      };

      const result = await service.chargeWallet('user-123', chargeDto);

      expect(result.userId).toBe('user-123');
      expect(result.balance).toBe(150);
      expect(result.transactionType).toBe('charge');
      expect(result.amount).toBe(50);
      expect(result.transactionId).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const chargeDto: ChargeWalletDto = {
        amount: 50,
        method: 'card',
      };

      await expect(service.chargeWallet('non-existent', chargeDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('debitWallet', () => {
    it('should debit wallet and return response', async () => {
      const user = new User({
        id: 'user-123',
        phone: '+18091234567',
        walletBalance: 100,
      });

      userRepository.findById.mockResolvedValue(user);
      userRepository.update.mockImplementation(async (u: User) => u);

      const result = await service.debitWallet('user-123', 30);

      expect(result.userId).toBe('user-123');
      expect(result.balance).toBe(70);
      expect(result.transactionType).toBe('debit');
      expect(result.amount).toBe(30);
    });

    it('should throw error when insufficient balance', async () => {
      const user = new User({
        id: 'user-123',
        phone: '+18091234567',
        walletBalance: 20,
      });

      userRepository.findById.mockResolvedValue(user);

      await expect(service.debitWallet('user-123', 50)).rejects.toThrow(
        'Insufficient wallet balance',
      );
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance', async () => {
      const user = new User({
        id: 'user-123',
        phone: '+18091234567',
        walletBalance: 150,
      });

      userRepository.findById.mockResolvedValue(user);

      const result = await service.getWalletBalance('user-123');

      expect(result.balance).toBe(150);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.getWalletBalance('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
