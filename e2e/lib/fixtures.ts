import { expect, APIRequestContext } from '@playwright/test';
import * as crypto from 'crypto';

/**
 * Test fixtures and helper classes for E2E tests
 */

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

export interface PlayRequest {
  requestId: string;
  userId: string;
  lotteryId: string;
  numbers: string[];
  betType: string;
  amount: number;
  currency: string;
  payment: {
    method: string;
    walletTransactionId?: string;
  };
  bancaId?: string;
}

export interface PlayResponse {
  playId: string;
  status: string;
  estimatedConfirmation?: string;
  ticketCode?: string;
  createdAt: string;
}

/**
 * API Client for Lotolink backend
 */
export class LotolinkApiClient {
  private baseUrl: string;
  private hmacSecret: string;

  constructor(
    private request: APIRequestContext,
    baseUrl: string = 'http://localhost:3000',
    hmacSecret: string = 'test_hmac_secret'
  ) {
    this.baseUrl = baseUrl;
    this.hmacSecret = hmacSecret;
  }

  /**
   * Health check endpoint
   */
  async health(): Promise<{ status: string }> {
    const response = await this.request.get(`${this.baseUrl}/health`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  /**
   * Create a new play
   */
  async createPlay(
    playRequest: PlayRequest,
    token: string,
    idempotencyKey?: string
  ): Promise<{ response: any; status: number }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await this.request.post(`${this.baseUrl}/api/v1/plays`, {
      data: playRequest,
      headers,
    });

    return {
      response: await response.json().catch(() => ({})),
      status: response.status(),
    };
  }

  /**
   * Get play by ID
   */
  async getPlay(playId: string, token: string): Promise<{ response: any; status: number }> {
    const response = await this.request.get(`${this.baseUrl}/api/v1/plays/${playId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      response: await response.json().catch(() => ({})),
      status: response.status(),
    };
  }

  /**
   * Get plays by user ID
   */
  async getPlaysByUser(
    userId: string,
    token: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ response: any; status: number }> {
    const response = await this.request.get(
      `${this.baseUrl}/api/v1/plays/user/${userId}?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return {
      response: await response.json().catch(() => ({})),
      status: response.status(),
    };
  }

  /**
   * Calculate HMAC signature for webhook
   */
  calculateSignature(method: string, path: string, timestamp: string, body: string): string {
    const signatureBase = `${method}${path}${timestamp}${body}`;
    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    hmac.update(signatureBase);
    return hmac.digest('base64');
  }

  /**
   * Send webhook confirmation (simulating Banca callback)
   */
  async sendWebhookConfirmation(
    requestId: string,
    playIdBanca: string,
    ticketCode: string | null,
    status: 'confirmed' | 'rejected',
    reason?: string
  ): Promise<{ response: any; status: number }> {
    const timestamp = new Date().toISOString();
    const payload = {
      requestId,
      playIdBanca,
      ticketCode,
      status,
      reason,
    };
    const bodyStr = JSON.stringify(payload);
    const signature = this.calculateSignature('POST', '/webhooks/plays/confirmation', timestamp, bodyStr);

    const response = await this.request.post(`${this.baseUrl}/webhooks/plays/confirmation`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
    });

    return {
      response: await response.json().catch(() => ({})),
      status: response.status(),
    };
  }
}

/**
 * Mock Banca API Client
 */
export class MockBancaClient {
  constructor(
    private request: APIRequestContext,
    private baseUrl: string = 'http://localhost:4000'
  ) {}

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    const response = await this.request.get(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * Configure mock behavior
   */
  async configure(config: {
    syncResponseRate?: number;
    confirmRate?: number;
    asyncDelayMs?: number;
  }): Promise<void> {
    await this.request.post(`${this.baseUrl}/admin/config`, {
      data: config,
    });
  }

  /**
   * Reset all plays
   */
  async reset(): Promise<void> {
    await this.request.post(`${this.baseUrl}/admin/reset`);
  }

  /**
   * Get all plays
   */
  async getPlays(): Promise<any[]> {
    const response = await this.request.get(`${this.baseUrl}/admin/plays`);
    return response.json();
  }
}

/**
 * Generate random UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate test play request
 */
export function createTestPlayRequest(overrides: Partial<PlayRequest> = {}): PlayRequest {
  return {
    requestId: generateUUID(),
    userId: overrides.userId || 'test_user_123',
    lotteryId: 'lottoRD_01',
    numbers: ['03', '07', '12'],
    betType: 'quiniela',
    amount: 50,
    currency: 'DOP',
    payment: {
      method: 'wallet',
      walletTransactionId: `wl_${generateUUID().substring(0, 8)}`,
    },
    ...overrides,
  };
}

/**
 * Wait helper
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
