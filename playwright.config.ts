import { defineConfig } from '@playwright/test';

const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const runId = process.env.SMART_TRAVEL_E2E_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');
process.env.SMART_TRAVEL_E2E_RUN_ID = runId;
if (channel && !['chrome', 'msedge'].includes(channel)) {
  throw new Error(
    'PLAYWRIGHT_BROWSER_CHANNEL must be chrome or msedge, or absent for bundled Chromium.',
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: `test-results/${runId}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report/${runId}` }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    serviceWorkers: 'block',
    ...(channel ? { channel } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [360, 768, 1024, 1440].map((width) => ({
    name: `chromium-${width}`,
    use: { viewport: { width, height: 960 } },
  })),
  // Production output, rather than a development transform, is exercised here.
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --outDir .cache/e2e-dist --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
