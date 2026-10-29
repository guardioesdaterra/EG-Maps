import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const port = process.env.MAP_PERF_PORT || '3001'
const origin = `http://localhost:${port}`
const resultsDir = process.env.PLAYWRIGHT_PERF_RESULTS_DIR || join(tmpdir(), 'egmaps-map-performance-results')
const reportDir = process.env.PLAYWRIGHT_PERF_REPORT_DIR || join(tmpdir(), 'egmaps-map-performance-report')
const siteDir = process.env.MAP_PERF_SITE_DIR || join(tmpdir(), 'egmaps-map-performance-site')

export default defineConfig({
  testDir: './tests',
  testMatch: '**/map-performance.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 5_000 },
  outputDir: resultsDir,
  reporter: [['list'], ['html', { outputFolder: reportDir, open: 'never' }]],
  use: {
    baseURL: `${origin}/`,
    locale: 'en-US',
    colorScheme: 'dark',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-map-performance',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-mobile-embed-host',
      grep: /Squarespace embed/,
      use: { browserName: 'webkit' },
    },
  ],
  webServer: {
    command: `pnpm exec serve --no-request-logging --no-clipboard --no-port-switching --listen tcp://0.0.0.0:${port} "${siteDir}"`,
    url: `${origin}/`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 60_000,
  },
})
