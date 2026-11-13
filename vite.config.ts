import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { readPublicEnvironment } from './config/public-env.ts';
import { aiDevelopmentPlugin } from './server/ai/dev-plugin.ts';

export default defineConfig(({ mode }) => {
  // Browser tests compile real production code with synthetic public configuration only.
  const config = readPublicEnvironment(
    mode === 'e2e'
      ? {
          VITE_APP_MODE: 'auto',
          VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: ['sb_publishable_', 'synthetic_public_fixture'].join(''),
        }
      : loadEnv(mode, process.cwd(), ''),
  );
  return {
    plugins: [
      react(),
      tailwindcss(),
      aiDevelopmentPlugin(mode === 'e2e' ? {} : loadEnv(mode, process.cwd(), ''), process.cwd()),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    // Disable Vite's automatic prefix export; emit only this explicit public object.
    envPrefix: [],
    define: { __PUBLIC_CONFIG__: JSON.stringify(config) },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: { sourcemap: false },
  };
});
