import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UserEntity } from '../entities/user.db-entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async save(user: User): Promise<User> {
    const entity = this.toEntity(user);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { phone } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? this.toDomain(entity) : null;
  }

  async update(user: User): Promise<User> {
    const entity = this.toEntity(user);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.phone = user.phone;
    entity.email = user.email;
    entity.name = user.name;
    entity.walletBalance = user.walletBalance;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    return entity;
  }

  private toDomain(entity: UserEntity): User {
    return new User({
      id: entity.id,
      phone: entity.phone,
      email: entity.email,
      name: entity.name,
      walletBalance: Number(entity.walletBalance),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
