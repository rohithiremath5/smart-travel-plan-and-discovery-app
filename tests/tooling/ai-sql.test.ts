// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
const db = new PGlite();
beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile('supabase/migrations/202611060001_ai_quota.sql', 'utf8'));
}, 60000);
beforeEach(() => db.exec('truncate public.ai_requests;'));
afterAll(() => db.close());
const key = (n: number) => n.toString(16).padStart(64, '0');
async function reserve(id: number, client = 10, content = id + 20) {
  return (
    await db.query<{ value: { state: string } }>(
      'select public.ai_reserve($1,$2,$3,5,3) as value',
      [key(id), key(client), key(content)],
    )
  ).rows[0]!.value;
}
async function next() {
  await db.exec("update public.ai_requests set created_at=created_at-interval '61 seconds'");
}
it('atomically limits anonymous clients and globally bounds all function instances', async () => {
  for (let i = 1; i <= 3; i++) {
    expect((await reserve(i)).state).toBe('reserved');
    await next();
  }
  expect((await reserve(4)).state).toBe('client_limited');
  for (let i = 4; i <= 5; i++) {
    expect((await reserve(i, 11)).state).toBe('reserved');
    await next();
  }
  expect((await reserve(6, 12)).state).toBe('limited');
  expect(
    (await db.query<{ count: number }>('select count(*)::integer as count from public.ai_requests'))
      .rows[0]!.count,
  ).toBe(5);
});
it('deduplicates requests and denies rapid repeats without spending another slot', async () => {
  expect((await reserve(1)).state).toBe('reserved');
  expect((await reserve(1)).state).toBe('duplicate');
  expect((await reserve(2)).state).toBe('busy');
});
it('denies unprivileged reservation and over-cap configuration', async () => {
  await expect(
    db.query('select public.ai_reserve($1,$2,$3,6,3)', [key(1), key(2), key(3)]),
  ).rejects.toThrow('Invalid');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await expect(reserve(1)).rejects.toThrow('permission denied');
    } finally {
      await db.exec('reset role');
    }
  }
});
