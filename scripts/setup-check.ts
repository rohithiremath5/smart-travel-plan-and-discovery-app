import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { ConfigurationError, readPublicEnvironment } from '../config/public-env';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
import { backendConfig } from './lib/backend-config';

export function supportedNodeVersion(version: string) {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return (major === 22 && minor >= 13) || major === 24;
}

export function checkSetup(root: string, version = process.versions.node) {
  if (!supportedNodeVersion(version))
    throw new SafeToolingError(
      'Use Node 22.13+ (22.x) or Node 24 LTS. This project was verified with Node 22.17.1.',
    );
  try {
    return {
      config: readPublicEnvironment(loadEnv('development', root, '')),
      hasEnvironmentFile: existsSync(join(root, '.env')),
    };
  } catch (error) {
    if (error instanceof ConfigurationError) throw new SafeToolingError(error.message);
    throw error;
  }
}

if (isMain(import.meta.url)) {
  try {
    const result = checkSetup(process.cwd());
    console.log(
      'Phase 6 local setup check passed. Manual planning remains local; optional AI runs only through controlled loopback development. See npm run setup:ai for safe configuration validation.',
    );
    console.log(
      result.hasEnvironmentFile
        ? '.env found; values were not printed.'
        : '.env absent; safe public defaults are active. Optional: npm run setup:env.',
    );
    console.log(
      result.config.runtimeMode === 'live'
        ? 'Public live request configuration present; this does not verify hosted setup.'
        : 'Curated demo remains available. Live discovery requires backend setup.',
    );
    try {
      backendConfig(loadEnv('development', process.cwd(), ''));
      console.log(
        'Backend variable presence, formats, matching project, origins and budget passed local checks. Values suppressed. No network request or hosted change performed.',
      );
    } catch (error) {
      console.log(
        error instanceof SafeToolingError
          ? error.message
          : 'Optional backend configuration is incomplete. See docs/PHASE_2_SETUP.md.',
      );
    }
    console.log(
      'Trips and saved destinations use device-only IndexedDB. No login, cloud trip storage, new credentials or hosted setup required. See docs/SETUP.md.',
    );
  } catch (error) {
    reportFailure(error);
  }
}
