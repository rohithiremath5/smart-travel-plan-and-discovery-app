import { test, expect, type Page, type TestInfo, type Locator } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { seedMappedTrip } from './mapping-fixture';
import { weatherFixture } from '../fixtures/weather';
async function capture(page: Page, info: TestInfo, name: string, locator?: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  const filename = `${name}-${info.project.use.viewport!.width}.png`;
  const path =
    process.env.SMART_TRAVEL_PHASE8_CAPTURE === '1'
      ? `docs/review/phase-8/screenshots/${filename}`
      : info.outputPath(filename);
  if (process.env.SMART_TRAVEL_PHASE8_CAPTURE === '1')
    await mkdir('docs/review/phase-8/screenshots', { recursive: true });
  const style = '.skip-link { visibility:hidden !important; }';
  if (locator) await locator.screenshot({ path, style });
  else await page.screenshot({ path, fullPage: false, style });
}
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2030-03-20T09:00:00Z') });
  const { trip } = await seedMappedTrip(page);
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open('smart-travel-trips', 4);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('trips', 'readwrite'),
          store = tx.objectStore('trips'),
          get = store.get(id);
        get.onsuccess = () =>
          store.put({
            ...get.result,
            title: 'Udaipur, a thoughtful journey',
            currency: 'INR',
            travelers: 3,
            budgetMinor: 2000000,
            destination: {
              id: 'udaipur-review',
              name: 'Udaipur',
              country: 'India',
              source: 'curated',
              latitude: 24.5854,
              longitude: 73.7125,
            },
          });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  }, trip.id);
  await page.goto(`/trips/${trip.id}/budget`);
  await expect(page.getByRole('heading', { name: 'Your assumptions' })).toBeVisible();
  return trip.id;
}

