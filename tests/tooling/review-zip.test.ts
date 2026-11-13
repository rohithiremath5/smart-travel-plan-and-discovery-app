// @vitest-environment node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createReviewArchive, verifyArchive } from '../../scripts/review-zip';
import { collectReviewFiles, requireInsideRoot } from '../../scripts/lib/review-files';
import { createFixture, seedReviewFixture } from './helpers';

describe('review archive boundary', () => {
  it('packages Phase 9 evidence separately and preserves accepted Phase 8 artifacts', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      const prior = await createReviewArchive(fixture.root, '8');
      const oldZip = await readFile(prior.path);
      const oldReceipt = await readFile(
        join(fixture.root, 'smart-travel-phase-8-review.receipt.json'),
      );
      await mkdir(join(fixture.root, 'docs/review/phase-9/screenshots'), { recursive: true });
      await writeFile(
        join(fixture.root, 'docs/review/phase-9/screenshots/synthetic-360.png'),
        new Uint8Array([137, 80, 78, 71]),
      );
      const next = await createReviewArchive(fixture.root, '9');
      expect(await readFile(prior.path)).toEqual(oldZip);
      expect(
        await readFile(join(fixture.root, 'smart-travel-phase-8-review.receipt.json')),
      ).toEqual(oldReceipt);
      expect(Object.keys(unzipSync(await readFile(next.path)))).toContain(
        'docs/review/phase-9/screenshots/synthetic-360.png',
      );
      const receipt = JSON.parse(
        await readFile(join(fixture.root, 'smart-travel-phase-9-review.receipt.json'), 'utf8'),
      );
      expect(receipt.phase).toBe(9);
      expect(receipt.sha256).toBe(next.sha256);
      expect(receipt.inventoryAndContentVerified).toBe(true);
    } finally {
      await fixture.clean();
    }
  });
  it('creates Phase 8 separately, includes only reviewed weather/budget images and retains Phase 7', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      const old = await createReviewArchive(fixture.root, '7'),
        oldBytes = await readFile(old.path);
      await mkdir(join(fixture.root, 'docs/review/phase-8/screenshots'), { recursive: true });
      await writeFile(
        join(fixture.root, 'docs/review/phase-8/screenshots/mocked-weather-360.png'),
        new Uint8Array([137, 80, 78, 71]),
      );
      const next = await createReviewArchive(fixture.root, '8');
      expect(await readFile(old.path)).toEqual(oldBytes);
      expect(Object.keys(unzipSync(await readFile(next.path)))).toContain(
        'docs/review/phase-8/screenshots/mocked-weather-360.png',
      );
      const receipt = JSON.parse(
        await readFile(join(fixture.root, 'smart-travel-phase-8-review.receipt.json'), 'utf8'),
      );
      expect(receipt.phase).toBe(8);
      expect(receipt.sha256).toBe(next.sha256);
    } finally {
      await fixture.clean();
    }
  });
  it('packages Phase 7 separately and preserves prior archives while excluding private state', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      const phase6 = await createReviewArchive(fixture.root);
      const phase61 = await createReviewArchive(fixture.root, '6-1');
      const prior6 = await readFile(phase6.path);
      const prior61 = await readFile(phase61.path);
      await mkdir(join(fixture.root, 'docs/review/phase-7/screenshots'), { recursive: true });
      await mkdir(join(fixture.root, '.cache'), { recursive: true });
      await writeFile(join(fixture.root, '.cache/private.json'), 'private state');
      await writeFile(join(fixture.root, '.env'), 'GEMINI_API_KEY=private-fixture-only');
      await writeFile(
        join(fixture.root, 'docs/review/phase-7/screenshots/organizer-360.png'),
        new Uint8Array([137, 80, 78, 71]),
      );
      const result = await createReviewArchive(fixture.root, '7');
      const entries = Object.keys(unzipSync(await readFile(result.path)));
      expect(result.path).toContain('smart-travel-phase-7-review.zip');
      expect(entries).toContain('docs/review/phase-7/screenshots/organizer-360.png');
      expect(entries.some((name) => name.startsWith('.cache/') || name.endsWith('.zip'))).toBe(
        false,
      );
      expect(entries).not.toContain('.env');
      expect(await readFile(phase6.path)).toEqual(prior6);
      expect(await readFile(phase61.path)).toEqual(prior61);
      const receipt = JSON.parse(
        await readFile(join(fixture.root, 'smart-travel-phase-7-review.receipt.json'), 'utf8'),
      );
      expect(receipt.phase).toBe(7);
      expect(receipt.sha256).toBe(result.sha256);
      expect(receipt.files).toHaveLength(entries.length);
    } finally {
      await fixture.clean();
    }
  });
  it('creates a separate Phase 6.1 archive and allows only its dedicated review screenshots', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      const old = await createReviewArchive(fixture.root);
      const oldBytes = await readFile(old.path);
      await mkdir(join(fixture.root, 'docs/review/phase-6-1/screenshots'), { recursive: true });
      await writeFile(
        join(fixture.root, 'docs/review/phase-6-1/screenshots/mock.png'),
        new Uint8Array([137, 80, 78, 71]),
      );
      const next = await createReviewArchive(fixture.root, '6-1');
      expect(next.path).toContain('smart-travel-phase-6-1-review.zip');
      expect(await readFile(old.path)).toEqual(oldBytes);
      const receipt = JSON.parse(
        await readFile(join(fixture.root, 'smart-travel-phase-6-1-review.receipt.json'), 'utf8'),
      );
      expect(receipt.phase).toBe(6.1);
      expect(receipt.sha256).toBe(next.sha256);
      expect(Object.keys(unzipSync(await readFile(next.path)))).toContain(
        'docs/review/phase-6-1/screenshots/mock.png',
      );
    } finally {
      await fixture.clean();
    }
  });
  it('includes only approved files and verifies content on a repeatable archive', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      await writeFile(join(fixture.root, '.env'), 'GEMINI_API_KEY=private-fixture-value');
      await writeFile(join(fixture.root, '.env.local'), 'OTHER_TOKEN=another-fixture-secret');
      await writeFile(join(fixture.root, 'previous.zip'), 'private archive');
      for (const directory of [
        'node_modules',
        'dist',
        'private-uploads',
        'logs',
        'docs/.private',
      ]) {
        await mkdir(join(fixture.root, directory), { recursive: true });
        await writeFile(join(fixture.root, directory, 'private.md'), 'excluded content');
      }
      await createReviewArchive(fixture.root);
      const result = await createReviewArchive(fixture.root);
      const archived = unzipSync(await readFile(result.path));
      expect(Object.keys(archived).sort()).toEqual([
        '.env.example',
        'AGENTS.md',
        'README.md',
        'docs/PHASE_STATUS.md',
        'package-lock.json',
        'package.json',
      ]);
      expect(result.fileCount).toBe(6);
      expect(result.sha256).toHaveLength(64);
      const receipt = JSON.parse(
        await readFile(join(fixture.root, 'smart-travel-phase-6-review.receipt.json'), 'utf8'),
      );
      expect(receipt.sha256).toBe(result.sha256);
      expect(receipt.files).toHaveLength(Object.keys(archived).length);
      expect(receipt.files.map((file: { path: string }) => file.path).sort()).toEqual(
        Object.keys(archived).sort(),
      );
    } finally {
      await fixture.clean();
    }
  });
  it('refuses source containing a known private value without printing it', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      const privateValue = 'private-fixture-key-that-must-not-ship';
      await writeFile(join(fixture.root, '.env'), `GEMINI_API_KEY=${privateValue}`);
      await writeFile(join(fixture.root, 'README.md'), `Do not share ${privateValue}`);
      const error = await collectReviewFiles(fixture.root).catch((error: unknown) => error);
      expect(String(error)).toContain('Possible credential');
      expect(String(error)).not.toContain(privateValue);
    } finally {
      await fixture.clean();
    }
  });
  it('includes licensed image and backend sources while excluding backend state and env files', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      for (const directory of [
        'public/images',
        'supabase/migrations',
        'supabase/.temp',
        'supabase/functions/discovery',
        'docs/review/phase-2/screenshots',
      ])
        await mkdir(join(fixture.root, directory), { recursive: true });
      await writeFile(
        join(fixture.root, 'public/images/scene.jpg'),
        new Uint8Array([255, 216, 255, 217]),
      );
      await writeFile(join(fixture.root, 'supabase/migrations/one.sql'), 'select 1;');
      await writeFile(
        join(fixture.root, 'docs/review/phase-2/screenshots/landing-360.png'),
        'image',
      );
      await writeFile(join(fixture.root, 'public/images/unreviewed.png'), 'excluded image');
      await writeFile(join(fixture.root, 'supabase/.temp/private.md'), 'private');
      await writeFile(
        join(fixture.root, 'supabase/functions/discovery/.env'),
        'PRIVATE_KEY=synthetic-secret',
      );
      const files = await collectReviewFiles(fixture.root);
      expect(Object.keys(files)).toContain('public/images/scene.jpg');
      expect(Object.keys(files)).toContain('supabase/migrations/one.sql');
      expect(Object.keys(files)).toContain('docs/review/phase-2/screenshots/landing-360.png');
      expect(Object.keys(files)).not.toContain('public/images/unreviewed.png');
      expect(
        Object.keys(files).some((name) => name.includes('.env') && name !== '.env.example'),
      ).toBe(false);
      expect(Object.keys(files).some((name) => name.includes('.temp'))).toBe(false);
    } finally {
      await fixture.clean();
    }
  });
  it('rejects populated template credentials and obvious token formats', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      await writeFile(join(fixture.root, '.env.example'), 'GEMINI_API_KEY=not-a-blank-placeholder');
      await expect(collectReviewFiles(fixture.root)).rejects.toThrow('placeholder');
      await writeFile(join(fixture.root, '.env.example'), 'GEMINI_API_KEY=');
      await writeFile(join(fixture.root, 'README.md'), ['AIza', 'a'.repeat(35)].join(''));
      await expect(collectReviewFiles(fixture.root)).rejects.toThrow('Possible credential');
    } finally {
      await fixture.clean();
    }
  });
  it('rejects trip backup JSON even without API credentials', async () => {
    const fixture = await createFixture();
    try {
      await seedReviewFixture(fixture.root);
      await writeFile(
        join(fixture.root, 'docs/private-trip.json'),
        JSON.stringify({ format: 'smart-travel-trips', version: 1, trips: [] }),
      );
      await expect(collectReviewFiles(fixture.root)).rejects.toThrow('Trip backup exports');
    } finally {
      await fixture.clean();
    }
  });
  it('rejects archive tampering and paths outside the project', () => {
    expect(() =>
      verifyArchive(zipSync({ 'injected.md': strToU8('private') }), {
        'README.md': strToU8('safe'),
      }),
    ).toThrow('inventory');
    expect(() =>
      verifyArchive(zipSync({ 'README.md': strToU8('different') }), {
        'README.md': strToU8('safe'),
      }),
    ).toThrow('verification');
    expect(() => requireInsideRoot(resolveRoot(), join(resolveRoot(), '..', 'escape'))).toThrow(
      'outside',
    );
  });
});

function resolveRoot() {
  return process.cwd();
}
