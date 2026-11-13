import { test, expect } from '@playwright/test';
import { seedMappedTrip, mapView, captureMap } from './mapping-fixture';
test('OpenFreeMap public tiles — live browser review only, no Geoapify request', async ({
  page,
}, info) => {
  test.skip(
    process.env.SMART_TRAVEL_LIVE_TILES !== '1',
    'Opt-in public-tile review; not part of deterministic provider mocks.',
  );
  const tileResponses: string[] = [];
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.url().startsWith('https://tiles.openfreemap.org/')) {
      if (response.ok()) tileResponses.push(new URL(response.url()).pathname);
      else failed.push(String(response.status()));
    }
  });
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await seedMappedTrip(page);
  await mapView(page, info.project.use.viewport!.width);
  await page.getByRole('button', { name: 'Open interactive map' }).click();
  await expect(page.getByText('Basemap loaded', { exact: true })).toBeAttached({ timeout: 25000 });
  expect(
    tileResponses.some((path) => !path.startsWith('/styles/') && !path.endsWith('.json')),
  ).toBe(true);
  expect(failed).toEqual([]);
  await captureMap(page, info, 'live-openfreemap');
  await info.attach('public-tile-evidence', {
    body: JSON.stringify({
      liveTilesLoaded: true,
      successfulResponses: tileResponses.length,
      geoapifyRequested: false,
    }),
    contentType: 'application/json',
  });
});
