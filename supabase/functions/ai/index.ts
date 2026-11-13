import { aiConfig } from '../_shared/ai/config.ts';
import { createAiHandler } from '../_shared/ai/handler.ts';
import { postgresAiQuota } from '../_shared/ai/postgres-quota.ts';
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};
const names = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_CHAT_MODEL',
  'AI_DAILY_REQUEST_BUDGET',
  'AI_REQUESTS_PER_USER_PER_DAY',
  'AI_DEVELOPMENT_TOKEN',
  'AI_PROVIDER_TIMEOUT_MS',
  'FUNCTION_ALLOWED_ORIGINS',
];
const env = Object.fromEntries(names.map((name) => [name, Deno.env.get(name)]));
function adminKey() {
  try {
    const value: unknown = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (value && typeof value === 'object')
      return Object.values(value).find((v) => typeof v === 'string') as string | undefined;
  } catch {
    /* fail closed through quota RPC */
  }
  return undefined;
}
Deno.serve(
  createAiHandler(
    aiConfig(env),
    postgresAiQuota(
      Deno.env.get('SUPABASE_URL') ?? '',
      adminKey() ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ),
  ),
);
