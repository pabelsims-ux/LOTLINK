import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PlayService } from '../../src/application/services/play.service';
import { PlayRepository, PLAY_REPOSITORY } from '../../src/domain/repositories/play.repository';
import { EventPublisher, EVENT_PUBLISHER } from '../../src/ports/outgoing/event-publisher.port';
import { Play, PlayProps } from '../../src/domain/entities/play.entity';
import { PlayStatus, BetType, Currency } from '../../src/domain/value-objects';
import { CreatePlayDto } from '../../src/application/dtos/play.dto';
import { NotFoundException } from '@nestjs/common';

describe('PlayService', () => {
  let service: PlayService;
  let playRepository: jest.Mocked<PlayRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  const mockPlayRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByRequestId: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
    publishToQueue: jest.fn(),
  };

  const createPlayDto: CreatePlayDto = {
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user_123',
    lotteryId: 'lottoRD_01',
    numbers: ['03', '07', '12'],
    betType: BetType.QUINIELA,
    amount: 50,
    currency: Currency.DOP,
    payment: {
      method: 'wallet',
      walletTransactionId: 'wl_123',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayService,
        {
          provide: PLAY_REPOSITORY,
          useValue: mockPlayRepository,
        },
        {
          provide: EVENT_PUBLISHER,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    service = module.get<PlayService>(PlayService);
    playRepository = module.get(PLAY_REPOSITORY);
    eventPublisher = module.get(EVENT_PUBLISHER);
  });

  describe('createPlay', () => {
    it('should create a new play and return response', async () => {
      playRepository.findByRequestId.mockResolvedValue(null);
      playRepository.save.mockImplementation(async (play: Play) => play);
      eventPublisher.publish.mockResolvedValue(undefined);

      const result = await service.createPlay(createPlayDto);

      expect(result.playId).toBeDefined();
      expect(result.status).toBe(PlayStatus.PENDING);
      expect(playRepository.save).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should return existing play if requestId already exists (idempotency)', async () => {
      const existingPlay = new Play({
        requestId: createPlayDto.requestId,
        userId: createPlayDto.userId,
        lotteryId: createPlayDto.lotteryId,
        numbers: createPlayDto.numbers,
        betType: createPlayDto.betType,
        amount: createPlayDto.amount,
        currency: createPlayDto.currency,
        payment: createPlayDto.payment,
      });

      playRepository.findByRequestId.mockResolvedValue(existingPlay);

      const result = await service.createPlay(createPlayDto);

      expect(result.playId).toBe(existingPlay.id);
      expect(playRepository.save).not.toHaveBeenCalled();
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('getPlayById', () => {
    it('should return play when found', async () => {
      const play = new Play({
        id: 'play-123',
        requestId: createPlayDto.requestId,
        userId: createPlayDto.userId,
        lotteryId: createPlayDto.lotteryId,
        numbers: createPlayDto.numbers,
        betType: createPlayDto.betType,
        amount: createPlayDto.amount,
        currency: createPlayDto.currency,
        payment: createPlayDto.payment,
      });

      playRepository.findById.mockResolvedValue(play);

      const result = await service.getPlayById('play-123');

      expect(result.playId).toBe('play-123');
      expect(result.userId).toBe(createPlayDto.userId);
    });

    it('should throw NotFoundException when play not found', async () => {
      playRepository.findById.mockResolvedValue(null);

      await expect(service.getPlayById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPlaysByUserId', () => {
    it('should return array of plays for user', async () => {
      const plays = [
        new Play({
          requestId: 'req-1',
          userId: 'user_123',
          lotteryId: 'lottoRD_01',
          numbers: ['01'],
          betType: BetType.QUINIELA,
          amount: 25,
          currency: Currency.DOP,
          payment: { method: 'wallet' },
        }),
        new Play({
          requestId: 'req-2',
          userId: 'user_123',
          lotteryId: 'lottoRD_01',
          numbers: ['02'],
          betType: BetType.QUINIELA,
          amount: 50,
          currency: Currency.DOP,
          payment: { method: 'wallet' },
        }),
      ];

      playRepository.findByUserId.mockResolvedValue(plays);

      const result = await service.getPlaysByUserId('user_123', 20, 0);

      expect(result).toHaveLength(2);
      expect(playRepository.findByUserId).toHaveBeenCalledWith('user_123', 20, 0);
    });
  });

  describe('confirmPlay', () => {
    it('should confirm a pending play', async () => {
      const play = new Play({
        id: 'play-123',
        requestId: createPlayDto.requestId,
        userId: createPlayDto.userId,
        lotteryId: createPlayDto.lotteryId,
        numbers: createPlayDto.numbers,
        betType: createPlayDto.betType,
        amount: createPlayDto.amount,
        currency: createPlayDto.currency,
        payment: createPlayDto.payment,
      });

      playRepository.findById.mockResolvedValue(play);
      playRepository.update.mockImplementation(async (p: Play) => p);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.confirmPlay('play-123', 'BANCA-12345', 'TKT-ABC123');

      expect(playRepository.update).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException when play not found', async () => {
      playRepository.findById.mockResolvedValue(null);

      await expect(
        service.confirmPlay('non-existent', 'BANCA-12345', 'TKT-ABC123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectPlay', () => {
    it('should reject a pending play with reason', async () => {
      const play = new Play({
        id: 'play-123',
        requestId: createPlayDto.requestId,
        userId: createPlayDto.userId,
        lotteryId: createPlayDto.lotteryId,
        numbers: createPlayDto.numbers,
        betType: createPlayDto.betType,
        amount: createPlayDto.amount,
        currency: createPlayDto.currency,
        payment: createPlayDto.payment,
      });

      playRepository.findById.mockResolvedValue(play);
      playRepository.update.mockImplementation(async (p: Play) => p);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.rejectPlay('play-123', 'Insufficient funds');

      expect(playRepository.update).toHaveBeenCalled();
      expect(eventPublisher.publish).toHaveBeenCalled();
    });
  });

  describe('confirmPlayByRequestId', () => {
    it('should confirm a play by requestId', async () => {
      const play = new Play({
        id: 'play-123',
        requestId: createPlayDto.requestId,
        userId: createPlayDto.userId,
        lotteryId: createPlayDto.lotteryId,
        numbers: createPlayDto.numbers,
        betType: createPlayDto.betType,
        amount: createPlayDto.amount,
        currency: createPlayDto.currency,
        payment: createPlayDto.payment,
      });

      playRepository.findByRequestId.mockResolvedValue(play);
      playRepository.update.mockImplementation(async (p: Play) => p);
      eventPublisher.publish.mockResolvedValue(undefined);

      await service.confirmPlayByRequestId(
        createPlayDto.requestId,
        'BANCA-12345',
        'TKT-ABC123',
      );

      expect(playRepository.findByRequestId).toHaveBeenCalledWith(
        createPlayDto.requestId,
      );
      expect(playRepository.update).toHaveBeenCalled();
    });
  });
});
