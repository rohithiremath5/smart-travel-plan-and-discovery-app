import { test, expect, type Page, type TestInfo } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import { createHandler, type DiscoveryStore } from '../../supabase/functions/_shared/handler';
import type { DiscoveryResponse } from '../../supabase/functions/_shared/contracts';
import { rawDestination } from '../fixtures/destination-search';
import type { MappingResponse } from '../../supabase/functions/_shared/mapping-contracts';

async function mockDiscovery(page: Page) {
  const calls: { operation: string; query?: string; kind?: string }[] = [];
  let failure = 0;
  const cache = new Map<string, DiscoveryResponse | MappingResponse>();
  const store: DiscoveryStore = {
    acquire: async (key) =>
      cache.has(key)
        ? { state: 'hit', payload: cache.get(key)! }
        : { state: 'reserved', lease: 'fixture' },
    complete: async (key, _lease, payload) => {
      if (payload) cache.set(key, payload);
    },
  };
  const fetcher: typeof fetch = async (input) => {
    if (failure) return new Response('Synthetic provider failure', { status: failure });
    const url = new URL(String(input)),
      query = url.searchParams.get('text') ?? '';
    if (query.toLowerCase().includes('chikmangalur') || query === 'unresolved place')
      return Response.json({ features: [] });
    const district = rawDestination(),
      city = rawDestination(
        { result_type: 'city', city: 'Chikkamagaluru', name: 'Chikkamagaluru' },
        2,
      );
    const state = rawDestination({ result_type: 'state', state: 'Karnataka' }, 3),
      country = rawDestination({ result_type: 'country', country: 'India' }, 4);
    const features = url.pathname.includes('place-details')
      ? [district]
      : url.searchParams.get('type') === 'country'
        ? [country]
        : url.searchParams.get('type') === 'state'
          ? [state]
          : url.searchParams.get('type') === 'city'
            ? [city]
            : [district, city];
    return Response.json({ features });
  };
  const handler = createHandler(
    {
      url: 'https://synthetic.example',
      adminKey: 'fixture-admin',
      publishableKeys: [['sb_publishable_', 'synthetic_public_fixture'].join('')],
      geoapifyKey: 'fixture-server-only',
      origins: ['http://127.0.0.1:4173'],
      budget: 100,
    },
    store,
    fetcher,
  );
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    calls.push(route.request().postDataJSON());
    const response = await handler(
      new Request(route.request().url(), {
        method: 'POST',
        headers: route.request().headers(),
        body: route.request().postData()!,
      }),
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  return {
    calls,
    fail: (status: number) => {
      failure = status;
    },
  };
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    scrollTo(0, 0);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  const filename = `after-${name}-${info.project.use.viewport!.width}.png`;
  const target =
    process.env.SMART_TRAVEL_SEARCH_CAPTURE === '1'
      ? `docs/review/phase-6-1/screenshots/${filename}`
      : info.outputPath(filename);
  if (process.env.SMART_TRAVEL_SEARCH_CAPTURE === '1')
    await mkdir('docs/review/phase-6-1/screenshots', { recursive: true });
  const temporary = target + '.tmp-' + crypto.randomUUID();
  await writeFile(temporary, await page.screenshot({ fullPage: true }));
  await rename(temporary, target);
}
test('corrected district explorer, keyboard details/save and complete guest wizard/reload/backup — mocked Geoapify', async ({
  page,
}, info) => {
  const api = await mockDiscovery(page);
  await page.goto('/discover?source=live&q=Chikkamagaluru');
  await expect(page.getByLabel('Search for')).toHaveValue('locality');
  await expect(page.locator('.destination-card')).toHaveCount(2);
  await expect(
    page.getByText('District / county · Explore the place and its surroundings.'),
  ).toBeVisible();
  await capture(page, info, 'explorer');
  await page
    .getByRole('combobox', { name: 'Where would you like to go?' })
    .fill('Chikkamagaluru, Karnataka');
  await expect(
    page.getByRole('option', { name: /Chikkamagaluru.*District \/ county/ }),
  ).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Chikkamagaluru', level: 1 })).toBeVisible();
  await expect(page.getByText(/not the boundary of the district/)).toBeVisible();
  await capture(page, info, 'district-detail');
  await page.getByRole('button', { name: 'Save Chikkamagaluru', exact: true }).click();
  await expect(page.getByText('Saved on this device.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', {
      name: 'Remove Chikkamagaluru from saved destinations',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Worldwide search' }).click();
  await page.getByLabel('Search destinations').fill('Chikkamagaluru');
  await page.getByLabel('Search destinations').press('Enter');
  await page.getByRole('button', { name: /Chikkamagaluru.*District \/ county/ }).click();
  await capture(page, info, 'wizard');
  async function next() {
    await page.getByRole('button', { name: /^Next:/ }).click();
  }
  await next();
  await page.getByLabel('Start date').fill('2030-03-20');
  await page.getByLabel('End date').fill('2030-03-21');
  await next();
  await next();
  await page.getByLabel('Total trip budget').fill('10000');
  await page.getByLabel('Currency', { exact: true }).selectOption('INR');
  await next();
  await page.getByLabel('Culture', { exact: true }).check();
  await next();
  await next();
  await page.getByLabel('Trip name').fill('Synthetic district trip');
  await page.getByRole('button', { name: 'Create trip', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Synthetic district trip', level: 1 }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('District / county', { exact: true })).toBeVisible();
  await page.goto('/trips');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export trips', exact: true }).click();
  const download = await downloadPromise,
    path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.trips[0].destination).toMatchObject({
    kind: 'county',
    state: 'Karnataka',
    county: 'Chikkamagaluru',
    latitude: 13.316,
  });
  expect(
    api.calls
      .filter((call) => call.operation === 'search')
      .every((call) => call.kind === 'locality'),
  ).toBe(true);
});
test('explicit spelling suggestions, global type filters, no-results and quota fallback — mocked Geoapify', async ({
  page,
}, info) => {
  const api = await mockDiscovery(page);
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Worldwide search' }).click();
  await page.getByLabel('Search destinations').fill('Chikmangalur');
  await expect(
    page.getByText(/Possible spelling, not a documented alternative name/),
  ).toBeVisible();
  expect(api.calls).toHaveLength(0);
  await expect(page.getByLabel('Search destinations')).toHaveValue('Chikmangalur');
  await capture(page, info, 'spelling');
  await page.getByRole('button', { name: 'Search all destinations for Chikkamagaluru' }).click();
  await expect(
    page.getByRole('button', { name: /Chikkamagaluru.*District \/ county/ }),
  ).toBeVisible();
  expect(api.calls).toHaveLength(1);
  await page.getByLabel('Destination type').selectOption('state');
  await page.getByLabel('Search destinations').fill('Karnataka');
  await page.getByLabel('Search destinations').press('Enter');
  await expect(page.getByRole('button', { name: /Karnataka.*State \/ province/ })).toBeVisible();
  await page.getByLabel('Destination type').selectOption('country');
  await page.getByLabel('Search destinations').fill('India');
  await page.getByLabel('Search destinations').press('Enter');
  await expect(page.getByRole('button', { name: /India.*Country/ })).toBeVisible();
  await page.getByLabel('Search destinations').fill('unresolved place');
  await page.getByLabel('Search destinations').press('Enter');
  await expect(page.getByText(/No places found. Try All destinations/)).toBeVisible();
  api.fail(429);
  await page.getByLabel('Search destinations').fill('Wayanad');
  await page.getByLabel('Search destinations').press('Enter');
  await expect(page.getByRole('alert')).toContainText('allowance');
  expect(api.calls).toHaveLength(5);
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByLabel('Destination name').fill('A personal destination');
  await page.getByRole('button', { name: 'Use this destination' }).click();
  await expect(page.getByRole('status')).toContainText('Selected: A personal destination');
});
