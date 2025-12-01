import { defineConfig, devices } from '@playwright/test';

/**
 * Lotolink E2E Test Configuration
 * 
 * Runs against local development environment by default.
 * Set BASE_URL environment variable for different environments.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  projects: [
    {
      name: 'api-tests',
      testDir: './tests/api',
    },
    {
      name: 'e2e-flows',
      testDir: './tests/flows',
    },
  ],
});
