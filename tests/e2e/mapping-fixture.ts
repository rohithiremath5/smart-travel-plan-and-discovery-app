import { expect, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
export async function seedMappedTrip(page: Page) {
  await page.goto('/');
  const id = crypto.randomUUID();
  const activity = (title: string, latitude?: number, longitude?: number) => ({
    id: crypto.randomUUID(),
    date: '2030-03-20',
    title,
    description: 'Synthetic review entry; coordinates entered by a user.',
    durationMinutes: 60,
    category: 'Culture',
    locationName: latitude === undefined ? '' : 'Saved review coordinate',
    currency: 'USD',
    notes: '',
    ...(latitude === undefined ? {} : { latitude, longitude }),
  });
  const activities = [
    activity('Garden morning', 35.0142, 135.7481),
    activity('Riverside tea', 35.0116, 135.7727),
    activity('An unplanned hour'),
  ];
  const trip = {
    id,
    schemaVersion: 1,
    revision: 1,
    createdAt: '2026-11-05T00:00:00.000Z',
    updatedAt: '2026-11-05T00:00:00.000Z',
    title: 'Kyoto, a sense of place',
    destination: {
      id: 'kyoto',
      name: 'Kyoto',
      country: 'Japan',
      source: 'curated',
      latitude: 35.0116,
      longitude: 135.7681,
    },
    startDate: '2030-03-20',
    endDate: '2030-03-21',
    travelers: 2,
    groupType: 'Couple',
    budgetMinor: 120000,
    currency: 'USD',
    budgetPreference: 'Value',
    interests: ['Culture'],
    pace: 'Balanced',
    status: 'Planning',
  };
  const plan = {
    schemaVersion: 1,
    tripId: id,
    revision: 0,
    days: [
      { date: '2030-03-20', notes: 'A synthetic journey for map review.', activities },
      {
        date: '2030-03-21',
        notes: '',
        activities: [{ ...activity('Another day', 35.003, 135.769), date: '2030-03-21' }],
      },
    ],
  };
  await page.evaluate(
    async (snapshot) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('smart-travel-trips', 2);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('trips', { keyPath: 'id' });
          request.result.createObjectStore('itineraries', { keyPath: 'tripId' });
        };
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction(['trips', 'itineraries'], 'readwrite');
          tx.objectStore('trips').add(snapshot.trip);
          tx.objectStore('itineraries').add(snapshot.plan);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(new Error('Synthetic seeding failed'));
        };
      });
    },
    { trip, plan },
  );
  await page.goto(`/trips/${id}/itinerary`);
  await expect(page.getByRole('heading', { name: trip.title, level: 1 })).toBeVisible();
  return { trip, plan };
}
export async function mapView(page: Page, width: number) {
  if (width < 1024) await page.getByRole('button', { name: 'Map & routes', exact: true }).click();
}
export async function listView(page: Page, width: number) {
  if (width < 1024) await page.getByRole('button', { name: 'Itinerary', exact: true }).click();
}
export async function mockBasemap(page: Page) {
  await page.route('https://tiles.openfreemap.org/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: 8,
        name: 'Deterministic mocked basemap — no live tiles',
        sources: {},
        layers: [
          { id: 'test-background', type: 'background', paint: { 'background-color': '#e9e9e1' } },
        ],
      }),
    }),
  );
}
export async function captureMap(page: Page, info: TestInfo, name: string) {
  await mkdir(info.outputDir, { recursive: true });
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
export function mockRoute(body: {
  mode: string;
  waypoints: { latitude: number; longitude: number }[];
}) {
  const a = body.waypoints[0]!,
    b = body.waypoints.at(-1)!;
  return {
    locations: [],
    route: {
      mode: body.mode,
      waypoints: body.waypoints,
      distanceMeters: 2600,
      durationSeconds: body.mode === 'walk' ? 1900 : 540,
      source: 'geoapify',
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [a.longitude, a.latitude],
            [135.76, 35.0142],
            [b.longitude, b.latitude],
          ],
        ],
      },
    },
    fetchedAt: '2026-11-05T00:00:00.000Z',
    cached: false,
  };
}
