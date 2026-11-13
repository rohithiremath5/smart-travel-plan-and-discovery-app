import { test, expect } from './offline-fixture';
import type { Page, TestInfo, Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { weatherFixture } from '../fixtures/weather';
import { aiPlan } from '../fixtures/ai';
import { seedMappedTrip, mockBasemap, mapView, mockRoute } from './mapping-fixture';

async function capture(page: Page, info: TestInfo, name: string, locator?: Locator) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    scrollTo(0, 0);
    document.querySelector('[role="dialog"]')?.scrollTo(0, 0);
  });
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
    process.env.SMART_TRAVEL_PHASE9_CAPTURE === '1'
      ? `docs/review/phase-9/screenshots/${filename}`
      : info.outputPath(filename);
  if (process.env.SMART_TRAVEL_PHASE9_CAPTURE === '1')
    await mkdir('docs/review/phase-9/screenshots', { recursive: true });
  const options = {
    path,
    style: '.skip-link { visibility:hidden !important; }',
    animations: 'disabled' as const,
  };
  if (locator) await locator.screenshot(options);
  else await page.screenshot({ ...options, fullPage: false });
}
async function nav(page: Page, name: string) {
  const desktop = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name, exact: true });
  if (await desktop.isVisible()) await desktop.click();
  else {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name, exact: true })
      .click();
  }
}
const district = {
  id: 'geo-' + 'a'.repeat(40),
  name: 'Chikkamagaluru',
  country: 'India',
  kind: 'county',
  state: 'Karnataka',
  county: 'Chikkamagaluru',
  latitude: 13.316,
  longitude: 75.773,
  source: 'geoapify',
  fetchedAt: '2030-03-20T09:00:00.000Z',
};

