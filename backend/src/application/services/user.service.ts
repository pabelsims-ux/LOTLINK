import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../domain/entities/user.entity';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';
import { CreateUserDto, ChargeWalletDto, WalletResponseDto } from '../dtos/user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findByPhone(dto.phone);
    if (existingUser) {
      return existingUser;
    }

    const user = new User({
      phone: dto.phone,
      email: dto.email,
      name: dto.name,
    });

    return this.userRepository.save(user);
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return user;
  }

  async chargeWallet(userId: string, dto: ChargeWalletDto): Promise<WalletResponseDto> {
    const user = await this.getUserById(userId);
    
    user.chargeWallet(dto.amount);
    await this.userRepository.update(user);

    return {
      userId: user.id,
      balance: user.walletBalance,
      transactionId: uuidv4(),
      transactionType: 'charge',
      amount: dto.amount,
      timestamp: new Date(),
    };
  }

  async debitWallet(userId: string, amount: number): Promise<WalletResponseDto> {
    const user = await this.getUserById(userId);
    
    user.debitWallet(amount);
    await this.userRepository.update(user);

    return {
      userId: user.id,
      balance: user.walletBalance,
      transactionId: uuidv4(),
      transactionType: 'debit',
      amount,
      timestamp: new Date(),
    };
  }

  async getWalletBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.getUserById(userId);
    return { balance: user.walletBalance };
  }
}
