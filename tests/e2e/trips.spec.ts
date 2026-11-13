import { test, expect } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('worldwide wizard selection reuses the mocked discovery contract and has a manual error fallback', async ({
  page,
}) => {
  const calls: string[] = [];
  let failed = false;
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body.operation);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Retry-After': '5',
      'Access-Control-Expose-Headers': 'Retry-After',
    };
    await route.fulfill({
      status: failed ? 429 : 200,
      headers,
      body: JSON.stringify(
        failed
          ? { code: 'daily_budget' }
          : {
              destinations: [
                {
                  id: 'geo-' + 'a'.repeat(40),
                  name: 'Osaka',
                  country: 'Japan',
                  kind: 'city',
                  latitude: 34.7,
                  longitude: 135.5,
                  source: 'geoapify',
                  fetchedAt: '2026-11-05T00:00:00.000Z',
                },
              ],
              attractions: [],
              cached: false,
              fetchedAt: '2026-11-05T00:00:00.000Z',
            },
      ),
    });
  });
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Worldwide search' }).click();
  await page.getByLabel('Search destinations').fill('Osaka');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: /Osaka.*Japan/ }).click();
  await expect(page.getByRole('status')).toContainText('Selected: Osaka, Japan');
  failed = true;
  await page.getByLabel('Search destinations').fill('Tokyo');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('allowance');
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByLabel('Destination name').fill('Another place');
  await page.getByRole('button', { name: 'Use this destination' }).click();
  await expect(page.getByRole('status')).toContainText('Selected: Another place');
  expect(calls).toEqual(['search', 'search']);
});

test('guest trip wizard, reload, edit, backup import and confirmed deletion', async ({
  page,
}, info) => {
  const width = info.project.use.viewport!.width;
  const external: string[] = [];
  page.on('request', (r) => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(r.url()).hostname))
      external.push('unexpected request');
  });
  async function capture(name: string) {
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`${name}-${width}.png`),
      fullPage: true,
    });
  }
  async function next() {
    await page.getByRole('button', { name: /^Next:/ }).click();
  }
  await page.goto('/destinations/kyoto');
  await page.getByRole('button', { name: 'Save Kyoto', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device.' })).toBeVisible();
  await page.goto('/trips');
  await expect(page.getByRole('heading', { name: 'The world is still unwritten.' })).toBeVisible();
  await page.getByRole('link', { name: 'Create new trip', exact: true }).click();
  await page.getByRole('button', { name: /Kyoto.*Japan/ }).click();
  await capture('wizard-destination');
  await next();
  await page.getByLabel('Start date').fill('2030-03-20');
  await page.getByLabel('End date').fill('2030-03-23');
  await next();
  await page.getByLabel('Number of travelers').fill('2');
  await page.getByLabel('Travel group').selectOption('Couple');
  await next();
  await page.getByLabel('Total trip budget').fill('1200.50');
  await page.getByLabel('Currency', { exact: true }).selectOption('EUR');
  await next();
  await page.getByLabel('Culture', { exact: true }).check();
  await page.getByLabel('Food', { exact: true }).check();
  await next();
  await page.getByLabel(/Slow mornings/).check();
  await next();
  await page.getByLabel('Trip name').fill('Kyoto, slowly');
  await capture('wizard-review');
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kyoto, slowly', level: 1 })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Saved on this device.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Kyoto, slowly', level: 1 })).toBeVisible();
  await capture('trip-overview');
  await page.getByRole('link', { name: 'Edit trip details' }).click();
  await next();
  await page.getByLabel('End date').fill('2030-03-24');
  await next();
  await next();
  await next();
  await next();
  await next();
  await page.getByLabel('Trip name').fill('Kyoto, a little longer');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(
    page.getByRole('heading', { name: 'Kyoto, a little longer', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('5 days, including arrival and departure')).toBeVisible();
  await page.getByRole('link', { name: 'Back to My trips' }).click();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  await capture('dashboard');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trips', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  const backup = JSON.parse(bytes.toString());
  expect(backup.format).toBe('smart-travel-trips');
  expect(backup.trips).toHaveLength(1);
  expect(backup.trips[0].title).toBe('Kyoto, a little longer');
  await page
    .getByLabel('Import trips JSON file')
    .setInputFiles({ name: 'test-backup.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByRole('dialog', { name: 'Review your import' })).toBeVisible();
  await expect(page.getByText('0 to add · 0 conflict copies · 1 identical trips')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  const conflict = { ...backup, trips: [{ ...backup.trips[0], title: 'An imported alternative' }] };
  await page.getByLabel('Import trips JSON file').setInputFiles({
    name: 'test-conflict.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(conflict)),
  });
  await expect(page.getByText('1 to add · 1 conflict copies · 0 identical trips')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm import' }).click();
  await expect(page.locator('.trip-card')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.trip-card')).toHaveCount(2);
  await page.getByLabel('Import trips JSON file').setInputFiles({
    name: 'test-invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"bad":true}'),
  });
  await expect(page.getByRole('alert')).toContainText('Unsupported or invalid');
  await expect(page.locator('.trip-card')).toHaveCount(2);
  await page.getByRole('link', { name: 'Kyoto, a little longer', exact: true }).click();
  await page.getByRole('button', { name: 'Delete trip', exact: true }).click();
  await page.getByRole('button', { name: 'Keep trip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Delete trip', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Delete trip', exact: true }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('heading', { name: /Welcome to your/ })).toBeVisible();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  await expect(
    page.getByRole('link', { name: 'An imported alternative', exact: true }),
  ).toBeVisible();
  await page.goto('/saved');
  await expect(page.getByRole('link', { name: 'Kyoto', exact: true })).toBeVisible();
  expect(external).toEqual([]);
  expect(page.url()).not.toContain('/auth');
});

test('manual destination and storage-unavailable feedback remain guest-only', async ({ page }) => {
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Next: Travel dates' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose a destination');
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByLabel('Destination name').fill('A quiet village');
  await page.getByLabel('Country or region (optional)').fill('Portugal');
  await page.getByRole('button', { name: 'Use this destination' }).click();
  await expect(page.getByText(/Selected: A quiet village/)).toBeVisible();
  await page.getByRole('button', { name: 'Next: Travel dates' }).click();
  await page.getByLabel('Start date').fill('2030-06-12');
  await page.getByLabel('End date').fill('2030-06-10');
  await page.getByRole('button', { name: 'Next: Travelers' }).click();
  await expect(page.getByRole('alert')).toContainText('End date must');
  await page.getByLabel('End date').fill('2030-06-12');
  await page.getByRole('button', { name: 'Next: Travelers' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Start date')).toHaveValue('2030-06-12');
  await page.getByRole('button', { name: 'My trips', exact: true }).click();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Start date')).toHaveValue('2030-06-12');
  await page.getByRole('button', { name: 'My trips', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await page.goto('/trips');
  await expect(page.getByRole('alert')).toContainText('unavailable');
  await expect(page.getByRole('button', { name: 'Retry storage' })).toBeEnabled();
});
