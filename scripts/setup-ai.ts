import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { createHash } from 'node:crypto';
import { aiConfig, configurationIssue } from '../supabase/functions/_shared/ai/config';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
export const aiDeploymentFiles = [
  'ai/index.ts',
  'ai/deno.json',
  '_shared/ai/contracts.ts',
  '_shared/ai/config.ts',
  '_shared/ai/timeouts.ts',
  '_shared/ai/gemini-provider.ts',
  '_shared/ai/handler.ts',
  '_shared/ai/postgres-quota.ts',
] as const;
export const aiSecretNames = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GEMINI_CHAT_MODEL',
  'AI_DAILY_REQUEST_BUDGET',
  'AI_REQUESTS_PER_USER_PER_DAY',
  'AI_DEVELOPMENT_TOKEN',
] as const;
export async function setupAi(root: string, args: string[]) {
  if (args.length)
    throw new SafeToolingError(
      'Phase 6 setup:ai is a local validation/hosted plan only. No hosted apply or secret upload is authorized. See docs/PHASE_6_SETUP.md.',
    );
  const env = loadEnv('development', root, ''),
    config = aiConfig(env),
    issue = configurationIssue(config);
  const sql = await readFile(join(root, 'supabase/migrations/202611060001_ai_quota.sql'), 'utf8');
  const files = await Promise.all(
    aiDeploymentFiles.map(async (file) => ({
      path: file,
      sha256: createHash('sha256')
        .update(await readFile(join(root, 'supabase/functions', file)))
        .digest('hex'),
    })),
  );
  return {
    configured: !issue,
    issue,
    models: { planner: config.model, chat: config.chatModel },
    dailyBudget: config.dailyBudget,
    clientBudget: config.clientBudget,
    timeouts: config.timeouts,
    backend: 'controlled loopback development; persistent local quota',
    hostedPlan: {
      migration: '202611060001_ai_quota.sql',
      migrationIdentity:
        'phase_6_ai_' + createHash('sha256').update(sql).digest('hex').slice(0, 16),
      function: 'ai',
      verifyJwt: false,
      confidentialDevelopmentCapabilityRequired: true,
      files,
      secrets: [...aiSecretNames],
      origins: 'Reuse existing FUNCTION_ALLOWED_ORIGINS without overwriting discovery settings',
      optionalTimeoutSetting:
        'AI_PROVIDER_TIMEOUT_MS (75000 default; no synchronization performed)',
    },
    hostedChanges: false,
    generationRequests: 0,
  };
}
if (isMain(import.meta.url))
  setupAi(process.cwd(), process.argv.slice(2))
    .then((result) => {
      console.log(
        result.configured
          ? 'Phase 6 approved model configuration validated locally; credential values suppressed.'
          : 'AI unavailable: ' +
              result.issue +
              '. Manual planning and mocked development remain available.',
      );
      console.log(
        'Local development: npm run dev; AI is loopback-only with persistent five/day and client three/day limits. No public anonymous endpoint.',
      );
      console.log(
        'Hosted plan requires separate approval: ' +
          result.hostedPlan.migration +
          ', only the ai function (eight reviewed files), and six server-only settings plus an optional non-secret timeout override. This command performs no hosted operation or generation.',
      );
    })
    .catch(reportFailure);
