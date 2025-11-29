import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Play, PlayPayment } from '../../../domain/entities/play.entity';
import { PlayRepository } from '../../../domain/repositories/play.repository';
import { PlayStatus, BetType, Currency } from '../../../domain/value-objects';
import { PlayEntity } from '../entities/play.db-entity';

@Injectable()
export class TypeOrmPlayRepository implements PlayRepository {
  constructor(
    @InjectRepository(PlayEntity)
    private readonly repository: Repository<PlayEntity>,
  ) {}

  async save(play: Play): Promise<Play> {
    const entity = this.toEntity(play);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Play | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByRequestId(requestId: string): Promise<Play | null> {
    const entity = await this.repository.findOne({ where: { requestId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string, limit = 20, offset = 0): Promise<Play[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return entities.map(e => this.toDomain(e));
  }

  async update(play: Play): Promise<Play> {
    const entity = this.toEntity(play);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  private toEntity(play: Play): PlayEntity {
    const entity = new PlayEntity();
    entity.id = play.id;
    entity.requestId = play.requestId;
    entity.userId = play.userId;
    entity.lotteryId = play.lotteryId;
    entity.numbers = play.numbers;
    entity.betType = play.betType;
    entity.amount = play.amount;
    entity.currency = play.currency;
    entity.paymentData = play.payment;
    entity.status = play.status;
    entity.playIdBanca = play.playIdBanca;
    entity.ticketCode = play.ticketCode;
    entity.bancaId = play.bancaId;
    entity.createdAt = play.createdAt;
    entity.updatedAt = play.updatedAt;
    return entity;
  }

  private toDomain(entity: PlayEntity): Play {
    const payment: PlayPayment = {
      method: entity.paymentData.method as 'wallet' | 'card' | 'bank',
      walletTransactionId: entity.paymentData.walletTransactionId,
      cardLast4: entity.paymentData.cardLast4,
    };

    return new Play({
      id: entity.id,
      requestId: entity.requestId,
      userId: entity.userId,
      lotteryId: entity.lotteryId,
      numbers: entity.numbers,
      betType: entity.betType as BetType,
      amount: Number(entity.amount),
      currency: entity.currency as Currency,
      payment,
      status: entity.status as PlayStatus,
      playIdBanca: entity.playIdBanca,
      ticketCode: entity.ticketCode,
      bancaId: entity.bancaId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
