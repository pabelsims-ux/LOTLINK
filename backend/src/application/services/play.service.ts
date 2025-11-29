import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Play, PlayPayment } from '../../domain/entities/play.entity';
import { PlayRepository, PLAY_REPOSITORY } from '../../domain/repositories/play.repository';
import { PlayStatus, BetType, Currency } from '../../domain/value-objects';
import { CreatePlayDto, PlayResponseDto, GetPlayDto } from '../dtos/play.dto';
import { EventPublisher, EVENT_PUBLISHER } from '../../ports/outgoing/event-publisher.port';
import { PlayCreatedEvent, PlayConfirmedEvent, PlayRejectedEvent } from '../../domain/events';

@Injectable()
export class PlayService {
  constructor(
    @Inject(PLAY_REPOSITORY)
    private readonly playRepository: PlayRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: EventPublisher,
  ) {}

  async createPlay(dto: CreatePlayDto): Promise<PlayResponseDto> {
    // Check for idempotency
    const existingPlay = await this.playRepository.findByRequestId(dto.requestId);
    if (existingPlay) {
      return this.toPlayResponse(existingPlay);
    }

    const payment: PlayPayment = {
      method: dto.payment.method,
      walletTransactionId: dto.payment.walletTransactionId,
      cardLast4: dto.payment.cardLast4,
    };

    const play = new Play({
      requestId: dto.requestId,
      userId: dto.userId,
      lotteryId: dto.lotteryId,
      numbers: dto.numbers,
      betType: dto.betType,
      amount: dto.amount,
      currency: dto.currency,
      payment,
      bancaId: dto.bancaId,
    });

    const savedPlay = await this.playRepository.save(play);

    // Publish event for async processing
    await this.eventPublisher.publish(
      new PlayCreatedEvent(
        savedPlay.id,
        savedPlay.requestId,
        savedPlay.userId,
        savedPlay.lotteryId,
        savedPlay.amount,
      ),
    );

    return this.toPlayResponse(savedPlay);
  }

  async getPlayById(playId: string): Promise<GetPlayDto> {
    const play = await this.playRepository.findById(playId);
    if (!play) {
      throw new NotFoundException(`Play with id ${playId} not found`);
    }
    return this.toGetPlayDto(play);
  }

  async getPlaysByUserId(userId: string, limit = 20, offset = 0): Promise<GetPlayDto[]> {
    const plays = await this.playRepository.findByUserId(userId, limit, offset);
    return plays.map(play => this.toGetPlayDto(play));
  }

  async confirmPlay(playId: string, playIdBanca: string, ticketCode: string): Promise<void> {
    const play = await this.playRepository.findById(playId);
    if (!play) {
      throw new NotFoundException(`Play with id ${playId} not found`);
    }

    play.confirm(playIdBanca, ticketCode);
    await this.playRepository.update(play);

    await this.eventPublisher.publish(
      new PlayConfirmedEvent(play.id, playIdBanca, ticketCode),
    );
  }

  async confirmPlayByRequestId(requestId: string, playIdBanca: string, ticketCode: string): Promise<void> {
    const play = await this.playRepository.findByRequestId(requestId);
    if (!play) {
      throw new NotFoundException(`Play with requestId ${requestId} not found`);
    }

    play.confirm(playIdBanca, ticketCode);
    await this.playRepository.update(play);

    await this.eventPublisher.publish(
      new PlayConfirmedEvent(play.id, playIdBanca, ticketCode),
    );
  }

  async rejectPlay(playId: string, reason?: string): Promise<void> {
    const play = await this.playRepository.findById(playId);
    if (!play) {
      throw new NotFoundException(`Play with id ${playId} not found`);
    }

    play.reject(reason);
    await this.playRepository.update(play);

    await this.eventPublisher.publish(
      new PlayRejectedEvent(play.id, reason),
    );
  }

  async rejectPlayByRequestId(requestId: string, reason?: string): Promise<void> {
    const play = await this.playRepository.findByRequestId(requestId);
    if (!play) {
      throw new NotFoundException(`Play with requestId ${requestId} not found`);
    }

    play.reject(reason);
    await this.playRepository.update(play);

    await this.eventPublisher.publish(
      new PlayRejectedEvent(play.id, reason),
    );
  }

  private toPlayResponse(play: Play): PlayResponseDto {
    const estimatedMs = 30000; // 30 seconds estimation
    const estimatedConfirmation = new Date(Date.now() + estimatedMs).toISOString();

    return {
      playId: play.id,
      status: play.status,
      estimatedConfirmation: play.status === PlayStatus.PENDING ? estimatedConfirmation : undefined,
      ticketCode: play.ticketCode,
      createdAt: play.createdAt,
    };
  }

  private toGetPlayDto(play: Play): GetPlayDto {
    return {
      playId: play.id,
      requestId: play.requestId,
      userId: play.userId,
      lotteryId: play.lotteryId,
      numbers: play.numbers,
      betType: play.betType,
      amount: play.amount,
      currency: play.currency,
      status: play.status,
      playIdBanca: play.playIdBanca,
      ticketCode: play.ticketCode,
      bancaId: play.bancaId,
      createdAt: play.createdAt,
      updatedAt: play.updatedAt,
    };
  }
}
