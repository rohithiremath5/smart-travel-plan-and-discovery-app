import { test, expect } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

test('before correction: city-only explorer and wizard cannot find a district — mocked Geoapify', async ({
  page,
}, info) => {
  test.skip(
    process.env.SMART_TRAVEL_SEARCH_BEFORE !== '1',
    'Explicit historical before-capture only; normal regressions use corrected behavior.',
  );
  const calls: { operation: string; kind?: string }[] = [];
  await page.route('https://*.supabase.co/functions/v1/discovery', async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        destinations: [],
        attractions: [],
        fetchedAt: '2026-11-07T00:00:00.000Z',
        cached: false,
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  async function capture(name: string) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    ).toEqual([]);
    const directory = 'docs/review/phase-6-1/screenshots';
    await mkdir(directory, { recursive: true });
    await writeFile(
      `${directory}/before-${name}-${info.project.use.viewport!.width}.png`,
      await page.screenshot({ fullPage: true }),
      { flag: 'wx' },
    );
  }
  await page.goto('/discover?source=live&q=Chikkamagaluru');
  await expect(page.getByLabel('Search for')).toHaveValue('city');
  await expect(
    page.getByRole('heading', { name: 'A different direction, perhaps?' }),
  ).toBeVisible();
  await capture('explorer');
  await page.goto('/trips/new');
  await page.getByRole('button', { name: 'Worldwide search' }).click();
  await page.getByLabel('Search destinations').fill('Chikkamagaluru');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByText('No places found. Try another search or enter your destination manually.'),
  ).toBeVisible();
  await capture('wizard');
  expect(
    calls.filter((call) => call.operation === 'search').every((call) => call.kind === 'city'),
  ).toBe(true);
});
