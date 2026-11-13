import { test, expect, type Page, type TestInfo } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { seedMappedTrip } from './mapping-fixture';
import { aiPlan } from '../fixtures/ai';
test('upstream deadline failure keeps manual planning and reload persistence available — mocked HTTP 504', async ({
  page,
}, info) => {
  let generations = 0;
  await page.route('**/api/ai/**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: status() });
    generations++;
    await route.fulfill({
      status: 504,
      json: { code: 'provider_deadline_exceeded', upstreamStatus: 504 },
    });
  });
  await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Generate with AI', exact: true }).click();
  await page
    .getByLabel('I agree to send these planning details to Gemini.', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('exceeded its response deadline');
  await expect(page.getByRole('alert')).toContainText('no automatic retry');
  await capture(page, info, 'offline-timeout-504', '.ai-error');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('Manual planning after timeout');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Manual planning after timeout', exact: true }),
  ).toBeVisible();
  expect(generations).toBe(1);
});
async function capture(page: Page, info: TestInfo, name: string, target?: string) {
  if (target) await page.locator(target).scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .getByRole('dialog')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  const filename = `${name}-${info.project.use.viewport!.width}.png`;
  // Normal regressions preserve review evidence. Recovery capture is explicit and uses new filenames.
  const output =
    process.env.SMART_TRAVEL_REVIEW_CAPTURE === 'phase-6-recovery'
      ? `docs/review/phase-6/screenshots/recovery-${filename}`
      : info.outputPath(filename);
  const bytes = await page.screenshot();
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.tmp-${crypto.randomUUID()}`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}
function status(code: string | null = null) {
  return {
    available: !code,
    code,
    models: { planner: 'gemini-3.8-flash', chat: 'gemini-3.5-flash-lite' },
    dailyBudget: 5,
    clientBudget: 3,
    scope: 'controlled-development',
  };
}
test('AI draft selection/rejection applies atomically, preserves manual content and complete backup — mocked Gemini', async ({
  page,
}, info) => {
  const requests: Record<string, unknown>[] = [];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/ai/**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: status() });
    const input = route.request().postDataJSON();
    requests.push(input);
    await gate;
    await route.fulfill({
      json: {
        model: 'gemini-3.8-flash',
        plan: aiPlan(input.context.dates),
        chat: null,
        quota: { globalRemaining: 4, clientRemaining: 2 },
      },
    });
  });
  await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Generate with AI', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await capture(page, info, 'ai-brief');
  await page
    .getByLabel('I agree to send these planning details to Gemini.', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await expect(page.getByText('Shaping a few possibilities…', { exact: true })).toBeVisible();
  await capture(page, info, 'ai-generating', '.ai-generation-progress');
  release();
  await expect(page.getByRole('region', { name: 'AI suggestion preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply selected suggestions' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reject A quiet neighbourhood', exact: true }).click();
  await page.getByRole('checkbox', { name: 'A garden afternoon', exact: true }).check();
  await capture(page, info, 'ai-preview', '.ai-suggestion');
  expect(JSON.stringify(requests)).not.toContain('A synthetic journey for map review.');
  expect(JSON.stringify(requests)).not.toContain('Garden morning');
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Apply selected suggestions', exact: true }).click();
  await expect(page.getByText('Your choices, now in your plan.', { exact: true })).toBeVisible();
  await capture(page, info, 'ai-applied', '.ai-applied');
  await page.getByRole('button', { name: 'Return to your itinerary' }).click();
  await expect(page.getByRole('button', { name: 'Generate with AI', exact: true })).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'A garden afternoon', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'A garden afternoon', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Garden morning', exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.itineraries[0].days[0].notes).toBe('A synthetic journey for map review.');
  expect(backup.itineraries[0].days[0].activities.map((a: { title: string }) => a.title)).toEqual([
    'Garden morning',
    'Riverside tea',
    'An unplanned hour',
    'A garden afternoon',
  ]);
  expect(
    backup.itineraries[0].days[1].activities.map((a: { title: string }) => a.title),
  ).not.toContain('A quiet neighbourhood');
});
test('AI assistant uses lightweight model, bounded follow-up context and honest quota errors without saving — mocked Gemini', async ({
  page,
}, info) => {
  const requests: Record<string, unknown>[] = [];
  let quota = false;
  await page.route('**/api/ai/**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: status() });
    const body = route.request().postDataJSON();
    requests.push(body);
    expect(body.operation).toBe('chat');
    if (quota)
      return route.fulfill({
        status: 429,
        json: { code: 'daily_budget' },
        headers: { 'Retry-After': '3600' },
      });
    await route.fulfill({
      json: {
        model: 'gemini-3.5-flash-lite',
        plan: null,
        chat: {
          answer:
            'Mocked assistant: leave a slower morning and confirm venue details before visiting.',
          followUps: ['Which neighbourhood suits us?'],
        },
        quota: { globalRemaining: 3, clientRemaining: 1 },
      },
    });
  });
  await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await page.getByRole('button', { name: 'Travel assistant', exact: true }).click();
  await page
    .getByLabel('I agree to send these planning details to Gemini.', { exact: true })
    .check();
  await page
    .getByLabel('Your travel question', { exact: true })
    .fill('How can we slow this day down?');
  await page.getByRole('button', { name: 'Ask the assistant' }).click();
  await expect(page.getByRole('log')).toContainText('Mocked assistant');
  await page.getByLabel('Your travel question', { exact: true }).fill('Could we focus on culture?');
  await page.getByRole('button', { name: 'Ask the assistant' }).click();
  await expect(page.locator('.ai-turn-model')).toHaveCount(2);
  expect(requests[1]!.messages as unknown[]).toHaveLength(3);
  await capture(page, info, 'ai-chat', '.ai-conversation');
  quota = true;
  await page.getByLabel('Your travel question', { exact: true }).fill('Another idea?');
  await page.getByRole('button', { name: 'Ask the assistant' }).click();
  await expect(page.getByRole('alert')).toContainText('five requests');
  await capture(page, info, 'ai-quota', '.ai-error');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.locator('.activity-card')).toHaveCount(3);
});
test('AI preview refuses stale revisions; missing key/model states keep manual planning usable — mocked Gemini', async ({
  page,
}, info) => {
  let unavailable: string | null = null;
  await page.route('**/api/ai/**', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: status(unavailable) });
    const input = route.request().postDataJSON();
    await route.fulfill({
      json: {
        model: 'gemini-3.8-flash',
        plan: aiPlan(input.context.dates),
        chat: null,
        quota: { globalRemaining: 4, clientRemaining: 2 },
      },
    });
  });
  const { trip } = await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await page
    .getByLabel('I agree to send these planning details to Gemini.', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await page.getByRole('checkbox', { name: 'A garden afternoon', exact: true }).check();
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('smart-travel-trips', 4);
      open.onsuccess = () => {
        const db = open.result,
          tx = db.transaction(['trips', 'itineraries'], 'readwrite');
        const metadata = tx.objectStore('trips').get(id),
          plan = tx.objectStore('itineraries').get(id);
        metadata.onsuccess = () => {
          const v = metadata.result;
          v.revision++;
          tx.objectStore('trips').put(v);
        };
        plan.onsuccess = () => {
          const v = plan.result;
          v.revision++;
          v.days[0].notes = 'Newer external note';
          tx.objectStore('itineraries').put(v);
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(new Error('Synthetic conflict fixture failed'));
      };
    });
  }, trip.id);
  await page.getByRole('button', { name: 'Apply selected suggestions' }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await capture(page, info, 'ai-stale', '.ai-error');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'A garden afternoon', exact: true }),
  ).not.toBeVisible();
  unavailable = 'missing_key';
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await expect(page.getByText(/AI is not configured on this development server/)).toBeVisible();
  await capture(page, info, 'ai-missing-key', '.ai-notice');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  unavailable = 'model_unavailable';
  await page.getByRole('button', { name: 'Generate with AI' }).click();
  await expect(page.getByText(/configured model is unavailable/)).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add an activity' })).toBeVisible();
});
