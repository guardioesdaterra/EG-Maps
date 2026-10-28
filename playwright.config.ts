import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.PLAYWRIGHT_PORT || '4173';
const e2eUrl = `http://127.0.0.1:${e2ePort}`;
const resultsDir = process.env.PLAYWRIGHT_RESULTS_DIR || join(tmpdir(), 'egmaps-playwright-results');
const reportDir = process.env.PLAYWRIGHT_REPORT_DIR || join(tmpdir(), 'egmaps-playwright-report');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: resultsDir,
  reporter: [['html', { outputFolder: reportDir, open: 'never' }]],
  use: {
    baseURL: `${e2eUrl}/`,
    colorScheme: 'dark',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `pnpm exec serve --no-request-logging --no-clipboard --no-port-switching --listen tcp://127.0.0.1:${e2ePort} .output/public`,
    url: e2eUrl,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
