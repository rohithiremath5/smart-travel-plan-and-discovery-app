import { loadEnv } from 'vite';
import { readPublicEnvironment } from '../../config/public-env';
import { SafeToolingError } from './cli';

export function backendConfig(environment: Record<string, string | undefined>) {
  const publicConfig = readPublicEnvironment(environment);
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_ACCESS_TOKEN',
    'GEOAPIFY_API_KEY',
  ] as const;
  const missing = required.filter((name) => !environment[name]?.trim());
  if (missing.length)
    throw new SafeToolingError(
      `Live setup requires ${missing.join(', ')} in .env. Demo development still works.`,
    );
  const ref = environment.SUPABASE_PROJECT_REF!;
  if (
    !/^[a-z0-9]{20}$/.test(ref) ||
    new URL(publicConfig.supabaseUrl).hostname !== `${ref}.supabase.co`
  )
    throw new SafeToolingError(
      'SUPABASE_PROJECT_REF must match VITE_SUPABASE_URL. Values suppressed.',
    );
  if (!/^[a-f0-9]{32}$/i.test(environment.GEOAPIFY_API_KEY!))
    throw new SafeToolingError(
      'GEOAPIFY_API_KEY has an unexpected format. Check the existing Geoapify project API Keys tab.',
    );
  const budget = Number(environment.GEOAPIFY_DAILY_CREDIT_BUDGET ?? '100');
  if (!Number.isInteger(budget) || budget < 1 || budget > 100)
    throw new SafeToolingError(
      'GEOAPIFY_DAILY_CREDIT_BUDGET must be an integer from 1 to 100 for this development setup.',
    );
  const origins = new Set(
    (environment.FUNCTION_ALLOWED_ORIGINS ?? publicConfig.appUrl)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  origins.add(publicConfig.appUrl);
  for (const origin of [...origins]) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new SafeToolingError('FUNCTION_ALLOWED_ORIGINS must contain exact origins.');
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.origin !== origin ||
      url.username ||
      url.password ||
      url.hostname.includes('*')
    )
      throw new SafeToolingError(
        'FUNCTION_ALLOWED_ORIGINS requires exact HTTPS or loopback HTTP origins; no wildcard or paths.',
      );
    // The documented dev/preview servers use 127.0.0.1; localhost is equivalent only for local setup.
    if (local) {
      for (const host of ['localhost', '127.0.0.1'])
        for (const port of ['5173', '4173']) origins.add(`http://${host}:${port}`);
    }
  }
  return {
    ref,
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.publishableKey,
    accessToken: environment.SUPABASE_ACCESS_TOKEN!,
    geoapifyKey: environment.GEOAPIFY_API_KEY!,
    origins: [...origins].sort(),
    budget,
  };
}
export function loadBackendConfig(root: string) {
  return backendConfig(loadEnv('development', root, ''));
}
export type BackendConfig = ReturnType<typeof backendConfig>;
export function functionSecrets(config: BackendConfig) {
  return [
    { name: 'GEOAPIFY_API_KEY', value: config.geoapifyKey },
    { name: 'FUNCTION_ALLOWED_ORIGINS', value: config.origins.join(',') },
    { name: 'GEOAPIFY_DAILY_CREDIT_BUDGET', value: String(config.budget) },
    { name: 'DISCOVERY_PUBLISHABLE_KEY', value: config.publishableKey },
  ];
}
