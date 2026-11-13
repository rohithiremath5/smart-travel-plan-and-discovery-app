import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

export async function createFixture() {
  const base = resolve('.cache/tooling-tests');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(join(base, 'fixture-'));
  return {
    root,
    async clean() {
      if (!resolve(root).startsWith(base + sep))
        throw new Error('Refusing fixture cleanup outside its dedicated cache directory.');
      await rm(root, { recursive: true, force: true });
    },
  };
}

export async function seedReviewFixture(root: string) {
  await mkdir(join(root, 'docs'), { recursive: true });
  for (const [path, text] of Object.entries({
    'README.md': '# Review fixture',
    'AGENTS.md': '# Instructions',
    '.env.example': 'GEMINI_API_KEY=',
    'package.json': '{}',
    'package-lock.json': '{}',
    'docs/PHASE_STATUS.md': 'Phase 1 READY_FOR_REVIEW',
  })) {
    await writeFile(join(root, path), text);
  }
}
