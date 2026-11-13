// @vitest-environment node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureEnvironment } from '../../scripts/setup-env';
import { supportedNodeVersion } from '../../scripts/setup-check';
import { createFixture } from './helpers';

describe('safe setup', () => {
  it('creates a file once and preserves existing credential bytes', async () => {
    const fixture = await createFixture();
    try {
      await writeFile(join(fixture.root, '.env.example'), 'GEMINI_API_KEY=\n');
      expect(await ensureEnvironment(fixture.root)).toBe('created');
      const existing = 'GEMINI_API_KEY=private-fixture-value\n';
      await writeFile(join(fixture.root, '.env'), existing);
      expect(await ensureEnvironment(fixture.root)).toBe('preserved');
      expect(await readFile(join(fixture.root, '.env'), 'utf8')).toBe(existing);
    } finally {
      await fixture.clean();
    }
  });
  it('reports supported runtimes accurately', () => {
    expect(supportedNodeVersion('22.17.1')).toBe(true);
    expect(supportedNodeVersion('24.0.0')).toBe(true);
    expect(supportedNodeVersion('22.12.0')).toBe(false);
    expect(supportedNodeVersion('18.20.0')).toBe(false);
  });
});
