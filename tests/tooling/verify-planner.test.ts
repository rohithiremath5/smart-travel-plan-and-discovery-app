// @vitest-environment node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { verifyPlanner } from '../../scripts/verify-planner';
import { createFixture } from './helpers';
import { aiPlan } from '../fixtures/ai';
it('defaults to no inference and needs both acknowledgments', async () => {
  const provider = vi.fn();
  expect((await verifyPlanner('not-a-project', [], provider)).performed).toBe(false);
  expect(provider).not.toHaveBeenCalled();
});
it('permits one synthetic planning attempt, validates an unsaved preview, and refuses a repeat across invocations', async () => {
  const fixture = await createFixture();
  try {
    await writeFile(join(fixture.root, '.env'), 'GEMINI_API_KEY=synthetic-private-fixture');
    const provider = vi.fn(async () => ({
      model: 'gemini-3.8-flash' as const,
      plan: aiPlan(['2030-03-20']),
      chat: null,
    }));
    const result = await verifyPlanner(
      fixture.root,
      ['--approved', '--free-project-confirmed'],
      provider,
    );
    expect(result).toMatchObject({
      success: true,
      startedRequests: 1,
      checks: { unsavedPreview: true, reservationAccounted: true },
    });
    await expect(
      verifyPlanner(fixture.root, ['--approved', '--free-project-confirmed'], provider),
    ).rejects.toThrow('already started');
    expect(provider).toHaveBeenCalledOnce();
  } finally {
    await fixture.clean();
  }
});
it('checks persistent allowance before creating a one-attempt guard or accessing a provider', async () => {
  const fixture = await createFixture();
  try {
    await writeFile(
      join(fixture.root, '.env'),
      'GEMINI_API_KEY=synthetic-private-fixture\nAI_DAILY_REQUEST_BUDGET=1',
    );
    await mkdir(join(fixture.root, '.cache'));
    await writeFile(
      join(fixture.root, '.cache', 'ai-development-ledger.json'),
      JSON.stringify({
        version: 1,
        requests: [
          {
            request: 'a'.repeat(64),
            client: 'b'.repeat(64),
            content: 'c'.repeat(64),
            at: Date.now(),
          },
        ],
      }),
    );
    const provider = vi.fn();
    await expect(
      verifyPlanner(fixture.root, ['--approved', '--free-project-confirmed'], provider),
    ).rejects.toThrow('No local application allowance');
    expect(provider).not.toHaveBeenCalled();
  } finally {
    await fixture.clean();
  }
});
