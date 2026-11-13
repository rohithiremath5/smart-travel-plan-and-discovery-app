import { loadEnv } from 'vite';
import { randomBytes } from 'node:crypto';
import { aiConfig, configurationIssue } from '../supabase/functions/_shared/ai/config';
import { createAiHandler } from '../supabase/functions/_shared/ai/handler';
import { localAiQuota, localAiUsage } from '../server/ai/local-quota';
import type { AiRequest } from '../supabase/functions/_shared/ai/contracts';
import { knownPrivateValues, assertNoCredentials } from './lib/review-files';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';
export async function verifyAi(root: string, args: string[]) {
  if (args.some((a) => !['--approved', '--free-project-confirmed'].includes(a)))
    throw new SafeToolingError('Unknown AI verification argument.');
  const config = aiConfig({
    ...loadEnv('development', root, ''),
    AI_DEVELOPMENT_TOKEN: randomBytes(32).toString('hex'),
    FUNCTION_ALLOWED_ORIGINS: 'http://localhost:5173',
  });
  if (!args.includes('--approved') || !args.includes('--free-project-confirmed'))
    return {
      performed: false,
      plan: 'At most two synthetic inference requests, one per approved model, using the same durable local development allowance. Actual free/unbilled project and approval required.',
    };
  const issue = configurationIssue(config);
  if (issue)
    throw new SafeToolingError('AI verification unavailable: ' + issue + '. No request made.');
  const before = await localAiUsage(root);
  if (config.dailyBudget - before.used < 2)
    throw new SafeToolingError(
      'Insufficient local daily allowance for two-model verification. No request made.',
    );
  const privateValues = await knownPrivateValues(root),
    handler = createAiHandler(config, localAiQuota(root)),
    clientId = crypto.randomUUID();
  const results: {
    operation: string;
    model: string;
    status: number;
    valid: boolean;
    activities?: number;
  }[] = [];
  for (const operation of ['day', 'chat'] as const) {
    const input: AiRequest = {
      requestId: crypto.randomUUID(),
      clientId,
      operation,
      context: {
        destination: 'Kyoto',
        country: 'Japan',
        dates: ['2030-03-20'],
        travelers: 1,
        budgetMinor: 10000,
        currency: 'JPY',
        interests: ['Culture'],
        pace: 'Relaxed',
        existing: [],
        places: [],
      },
      instruction:
        operation === 'day'
          ? 'Synthetic development check: return exactly one brief, unverified activity for the supplied one day. No exact prices or opening hours.'
          : 'Answer in one short sentence.',
      messages:
        operation === 'chat'
          ? [{ role: 'user', text: 'Suggest one general way to keep a Kyoto culture day relaxed.' }]
          : [],
      consent: true,
    };
    const response = await handler(
      new Request('http://localhost:5173/api/ai/generate', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:5173',
          Authorization: 'Bearer ' + config.developmentToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }),
    );
    const body = await response.text();
    assertNoCredentials('synthetic live AI response', body, privateValues);
    const value: unknown = JSON.parse(body);
    if (!response.ok) {
      const code =
        value && typeof value === 'object' && 'code' in value
          ? String(value.code).replace(/[^a-z_]/g, '')
          : 'unknown';
      throw new SafeToolingError(
        `Live ${operation} verification returned HTTP ${response.status} (${code}). Started reservations remain consumed; no retry or model fallback attempted.`,
      );
    }
    if (!value || typeof value !== 'object' || !('model' in value))
      throw new SafeToolingError('Live response shape invalid.');
    results.push({ operation, model: String(value.model), status: response.status, valid: true });
    if (operation === 'day') await new Promise((resolve) => setTimeout(resolve, 10500));
  }
  const after = await localAiUsage(root);
  return {
    performed: true,
    requests: results,
    localQuotaBefore: before,
    localQuotaAfter: after,
    startedRequests: after.used - before.used,
    privateCredentialScan: 'passed',
    hostedChanges: false,
    syntheticPlanningOnly: true,
    providerProjectQuota: 'Actual remaining provider RPM/TPM/RPD not established by this check.',
  };
}
if (isMain(import.meta.url))
  verifyAi(process.cwd(), process.argv.slice(2))
    .then((result) => console.log(JSON.stringify(result)))
    .catch(reportFailure);