test('connected guest journey: discovery through saved trip, planning, organizer, budget, weather, backup and private print — mocked only', async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.clock.install({ time: new Date('2030-03-20T09:00:00Z') });
  let weatherCalls = 0;
  await page.route('https://*.supabase.co/functions/v1/discovery', (r) =>
    r.fulfill({
      json: {
        destinations: [district],
        attractions: [],
        cached: false,
        fetchedAt: district.fetchedAt,
      },
    }),
  );
  await page.route('https://api.open-meteo.com/**', (r) => {
    weatherCalls++;
    return r.fulfill({ json: weatherFixture() });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Somewhere new.');
  await capture(page, info, 'landing');
  await nav(page, 'Discover');
  await page.getByRole('button', { name: 'Worldwide search', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Where would you like to go?' })
    .fill('Chikkamagaluru, Karnataka');
  await expect(
    page.getByRole('option', { name: /Chikkamagaluru.*District \/ county/ }),
  ).toBeVisible();
  await capture(page, info, 'discovery');
  await page.getByRole('combobox', { name: 'Where would you like to go?' }).press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Chikkamagaluru', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Save Chikkamagaluru', exact: true }).click();
  await expect(page.getByText('Saved on this device.', { exact: true })).toBeVisible();
  await capture(page, info, 'destination');
  await nav(page, 'Saved');
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await nav(page, 'My trips');
  await capture(page, info, 'dashboard-empty');
  await page.getByRole('link', { name: 'Create new trip', exact: true }).click();
  await page.getByRole('button', { name: 'Worldwide search', exact: true }).click();
  await page.getByLabel('Search destinations').fill('Chikkamagaluru');
  await page.getByLabel('Search destinations').press('Enter');
  await page.getByRole('button', { name: /Chikkamagaluru.*District \/ county/ }).click();
  async function next() {
    await page.getByRole('button', { name: /^Next:/ }).click();
  }
  await next();
  await page.getByLabel('Start date').fill('2030-03-20');
  await page.getByLabel('End date').fill('2030-03-21');
  await next();
  await page.getByLabel('Number of travelers').fill('3');
  await page.getByLabel('Travel group').selectOption('Friends');
  await next();
  await page.getByLabel('Currency', { exact: true }).selectOption('INR');
  await page.getByLabel('Total trip budget').fill('20000');
  await next();
  await page.getByLabel('Culture', { exact: true }).check();
  await next();
  await page.getByLabel(/Slow mornings/).check();
  await next();
  await page.getByLabel('Trip name').fill('Synthetic Karnataka journey');
  await capture(page, info, 'wizard-review');
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic Karnataka journey', level: 1 }),
  ).toBeVisible();
  const id = new URL(page.url()).pathname.split('/')[2]!;
  await capture(page, info, 'trip-overview');
  await page.getByRole('link', { name: 'Open itinerary', exact: true }).click();
  await page.getByRole('button', { name: 'Plan your first activity', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('Morning garden walk');
  await page.getByLabel('Start time (optional)').fill('09:00');
  await page.getByLabel('Duration in minutes').fill('45');
  await page.getByText('Coordinates (optional)', { exact: true }).click();
  await page.getByLabel('Latitude', { exact: true }).fill('13.316');
  await page.getByLabel('Longitude', { exact: true }).fill('75.773');
  await page.getByRole('button', { name: 'Add to day', exact: true }).click();
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('Afternoon coffee');
  await page.getByRole('button', { name: 'Add to day', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Afternoon coffee', exact: true }).click();
  await page.getByLabel('Duration in minutes').fill('90');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await page.getByRole('button', { name: 'Move Afternoon coffee up', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.activity-card h3').first()).toHaveText('Afternoon coffee');
  await page.getByLabel('Day notes', { exact: true }).fill('Private synthetic day note');
  await page.getByRole('button', { name: 'Save day notes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save day notes', exact: true })).toBeDisabled();
  await capture(page, info, 'itinerary');
  await page.getByRole('link', { name: 'Organizer', exact: true }).click();
  await page.getByRole('button', { name: 'Add trip note', exact: true }).click();
  await page.getByLabel('Title (optional)').fill('Private arrival');
  await page
    .getByLabel('Note', { exact: true })
    .fill('<script>window.phase9Injected=true</script> Synthetic private note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByText('<script>window.phase9Injected=true</script> Synthetic private note', {
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, 'phase9Injected'))).toBe(false);
  await page.getByRole('button', { name: 'Browse list templates', exact: true }).click();
  await page.getByLabel('Add to', { exact: true }).selectOption('packing');
  await page.getByRole('checkbox', { name: 'Phone and charger', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Everyday clothing', exact: true }).check();
  await page.getByRole('button', { name: 'Add selected items', exact: true }).click();
  for (const name of ['Phone and charger', 'Everyday clothing']) {
    await page.getByRole('checkbox', { name: 'Packed: ' + name, exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Packed: ' + name, exact: true }),
    ).toBeChecked();
  }
  await page.getByRole('button', { name: 'Add checklist item', exact: true }).click();
  await page.getByLabel('Item label').fill('Confirm arrival');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await capture(page, info, 'organizer');
  await capture(
    page,
    info,
    'packing',
    page.locator('#packing-heading').locator('..').locator('..'),
  );
  await page.getByRole('link', { name: 'Budget & weather', exact: true }).click();
  await expect(page.getByLabel('Price per vehicle-km')).toHaveValue('10.00');
  await page.getByLabel('Distance (km)', { exact: true }).fill('100');
  await expect(page.getByRole('region', { name: 'Budget at a glance' })).toContainText(
    '₹10,300.00',
  );
  await page.getByLabel('Travelers in this estimate').fill('4');
  await expect(page.getByRole('region', { name: 'Budget at a glance' })).toContainText(
    '₹12,400.00',
  );
  await capture(page, info, 'budget', page.locator('[aria-labelledby="assumptions-title"]'));
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('500.25');
  await page.getByLabel('Expense category').selectOption('Food');
  await page.getByLabel('Description (optional)').fill('Synthetic lunch');
  await page.getByRole('button', { name: 'Keep expense in draft', exact: true }).click();
  await capture(page, info, 'actual-expenses', page.locator('[aria-labelledby="expenses-title"]'));
  await page.getByLabel('Convert from').selectOption('AED');
  await expect(page.locator('.currency-result')).toHaveText('Reference rate required');
  await page.getByLabel('Manual rate: INR per 1 AED').fill('22');
  await page.getByLabel('Rate reference date').fill('2026-11-10');
  await page.getByRole('button', { name: 'Keep manual rate in draft', exact: true }).click();
  await capture(page, info, 'currency', page.locator('[aria-labelledby="currency-title"]'));
  expect(weatherCalls).toBe(0);
  await page.getByRole('checkbox', { name: /personal, non-commercial/ }).check();
  await page.getByRole('button', { name: 'Load weather', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Partly cloudy' })).toBeVisible();
  expect(weatherCalls).toBe(1);
  await capture(page, info, 'weather', page.locator('.weather-panel'));
  await page.getByRole('button', { name: 'Save budget and expenses', exact: true }).click();
  await expect(page.getByText('Budget and expenses saved on this device.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Synthetic lunch', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Distance (km)', { exact: true })).toHaveValue('100');
  await page.getByRole('link', { name: 'Itinerary', exact: true }).click();
  await expect(page.locator('.activity-card h3').first()).toHaveText('Afternoon coffee');
  await expect(page.getByLabel('Day notes', { exact: true })).toHaveValue(
    'Private synthetic day note',
  );
  await page.getByRole('link', { name: 'Organizer', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Packed: Phone and charger', exact: true }),
  ).toBeChecked();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip', exact: true }).click();
  const backup = JSON.parse(await readFile((await (await pending).path())!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.itineraries[0].days[0].activities.map((x: { title: string }) => x.title)).toEqual([
    'Afternoon coffee',
    'Morning garden walk',
  ]);
  expect(backup.organizers[0].packing.every((x: { complete: boolean }) => x.complete)).toBe(true);
  expect(backup.budgets[0].expenses[0].amountMinor).toBe(50025);
  expect(backup.budgets[0].manualRates[0].referenceDate).toBe('2026-11-10');
  expect(JSON.stringify(backup)).not.toMatch(
    /GEMINI_API_KEY|GEOAPIFY_API_KEY|SUPABASE_ACCESS_TOKEN/,
  );
  await page.getByRole('link', { name: 'Print summary', exact: true }).click();
  const sheet = page.getByRole('article', { name: 'Selected trip print summary' });
  await expect(sheet).not.toContainText('Private synthetic day note');
  await expect(sheet).not.toContainText('Synthetic private note');
  await page.getByLabel('Include estimated budget breakdown').check();
  await page.getByLabel('Include actual expense totals (no descriptions)').check();
  await expect(sheet).toContainText('₹12,400.00');
  await expect(sheet).toContainText('₹500.25');
  await expect(sheet).not.toContainText('Synthetic lunch');
  await page.emulateMedia({ media: 'print' });
  await capture(page, info, 'print', sheet);
  await page.emulateMedia({ media: 'screen' });
  await nav(page, 'My trips');
  await capture(page, info, 'dashboard');
  backup.budgets[0].assumptions.distanceMeters = 200000;
  const upload = {
    name: 'synthetic-v4.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page.getByLabel('Import trips JSON file').setInputFiles(upload);
  await expect(page.getByRole('dialog', { name: 'Review your import' })).toContainText(
    '1 conflict copies',
  );
  await capture(page, info, 'backup-preview', page.getByRole('dialog'));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.trip-card')).toHaveCount(1);
  await page.getByLabel('Import trips JSON file').setInputFiles(upload);
  await page.getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(page.locator('.trip-card')).toHaveCount(2);
  await page.goto(`/trips/${id}/budget`);
  await expect(page.getByLabel('Distance (km)', { exact: true })).toHaveValue('100');
  expect(weatherCalls).toBe(1);
});

test('map and AI review states remain optional, keyboard accessible and deterministic — no provider traffic', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  await mockBasemap(page);
  await page.route('https://*.supabase.co/functions/v1/discovery', (r) =>
    r.fulfill({ json: mockRoute(r.request().postDataJSON()) }),
  );
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/ai/**', async (r) => {
    if (r.request().method() === 'GET')
      return r.fulfill({
        json: {
          available: true,
          code: null,
          models: { planner: 'gemini-3.8-flash', chat: 'gemini-3.5-flash-lite' },
          dailyBudget: 5,
          clientBudget: 3,
          scope: 'controlled-development',
        },
      });
    const input = r.request().postDataJSON();
    await gate;
    await r.fulfill({
      json: {
        model: 'gemini-3.8-flash',
        plan: aiPlan(input.context.dates),
        chat: null,
        quota: { globalRemaining: 4, clientRemaining: 2 },
      },
    });
  });
  await seedMappedTrip(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mapView(page, info.project.use.viewport!.width);
  await page.getByRole('button', { name: 'Open interactive map', exact: true }).click();
  await expect(page.getByText('Basemap loaded', { exact: true })).toBeAttached();
  await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.locator('.route-summary')).toContainText('2.6 km');
  await capture(page, info, 'map-route', page.locator('.mapping-workspace'));
  await page.getByRole('button', { name: 'Map activity 1: Garden morning', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.activity-card[data-selected=true]')).toBeFocused();
  await page.getByRole('button', { name: 'Generate with AI', exact: true }).click();
  await capture(page, info, 'ai-consent', page.getByRole('dialog'));
  await page
    .getByLabel('I agree to send these planning details to Gemini.', { exact: true })
    .check();
  await page.getByRole('button', { name: 'Generate draft', exact: true }).click();
  await expect(page.getByText('Shaping a few possibilities…', { exact: true })).toBeVisible();
  await capture(page, info, 'ai-loading', page.getByRole('dialog'));
  release();
  await expect(page.getByRole('region', { name: 'AI suggestion preview' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'A garden afternoon', exact: true }).check();
  await capture(
    page,
    info,
    'ai-preview',
    page.getByRole('region', { name: 'AI suggestion preview' }),
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Generate with AI', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Garden morning', exact: true })).toBeVisible();
});

test('keyboard validation, long untrusted text and offline weather failure preserve the guest plan', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.clock.install({ time: new Date('2030-03-20T09:00:00Z') });
  const { trip } = await seedMappedTrip(page);
  await page.goto(`/trips/${trip.id}/budget`);
  await expect(page).toHaveTitle(/Budget/);
  await page.getByLabel('Distance (km)', { exact: true }).fill('-1');
  await capture(
    page,
    info,
    'budget-validation',
    page.locator('[aria-labelledby="assumptions-title"]'),
  );
  await expect(
    page.getByRole('button', { name: 'Save budget and expenses', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Distance (km)', { exact: true }).fill('0');
  await page.route('https://api.open-meteo.com/**', (r) => r.abort('internetdisconnected'));
  await page.getByRole('checkbox', { name: /personal, non-commercial/ }).check();
  await page.getByRole('button', { name: 'Load weather', exact: true }).click();
  await expect(page.locator('.weather-panel').getByRole('alert')).toContainText(
    'could not be loaded',
  );
  await capture(page, info, 'weather-error', page.locator('.weather-panel'));
  await page.getByRole('button', { name: 'Reset estimates', exact: true }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Reset estimates', exact: true })).toBeFocused();
});

test('maximum destination names, leap-day trips and near-limit private notes reflow and persist safely', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const name = 'S'.repeat(200),
    title = 'T'.repeat(100);
  const note =
    '<script>window.phase9Unsafe=true</script> ' +
    'Synthetic long note. '.repeat(200).slice(0, 3900);
  const destination = { ...district, id: 'geo-' + 'b'.repeat(40), name };
  await page.route('https://*.supabase.co/functions/v1/discovery', (route) =>
    route.fulfill({
      json: {
        destinations: [destination],
        attractions: [],
        cached: false,
        fetchedAt: district.fetchedAt,
      },
    }),
  );
  async function reflow() {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.goto('/destinations/' + destination.id);
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await reflow();
  await capture(page, info, 'long-destination', page.locator('.destination-intro'));
  await page.getByRole('button', { name: `Save ${name}`, exact: true }).click();
  await page.goto('/saved');
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await reflow();
  await page.goto('/discover?source=live&q=synthetic');
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await reflow();
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Enter manually', exact: true }).click();
  await page.getByLabel('Destination name').fill(name);
  await page.getByLabel('Country or region (optional)').fill('India');
  await page.getByRole('button', { name: 'Use this destination', exact: true }).click();
  await reflow();
  const next = () => page.getByRole('button', { name: /^Next:/ }).click();
  await next();
  await page.getByLabel('Start date').fill('2028-02-29');
  await page.getByLabel('End date').fill('2028-03-01');
  await next();
  await next();
  await page.getByLabel('Total trip budget').fill('0');
  await next();
  await page.getByLabel('Culture', { exact: true }).check();
  await next();
  await next();
  await page.getByLabel('Trip name').fill(title);
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await reflow();
  await page.getByRole('link', { name: 'Open organizer', exact: true }).click();
  await page.getByRole('button', { name: 'Add trip note', exact: true }).click();
  await page.getByLabel('Note', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  await reflow();
  expect(await page.evaluate(() => Object.hasOwn(window, 'phase9Unsafe'))).toBe(false);
  await capture(page, info, 'long-organizer', page.locator('.organizer-notes'));
  const id = new URL(page.url()).pathname.split('/')[2]!;
  for (const path of [
    `/trips/${id}/itinerary`,
    `/trips/${id}/budget`,
    `/trips/${id}/print`,
    '/trips',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
    await reflow();
  }
});
