// @vitest-environment node
import { mkdtemp, unlink, rmdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, it, expect } from 'vitest';
import { localAiQuota } from '../../server/ai/local-quota';
const roots: string[] = [];
async function root() {
  const path = await mkdtemp(join(tmpdir(), 'smart-travel-ai-test-'));
  roots.push(path);
  return path;
}
afterEach(async () => {
  for (const path of roots.splice(0)) {
    for (const file of ['ai-development-ledger.json', 'ai-development-ledger.json.lock'])
      await unlink(join(path, '.cache', file)).catch(() => undefined);
    await rmdir(join(path, '.cache')).catch(() => undefined);
    await rmdir(path).catch(() => undefined);
  }
});
const key = (n: number) => n.toString(16).padStart(64, '0');
it('persists the five-request ceiling across instances even when anonymous client IDs change', async () => {
  const path = await root();
  let stamp = Date.UTC(2026, 10, 6, 12);
  const store = localAiQuota(path, () => stamp);
  for (let i = 1; i <= 5; i++) {
    expect((await store.reserve(key(i), key(i + 10), key(i + 20), 5, 3)).state).toBe('reserved');
    stamp += 11000;
  }
  expect(
    (await localAiQuota(path, () => stamp).reserve(key(6), key(99), key(26), 5, 3)).state,
  ).toBe('limited');
  const ledger = await readFile(join(path, '.cache', 'ai-development-ledger.json'), 'utf8');
  expect(JSON.parse(ledger).requests).toHaveLength(5);
  expect(ledger).not.toContain('prompt');
});
it('enforces the client limit, duplicate ID and rapid/identical-request deduplication', async () => {
  const path = await root();
  let stamp = Date.UTC(2026, 10, 6, 12);
  const store = localAiQuota(path, () => stamp);
  expect((await store.reserve(key(1), key(10), key(20), 5, 3)).state).toBe('reserved');
  expect((await store.reserve(key(1), key(10), key(20), 5, 3)).state).toBe('duplicate');
  expect((await store.reserve(key(2), key(10), key(21), 5, 3)).state).toBe('busy');
  stamp += 11000;
  expect((await store.reserve(key(2), key(10), key(20), 5, 3)).state).toBe('busy');
  for (let i = 2; i <= 3; i++) {
    stamp += 11000;
    expect((await store.reserve(key(i), key(10), key(i + 20), 5, 3)).state).toBe('reserved');
  }
  stamp += 11000;
  expect((await store.reserve(key(4), key(10), key(24), 5, 3)).state).toBe('client_limited');
});
it('serializes concurrent reservations and fails closed on corrupt storage or backward clock', async () => {
  const path = await root();
  const stamp = Date.UTC(2026, 10, 6, 12),
    store = localAiQuota(path, () => stamp);
  const results = await Promise.all([
    store.reserve(key(1), key(10), key(20), 5, 3),
    store.reserve(key(2), key(11), key(21), 5, 3),
  ]);
  expect(results.filter((r) => r.state === 'reserved')).toHaveLength(1);
  await expect(
    localAiQuota(path, () => stamp - 10000).reserve(key(3), key(12), key(22), 5, 3),
  ).rejects.toThrow('Clock');
  await writeFile(join(path, '.cache', 'ai-development-ledger.json'), 'broken');
  await expect(store.reserve(key(3), key(12), key(22), 5, 3)).rejects.toThrow();
  expect(await readFile(join(path, '.cache', 'ai-development-ledger.json'), 'utf8')).toBe('broken');
});
