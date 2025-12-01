import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BancaAdapter, BANCA_ADAPTER, BancaPlayRequest } from '../../ports/outgoing/banca-adapter.port';
import { PlayRepository, PLAY_REPOSITORY } from '../../domain/repositories/play.repository';
import { EventPublisher, EVENT_PUBLISHER } from '../../ports/outgoing/event-publisher.port';
import { PlayCreatedEvent, PlayConfirmedEvent, PlayRejectedEvent, DomainEvent } from '../../domain/events';
import { InMemoryEventPublisher } from './in-memory-event-publisher';

/**
 * Worker that processes play events and forwards them to bancas
 */
@Injectable()
export class PlayWorker implements OnModuleInit {
  private readonly logger = new Logger(PlayWorker.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    @Inject(BANCA_ADAPTER)
    private readonly bancaAdapter: BancaAdapter,
    @Inject(PLAY_REPOSITORY)
    private readonly playRepository: PlayRepository,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: EventPublisher,
    private readonly configService: ConfigService,
  ) {
    this.maxRetries = this.configService.get<number>('PLAY_WORKER_MAX_RETRIES', 3);
    this.retryDelayMs = this.configService.get<number>('PLAY_WORKER_RETRY_DELAY_MS', 5000);
  }

  onModuleInit(): void {
    // Subscribe to PlayCreatedEvent if using InMemoryEventPublisher
    if (this.eventPublisher instanceof InMemoryEventPublisher) {
      this.eventPublisher.subscribe('PlayCreatedEvent', this.handlePlayCreated.bind(this));
      this.logger.log('PlayWorker subscribed to PlayCreatedEvent');
    }
  }

  async handlePlayCreated(event: DomainEvent): Promise<void> {
    const playEvent = event as PlayCreatedEvent;
    this.logger.log(`Processing PlayCreatedEvent: ${playEvent.playId}`);

    const play = await this.playRepository.findById(playEvent.playId);
    if (!play) {
      this.logger.error(`Play not found: ${playEvent.playId}`);
      return;
    }

    // Build banca request
    const bancaRequest: BancaPlayRequest = {
      requestId: play.requestId,
      play: {
        lotteryId: play.lotteryId,
        numbers: play.numbers,
        betType: play.betType,
        amount: play.amount,
      },
      payment: {
        method: play.payment.method,
        transactionId: play.payment.walletTransactionId,
      },
      user: {
        userId: play.userId,
      },
    };

    // Try to register with banca with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.log(`Attempt ${attempt}/${this.maxRetries} to register play ${play.id}`);
        const response = await this.bancaAdapter.registerPlay(bancaRequest);

        if (response.status === 'confirmed' || response.status === 'accepted') {
          play.confirm(response.playIdBanca || '', response.ticketCode || '');
          await this.playRepository.update(play);
          
          await this.eventPublisher.publish(
            new PlayConfirmedEvent(play.id, response.playIdBanca || '', response.ticketCode || ''),
          );
          this.logger.log(`Play ${play.id} confirmed by banca`);
          return;
        }

        if (response.status === 'rejected') {
          play.reject(response.message);
          await this.playRepository.update(play);
          
          await this.eventPublisher.publish(
            new PlayRejectedEvent(play.id, response.message),
          );
          this.logger.log(`Play ${play.id} rejected by banca: ${response.message}`);
          return;
        }

        // If pending, wait and retry
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs);
        }
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Error on attempt ${attempt}: ${error}`);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs);
        }
      }
    }

    // All retries failed
    play.fail(lastError?.message || 'Max retries exceeded');
    await this.playRepository.update(play);
    this.logger.error(`Play ${play.id} failed after ${this.maxRetries} attempts`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