test('budget, expenses and static currency persist through v4 backup/restore and private print — offline fixtures', async ({
  page,
  context,
}, info) => {
  test.setTimeout(150000);
  let external = 0;
  await context.route('**/*', (route) => {
    if (['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname))
      return route.continue();
    external++;
    return route.abort();
  });
  const id = await seed(page);
  await page.evaluate(() => scrollTo(0, 0));
  await capture(page, info, 'budget-overview');
  await capture(page, info, 'budget-summary', page.locator('.budget-stats'));
  await page.getByLabel('Distance (km)', { exact: true }).fill('100');
  await page.getByLabel('Number of vehicles').fill('2');
  await page.getByLabel('Distance interpretation').selectOption('return');
  await page.getByLabel('Accommodation nights').fill('2');
  await page.getByLabel('Contingency (%)', { exact: true }).fill('10');
  await expect(page.getByRole('region', { name: 'Budget at a glance' })).toContainText(
    '₹17,930.00',
  );
  await capture(
    page,
    info,
    'estimate-controls',
    page.locator('[aria-labelledby="assumptions-title"]'),
  );
  await page.getByLabel('Custom estimate label').fill('Museum passes');
  await page.getByLabel('Custom estimate amount').fill('500');
  await page.getByRole('button', { name: 'Add custom estimate', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Budget at a glance' })).toContainText(
    '₹18,480.00',
  );
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await expect(page.getByLabel('Amount', { exact: true })).toBeFocused();
  await page.getByLabel('Amount', { exact: true }).fill('1234.56');
  await page.getByLabel('Expense category').selectOption('Food');
  await page.getByLabel('Expense date (optional)').fill('2030-03-20');
  await page.getByLabel('Description (optional)').fill('Synthetic lunch');
  await page.getByRole('button', { name: 'Keep expense in draft' }).click();
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('Expense currency').selectOption('USD');
  await page.getByLabel('Amount', { exact: true }).fill('10');
  await page.getByLabel('Description (optional)').fill('Synthetic ticket');
  await page.getByRole('button', { name: 'Keep expense in draft' }).click();
  await capture(page, info, 'actual-expenses', page.locator('[aria-labelledby="expenses-title"]'));
  await page.getByLabel('Convert from').selectOption('AED');
  await expect(page.locator('.currency-result')).toHaveText('Reference rate required');
  await page.getByLabel('Manual rate: INR per 1 AED').fill('22');
  await page.getByLabel('Rate reference date').fill('2026-11-10');
  await page.getByRole('button', { name: 'Keep manual rate in draft' }).click();
  await expect(page.locator('.currency-result')).toContainText('₹22.00');
  await capture(
    page,
    info,
    'currency-reference',
    page.locator('[aria-labelledby="currency-title"]'),
  );
  await page.getByRole('button', { name: 'Save budget and expenses', exact: true }).click();
  await expect(page.getByText('Budget and expenses saved on this device.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Distance (km)', { exact: true })).toHaveValue('100');
  await expect(page.getByText('Synthetic lunch', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Budget currency')).toBeDisabled();
  await page.getByRole('button', { name: 'Edit expense Synthetic lunch' }).click();
  await page.getByLabel('Amount', { exact: true }).fill('1200');
  await page.getByRole('button', { name: 'Keep expense in draft' }).click();
  await page.getByRole('button', { name: 'Save budget and expenses', exact: true }).click();
  await expect(page.getByText('Budget and expenses saved on this device.')).toBeVisible();
  await page.goto(`/trips/${id}/organizer`);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await downloadEvent).path())!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.budgets[0].expenses).toHaveLength(2);
  expect(backup.budgets[0].manualRates[0].referenceDate).toBe('2026-11-10');
  await page.getByRole('link', { name: 'Print summary', exact: true }).click();
  const sheet = page.getByRole('article', { name: 'Selected trip print summary' });
  await expect(sheet).not.toContainText('Actual expense totals');
  await page.getByLabel('Include estimated budget breakdown').check();
  await page.getByLabel('Include actual expense totals (no descriptions)').check();
  await expect(sheet).toContainText('Actual expense totals');
  await expect(sheet).not.toContainText('Synthetic lunch');
  await page.emulateMedia({ media: 'print' });
  await capture(page, info, 'print-budget', sheet);
  await page.emulateMedia({ media: 'screen' });
  backup.budgets[0].custom[0].label = 'Alternate synthetic estimate';
  await page.goto('/trips');
  await page.getByLabel('Import trips JSON file').setInputFiles({
    name: 'synthetic-v4.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole('dialog', { name: 'Review your import' })).toContainText(
    '1 conflict copies',
  );
  await capture(
    page,
    info,
    'budget-import-preview',
    page.getByRole('dialog', { name: 'Review your import' }),
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  await page.getByLabel('Import trips JSON file').setInputFiles({
    name: 'synthetic-v4.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.locator('.trip-card')).toHaveCount(2);
  expect(external).toBe(0);
});

test('weather loads only explicitly, validates mocked provider data, caches and shows failures — no live API', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  let requests = 0,
    status = 200;
  await context.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (['127.0.0.1', 'localhost'].includes(host)) return route.continue();
    if (host === 'api.open-meteo.com') {
      requests++;
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(status === 200 ? weatherFixture() : { error: true }),
      });
    }
    return route.abort();
  });
  await seed(page);
  expect(requests).toBe(0);
  await page.getByLabel('Distance (km)', { exact: true }).fill('150');
  expect(requests).toBe(0);
  await page.getByRole('checkbox', { name: /personal, non-commercial/ }).check();
  await page.getByRole('button', { name: 'Load weather', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partly cloudy' })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByLabel('Temperature unit').selectOption('F');
  await expect(page.locator('.weather-panel')).toContainText('84°F');
  await capture(page, info, 'weather-forecast', page.locator('.weather-panel'));
  await page.getByRole('button', { name: 'Use cached forecast' }).click();
  expect(requests).toBe(1);
  await page.getByLabel('Price per meal').fill('300');
  expect(requests).toBe(1);
  status = 429;
  await page.clock.fastForward(31000);
  await page.getByRole('button', { name: 'Refresh forecast' }).click();
  await expect(page.locator('.weather-panel').getByRole('alert')).toContainText('quota');
  await expect(page.getByRole('heading', { name: 'Partly cloudy' })).toBeVisible();
  await capture(page, info, 'weather-error', page.locator('.weather-panel'));
  expect(requests).toBe(2);
});

test('stale budget draft needs explicit review; unavailable weather stays local — synthetic two-tab workflow', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  await context.route('**/*', (r) =>
    ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname)
      ? r.continue()
      : r.abort(),
  );
  const id = await seed(page);
  await page.getByLabel('Number of vehicles').fill('2');
  const other = await context.newPage();
  await other.goto(`/trips/${id}/budget`);
  await other.getByLabel('Price per meal').fill('999');
  await other.getByRole('button', { name: 'Save budget and expenses', exact: true }).click();
  await expect(other.getByText('Budget and expenses saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Save budget and expenses', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.getByLabel('Number of vehicles')).toHaveValue('2');
  await page.getByRole('button', { name: 'Review latest saved budget' }).click();
  await expect(page.locator('.organizer-latest')).toContainText('99900');
  await capture(page, info, 'budget-conflict', page.locator('.organizer-latest'));
  await page.getByRole('button', { name: 'Save my budget after review' }).click();
  await expect(page.getByText('Budget and expenses saved on this device.')).toBeVisible();
  await other.close();
  await page.goto('/trips');
  await page.evaluate(async (tripId) => {
    await new Promise<void>((resolve) => {
      const r = indexedDB.open('smart-travel-trips', 4);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('trips', 'readwrite'),
          store = tx.objectStore('trips'),
          q = store.get(tripId);
        q.onsuccess = () =>
          store.put({
            ...q.result,
            destination: {
              id: 'manual-review',
              name: 'A manually entered place',
              country: 'India',
              source: 'manual',
            },
          });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, id);
  await page.goto(`/trips/${id}/budget`);
  await expect(page.locator('.weather-panel')).toContainText('Location verification required');
  await capture(page, info, 'weather-unavailable', page.locator('.weather-panel'));
  await expect(page.getByRole('button', { name: 'Load weather', exact: true })).toHaveCount(0);
});
