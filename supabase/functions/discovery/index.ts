import { createHandler, createStore, type EdgeConfig } from '../_shared/handler.ts';

// Platform environment only. No private credentials enter the frontend projection.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
function namedKeys(name: string): string[] {
  try {
    const value: unknown = JSON.parse(Deno.env.get(name) ?? '{}');
    return value && typeof value === 'object'
      ? Object.values(value).filter((key): key is string => typeof key === 'string')
      : [];
  } catch {
    return [];
  }
}
const config: EdgeConfig = {
  url: Deno.env.get('SUPABASE_URL') ?? '',
  adminKey:
    namedKeys('SUPABASE_SECRET_KEYS')[0] ??
    Deno.env.get('SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    '',
  publishableKeys: [
    ...namedKeys('SUPABASE_PUBLISHABLE_KEYS'),
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
    Deno.env.get('DISCOVERY_PUBLISHABLE_KEY') ?? '',
  ].filter((key) => key.startsWith('sb_publishable_')),
  geoapifyKey: Deno.env.get('GEOAPIFY_API_KEY') ?? '',
  origins: (Deno.env.get('FUNCTION_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  budget: Number(Deno.env.get('GEOAPIFY_DAILY_CREDIT_BUDGET') ?? '100'),
};
Deno.serve(createHandler(config, createStore(config)));
