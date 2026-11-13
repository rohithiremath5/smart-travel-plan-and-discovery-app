import { test, expect, type Page, type TestInfo } from './offline-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { seedMappedTrip } from './mapping-fixture';
async function capture(page: Page, info: TestInfo, name: string) {
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
  const target =
    process.env.SMART_TRAVEL_PHASE7_CAPTURE === '1'
      ? `docs/review/phase-7/screenshots/${filename}`
      : info.outputPath(filename);
  if (process.env.SMART_TRAVEL_PHASE7_CAPTURE === '1')
    await mkdir('docs/review/phase-7/screenshots', { recursive: true });
  const temporary = target + '.tmp-' + crypto.randomUUID();
  await writeFile(
    temporary,
    await page.screenshot({ fullPage: (await page.getByRole('dialog').count()) === 0 }),
  );
  await rename(temporary, target);
}
test('local organizer: notes, lists, templates, reload/reopen, complete backup, selected print and safe import/delete', async ({
  page,
  context,
}, info) => {
  test.setTimeout(150000);
  let providerAttempts = 0;
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
    providerAttempts++;
    return route.abort();
  });
  const { trip } = await seedMappedTrip(page);
  await page.getByRole('link', { name: 'Organizer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your journey, gathered.' })).toBeVisible();
  await capture(page, info, 'empty-organizer');
  const add = page.getByRole('button', { name: 'Add trip note', exact: true });
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Title (optional)')).toBeFocused();
  await page.getByLabel('Title (optional)').fill('Arrival notes');
  await page
    .getByLabel('Note', { exact: true })
    .fill('Synthetic arrival reminder, saved only for this trip.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByText('Synthetic arrival reminder, saved only for this trip.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit note Arrival notes' }).click();
  await page
    .getByLabel('Note', { exact: true })
    .fill('Synthetic arrival reminder, updated on this device.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await capture(page, info, 'trip-notes');
  await page.getByRole('button', { name: 'Add trip note', exact: true }).click();
  await page.getByLabel('Note', { exact: true }).fill('Unsaved synthetic draft');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue('Unsaved synthetic draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Discard draft' }).click();
  await expect(add).toBeFocused();
  async function item(
    kind: 'checklist' | 'packing',
    label: string,
    category: string,
    quantity = '1',
  ) {
    await page.getByRole('button', { name: `Add ${kind} item`, exact: true }).click();
    await page.getByLabel('Item label').fill(label);
    await page.getByLabel('Category', { exact: true }).fill(category);
    if (kind === 'packing') await page.getByLabel('Quantity').fill(quantity);
    await page.getByRole('button', { name: 'Save item', exact: true }).click();
    await expect(
      page.getByRole('checkbox', {
        name: `${kind === 'packing' ? 'Packed' : 'Complete'}: ${label}`,
      }),
    ).toBeVisible();
  }
  await item('checklist', 'Confirm arrival', 'Before departure');
  // Persisted controls reflect committed IndexedDB state, not an optimistic DOM toggle.
  await page.getByRole('checkbox', { name: 'Complete: Confirm arrival', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Complete: Confirm arrival', exact: true }),
  ).toBeChecked();
  await item('checklist', 'Review travel documents', 'Travel documents');
  await capture(page, info, 'travel-checklist');
  await item('packing', 'Light layers', 'Clothing', '2');
  await page.getByRole('checkbox', { name: 'Packed: Light layers', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Packed: Light layers', exact: true }),
  ).toBeChecked();
  await item('packing', 'Walking shirt', 'Clothing');
  await page.getByRole('button', { name: 'Move Walking shirt up' }).click();
  await expect(page.locator('#packing-heading').locator('..').locator('..')).toContainText(
    'Packing list',
  );
  await capture(page, info, 'packing-progress');
  await page.getByRole('button', { name: 'Reset packed status' }).click();
  await page.getByRole('button', { name: 'Keep unchanged' }).click();
  await expect(page.getByRole('checkbox', { name: 'Packed: Light layers' })).toBeChecked();
  await page.getByRole('button', { name: 'Browse list templates' }).click();
  await page.getByRole('checkbox', { name: 'Review your reservations', exact: true }).check();
  await capture(page, info, 'template-preview');
  await page.getByRole('button', { name: 'Add selected items' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Complete: Review your reservations' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Browse list templates' }).click();
  await expect(page.getByRole('checkbox', { name: /Review your reservations/ })).toBeDisabled();
  await page.getByLabel('Add to', { exact: true }).selectOption('packing');
  await page.getByRole('checkbox', { name: 'Phone and charger', exact: true }).check();
  await page.getByRole('button', { name: 'Add selected items' }).click();
  await capture(page, info, 'organizer-overview');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this trip' }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.version).toBe(4);
  expect(backup.organizers).toHaveLength(1);
  expect(backup.organizers[0].notes[0].text).toBe(
    'Synthetic arrival reminder, updated on this device.',
  );
  expect(backup.organizers[0].packing.map((x: { label: string }) => x.label)).toEqual([
    'Walking shirt',
    'Light layers',
    'Phone and charger',
  ]);
  expect(backup.organizers[0].packing[1].quantity).toBe(2);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Packed: Light layers' })).toBeChecked();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(`/trips/${trip.id}/organizer`);
  await expect(
    reopened.getByText('Synthetic arrival reminder, updated on this device.'),
  ).toBeVisible();
  await expect(reopened.getByRole('checkbox', { name: 'Complete: Confirm arrival' })).toBeChecked();
  await reopened.getByRole('link', { name: 'Print summary', exact: true }).click();
  const sheet = reopened.getByRole('article', { name: 'Selected trip print summary' });
  await expect(sheet).not.toContainText('Synthetic arrival reminder');
  await expect(sheet).not.toContainText('A synthetic journey for map review.');
  await reopened.getByRole('checkbox', { name: /Arrival notes/ }).check();
  await expect(sheet).toContainText('Synthetic arrival reminder, updated on this device.');
  await reopened.emulateMedia({ media: 'print' });
  await expect(reopened.locator('.site-header')).toBeHidden();
  await expect(reopened.getByRole('button', { name: 'Print this summary' })).toBeHidden();
  await capture(reopened, info, 'print-summary');
  const pdf = await reopened.pdf({
    path: info.outputPath('synthetic-selected-trip.pdf'),
    format: 'A4',
  });
  expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  await reopened.emulateMedia({ media: 'screen' });
  await reopened.goto('/trips');
  backup.organizers[0].notes[0].text = 'Synthetic imported alternative note';
  const upload = {
    name: 'synthetic-phase7.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await reopened.getByLabel('Import trips JSON file').setInputFiles(upload);
  await expect(reopened.getByRole('dialog', { name: 'Review your import' })).toContainText(
    '1 conflict copies',
  );
  await capture(reopened, info, 'backup-import-preview');
  await reopened.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(reopened.locator('.trip-card')).toHaveCount(1);
  await reopened.getByLabel('Import trips JSON file').setInputFiles(upload);
  await reopened.getByRole('button', { name: 'Confirm import' }).click();
  await expect(reopened.locator('.trip-card')).toHaveCount(2);
  await reopened
    .locator(`.trip-card a[href$="/organizer"]:not([href="/trips/${trip.id}/organizer"])`)
    .click();
  await expect(reopened.getByText('Synthetic imported alternative note')).toBeVisible();
  expect(reopened.url()).not.toContain(trip.id);
  await reopened.goto(`/trips/${trip.id}/organizer`);
  await expect(
    reopened.getByText('Synthetic arrival reminder, updated on this device.'),
  ).toBeVisible();
  await reopened.getByRole('button', { name: 'Delete note Arrival notes' }).click();
  await reopened.getByRole('button', { name: 'Confirm change' }).click();
  await expect(
    reopened.getByText('Synthetic arrival reminder, updated on this device.'),
  ).toHaveCount(0);
  await reopened.goto(`/trips/${trip.id}`);
  await reopened.getByRole('button', { name: 'Delete trip', exact: true }).click();
  await reopened.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(reopened.locator('.trip-card')).toHaveCount(1);
  await reopened.goto(`/trips/${trip.id}/organizer`);
  await expect(reopened.getByRole('alert')).toContainText('not found');
  expect(providerAttempts).toBe(0);
});
test('organizer conflict review keeps drafts, protects unrelated notes and reports unavailable storage', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000);
  await context.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort(),
  );
  const { trip } = await seedMappedTrip(page);
  await page.goto(`/trips/${trip.id}/organizer`);
  async function addNote(target: Page, title: string, text: string) {
    await target.getByRole('button', { name: 'Add trip note', exact: true }).click();
    await target.getByLabel('Title (optional)').fill(title);
    await target.getByLabel('Note', { exact: true }).fill(text);
    await target.getByRole('button', { name: 'Save note', exact: true }).click();
    await expect(target.getByText(text, { exact: true })).toBeVisible();
  }
  await addNote(page, 'Shared reminder', 'Original synthetic content');
  await page.getByRole('button', { name: 'Edit note Shared reminder' }).click();
  await page.getByLabel('Note', { exact: true }).fill('First tab draft, kept safely');
  const other = await context.newPage();
  await other.goto(`/trips/${trip.id}/organizer`);
  await other.getByRole('button', { name: 'Edit note Shared reminder' }).click();
  await other.getByLabel('Note', { exact: true }).fill('Second tab saved version');
  await other.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(other.getByText('Second tab saved version', { exact: true })).toBeVisible();
  await addNote(other, 'Separate reminder', 'Unrelated second-tab content');
  await page.bringToFront();
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('another tab');
  await expect(page.getByLabel('Note', { exact: true })).toHaveValue(
    'First tab draft, kept safely',
  );
  await capture(page, info, 'conflict-draft');
  await page.getByRole('button', { name: 'Review latest saved content' }).click();
  await expect(page.locator('.organizer-latest')).toContainText('Second tab saved version');
  await page.getByRole('button', { name: 'Save my draft after review' }).click();
  await expect(page.getByText('First tab draft, kept safely', { exact: true })).toBeVisible();
  await expect(page.getByText('Unrelated second-tab content', { exact: true })).toBeVisible();
  await other.close();
  await page.addInitScript(() =>
    Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('storage');
  await capture(page, info, 'storage-error');
});
