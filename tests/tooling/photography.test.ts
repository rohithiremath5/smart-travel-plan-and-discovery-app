// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { photography } from '../../src/features/discovery/data/photography';

describe('bundled photo provenance', () => {
  it('matches every displayed credit to the licensed manifest and verifies exact asset hashes', async () => {
    const manifest = JSON.parse(await readFile('public/images/manifest.json', 'utf8')) as {
      photos: {
        key: keyof typeof photography;
        creator: string;
        source: string;
        licenseUrl: string;
        retrieved: string;
        match: string;
        files: { file: string; sha256: string; bytes: number; width: number }[];
      }[];
    };
    expect(manifest.photos).toHaveLength(4);
    for (const photo of manifest.photos) {
      expect(photo.creator).toBe(photography[photo.key].creator);
      expect(photo.source).toBe(photography[photo.key].source);
      expect(photo.licenseUrl).toBe('https://www.pexels.com/license/');
      expect(photo.match).toBeTruthy();
      expect(photo.files.map((file) => file.width)).toEqual([640, 1280]);
      for (const file of photo.files) {
        expect(file.file).toBe(`${photo.key}-${file.width}.jpg`);
        const bytes = await readFile(`public/images/${file.file}`);
        expect(bytes[0]).toBe(255);
        expect(bytes[1]).toBe(216);
        expect(bytes.length).toBe(file.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
      }
    }
  });
});
