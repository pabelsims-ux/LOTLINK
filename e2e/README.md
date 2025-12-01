# Lotolink E2E Tests

End-to-end tests for the Lotolink platform using Playwright.

## Overview

These tests validate the complete system functionality including:

- **API Tests**: REST API endpoint testing for plays, webhooks, and authentication
- **Flow Tests**: Complete end-to-end flows with mock-banca integration

## Prerequisites

- Node.js 18+
- Running backend (localhost:3000 by default)
- Running mock-banca (localhost:4000 by default)

## Installation

```bash
cd e2e
npm install
npx playwright install --with-deps chromium
```

## Running Tests

### All Tests
```bash
npm test
```

### API Tests Only
```bash
npx playwright test --project=api-tests
```

### Flow Tests Only
```bash
npx playwright test --project=e2e-flows
```

### With UI Mode (Interactive)
```bash
npm run test:ui
```

### View Report
```bash
npm run test:report
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Lotolink backend URL |
| `MOCK_BANCA_URL` | `http://localhost:4000` | Mock Banca URL |
| `HMAC_SECRET` | `test_hmac_secret` | HMAC secret for webhook signatures |
| `JWT_TOKEN` | (mock token) | JWT token for authentication |

## Test Structure

```
e2e/
├── tests/
│   ├── api/                  # API endpoint tests
│   │   ├── plays.spec.ts     # Play creation and query tests
│   │   └── webhooks.spec.ts  # Webhook security tests
│   └── flows/                # End-to-end flow tests
│       └── complete-play-flow.spec.ts
├── lib/
│   └── fixtures.ts           # Test utilities and API clients
├── playwright.config.ts      # Playwright configuration
└── package.json
```

## Test Categories

### 1. Play Creation API Tests (`plays.spec.ts`)
- Create new plays
- Idempotency guarantees
- Authentication requirements
- Concurrent request handling

### 2. Webhook Security Tests (`webhooks.spec.ts`)
- Valid signature acceptance
- Invalid signature rejection
- Missing signature rejection
- Expired timestamp rejection
- Future timestamp rejection
- Confirmed/rejected webhook processing

### 3. Complete Flow Tests (`complete-play-flow.spec.ts`)
- Synchronous play confirmation
- Asynchronous play confirmation with webhooks
- Play rejection handling
- Error recovery and retry scenarios
- Health check validation

## CI/CD Integration

Tests are automatically run in the GitHub Actions pipeline after staging deployment.

```yaml
- name: Run E2E tests
  run: |
    cd e2e
    npx playwright test --project=api-tests
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    HMAC_SECRET: ${{ secrets.HMAC_SECRET }}
```

## Writing New Tests

1. Create a new spec file in the appropriate directory (`api/` or `flows/`)
2. Import the fixtures from `lib/fixtures.ts`
3. Use the `LotolinkApiClient` for API calls
4. Use the `MockBancaClient` for mock-banca configuration

Example:
```typescript
import { test, expect } from '@playwright/test';
import { LotolinkApiClient, createTestPlayRequest } from '../../lib/fixtures';

test.describe('My New Test', () => {
  let apiClient: LotolinkApiClient;

  test.beforeAll(async ({ request }) => {
    apiClient = new LotolinkApiClient(request);
  });

  test('should do something', async () => {
    const playRequest = createTestPlayRequest();
    const { response, status } = await apiClient.createPlay(playRequest, token);
    expect(status).toBe(201);
  });
});
```

## Troubleshooting

### Tests Fail with Connection Error
Ensure the backend and mock-banca are running:
```bash
docker-compose up -d
```

### Authentication Errors (401)
Tests may skip with 401 errors if running in isolated mode without valid JWT tokens. This is expected behavior for security validation tests.

### Webhook Tests Fail with 404
This is expected if the referenced play doesn't exist. The test is validating the webhook security layer, not the business logic.
