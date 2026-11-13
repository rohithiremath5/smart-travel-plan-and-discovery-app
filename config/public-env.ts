import { z } from 'zod';
import { aiTimeouts, validAiTimeouts } from '../supabase/functions/_shared/ai/timeouts.ts';

export const publicEnvironmentNames = [
  'VITE_APP_NAME',
  'VITE_APP_MODE',
  'VITE_APP_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_WEATHER_ENABLED',
] as const;

const schema = z.object({
  VITE_APP_NAME: z.string().trim().min(2).max(80).default('Smart Travel Plan and Discovery App'),
  VITE_APP_MODE: z.enum(['auto', 'demo', 'live']).default('auto'),
  VITE_APP_URL: z
    .url()
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      return (
        (url.protocol === 'https:' || (url.protocol === 'http:' && local)) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === '/'
      );
    }, 'Use an HTTPS origin or a local HTTP origin, without a path or credentials.')
    .default('http://localhost:5173'),
});

export class ConfigurationError extends Error {
  constructor(public readonly fields: readonly string[]) {
    super(`Check environment variable names/settings: ${fields.join(', ')}. See docs/SETUP.md.`);
    this.name = 'ConfigurationError';
  }
}

export function readPublicEnvironment(environment: Record<string, string | undefined>) {
  const timeouts = aiTimeouts(Number(environment.AI_PROVIDER_TIMEOUT_MS ?? '75000'));
  if (!validAiTimeouts(timeouts)) throw new ConfigurationError(['AI_PROVIDER_TIMEOUT_MS']);
  const unknownPublicNames = Object.keys(environment).filter(
    (name) =>
      name.startsWith('VITE_') &&
      !publicEnvironmentNames.includes(name as (typeof publicEnvironmentNames)[number]),
  );
  if (unknownPublicNames.length) throw new ConfigurationError(unknownPublicNames);

  const publicKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (publicKey && !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(publicKey)) {
    throw new ConfigurationError(['VITE_SUPABASE_PUBLISHABLE_KEY']);
  }
  const result = schema.safeParse({
    VITE_APP_NAME: environment.VITE_APP_NAME,
    VITE_APP_MODE: environment.VITE_APP_MODE,
    VITE_APP_URL: environment.VITE_APP_URL,
  });
  if (!result.success) {
    throw new ConfigurationError([
      ...new Set(result.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  }

  const supabaseUrl = environment.VITE_SUPABASE_URL ?? '';
  if (supabaseUrl) {
    if (!URL.canParse(supabaseUrl)) throw new ConfigurationError(['VITE_SUPABASE_URL']);
    const url = new URL(supabaseUrl);
    if (
      url.protocol !== 'https:' ||
      !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new ConfigurationError(['VITE_SUPABASE_URL']);
  }
  const configured = !!supabaseUrl && !!publicKey;
  return {
    // Non-secret derived duration only; provider configuration/credentials stay server-side.
    aiRequestTimeoutMs: timeouts.browserMs,
    appName: result.data.VITE_APP_NAME,
    appUrl: new URL(result.data.VITE_APP_URL).origin,
    requestedMode: result.data.VITE_APP_MODE,
    // Configured means requests can be attempted, not that a live connection was verified.
    runtimeMode:
      result.data.VITE_APP_MODE === 'demo'
        ? ('demo' as const)
        : configured
          ? ('live' as const)
          : result.data.VITE_APP_MODE === 'live'
            ? ('unavailable' as const)
            : ('demo' as const),
    supabaseUrl: supabaseUrl ? new URL(supabaseUrl).origin : '',
    publishableKey: publicKey,
    phase: 6 as const,
  };
}

export type PublicConfig = ReturnType<typeof readPublicEnvironment>;
