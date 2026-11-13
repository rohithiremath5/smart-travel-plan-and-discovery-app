import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  testMatch: 'mapping-hosted.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: { ...base.use, trace: 'off' },
  webServer: {
    command:
      'node node_modules/vite/bin/vite.js preview --outDir dist --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
