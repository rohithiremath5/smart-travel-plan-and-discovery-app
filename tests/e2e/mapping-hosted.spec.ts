import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadBackendConfig } from '../../scripts/lib/backend-config';
import { managementApi } from '../../scripts/lib/management-api';
import { assertNoCredentials, knownPrivateValues } from '../../scripts/lib/review-files';
import { parseMappingRequest } from '../../supabase/functions/_shared/mapping-contracts';
import { seedMappedTrip, mapView, listView, captureMap } from './mapping-fixture';

test('hosted Geoapify cache and real tiles: search/save/reload, walk/drive, markers, day switch; mocked failure controls', async ({
  page,
}, info) => {
  test.skip(
    process.env.SMART_TRAVEL_LIVE_MAPPING !== '1',
    'Requires approved setup, live cache warmup and a verified 41-credit ledger.',
  );
  const config = loadBackendConfig(process.cwd());
  const api = managementApi(config);
  const values = await knownPrivateValues(process.cwd());
  const ledger = JSON.parse(await readFile('docs/review/phase-5/live-verification.json', 'utf8'));
  const payloads = JSON.parse(await readFile('docs/review/phase-5/live-inputs.json', 'utf8'));
  expect(ledger.status).toBe('LIVE_PROVIDER_CORE_CHECKS_PASSED');
  expect(ledger.additionalReservedCredits).toBeLessThanOrEqual(41);
  const width = info.project.use.viewport!.width;
  let failure: 'quota' | 'network' | null = null;
  const liveResponses: { operation: string; status: number; cached: boolean }[] = [];
  const pendingScans: Promise<void>[] = [];
  const requests: string[] = [];
  const key = (body: unknown) => {
    const parsed = parseMappingRequest(body);
    if (!parsed) throw new Error('Unapproved live request; stopped before forwarding.');
    const normalized =
      'query' in parsed ? { ...parsed, query: parsed.query.toLocaleLowerCase('en') } : parsed;
    return createHash('sha256')
      .update(`mapping-v1:${JSON.stringify(normalized)}`)
      .digest('hex');
  };
  const allowed = new Set([
    key(payloads.searchRequest),
    key(payloads.walkRequest),
    key(payloads.driveRequest),
  ]);
  page.on('response', (response) => {
    if (
      !response.url().endsWith('/functions/v1/discovery') ||
      response.request().method() !== 'POST'
    )
      return;
    pendingScans.push(
      (async () => {
        const responseError = await response.finished();
        if (responseError)
          throw new Error('Live response did not finish; credential scan incomplete.');
        const text = await response.text();
        assertNoCredentials('live browser function response', text, values);
        const json = JSON.parse(text);
        if (response.ok()) {
          expect(json.cached).toBe(true);
          liveResponses.push({
            operation: response.request().postDataJSON().operation,
            status: response.status(),
            cached: json.cached,
          });
        }
      })(),
    );
    // Keep early asynchronous failures attached until the final awaited scan assertion.
    void pendingScans.at(-1)!.catch(() => undefined);
  });
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    if (failure === 'network') return route.abort();
    if (failure === 'quota')
      return route.fulfill({
        status: 429,
        json: { code: 'daily_budget' },
        headers: {
          'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
          'Access-Control-Expose-Headers': 'Retry-After',
          'Retry-After': '60',
        },
      });
    const body = route.request().postDataJSON();
    const hash = key(body);
    if (!allowed.has(hash)) {
      await route.abort();
      throw new Error('Request differs from the approved cached verification inputs.');
    }
    const cached = await api('/database/query/read-only', 'POST', {
      query: `select exists(select 1 from public.discovery_cache where key='${hash}' and expires_at>current_timestamp and payload is not null) as present`,
    });
    if (!Array.isArray(cached) || !cached[0]?.present) {
      await route.abort();
      throw new Error('Verified live cache entry unavailable; no new provider call permitted.');
    }
    requests.push(body.operation);
    return route.continue();
  });
  await seedMappedTrip(page);
  await page.getByRole('button', { name: 'Edit Garden morning', exact: true }).click();
  await page.getByText('Find a location', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Worldwide places' }).click();
  await page.getByLabel('Search for a place', { exact: true }).fill(payloads.searchRequest.query);
  const place = page
    .locator('.location-results button')
    .filter({ hasText: payloads.place.name })
    .first();
  await expect(place).toBeVisible({ timeout: 25000 });
  await captureMap(page, info, 'live-hosted-search');
  await place.click();
  await page.getByRole('button', { name: 'Use this location', exact: true }).click();
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit Garden morning', exact: true }).click();
  await expect(page.getByLabel('Location name (optional)', { exact: true })).toHaveValue(
    payloads.place.name,
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await mapView(page, width);
  await page.getByRole('button', { name: 'Open interactive map' }).click();
  await expect(page.getByText('Basemap loaded', { exact: true })).toBeAttached({ timeout: 25000 });
  for (const [mode, label] of [
    ['walk', 'Walking'],
    ['drive', 'Driving'],
  ] as const) {
    if (mode === 'drive') await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
    await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
    await expect(page.locator('.route-summary')).toContainText(`${label} estimate`, {
      timeout: 25000,
    });
    await expect(page.locator('.route-summary')).toContainText('Server-cached Geoapify route');
    const expected = payloads[mode].route;
    await expect(page.locator('.route-summary')).toContainText(
      `${Math.round(expected.distanceMeters)} m`,
    );
    await page.locator('.mapping-workspace').evaluate((element) => {
      element.scrollTop = 0;
    });
    await captureMap(page, info, `live-hosted-${mode}`);
  }
  await page.getByRole('button', { name: 'Map activity 1: Garden morning', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.activity-card[data-selected=true]')).toBeFocused();
  await expect(page.locator('.activity-card[data-selected=true] h3')).toHaveText('Garden morning');
  await page
    .locator('.activity-card[data-selected=true]')
    .getByRole('button', { name: 'Show on map', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Map activity 1: Garden morning', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await captureMap(page, info, 'live-hosted-selection');
  await page.getByRole('button', { name: /Day 2/ }).click();
  await expect(page.locator('.travel-map-marker')).toHaveCount(2);
  await expect(page.getByText('Add another location to calculate a route.')).toBeVisible();
  await page.getByRole('button', { name: /Day 1/ }).click();
  await listView(page, width);
  // Real network failure and synthetic quota response only; never change hosted quota/settings.
  for (const state of ['quota', 'network'] as const) {
    failure = state;
    await page.reload();
    await mapView(page, width);
    await page.getByRole('button', { name: 'Open interactive map' }).click();
    await expect(page.getByText('Basemap loaded', { exact: true })).toBeAttached({
      timeout: 25000,
    });
    await page.getByLabel('I confirm these saved coordinates', { exact: false }).check();
    await page.getByRole('button', { name: 'Calculate route', exact: true }).click();
    await expect(page.locator('.route-panel [role=alert]')).toBeVisible();
    await captureMap(page, info, `mocked-hosted-${state}`);
    await listView(page, width);
    await page.getByRole('button', { name: 'Edit Garden morning', exact: true }).click();
    await page.getByLabel('Activity title', { exact: true }).fill('Garden morning');
    await page.getByRole('button', { name: 'Save activity', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Garden morning', exact: true })).toBeVisible();
  }
  await Promise.all(pendingScans);
  expect(requests).toEqual(['location', 'route', 'route']);
  expect(liveResponses).toHaveLength(3);
  await info.attach('live-cached-function-evidence', {
    body: JSON.stringify({
      width,
      liveResponses,
      realTiles: true,
      additionalProviderRequestsPermitted: false,
      failureStates:
        'Synthetic 429 and intentionally aborted browser requests; not live upstream errors.',
    }),
    contentType: 'application/json',
  });
});
