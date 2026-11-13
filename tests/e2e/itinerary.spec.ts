import { test, expect, type Page, type TestInfo } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function legacyTrip(page: Page) {
  await page.goto('/');
  const record = {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    revision: 1,
    createdAt: '2026-11-05T00:00:00.000Z',
    updatedAt: '2026-11-05T00:00:00.000Z',
    title: 'Kyoto, one moment at a time',
    destination: { id: 'kyoto', name: 'Kyoto', country: 'Japan', source: 'curated' },
    startDate: '2030-03-20',
    endDate: '2030-03-23',
    travelers: 2,
    groupType: 'Couple',
    budgetMinor: 120000,
    currency: 'USD',
    budgetPreference: 'Value',
    interests: ['Culture'],
    pace: 'Balanced',
    status: 'Planning',
  };
  await page.evaluate(async (trip) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('smart-travel-trips', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('trips', { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('trips', 'readwrite');
        tx.objectStore('trips').add(trip);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(new Error('Synthetic seed failed'));
      };
    });
  }, record);
  await page.goto(`/trips/${record.id}/itinerary`);
  await expect(page.getByRole('heading', { name: record.title, level: 1 })).toBeVisible();
  return record;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    scrollTo(0, 0);
    document.querySelector('[role="dialog"]')?.scrollTo(0, 0);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath(`${name}-${info.project.use.viewport!.width}.png`),
    fullPage: !(await page.getByRole('dialog').count()),
  });
}
async function add(page: Page, title: string, time = '09:00') {
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill(title);
  await page.getByLabel('Start time (optional)', { exact: true }).fill(time);
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}
test('legacy trip upgrade, complete local planner, keyboard reorder, reload and offline editing', async ({
  page,
}, info) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname))
      external.push('external');
  });
  const trip = await legacyTrip(page);
  await capture(page, info, 'empty-day');
  await page.getByRole('button', { name: 'Plan your first activity' }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('Temple gardens');
  await page.getByLabel('Start time (optional)').fill('09:00');
  await page.getByLabel('Duration in minutes').fill('90');
  await page.getByLabel('Location name (optional)').fill('North gate');
  await page.getByLabel('Estimated cost (optional)').fill('12.50');
  await page.getByLabel('Activity notes (optional)').fill('Bring water');
  await capture(page, info, 'add-activity');
  await page.getByRole('button', { name: 'Add to day' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await add(page, 'Tea by the river', '10:00');
  await expect(page.getByLabel('Schedule reminders')).toContainText('overlaps');
  await page.getByLabel('Day notes', { exact: true }).fill('Meet at the station at 08:45.');
  await page.getByRole('button', { name: 'Save day notes' }).click();
  await expect(page.getByRole('button', { name: 'Save day notes' })).toBeDisabled();
  await capture(page, info, 'populated-itinerary');
  const move = page.getByRole('button', { name: 'Move Tea by the river up', exact: true });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.activity-card h3').first()).toHaveText('Tea by the river');
  await expect(page.getByLabel('Schedule reminders')).toContainText('chosen order');
  await capture(page, info, 'reordered-day');
  await page.getByRole('button', { name: 'Edit Tea by the river', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('A quiet tea break');
  await capture(page, info, 'edit-activity');
  await page.getByLabel('Day', { exact: true }).selectOption('2030-03-21');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: /Day 2/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet tea break' })).toBeVisible();
  await capture(page, info, 'multi-day');
  await page.reload();
  await page.getByRole('button', { name: /Day 2/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet tea break' })).toBeVisible();
  // Assets are loaded first. This checks in-session offline storage, not an offline cold reload.
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Edit A quiet tea break', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('An offline tea break');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'An offline tea break' })).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole('button', { name: 'Delete An offline tea break', exact: true }).click();
  await page.getByRole('button', { name: 'Keep activity' }).click();
  await page.getByRole('button', { name: 'Delete An offline tea break', exact: true }).click();
  await page.getByRole('button', { name: 'Remove activity', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Leave a little room for wonder.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Day 1/ }).click();
  await expect(page.getByLabel('Day notes', { exact: true })).toHaveValue(
    'Meet at the station at 08:45.',
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const download = await pending;
  const bytes = await readFile((await download.path())!);
  const backup = JSON.parse(bytes.toString());
  expect(backup.version).toBe(4);
  expect(backup.itineraries[0].days[0].activities[0].costMinor).toBe(1250);
  expect(backup.itineraries[0].days[0].notes).toContain('station');
  expect(backup.trips[0].id).toBe(trip.id);
  expect(external).toEqual([]);
});
test('date-change consent, complete conflict imports, notes guard and confirmed cascade', async ({
  page,
}, info) => {
  const trip = await legacyTrip(page);
  await add(page, 'A morning walk');
  await page.getByLabel('Day notes', { exact: true }).fill('Unsaved reminder');
  await page.getByRole('button', { name: /Day 2/ }).click();
  await expect(page.getByRole('dialog', { name: 'Keep your day notes?' })).toBeVisible();
  await page.getByRole('button', { name: 'Stay and save notes' }).click();
  await page.getByRole('button', { name: 'Save day notes' }).click();
  await expect(page.getByRole('button', { name: 'Save day notes' })).toBeDisabled();
  await page.getByRole('link', { name: 'Trip details', exact: true }).click();
  await page.getByRole('button', { name: /^Next:/ }).click();
  await page.getByLabel('Start date').fill('2030-03-21');
  await page.getByLabel('End date').fill('2030-03-22');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: /^Next:/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Review your new trip dates' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm date changes' })).toBeDisabled();
  await capture(page, info, 'date-change-preview');
  await page.getByLabel('Shift by day number', { exact: false }).check();
  await expect(dialog.getByText(/1 activities retained · 0 removed/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirm date changes' }).click();
  await expect(page.getByRole('heading', { name: trip.title, level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Open itinerary' }).click();
  await expect(page.getByRole('heading', { name: 'A morning walk' })).toBeVisible();
  await expect(page.getByLabel('Day notes', { exact: true })).toHaveValue('Unsaved reminder');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const download = await pending;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  backup.trips[0].title = 'An alternative itinerary';
  const originalId = backup.itineraries[0].days[0].activities[0].id;
  await page.goto('/trips');
  const file = {
    name: 'synthetic-itinerary.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page.getByLabel('Import trips JSON file').setInputFiles(file);
  await expect(page.getByText('1 to add · 1 conflict copies · 0 identical trips')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.locator('.trip-card')).toHaveCount(2);
  await page.getByLabel('Import trips JSON file').setInputFiles(file);
  await expect(page.getByText('0 to add · 0 conflict copies · 1 identical trips')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: 'An alternative itinerary', exact: true }).click();
  await page.getByRole('link', { name: 'Open itinerary' }).click();
  await expect(page.getByRole('heading', { name: 'A morning walk' })).toBeVisible();
  const copyId = new URL(page.url()).pathname.split('/')[2]!;
  expect(copyId).not.toBe(trip.id);
  const copyPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const copied = JSON.parse(await readFile((await (await copyPending).path())!, 'utf8'));
  expect(copied.itineraries[0].days[0].activities[0].id).not.toBe(originalId);
  await page.getByRole('link', { name: 'Trip overview' }).click();
  await page.getByRole('button', { name: 'Delete trip', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('all its activities');
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  await page.goto(`/trips/${copyId}/itinerary`);
  await expect(page.getByRole('alert')).toContainText('not found');
  await page.goto(`/trips/${trip.id}/itinerary`);
  await expect(page.getByRole('heading', { name: 'A morning walk' })).toBeVisible();
});
