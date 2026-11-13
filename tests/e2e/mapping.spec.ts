import { test, expect } from './offline-fixture';
import { readFile } from 'node:fs/promises';
import {
  seedMappedTrip,
  mapView,
  listView,
  mockBasemap,
  captureMap,
  mockRoute,
} from './mapping-fixture';
test('map marker synchronization, day updates, ordered walking/driving routes and cache reuse — mocked providers', async ({
  page,
}, info) => {
  const width = info.project.use.viewport!.width;
  await mockBasemap(page);
  const calls: { mode: string; waypoints: { latitude: number; longitude: number }[] }[] = [];
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    await route.fulfill({ json: mockRoute(body), headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await seedMappedTrip(page);
  await mapView(page, width);
  await page.getByRole('button', { name: 'Open interactive map' }).click();
  await expect(page.getByText('Basemap loaded', { exact: true })).toBeAttached();
  await expect(page.locator('.travel-map-marker')).toHaveCount(3);
  expect(
    await page
      .locator('.map-surface')
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeGreaterThan(250);
  await captureMap(page, info, 'mocked-map');
  await page.getByRole('button', { name: 'Map activity 1: Garden morning', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.activity-card[data-selected=true] h3')).toHaveText('Garden morning');
  await expect(page.locator('.activity-card[data-selected=true]')).toBeFocused();
  await captureMap(page, info, 'selected-itinerary');
  await page
    .locator('.activity-card')
    .filter({ has: page.getByRole('heading', { name: 'Garden morning', exact: true }) })
    .getByRole('button', { name: 'Show on map', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Map activity 1: Garden morning' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.locator('.route-summary')).toContainText('2.6 km');
  await expect(page.locator('.route-summary')).toContainText('32 min');
  expect(calls).toHaveLength(1);
  expect(calls[0]!.waypoints[0]).toEqual({ latitude: 35.0142, longitude: 135.7481 });
  await captureMap(page, info, 'mocked-walking-route');
  await page.getByRole('button', { name: 'Driving', exact: true }).click();
  await expect(page.locator('.route-summary')).not.toBeVisible();
  await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.locator('.route-summary')).toContainText('9 min');
  expect(calls).toHaveLength(2);
  await page.getByRole('button', { name: 'Walking', exact: true }).click();
  await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.locator('.route-summary')).toContainText('32 min');
  expect(calls).toHaveLength(2);
  await page.getByRole('button', { name: /Day 2/ }).click();
  await expect(page.locator('.travel-map-marker')).toHaveCount(2);
  await expect(page.locator('.route-summary')).not.toBeVisible();
  await expect(page.getByText('Add another location to calculate a route.')).toBeVisible();
  await listView(page, width);
  await expect(page.getByRole('heading', { name: 'Another day', exact: true })).toBeVisible();
});
test('place search debounce, explicit location replacement, saved coordinates and complete backup — mocked HTTP', async ({
  page,
}, info) => {
  const width = info.project.use.viewport!.width;
  let searches = 0;
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    searches++;
    expect(route.request().postDataJSON().operation).toBe('location');
    await route.fulfill({
      json: {
        locations: [
          {
            id: 'synthetic-place-id',
            name: 'A Kyoto garden',
            address: 'Mocked provider search result, Kyoto',
            latitude: 35.0142,
            longitude: 135.7481,
            source: 'geoapify',
          },
        ],
        route: null,
        fetchedAt: '2026-11-05T00:00:00.000Z',
        cached: false,
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Edit An unplanned hour', exact: true }).click();
  await page.getByText('Find a location', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Worldwide places' }).click();
  await page.getByLabel('Search for a place', { exact: true }).fill('Kyoto garden');
  await page.getByRole('button', { name: /A Kyoto garden.*Geoapify search result/ }).click();
  expect(searches).toBe(1);
  await expect(page.getByLabel('Location name (optional)', { exact: true })).toHaveValue('');
  await captureMap(page, info, 'place-confirmation');
  await page.getByRole('button', { name: 'Use this location', exact: true }).click();
  await expect(page.getByLabel('Location name (optional)', { exact: true })).toHaveValue(
    'A Kyoto garden',
  );
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit An unplanned hour', exact: true }).click();
  await expect(page.getByLabel('Location name (optional)', { exact: true })).toHaveValue(
    'A Kyoto garden',
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await mapView(page, width);
  await expect(page.getByText('3 of 3 activities located', { exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const download = await pending;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.itineraries[0].days[0].activities[2]).toMatchObject({
    locationName: 'A Kyoto garden',
    latitude: 35.0142,
    longitude: 135.7481,
  });
});
test('failed tiles and provider quota preserve all manual planning and location-list controls', async ({
  page,
}, info) => {
  const width = info.project.use.viewport!.width;
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort());
  let count = 0;
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    count++;
    await route.fulfill({
      status: 429,
      json: { code: 'daily_budget' },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Retry-After',
        'Retry-After': '60',
      },
    });
  });
  await seedMappedTrip(page);
  await mapView(page, width);
  await page.getByRole('button', { name: 'Open interactive map' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'basemap is unavailable' })).toBeVisible();
  await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
  await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'shared daily allowance' })).toBeVisible();
  await captureMap(page, info, 'network-fallback');
  expect(count).toBe(1);
  await page.getByRole('button', { name: 'Driving', exact: true }).click();
  await page.getByRole('button', { name: 'Walking', exact: true }).click();
  await listView(page, width);
  await page.getByRole('button', { name: 'Edit Garden morning', exact: true }).click();
  await page.getByLabel('Activity title', { exact: true }).fill('A slower garden morning');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A slower garden morning', exact: true }),
  ).toBeVisible();
  expect(count).toBe(1);
});
