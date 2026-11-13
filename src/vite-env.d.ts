import type { PublicConfig } from '../config/public-env';

declare global {
  const __PUBLIC_CONFIG__: PublicConfig;
}

export {};
