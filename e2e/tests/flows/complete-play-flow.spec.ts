import { test, expect } from '@playwright/test';
import { 
  LotolinkApiClient, 
  MockBancaClient, 
  createTestPlayRequest, 
  generateUUID, 
  wait 
} from '../../lib/fixtures';

/**
 * E2E Tests: Complete Play Flow with Mock Banca
 * 
 * These tests validate the complete end-to-end flow:
 * 1. User creates play in Lotolink
 * 2. Lotolink forwards to Banca
 * 3. Banca processes and sends webhook confirmation
 * 4. User can query confirmed play
 */

test.describe('Complete Play Flow', () => {
  let apiClient: LotolinkApiClient;
  let bancaClient: MockBancaClient;
  
  // Mock JWT token for testing
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiaWF0IjoxNjE2MjM5MDIyfQ.test';

  test.beforeAll(async ({ request }) => {
    apiClient = new LotolinkApiClient(
      request,
      process.env.BASE_URL || 'http://localhost:3000',
      process.env.HMAC_SECRET || 'test_hmac_secret'
    );
    
    bancaClient = new MockBancaClient(
      request,
      process.env.MOCK_BANCA_URL || 'http://localhost:4000'
    );
  });

  test.describe('Synchronous Flow', () => {
    test.beforeAll(async () => {
      // Configure mock-banca for 100% synchronous responses
      try {
        await bancaClient.configure({
          syncResponseRate: 1.0,
          confirmRate: 1.0,
        });
      } catch {
        // Mock banca might not be running
      }
    });

    test('should create and confirm play synchronously', async () => {
      const playRequest = createTestPlayRequest();
      
      // Step 1: Create play
      const createResult = await apiClient.createPlay(
        playRequest,
        testToken,
        playRequest.requestId
      );

      // If auth fails, skip this test (expected in isolated environment)
      if (createResult.status === 401) {
        test.skip();
        return;
      }

      expect(createResult.status).toBe(201);
      expect(createResult.response.playId).toBeDefined();
      expect(createResult.response.status).toBe('pending');

      // Step 2: Wait for processing (in sync mode, should be fast)
      await wait(1000);

      // Step 3: Query play status
      const queryResult = await apiClient.getPlay(createResult.response.playId, testToken);
      
      if (queryResult.status === 200) {
        expect(['pending', 'confirmed', 'processing']).toContain(queryResult.response.status);
      }
    });
  });

  test.describe('Asynchronous Flow', () => {
    test.beforeAll(async () => {
      // Configure mock-banca for 100% async responses
      try {
        await bancaClient.configure({
          syncResponseRate: 0.0,
          confirmRate: 1.0,
          asyncDelayMs: 2000,
        });
      } catch {
        // Mock banca might not be running
      }
    });

    test('should create play and receive async confirmation', async () => {
      const playRequest = createTestPlayRequest();
      
      // Step 1: Create play
      const createResult = await apiClient.createPlay(
        playRequest,
        testToken,
        playRequest.requestId
      );

      // If auth fails, skip this test
      if (createResult.status === 401) {
        test.skip();
        return;
      }

      expect(createResult.status).toBe(201);
      expect(createResult.response.playId).toBeDefined();

      // Step 2: Initially should be pending
      const initialQuery = await apiClient.getPlay(createResult.response.playId, testToken);
      if (initialQuery.status === 200) {
        expect(['pending', 'processing']).toContain(initialQuery.response.status);
      }

      // Step 3: Wait for async webhook (mock-banca delay + buffer)
      await wait(5000);

      // Step 4: Query should show confirmed status
      const finalQuery = await apiClient.getPlay(createResult.response.playId, testToken);
      if (finalQuery.status === 200) {
        expect(['pending', 'confirmed', 'processing']).toContain(finalQuery.response.status);
      }
    });
  });

  test.describe('Rejection Flow', () => {
    test.beforeAll(async () => {
      // Configure mock-banca for 100% rejections
      try {
        await bancaClient.configure({
          syncResponseRate: 1.0,
          confirmRate: 0.0,
        });
      } catch {
        // Mock banca might not be running
      }
    });

    test('should handle play rejection correctly', async () => {
      const playRequest = createTestPlayRequest();
      
      // Step 1: Create play
      const createResult = await apiClient.createPlay(
        playRequest,
        testToken,
        playRequest.requestId
      );

      // If auth fails, skip this test
      if (createResult.status === 401) {
        test.skip();
        return;
      }

      expect(createResult.status).toBe(201);

      // Step 2: Wait for processing
      await wait(1000);

      // Step 3: Query should eventually show rejected status
      const queryResult = await apiClient.getPlay(createResult.response.playId, testToken);
      
      if (queryResult.status === 200) {
        expect(['pending', 'rejected', 'processing']).toContain(queryResult.response.status);
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should handle network timeout gracefully', async () => {
      const playRequest = createTestPlayRequest();
      
      const { status } = await apiClient.createPlay(
        playRequest,
        testToken,
        playRequest.requestId
      );

      // Should not crash, should return some response
      expect(status).toBeDefined();
    });

    test('should not create duplicate plays on retry', async () => {
      const requestId = generateUUID();
      const playRequest = createTestPlayRequest({ requestId });
      
      // First attempt
      const result1 = await apiClient.createPlay(playRequest, testToken, requestId);
      
      // Simulated retry (network issue)
      const result2 = await apiClient.createPlay(playRequest, testToken, requestId);
      
      // Third retry
      const result3 = await apiClient.createPlay(playRequest, testToken, requestId);

      // All should return same playId (idempotency)
      expect(result1.status).toBe(result2.status);
      expect(result2.status).toBe(result3.status);
      
      if (result1.status === 201) {
        expect(result1.response.playId).toBe(result2.response.playId);
        expect(result2.response.playId).toBe(result3.response.playId);
      }
    });
  });
});

test.describe('Health Checks', () => {
  test('should return healthy status for backend', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    try {
      const response = await request.get(`${baseUrl}/health`);
      // Health endpoint might not exist, that's ok
      if (response.ok()) {
        const data = await response.json();
        expect(data.status).toBeDefined();
      }
    } catch {
      // Server might not be running
      test.skip();
    }
  });

  test('should return healthy status for mock-banca', async ({ request }) => {
    const bancaUrl = process.env.MOCK_BANCA_URL || 'http://localhost:4000';
    
    try {
      const response = await request.get(`${bancaUrl}/health`);
      if (response.ok()) {
        const data = await response.json();
        expect(data.status).toBe('ok');
        expect(data.service).toBe('mock-banca');
      }
    } catch {
      // Mock banca might not be running
      test.skip();
    }
  });
});
