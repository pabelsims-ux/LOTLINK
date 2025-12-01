import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../../src/application/services/webhook.service';
import { PlayService } from '../../src/application/services/play.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

describe('WebhookService', () => {
  let service: WebhookService;
  let playService: jest.Mocked<PlayService>;
  let configService: ConfigService;

  const HMAC_SECRET = 'test_hmac_secret';

  const mockPlayService = {
    confirmPlayByRequestId: jest.fn(),
    rejectPlayByRequestId: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      if (key === 'HMAC_SECRET') return HMAC_SECRET;
      if (key === 'HMAC_TIMESTAMP_TOLERANCE_SECONDS') return 120;
      return defaultValue;
    }),
  };

  function calculateSignature(method: string, path: string, timestamp: string, body: string): string {
    const signatureBase = `${method}${path}${timestamp}${body}`;
    const hmac = createHmac('sha256', HMAC_SECRET);
    hmac.update(signatureBase);
    return hmac.digest('base64');
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PlayService,
          useValue: mockPlayService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    playService = module.get(PlayService);
    configService = module.get(ConfigService);
  });

  describe('processPlayConfirmation', () => {
    const createValidDto = (status: 'confirmed' | 'rejected' = 'confirmed') => ({
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      playIdBanca: 'BANCA-12345',
      ticketCode: 'TKT-ABC123',
      status,
      reason: status === 'rejected' ? 'Insufficient funds' : undefined,
    });

    it('should process a confirmed play successfully', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      const timestamp = new Date().toISOString();
      const signature = calculateSignature('POST', '/webhooks/plays/confirmation', timestamp, body);

      mockPlayService.confirmPlayByRequestId.mockResolvedValue(undefined);

      const result = await service.processPlayConfirmation(dto, signature, timestamp, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('confirmed');
      expect(mockPlayService.confirmPlayByRequestId).toHaveBeenCalledWith(
        dto.requestId,
        dto.playIdBanca,
        dto.ticketCode,
      );
    });

    it('should process a rejected play successfully', async () => {
      const dto = createValidDto('rejected');
      const body = JSON.stringify(dto);
      const timestamp = new Date().toISOString();
      const signature = calculateSignature('POST', '/webhooks/plays/confirmation', timestamp, body);

      mockPlayService.rejectPlayByRequestId.mockResolvedValue(undefined);

      const result = await service.processPlayConfirmation(dto, signature, timestamp, body);

      expect(result.success).toBe(true);
      expect(result.message).toContain('rejected');
      expect(mockPlayService.rejectPlayByRequestId).toHaveBeenCalledWith(
        dto.requestId,
        dto.reason,
      );
    });

    it('should reject request with invalid signature', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      const timestamp = new Date().toISOString();
      const invalidSignature = 'invalid_signature_here';

      await expect(
        service.processPlayConfirmation(dto, invalidSignature, timestamp, body),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPlayService.confirmPlayByRequestId).not.toHaveBeenCalled();
    });

    it('should reject request with expired timestamp', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      // Timestamp 10 minutes ago (beyond 120 second tolerance)
      const expiredTimestamp = new Date(Date.now() - 600000).toISOString();
      const signature = calculateSignature('POST', '/webhooks/plays/confirmation', expiredTimestamp, body);

      await expect(
        service.processPlayConfirmation(dto, signature, expiredTimestamp, body),
      ).rejects.toThrow(BadRequestException);

      expect(mockPlayService.confirmPlayByRequestId).not.toHaveBeenCalled();
    });

    it('should reject request with future timestamp beyond tolerance', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      // Timestamp 10 minutes in the future
      const futureTimestamp = new Date(Date.now() + 600000).toISOString();
      const signature = calculateSignature('POST', '/webhooks/plays/confirmation', futureTimestamp, body);

      await expect(
        service.processPlayConfirmation(dto, signature, futureTimestamp, body),
      ).rejects.toThrow(BadRequestException);

      expect(mockPlayService.confirmPlayByRequestId).not.toHaveBeenCalled();
    });

    it('should reject request with signature of different length (timing-safe)', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      const timestamp = new Date().toISOString();
      // Signature with different length
      const shortSignature = 'short';

      await expect(
        service.processPlayConfirmation(dto, shortSignature, timestamp, body),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPlayService.confirmPlayByRequestId).not.toHaveBeenCalled();
    });

    it('should reject request with empty signature', async () => {
      const dto = createValidDto('confirmed');
      const body = JSON.stringify(dto);
      const timestamp = new Date().toISOString();

      await expect(
        service.processPlayConfirmation(dto, '', timestamp, body),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPlayService.confirmPlayByRequestId).not.toHaveBeenCalled();
    });
  });

  describe('calculateSignature', () => {
    it('should calculate correct HMAC signature', () => {
      const method = 'POST';
      const path = '/webhooks/plays/confirmation';
      const timestamp = '2025-01-15T10:00:00Z';
      const body = '{"test":"data"}';

      const signature = service.calculateSignature(method, path, timestamp, body);

      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);

      // Verify it's base64 encoded
      const decoded = Buffer.from(signature, 'base64');
      expect(decoded.length).toBe(32); // SHA-256 produces 32 bytes
    });

    it('should produce different signatures for different inputs', () => {
      const method = 'POST';
      const path = '/webhooks/plays/confirmation';
      const timestamp = '2025-01-15T10:00:00Z';

      const sig1 = service.calculateSignature(method, path, timestamp, '{"a":"1"}');
      const sig2 = service.calculateSignature(method, path, timestamp, '{"a":"2"}');

      expect(sig1).not.toBe(sig2);
    });

    it('should produce same signature for same inputs (deterministic)', () => {
      const method = 'POST';
      const path = '/webhooks/plays/confirmation';
      const timestamp = '2025-01-15T10:00:00Z';
      const body = '{"test":"data"}';

      const sig1 = service.calculateSignature(method, path, timestamp, body);
      const sig2 = service.calculateSignature(method, path, timestamp, body);

      expect(sig1).toBe(sig2);
    });
  });
});
