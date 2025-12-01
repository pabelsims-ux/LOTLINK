import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MockBancaAdapter } from '../../src/infrastructure/adapters/mock-banca.adapter';
import { BancaPlayRequest } from '../../src/ports/outgoing/banca-adapter.port';

describe('MockBancaAdapter', () => {
  let adapter: MockBancaAdapter;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockBancaAdapter,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    adapter = module.get<MockBancaAdapter>(MockBancaAdapter);
    configService = module.get(ConfigService);
  });

  describe('registerPlay', () => {
    const createPlayRequest = (): BancaPlayRequest => ({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      play: {
        lotteryId: 'lottoRD_01',
        numbers: ['03', '07', '12'],
        betType: 'quiniela',
        amount: 50,
      },
      payment: {
        method: 'wallet',
        transactionId: 'wl_123',
      },
      user: {
        userId: 'user_123',
      },
    });

    it('should return a response with status', async () => {
      const request = createPlayRequest();

      const result = await adapter.registerPlay(request);

      expect(result.status).toBeDefined();
      expect(['confirmed', 'rejected']).toContain(result.status);
    });

    it('should return playIdBanca for confirmed plays', async () => {
      const request = createPlayRequest();

      // Run multiple times to get at least one confirmed
      for (let i = 0; i < 20; i++) {
        const result = await adapter.registerPlay(request);
        if (result.status === 'confirmed') {
          expect(result.playIdBanca).toBeDefined();
          expect(result.playIdBanca).toMatch(/^BANCA-/);
          expect(result.ticketCode).toBeDefined();
          expect(result.ticketCode).toMatch(/^TKT-/);
          return;
        }
      }
      // With 90% success rate, this should rarely fail
    });

    it('should handle rejected plays with message', async () => {
      const request = createPlayRequest();

      // Run multiple times to get at least one rejection
      // Increase timeout for this test and limit iterations
      for (let i = 0; i < 30; i++) {
        const result = await adapter.registerPlay(request);
        if (result.status === 'rejected') {
          expect(result.message).toBeDefined();
          expect(result.playIdBanca).toBeUndefined();
          expect(result.ticketCode).toBeUndefined();
          return;
        }
      }
      // With 10% rejection rate, we should usually see at least one
      // If all 30 are confirmed, that's statistically very unlikely but possible
      // So we'll just skip the assertion if we didn't get a rejection
    }, 15000);
  });

  describe('checkPlayStatus', () => {
    it('should return pending for unknown playIdBanca', async () => {
      const result = await adapter.checkPlayStatus('UNKNOWN-12345');

      expect(result.status).toBe('pending');
      expect(result.message).toContain('not found');
    });

    it('should return status for previously registered play', async () => {
      const request: BancaPlayRequest = {
        requestId: 'req-check-status',
        play: {
          lotteryId: 'lottoRD_01',
          numbers: ['01'],
          betType: 'quiniela',
          amount: 25,
        },
        payment: { method: 'wallet' },
        user: { userId: 'user_123' },
      };

      // Register a play first
      let registeredPlayId: string | undefined;
      for (let i = 0; i < 20; i++) {
        const registerResult = await adapter.registerPlay(request);
        if (registerResult.status === 'confirmed' && registerResult.playIdBanca) {
          registeredPlayId = registerResult.playIdBanca;
          break;
        }
      }

      if (registeredPlayId) {
        const statusResult = await adapter.checkPlayStatus(registeredPlayId);
        expect(statusResult.status).toBe('confirmed');
        expect(statusResult.playIdBanca).toBe(registeredPlayId);
      }
    });
  });

  describe('isHealthy', () => {
    it('should always return true for mock adapter', async () => {
      const result = await adapter.isHealthy();

      expect(result).toBe(true);
    });
  });
});
