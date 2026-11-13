// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, it, expect } from 'vitest';
const db = new PGlite();
beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile('supabase/migrations/202611040001_discovery.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202611050001_mapping_quota.sql', 'utf8'));
}, 60000);
afterAll(() => db.close());
async function acquire(key: string, cost: number) {
  await db.exec("update public.discovery_gate set next_at='-infinity'");
  return (
    await db.query<{ value: { state: string; lease: string } }>(
      'select public.discovery_acquire($1,100,$2) as value',
      [key, cost],
    )
  ).rows[0]!.value;
}
it('shares a durable 100-credit ceiling with legacy discovery and preserves cache hits', async () => {
  const key = 'a'.repeat(64);
  const reservation = await acquire(key, 20);
  expect(reservation.state).toBe('reserved');
  await db.query('select public.discovery_complete($1,$2,$3)', [
    key,
    reservation.lease,
    JSON.stringify({ locations: [], route: null }),
  ]);
  expect((await acquire(key, 20)).state).toBe('hit');
  for (const c of ['b', 'c', 'd', 'e'])
    expect((await acquire(c.repeat(64), 20)).state).toBe('reserved');
  expect((await acquire('f'.repeat(64), 1)).state).toBe('limited');
  expect(
    (await db.query<{ credits: number }>('select credits from public.discovery_usage')).rows[0]!
      .credits,
  ).toBe(100);
  expect(
    (
      await db.query<{ value: { state: string } }>(
        'select public.discovery_acquire($1,100) as value',
        ['1'.repeat(64)],
      )
    ).rows[0]!.value.state,
  ).toBe('limited');
  expect((await acquire(key, 20)).state).toBe('hit');
});
it('rejects over-cap and invalid weighted reservations and denies unprivileged execution', async () => {
  await expect(acquire('2'.repeat(64), 21)).rejects.toThrow('Invalid');
  await expect(
    db.query('select public.discovery_acquire($1,101,20)', ['2'.repeat(64)]),
  ).rejects.toThrow('Invalid');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await expect(
        db.query('select public.discovery_acquire($1,100,20)', ['2'.repeat(64)]),
      ).rejects.toThrow('permission denied');
    } finally {
      await db.exec('reset role');
    }
  }
});
it('refuses unrecorded migration collisions without dropping tables or changing old data', async () => {
  const before = await db.query('select * from public.discovery_usage');
  await expect(
    db.exec(await readFile('supabase/migrations/202611050001_mapping_quota.sql', 'utf8')),
  ).rejects.toThrow('already exists');
  await db.exec('rollback');
  expect((await db.query('select * from public.discovery_usage')).rows).toEqual(before.rows);
  expect(
    (
      await db.query<{ count: number }>(
        "select count(*)::integer as count from information_schema.tables where table_schema='public' and table_name like 'discovery_%'",
      )
    ).rows[0]!.count,
  ).toBe(3);
});
