import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const origin =
  process.env.GOALDAY_E2E_ORIGIN ?? process.env.GOALDAY_VISUAL_BASELINE_ORIGIN;
const port = Number(process.env.GOALDAY_E2E_PORT ?? 4173);
const runDir =
  process.env.GOALDAY_RUN_DIR ?? `.artifacts/direct-e2e-${Date.now()}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  outputDir: resolve(runDir, 'test-results'),
  reporter: [
    [process.env.CI ? 'github' : 'list'],
    ['html', { outputFolder: resolve(runDir, 'report'), open: 'never' }],
    ['json', { outputFile: resolve(runDir, 'results.json') }],
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: origin ?? `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: origin
    ? undefined
    : {
        command: `bun --bun run dev:web --host 127.0.0.1 --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
      },
});
