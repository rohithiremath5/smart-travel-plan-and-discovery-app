import { randomBytes, createHash } from 'node:crypto';
import { lstat, open, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';
import { readPublicEnvironment } from '../config/public-env';
import { aiConfig, configurationIssue } from '../supabase/functions/_shared/ai/config';
import { aiDeadline } from '../supabase/functions/_shared/ai/timeouts';
import {
  aiRequestSchema,
  plannerModel,
  validatePlan,
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

const preflightFile = 'docs/review/phase-6/timeout-planner-preflight.json';
const resultFile = 'docs/review/phase-6/timeout-planner-live.json';
const oldGuard = '.cache/phase6-targeted-planner.once';
const newGuard = '.cache/phase6-timeout-planner.once';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Only this new authorization; the earlier verifier/guard remain untouched. */
export async function verifyTimeoutPlanner(
  root: string,
  args: string[],
  provider = generateWithGemini,
) {
  if (args.some((arg) => !['--approved-once', '--free-project-confirmed'].includes(arg)))
    throw new SafeToolingError('Unknown timeout planner verification argument.');
  if (!args.includes('--approved-once') || !args.includes('--free-project-confirmed'))
    return {
      performed: false,
      plan: 'One synthetic Kyoto day through the existing local handler/SDK/durable quota, after fresh documented preflight. New exclusive guard; no retry, chat, hosted operation or fallback.',
    };
  try {
    await lstat(join(root, newGuard));
    throw new SafeToolingError(
      'The timeout planner attempt has already started. No retry authorized.',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const preflight = JSON.parse(await readFile(join(root, preflightFile), 'utf8'));
  const age = Date.now() - Date.parse(preflight.checkedAt);
  if (
    !Number.isFinite(age) ||
    age < -5000 ||
    age > 3600000 ||
    preflight.ownerFreeUnbilledManualConfirmation !== true ||
    preflight.confirmedEnvironmentUnchanged !== true ||
    preflight.publishedFreeStandardEligible !== true ||
    preflight.noOtherLocalAiVerificationRunning !== true
  )
    throw new SafeToolingError(
      'Required current Free/project/process preflight is missing or expired. No request made.',
    );
  const baseline = JSON.parse(
    await readFile(join(root, '.cache/phase6-timeout-live-baseline.json'), 'utf8'),
  ) as { files: { path: string; sha256: string }[] };
  for (const path of ['.env', oldGuard, '.cache/ai-development-ledger.json']) {
    const stat = await lstat(join(root, path));
    const original = baseline.files.find((file) => file.path === path);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      !original ||
      hash(await readFile(join(root, path))) !== original.sha256
    )
      throw new SafeToolingError(
        'Confirmed environment, original guard or quota state changed; stop without generation.',
      );
  }
  if ((await lstat(join(root, '.cache'))).isSymbolicLink())
    throw new SafeToolingError('Linked state directory refused.');
  try {
    await lstat(join(root, '.cache/ai-development-ledger.json.lock'));
    throw new SafeToolingError('Another quota operation is active. No request made.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const env = loadEnv('development', root, ''),
    config = aiConfig({
      ...env,
      AI_DEVELOPMENT_TOKEN: randomBytes(32).toString('hex'),
      FUNCTION_ALLOWED_ORIGINS: 'http://localhost:5173',
    });
  if (
    configurationIssue(config) ||
    config.dailyBudget !== 5 ||
    config.clientBudget !== 3 ||
    config.timeouts.providerMs !== 75000 ||
    config.timeouts.handlerMs !== 80000 ||
    readPublicEnvironment(env).aiRequestTimeoutMs !== 85000
  )
    throw new SafeToolingError(
      'Approved exact model, 5/3 budgets or 75/80/85 deadlines are not active. No request made.',
    );
  const before = await localAiUsage(root);
  if (before.used >= 5)
    throw new SafeToolingError('No local application allowance remains. No request made.');
  const ledgerBefore = JSON.parse(
    await readFile(join(root, '.cache/ai-development-ledger.json'), 'utf8'),
  ) as { requests: { at: number }[] };
  if (
    ledgerBefore.requests.some(
      (row) => Date.now() - row.at < 85000 || Date.now() - row.at >= 6 * 86400000,
    )
  )
    throw new SafeToolingError(
      'Recent/in-flight usage or historical pruning risk; stop without changing quota records.',
    );
  const values = await knownPrivateValues(root);
  const input = aiRequestSchema.parse({
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
      'Synthetic developer verification. Return one brief unverified cultural activity for this day. Short description. No coordinates, exact prices or opening hours.',
    messages: [],
    consent: true,
  });
  if (input.context.dates[0]! <= new Date().toISOString().slice(0, 10))
    throw new SafeToolingError('Synthetic date must remain in the future.');
  const guard = await open(join(root, newGuard), 'wx', 0o600).catch(() => {
    throw new SafeToolingError(
      'The timeout planner attempt has already started or its exclusive guard is unavailable. No retry authorized.',
    );
  });
  try {
    await guard.writeFile(
      JSON.stringify({
        scope: 'one-phase6-timeout-planner-attempt',
        startedAt: new Date().toISOString(),
      }),
    );
  } finally {
    await guard.close();
  }
  const events: AiDiagnostic[] = [],
    started = performance.now();
  const deadline = aiDeadline(new AbortController().signal, 85000);
  let response: Response | undefined,
    value: Record<string, unknown> = {},
    validationPassed = false;
  let activityCount = 0;
  let failureCategory: string | undefined;
  try {
    const handler = createAiHandler(config, localAiQuota(root), (request, settings, signal) =>
      provider(request, settings, signal, undefined, (event) => events.push(event)),
    );
    response = await handler(
      new Request('http://localhost:5173/api/ai/generate', {
        method: 'POST',
        signal: deadline.signal,
        headers: {
          origin: 'http://localhost:5173',
          authorization: 'Bearer ' + config.developmentToken,
          'content-type': 'application/json',
        },
        body: JSON.stringify(input),
      }),
    );
    const body = await response.text();
    assertNoCredentials('synthetic timeout planner response', body, values);
    value = JSON.parse(body) as Record<string, unknown>;
    if (response.ok) {
      const plan = validatePlan(value.plan, input.context),
        preview = suggestionsFromPlan(plan, []);
      activityCount = preview.length;
      validationPassed =
        value.model === plannerModel &&
        value.chat === null &&
        preview.length > 0 &&
        preview.every((item) => !item.selected && item.place === null && item.replaceId === '');
      if (!validationPassed) failureCategory = 'preview_validation_failure';
    }
  } catch {
    failureCategory = 'local_response_validation_failure';
  } finally {
    deadline.dispose();
  }
  const elapsedMs = Math.round(performance.now() - started),
    after = await localAiUsage(root);
  const ledgerAfter = JSON.parse(
    await readFile(join(root, '.cache/ai-development-ledger.json'), 'utf8'),
  ) as { requests: unknown[] };
  const previousRecordsPreserved = ledgerBefore.requests.every((row) =>
    ledgerAfter.requests.some((next) => JSON.stringify(next) === JSON.stringify(row)),
  );
  const original = baseline.files.find((file) => file.path === oldGuard)!;
  const oldGuardPreserved = hash(await readFile(join(root, oldGuard))) === original.sha256;
  const reservations = ledgerAfter.requests.length - ledgerBefore.requests.length;
  const upstreamStatus = events.find((event) => event.stage === 'http_headers')?.upstreamStatus;
  const diagnostic = value.diagnostic as AiDiagnostic | undefined;
  const transportRequests = events.filter((event) => event.stage === 'request_send').length;
  const success =
    response?.status === 200 &&
    validationPassed &&
    events.some((event) => event.stage === 'complete') &&
    upstreamStatus === 200 &&
    transportRequests === 1 &&
    reservations === 1 &&
    previousRecordsPreserved &&
    oldGuardPreserved;
  return {
    date: new Date().toISOString(),
    performed: true,
    success,
    model: plannerModel,
    operation: 'day',
    httpStatus: response?.status ?? null,
    upstreamStatus: upstreamStatus ?? null,
    elapsedMs,
    stages: events,
    diagnostic: success
      ? null
      : (diagnostic ?? {
          category: failureCategory ?? 'handler_or_accounting_failure',
          stage: events.at(-1)?.stage ?? 'handler',
        }),
    applicationQuotaBefore: before,
    applicationQuotaAfter: after,
    applicationReservations: reservations,
    transportRequests,
    previousQuotaRecordsPreserved: previousRecordsPreserved,
    oldConsumedGuardPreserved: oldGuardPreserved,
    newExclusiveGuardConsumed: true,
    timeouts: config.timeouts,
    backend:
      'Existing controlled local Web Request handler, Gemini provider/official SDK and persistent checkout quota; direct invocation, no hosted endpoint or live browser generation.',
    ...(success
      ? {
          activityCount,
          checks: {
            exactModel: true,
            completedProviderResponse: true,
            validStructuredJson: true,
            zodActivitiesAndDurationBounds: true,
            exactRequestedDay: true,
            noInventedCoordinates: true,
            unsavedPreview: true,
            nothingSelectedOrApplied: true,
            reservationAccounted: true,
          },
        }
      : {}),
    noRetry: true,
    noContinuation: true,
    noTools: true,
    noModelFallback: true,
    assistantRequests: 0,
    hostedChanges: false,
    credentialScan:
      'Configured private values checked; no prompt/output content retained. Limited scan.',
    phase7Started: false,
  };
}
if (isMain(import.meta.url))
  verifyTimeoutPlanner(process.cwd(), process.argv.slice(2))
    .then(async (result) => {
      if (result.performed)
        await writeFile(join(process.cwd(), resultFile), JSON.stringify(result, null, 2) + '\n', {
          flag: 'wx',
          mode: 0o600,
        });
      console.log(JSON.stringify(result));
      if ('success' in result && !result.success) process.exitCode = 1;
    })
    .catch(reportFailure);
