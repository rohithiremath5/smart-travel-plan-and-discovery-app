import { expect, test } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';

test('curated search, combined filters, details, local save/reload/remove', async ({
  page,
}, testInfo) => {
  await page.goto('/discover?source=demo');
  await expect(page.locator('.destination-card')).toHaveCount(4);
  const search = page.getByRole('combobox');
  await search.fill('mountains');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'The Dolomites', exact: true })).toBeVisible();
  async function filter(name: string) {
    if (page.viewportSize()!.width < 768)
      await page.getByRole('button', { name: /Filters ·/ }).click();
    await page.getByRole('button', { name, exact: true }).click();
  }
  await filter('Culture & heritage');
  await expect(
    page.getByRole('heading', { name: 'A different direction, perhaps?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear search & filters', exact: true }).first().click();
  await expect(page.locator('.destination-card')).toHaveCount(4);
  await page.getByRole('link', { name: 'Kyoto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kyoto', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fushimi Inari Taisha' })).toBeVisible();
  await page.getByRole('button', { name: 'Nature & outdoors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Arashiyama' })).toBeVisible();
  await page.getByRole('button', { name: 'Save Kyoto', exact: true }).click();
  await expect(page.getByText('Saved on this device.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remove Kyoto from saved destinations' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: testInfo.outputPath('destination.png'), fullPage: true });
  await page.goto('/saved');
  await expect(page.getByRole('link', { name: 'Kyoto', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Kyoto from saved destinations' }).click();
  await expect(page.getByRole('heading', { name: 'An open page, for now.' })).toBeVisible();
  await page.goto('/discover?source=demo');
  await page.screenshot({ path: testInfo.outputPath('explorer.png'), fullPage: true });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mocked worldwide search debounces, handles errors, opens details and nearby places', async ({
  page,
}) => {
  const calls: { operation: string; query?: string }[] = [];
  const destination = {
    id: 'geo-' + 'a'.repeat(40),
    name: 'Kyoto',
    country: 'Japan',
    kind: 'city',
    latitude: 35,
    longitude: 135,
    source: 'geoapify',
    fetchedAt: '2026-11-04T00:00:00.000Z',
  };
  let failure = '';
  await page.route('https://*.supabase.co/**', async (route) => {
    const body = route.request().postDataJSON() as { operation: string; query?: string };
    calls.push(body);
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Retry-After',
      'Content-Type': 'application/json',
      'Retry-After': '5',
    };
    if (failure === 'quota') {
      await route.fulfill({ status: 429, headers, body: JSON.stringify({ code: 'daily_budget' }) });
      return;
    }
    if (failure === 'malformed') {
      await route.fulfill({ status: 200, headers, body: '{"invalid":true}' });
      return;
    }
    if (failure === 'timeout') {
      await route.abort('timedout');
      return;
    }
    const payload = {
      destinations: body.operation === 'places' ? [] : [destination],
      attractions:
        body.operation === 'places'
          ? [
              {
                id: 'sight-1',
                name: 'Provider sight',
                address: 'Kyoto',
                description: '',
                category: 'sights',
              },
            ]
          : [],
      fetchedAt: '2026-11-04T00:00:00.000Z',
      cached: false,
    };
    await route.fulfill({ status: 200, headers, body: JSON.stringify(payload) });
  });
  await page.goto('/discover?source=live');
  const search = page.getByRole('combobox', { name: 'Where would you like to go?' });
  await search.fill('Ky');
  await page.waitForTimeout(450);
  expect(calls).toHaveLength(0);
  await search.fill('Kyoto');
  await expect(page.getByRole('option', { name: /Kyoto/ })).toBeVisible();
  expect(calls.filter((call) => call.operation === 'autocomplete')).toHaveLength(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.destination-card')).toHaveCount(1);
  await expect(page.getByText('Powered by', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Kyoto', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kyoto', level: 1 })).toBeVisible();
  await expect(page.getByText('Geoapify destination', { exact: true })).toBeVisible();
  await expect(page.getByText('A place to picture for yourself')).toBeVisible();
  await page.getByRole('button', { name: 'Find nearby places' }).click();
  await expect(page.getByRole('heading', { name: 'Provider sight' })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  failure = 'quota';
  await page.goto('/discover?source=live&q=Osaka');
  await expect(page.getByText(/discovery allowance has been reached/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again in/ })).toBeDisabled();
  failure = 'malformed';
  await page.goto('/discover?source=live&q=Tokyo');
  await expect(page.getByText(/unreadable response/)).toBeVisible();
  failure = 'timeout';
  await page.goto('/discover?source=live&q=Nagoya');
  // Wait for the lazy route before checking its deliberately aborted provider request.
  await expect(page.getByRole('combobox', { name: 'Where would you like to go?' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(/took too long to respond/)).toBeVisible();
});
