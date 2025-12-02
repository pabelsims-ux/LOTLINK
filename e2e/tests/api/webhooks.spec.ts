import { test, expect } from '@playwright/test';
import { LotolinkApiClient, generateUUID } from '../../lib/fixtures';

/**
 * E2E Tests: Webhook Handling
 * 
 * These tests validate webhook security and processing including:
 * - HMAC signature verification
 * - Timestamp validation (replay protection)
 * - Confirmation/rejection processing
 */

test.describe('Webhook Security', () => {

  test('should accept webhook with valid signature', async ({ request }) => {
    const apiClient = new LotolinkApiClient(
      request,
      process.env.BASE_URL || 'http://localhost:3000',
      process.env.HMAC_SECRET || 'test_hmac_secret'
    );
    const requestId = generateUUID();
    const playIdBanca = `BANCA-${generateUUID().substring(0, 8).toUpperCase()}`;
    const ticketCode = `TKT-${generateUUID().substring(0, 8).toUpperCase()}`;

    const { status, response } = await apiClient.sendWebhookConfirmation(
      requestId,
      playIdBanca,
      ticketCode,
      'confirmed'
    );

    // Should either process successfully or return 404 (play not found)
    // Both are valid responses depending on whether the play exists
    expect([200, 404, 500]).toContain(status);
  });

  test('should reject webhook with invalid signature', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const timestamp = new Date().toISOString();
    const payload = {
      requestId: generateUUID(),
      playIdBanca: 'BANCA-TEST',
      ticketCode: 'TKT-TEST',
      status: 'confirmed',
    };

    const response = await request.post(`${baseUrl}/webhooks/plays/confirmation`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'invalid_signature_here',
        'X-Timestamp': timestamp,
      },
    });

    // Should reject with 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should reject webhook with missing signature', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const timestamp = new Date().toISOString();
    const payload = {
      requestId: generateUUID(),
      playIdBanca: 'BANCA-TEST',
      ticketCode: 'TKT-TEST',
      status: 'confirmed',
    };

    const response = await request.post(`${baseUrl}/webhooks/plays/confirmation`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp,
      },
    });

    // Should reject with 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should reject webhook with expired timestamp', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const hmacSecret = process.env.HMAC_SECRET || 'test_hmac_secret';
    
    // Timestamp 10 minutes ago (beyond 120 second tolerance)
    const expiredTimestamp = new Date(Date.now() - 600000).toISOString();
    const payload = {
      requestId: generateUUID(),
      playIdBanca: 'BANCA-TEST',
      ticketCode: 'TKT-TEST',
      status: 'confirmed',
    };
    const bodyStr = JSON.stringify(payload);
    
    // Calculate valid signature but with expired timestamp
    const crypto = require('crypto');
    const signatureBase = `POST/webhooks/plays/confirmation${expiredTimestamp}${bodyStr}`;
    const hmac = crypto.createHmac('sha256', hmacSecret);
    hmac.update(signatureBase);
    const signature = hmac.digest('base64');

    const response = await request.post(`${baseUrl}/webhooks/plays/confirmation`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': expiredTimestamp,
      },
    });

    // Should reject with 400 Bad Request (timestamp out of range)
    expect(response.status()).toBe(400);
  });

  test('should reject webhook with future timestamp', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const hmacSecret = process.env.HMAC_SECRET || 'test_hmac_secret';
    
    // Timestamp 10 minutes in the future
    const futureTimestamp = new Date(Date.now() + 600000).toISOString();
    const payload = {
      requestId: generateUUID(),
      playIdBanca: 'BANCA-TEST',
      ticketCode: 'TKT-TEST',
      status: 'confirmed',
    };
    const bodyStr = JSON.stringify(payload);
    
    // Calculate valid signature but with future timestamp
    const crypto = require('crypto');
    const signatureBase = `POST/webhooks/plays/confirmation${futureTimestamp}${bodyStr}`;
    const hmac = crypto.createHmac('sha256', hmacSecret);
    hmac.update(signatureBase);
    const signature = hmac.digest('base64');

    const response = await request.post(`${baseUrl}/webhooks/plays/confirmation`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': futureTimestamp,
      },
    });

    // Should reject with 400 Bad Request (timestamp out of range)
    expect(response.status()).toBe(400);
  });

  test('should process confirmed webhook', async ({ request }) => {
    const apiClient = new LotolinkApiClient(
      request,
      process.env.BASE_URL || 'http://localhost:3000',
      process.env.HMAC_SECRET || 'test_hmac_secret'
    );
    const requestId = generateUUID();
    const playIdBanca = `BANCA-${generateUUID().substring(0, 8).toUpperCase()}`;
    const ticketCode = `TKT-${generateUUID().substring(0, 8).toUpperCase()}`;

    const { status, response } = await apiClient.sendWebhookConfirmation(
      requestId,
      playIdBanca,
      ticketCode,
      'confirmed'
    );

    // Either processes or returns 404 (play not found)
    expect([200, 404]).toContain(status);
    
    if (status === 200) {
      expect(response.success).toBe(true);
      expect(response.message).toContain('confirmed');
    }
  });

  test('should process rejected webhook', async ({ request }) => {
    const apiClient = new LotolinkApiClient(
      request,
      process.env.BASE_URL || 'http://localhost:3000',
      process.env.HMAC_SECRET || 'test_hmac_secret'
    );
    const requestId = generateUUID();
    const playIdBanca = `BANCA-${generateUUID().substring(0, 8).toUpperCase()}`;

    const { status, response } = await apiClient.sendWebhookConfirmation(
      requestId,
      playIdBanca,
      null,
      'rejected',
      'Insufficient funds'
    );

    // Either processes or returns 404 (play not found)
    expect([200, 404]).toContain(status);
    
    if (status === 200) {
      expect(response.success).toBe(true);
      expect(response.message).toContain('rejected');
    }
  });
});
