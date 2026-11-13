// @vitest-environment node
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { verifyTimeoutPlanner } from '../../scripts/verify-timeout-planner';
import {
  AiProviderError,
  type generateWithGemini,
} from '../../supabase/functions/_shared/ai/gemini-provider';
import { createFixture } from './helpers';
import { aiPlan } from '../fixtures/ai';
const args = ['--approved-once', '--free-project-confirmed'];
const evidence = 'docs/review/phase-6/timeout-planner-preflight.json';
const oldGuard = '.cache/phase6-targeted-planner.once',
  newGuard = '.cache/phase6-timeout-planner.once';
async function baseline(root: string) {
  const files = await Promise.all(
    ['.env', oldGuard, '.cache/ai-development-ledger.json'].map(async (path) => ({
      path,
      sha256: createHash('sha256')
        .update(await readFile(join(root, path)))
        .digest('hex'),
    })),
  );
  await writeFile(
    join(root, '.cache/phase6-timeout-live-baseline.json'),
    JSON.stringify({ files }),
  );
}
async function fixture() {
  const result = await createFixture();
  await mkdir(join(result.root, '.cache'));
  await mkdir(join(result.root, 'docs/review/phase-6'), { recursive: true });
  await writeFile(join(result.root, '.env'), 'GEMINI_API_KEY=synthetic-private-fixture');
  await writeFile(join(result.root, oldGuard), 'preserved consumed guard');
  await writeFile(
    join(result.root, '.cache/ai-development-ledger.json'),
    JSON.stringify({ version: 1, requests: [] }),
  );
  await writeFile(
    join(result.root, evidence),
    JSON.stringify({
      checkedAt: new Date().toISOString(),
      ownerFreeUnbilledManualConfirmation: true,
      confirmedEnvironmentUnchanged: true,
      publishedFreeStandardEligible: true,
      noOtherLocalAiVerificationRunning: true,
    }),
  );
  await baseline(result.root);
  return result;
}
function provider() {
  return vi.fn(async (...parameters: Parameters<typeof generateWithGemini>) => {
    parameters[4]?.({ stage: 'request_send' });
    parameters[4]?.({ stage: 'http_headers', upstreamStatus: 200 });
    parameters[4]?.({ stage: 'complete', upstreamStatus: 200 });
    expect(parameters[0].operation).toBe('day');
    expect(parameters[0].context.travelers).toBe(1);
    expect(parameters[1].timeouts.providerMs).toBe(75000);
    return { model: 'gemini-3.8-flash' as const, plan: aiPlan(['2030-03-20']), chat: null };
  });
}
it('defaults to zero requests and requires both acknowledgments', async () => {
  const mock = provider();
  expect((await verifyTimeoutPlanner('not-a-project', [], mock)).performed).toBe(false);
  expect((await verifyTimeoutPlanner('not-a-project', ['--approved-once'], mock)).performed).toBe(
    false,
  );
  await expect(verifyTimeoutPlanner('not-a-project', ['--approved'], mock)).rejects.toThrow(
    'Unknown',
  );
  expect(mock).not.toHaveBeenCalled();
});
it('makes one fixture-only request, validates unsaved/unselected preview, preserves old guard and refuses another invocation', async () => {
  const f = await fixture(),
    mock = provider();
  try {
    const result = await verifyTimeoutPlanner(f.root, args, mock);
    expect(result).toMatchObject({
      success: true,
      applicationReservations: 1,
      transportRequests: 1,
      oldConsumedGuardPreserved: true,
      previousQuotaRecordsPreserved: true,
      checks: { unsavedPreview: true, nothingSelectedOrApplied: true },
    });
    expect(await readFile(join(f.root, oldGuard), 'utf8')).toBe('preserved consumed guard');
    await baseline(f.root); // Even an updated quota snapshot cannot reuse the exclusive guard.
    await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow('already started');
    expect(mock).toHaveBeenCalledOnce();
  } finally {
    await f.clean();
  }
});
it('permits only one of two concurrent fixture invocations', async () => {
  const f = await fixture(),
    mock = provider();
  try {
    const results = await Promise.allSettled([
      verifyTimeoutPlanner(f.root, args, mock),
      verifyTimeoutPlanner(f.root, args, mock),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(mock).toHaveBeenCalledOnce();
  } finally {
    await f.clean();
  }
});
it('records an upstream failure without content, retry or reservation refund', async () => {
  const f = await fixture(),
    mock = vi.fn(async (...parameters: Parameters<typeof generateWithGemini>) => {
      parameters[4]?.({ stage: 'request_send' });
      parameters[4]?.({ stage: 'http_headers', upstreamStatus: 504 });
      throw new AiProviderError('provider_deadline_exceeded', 504, 504, {
        stage: 'http_headers',
        upstreamStatus: 504,
        category: 'provider_deadline_exceeded',
      });
    });
  try {
    const result = await verifyTimeoutPlanner(f.root, args, mock);
    expect(result).toMatchObject({
      success: false,
      httpStatus: 504,
      upstreamStatus: 504,
      applicationReservations: 1,
      noRetry: true,
      diagnostic: { stage: 'http_headers', category: 'provider_deadline_exceeded' },
    });
    expect(mock).toHaveBeenCalledOnce();
    await expect(access(join(f.root, newGuard))).resolves.toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('synthetic-private-fixture');
  } finally {
    await f.clean();
  }
});
it.each([
  'ownerFreeUnbilledManualConfirmation',
  'confirmedEnvironmentUnchanged',
  'publishedFreeStandardEligible',
  'noOtherLocalAiVerificationRunning',
  'checkedAt',
])('stops before guard/provider when mandatory %s evidence is absent or stale', async (field) => {
  const f = await fixture(),
    mock = provider();
  try {
    const doc = JSON.parse(await readFile(join(f.root, evidence), 'utf8'));
    doc[field] = field === 'checkedAt' ? '2020-01-01' : false;
    await writeFile(join(f.root, evidence), JSON.stringify(doc));
    await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow('preflight');
    expect(mock).not.toHaveBeenCalled();
    await expect(access(join(f.root, newGuard))).rejects.toThrow();
  } finally {
    await f.clean();
  }
});
it.each(['AI_PROVIDER_TIMEOUT_MS=60000', 'GEMINI_MODEL=other', 'AI_DAILY_REQUEST_BUDGET=4'])(
  'refuses unapproved configuration %s before inference',
  async (setting) => {
    const f = await fixture(),
      mock = provider();
    try {
      await writeFile(join(f.root, '.env'), 'GEMINI_API_KEY=synthetic-private-fixture\n' + setting);
      await baseline(f.root);
      await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow('not active');
      expect(mock).not.toHaveBeenCalled();
    } finally {
      await f.clean();
    }
  },
);
it('fails closed on changed environment and active quota lock', async () => {
  const f = await fixture(),
    mock = provider();
  try {
    await writeFile(join(f.root, '.env'), 'GEMINI_API_KEY=changed-synthetic-private-fixture');
    await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow('changed');
    await baseline(f.root);
    await writeFile(join(f.root, '.cache/ai-development-ledger.json.lock'), 'active');
    await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow('active');
    expect(mock).not.toHaveBeenCalled();
  } finally {
    await f.clean();
  }
});
it('stops on exhausted quota, recent activity or pending historical pruning', async () => {
  const f = await fixture(),
    mock = provider();
  try {
    for (const ages of [Array(5).fill(120000), [1000], [7 * 86400000]]) {
      const rows = ages.map((age, index) => ({
        request: String(index).repeat(64),
        client: 'b'.repeat(64),
        content: 'c'.repeat(64),
        at: Date.now() - age,
      }));
      await writeFile(
        join(f.root, '.cache/ai-development-ledger.json'),
        JSON.stringify({ version: 1, requests: rows }),
      );
      await baseline(f.root);
      await expect(verifyTimeoutPlanner(f.root, args, mock)).rejects.toThrow();
      expect(mock).not.toHaveBeenCalled();
    }
    await expect(access(join(f.root, newGuard))).rejects.toThrow();
  } finally {
    await f.clean();
  }
});
