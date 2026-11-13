// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  await db.exec(await readFile('supabase/migrations/202611040001_discovery.sql', 'utf8'));
}, 60000);
afterAll(() => db.close());
async function acquire(key: string, budget = 2) {
  const result = await db.query<{ value: { state: string; lease?: string; payload?: unknown } }>(
    'select public.discovery_acquire($1,$2) as value',
    [key, budget],
  );
  return result.rows[0]!.value;
}
async function reset() {
  await db.exec(
    "truncate public.discovery_cache, public.discovery_usage; update public.discovery_gate set next_at='-infinity';",
  );
}
describe('real PostgreSQL discovery migration (embedded, not hosted Supabase)', () => {
  it('reserves before use, coalesces duplicates and serves cache without credit charges', async () => {
    await reset();
    const key = 'a'.repeat(64);
    const first = await acquire(key);
    expect(first.state).toBe('reserved');
    expect((await acquire(key)).state).toBe('busy');
    const payload = {
      destinations: [],
      attractions: [],
      fetchedAt: '2026-11-04T00:00:00Z',
      cached: false,
    };
    await db.query('select public.discovery_complete($1,$2,$3)', [
      key,
      first.lease,
      JSON.stringify(payload),
    ]);
    expect(await acquire(key)).toMatchObject({ state: 'hit', payload });
    expect(
      (await db.query<{ credits: number }>('select credits from public.discovery_usage')).rows[0]!
        .credits,
    ).toBe(1);
  });
  it('enforces daily budget and global request spacing independently', async () => {
    await reset();
    expect((await acquire('a'.repeat(64), 1)).state).toBe('reserved');
    expect((await acquire('b'.repeat(64), 1)).state).toBe('busy');
    await db.exec("update public.discovery_gate set next_at='-infinity';");
    expect((await acquire('b'.repeat(64), 1)).state).toBe('limited');
  });
  it('counts failed calls, rejects foreign leases and allows a fresh lease after expiration', async () => {
    await reset();
    const key = 'c'.repeat(64);
    const first = await acquire(key);
    await db.query('select public.discovery_complete($1,$2,$3)', [
      key,
      '00000000-0000-0000-0000-000000000000',
      null,
    ]);
    expect((await acquire(key)).state).toBe('busy');
    await db.query('select public.discovery_complete($1,$2,$3)', [key, first.lease, null]);
    await db.exec("update public.discovery_gate set next_at='-infinity';");
    expect((await acquire(key)).state).toBe('reserved');
    expect(
      (await db.query<{ credits: number }>('select credits from public.discovery_usage')).rows[0]!
        .credits,
    ).toBe(2);
  });
  it('bounds cache to 256 records, cleans expired data and rejects oversized payloads', async () => {
    await reset();
    await db.exec(
      "insert into public.discovery_cache(key,payload,expires_at) select lpad(to_hex(i),64,'0'), '{}'::jsonb, clock_timestamp()+interval '1 hour' from generate_series(1,256) i;",
    );
    const fresh = await acquire('f'.repeat(64));
    expect(fresh.state).toBe('reserved');
    expect(
      (
        await db.query<{ count: number }>(
          'select count(*)::integer as count from public.discovery_cache',
        )
      ).rows[0]!.count,
    ).toBe(256);
    await expect(
      db.query('select public.discovery_complete($1,$2,$3)', [
        'f'.repeat(64),
        fresh.lease,
        JSON.stringify({ value: 'x'.repeat(200001) }),
      ]),
    ).rejects.toThrow('too large');
  });
  it('denies anonymous/authenticated direct table access and RPC execution', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query('select * from public.discovery_cache')).rejects.toThrow(
          'permission denied',
        );
        await expect(acquire('a'.repeat(64))).rejects.toThrow('permission denied');
      } finally {
        await db.exec('reset role');
      }
    }
    const policies = await db.query<{ enabled: boolean }>(
      "select relrowsecurity as enabled from pg_catalog.pg_class where relname in ('discovery_cache','discovery_usage','discovery_gate')",
    );
    expect(policies.rows).toHaveLength(3);
    expect(policies.rows.every((row) => row.enabled)).toBe(true);
  });
  it('rejects invalid reservation inputs even for privileged callers', async () => {
    await expect(acquire('not-a-key')).rejects.toThrow('Invalid');
    await expect(acquire('a'.repeat(64), 2001)).rejects.toThrow('Invalid');
  });
  it('refuses unrecorded object collisions without altering existing data', async () => {
    const before = await db.query('select * from public.discovery_usage');
    await expect(
      db.exec(await readFile('supabase/migrations/202611040001_discovery.sql', 'utf8')),
    ).rejects.toThrow('already exist');
    await db.exec('rollback');
    expect((await db.query('select * from public.discovery_usage')).rows).toEqual(before.rows);
  });
});
