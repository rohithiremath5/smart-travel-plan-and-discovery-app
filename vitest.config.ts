import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { readPublicEnvironment } from './config/public-env.ts';

export default defineConfig({
  envDir: false,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __PUBLIC_CONFIG__: JSON.stringify(readPublicEnvironment({})) },
  test: {
    maxWorkers: 2,
    testTimeout: 15000,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/tooling/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
