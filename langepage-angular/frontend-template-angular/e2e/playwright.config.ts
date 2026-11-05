import { defineConfig, devices } from '@playwright/test';

// Smoke target: the deployed environment in the pipeline (E2E_BASE_URL = DES address, set by Jenkins, never versioned);
// locally, the image (`docker run -p 4360:8080 frontend-template-angular`) or `npx ng serve --port 4360`.
const baseURL = process.env['E2E_BASE_URL'] || 'http://127.0.0.1:4360';
// Optional browser binary: an image or workstation with Chrome/Chromium but without the Playwright browsers
// (corporate network blocks the Playwright download). Unset = browser installed by `npx playwright install`.
const executablePath = process.env['E2E_CHROME_BIN'] || process.env['CHROME_BIN'] || undefined;
const ci = !!process.env['CI'];

export default defineConfig({
  testDir: './specs',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci
    ? [['list'], ['junit', { outputFile: 'test-results/junit.xml' }], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Desktop width: the sidebar is open and every page block is in its final layout.
        viewport: { width: 1440, height: 900 },
        launchOptions: executablePath ? { executablePath } : {}
      }
    }
  ]
});
