import { expect, test } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';

test('shell, route reloads, mobile navigation, and honest phase boundary', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(request.url()).hostname))
      externalRequests.push('unexpected external request');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Somewhere new.');
  await expect(page.locator('.travel-hero-visual img')).toBeVisible();
  await page.locator('.destination-card').last().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('.destination-photo img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  if (page.viewportSize()!.width < 1024) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: 'Discover', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  } else
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Discover', exact: true })
      .click();
  await expect(page.getByRole('combobox', { name: 'Where would you like to go?' })).toBeVisible();
  for (const route of [
    '/',
    '/discover?source=demo',
    '/destinations/kyoto',
    '/trips',
    '/saved',
    '/settings',
    '/design-system',
    '/not-a-page',
  ]) {
    await page.goto(route);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
      `Accessibility at ${route}`,
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test('keyboard dialog focus, tabs, validation, and component states', async ({
  page,
}, testInfo) => {
  await page.goto('/design-system');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const trigger = page.getByRole('button', { name: 'Try a dialog' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'A moment of focus.' });
  await expect(dialog).toBeVisible();
  for (let count = 0; count < 6; count++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  const input = page.getByRole('textbox', { name: 'Preview label' });
  await input.fill('');
  await page.getByRole('button', { name: 'Update sample' }).click();
  await expect(input).toBeFocused();
  await expect(page.getByRole('alert')).toHaveText('Use at least 2 characters.');
  await input.fill('A fresh perspective');
  await page.getByRole('button', { name: 'Update sample' }).click();
  await expect(page.getByRole('status')).toHaveText('Sample updated for this page only.');
  await page.getByRole('button', { name: 'Reset sample' }).click();
  await expect(input).toHaveValue('A considered journey');
  await expect(page.getByRole('button', { name: 'Disabled example' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Loading example' })).toBeDisabled();
  await page.getByRole('tab', { name: 'Components', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Design tokens' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Grounded in warmth.' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('tokens.png'),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: 'Components', exact: true }).click();
  expect(
    await page
      .getByRole('button', { name: 'Loading example' })
      .locator('svg')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});
