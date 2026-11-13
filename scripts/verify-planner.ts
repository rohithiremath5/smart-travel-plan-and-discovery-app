import { randomBytes } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { aiConfig, configurationIssue } from '../supabase/functions/_shared/ai/config';
import {
  plannerModel,
  validatePlan,
  type AiRequest,
} from '../supabase/functions/_shared/ai/contracts';
import {
  generateWithGemini,
  type AiDiagnostic,
} from '../supabase/functions/_shared/ai/gemini-provider';
import { createAiHandler } from '../supabase/functions/_shared/ai/handler';
import { localAiQuota, localAiUsage } from '../server/ai/local-quota';
import { suggestionsFromPlan } from '../src/features/ai/domain/planning';
import { assertNoCredentials, knownPrivateValues } from './lib/review-files';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';

// A separate command avoids accidentally running the existing two-model verifier.
export async function verifyPlanner(root: string, args: string[], provider = generateWithGemini) {
  if (args.some((a) => !['--approved', '--free-project-confirmed'].includes(a)))
    throw new SafeToolingError('Unknown planner verification argument.');
  if (!args.includes('--approved') || !args.includes('--free-project-confirmed'))
    return {
      performed: false,
      plan: 'One short synthetic gemini-3.8-flash day request through the real handler and persistent quota; no retries/tools/fallback. Existing Free/unbilled confirmation and published free eligibility required.',
    };
  const config = aiConfig({
    ...loadEnv('development', root, ''),
    AI_DEVELOPMENT_TOKEN: randomBytes(32).toString('hex'),
    FUNCTION_ALLOWED_ORIGINS: 'http://localhost:5173',
  });
  const issue = configurationIssue(config);
  if (issue)
    throw new SafeToolingError('Planner preflight failed: ' + issue + '. No request made.');
  const before = await localAiUsage(root);
  if (before.used >= config.dailyBudget)
    throw new SafeToolingError('No local application allowance remains. No request made.');
  const privateValues = await knownPrivateValues(root);
  await mkdir(join(root, '.cache'), { recursive: true });
  const guard = await open(join(root, '.cache', 'phase6-targeted-planner.once'), 'wx', 0o600).catch(
    () => {
      throw new SafeToolingError(
        'This targeted planner attempt was already started or its guard cannot be created. Stop; no retry authorized.',
      );
    },
  );
  await guard.writeFile(
    JSON.stringify({
      scope: 'one-targeted-phase6-planner-attempt',
      startedAt: new Date().toISOString(),
    }),
  );
  await guard.close();
  const events: AiDiagnostic[] = [];
  const input: AiRequest = {
    requestId: crypto.randomUUID(),
    clientId: crypto.randomUUID(),
    operation: 'day',
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
      'Synthetic developer verification. Return exactly one brief, unverified activity for this single day. Keep descriptions short. No exact prices, opening hours or coordinates.',
    messages: [],
    consent: true,
  };
  const handler = createAiHandler(config, localAiQuota(root), (request, settings, signal) =>
    provider(request, settings, signal, undefined, (event) => events.push(event)),
  );
  const response = await handler(
    new Request('http://localhost:5173/api/ai/generate', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        authorization: 'Bearer ' + config.developmentToken,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    }),
  );
  const body = await response.text();
  assertNoCredentials('targeted synthetic planner response', body, privateValues);
  const value = JSON.parse(body);
  const after = await localAiUsage(root);
  const common = {
    date: new Date().toISOString(),
    performed: true,
    model: plannerModel,
    httpStatus: response.status,
    stages: events,
    applicationQuotaBefore: before,
    applicationQuotaAfter: after,
    startedRequests: after.used - before.used,
    noRetry: true,
    noTools: true,
    noModelFallback: true,
    hostedChanges: false,
    credentialScan: 'passed; no content retained',
  };
  if (!response.ok)
    return {
      ...common,
      success: false,
      diagnostic: value.diagnostic ?? {
        category: 'unclassified_handler_failure',
        stage: 'handler',
      },
      ...(Number.isInteger(value.upstreamStatus) ? { upstreamStatus: value.upstreamStatus } : {}),
    };
  const plan = validatePlan(value.plan, input.context),
    preview = suggestionsFromPlan(plan, []);
  if (
    value.model !== plannerModel ||
    !preview.length ||
    preview.some((s) => s.selected || s.place !== null) ||
    after.used - before.used !== 1
  )
    throw new SafeToolingError(
      'Live planner returned inconsistent model/preview/accounting. No retry authorized.',
    );
  return {
    ...common,
    success: true,
    upstreamStatus: events.find((e) => e.stage === 'http_headers')?.upstreamStatus,
    checks: {
      exactModel: true,
      validJson: true,
      exactRequestedDates: true,
      zodActivities: true,
      noInventedCoordinates: true,
      unsavedPreview: true,
      nothingSelectedOrApplied: true,
      reservationAccounted: true,
    },
    activityCount: preview.length,
  };
}
if (isMain(import.meta.url))
  verifyPlanner(process.cwd(), process.argv.slice(2))
    .then((result) => {
      console.log(JSON.stringify(result));
      if ('success' in result && !result.success) process.exitCode = 1;
    })
    .catch(reportFailure);
