// @vitest-environment node
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { it, expect, vi } from 'vitest';
import { createFixture } from './helpers';
import { setupMapping } from '../../scripts/setup-mapping';
const ref = 'abcdefghijklmnopqrst';
const publicKey = ['sb_publishable_', 'synthetic_fixture_key'].join('');
async function fixture() {
  const f = await createFixture();
  await writeFile(
    join(f.root, '.env'),
    `VITE_SUPABASE_URL=https://${ref}.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=${publicKey}\nSUPABASE_PROJECT_REF=${ref}\nSUPABASE_ACCESS_TOKEN=synthetic-local-token\nGEOAPIFY_API_KEY=${'a'.repeat(32)}\nGEOAPIFY_DAILY_CREDIT_BUDGET=100`,
  );
  await mkdir(join(f.root, 'supabase/migrations'), { recursive: true });
  await writeFile(join(f.root, 'supabase/migrations/202611040001_discovery.sql'), 'select 1;');
  await writeFile(join(f.root, 'supabase/migrations/202611050001_mapping_quota.sql'), 'select 2;');
  return f;
}
const approved = ['--apply', '--approved', '--free-plan-confirmed', '--confirm-project', ref];
it('defaults to a local plan and preserves existing credentials with no network activity', async () => {
  const f = await fixture();
  try {
    const before = await readFile(join(f.root, '.env'));
    const fetcher = vi.fn<typeof fetch>();
    expect((await setupMapping(f.root, [], fetcher)).applied).toBe(false);
    await expect(setupMapping(f.root, ['--apply'], fetcher)).rejects.toThrow('approval');
    await expect(
      setupMapping(
        f.root,
        approved.filter((arg) => arg !== '--free-plan-confirmed'),
        fetcher,
      ),
    ).rejects.toThrow('manual evidence');
    expect(fetcher).not.toHaveBeenCalled();
    expect(await readFile(join(f.root, '.env'))).toEqual(before);
  } finally {
    await f.clean();
  }
});
it('requires matching reviewed migration history and deploys only after identity/health/key checks — mocked management API', async () => {
  const f = await fixture();
  try {
    const baseline = `phase_2_discovery_${createHash('sha256').update('select 1;').digest('hex').slice(0, 16)}`;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: ref, status: 'ACTIVE_HEALTHY' }))
      .mockResolvedValueOnce(Response.json([{ type: 'publishable', api_key: publicKey }]))
      .mockResolvedValueOnce(Response.json([{ name: baseline }]))
      .mockResolvedValueOnce(Response.json([{ slug: 'discovery' }]))
      .mockResolvedValueOnce(Response.json({}));
    const deploy = vi.fn().mockResolvedValue(undefined);
    expect((await setupMapping(f.root, approved, fetcher, deploy)).applied).toBe(true);
    expect(deploy).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(JSON.parse(String(fetcher.mock.calls[4]![1]!.body)).query).toBe('select 2;');
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes('/organizations'))).toBe(true);
  } finally {
    await f.clean();
  }
});
it('stops on a scoped read permission denial without mutation or token broadening', async () => {
  const f = await fixture();
  try {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: ref, status: 'ACTIVE_HEALTHY' }))
      .mockResolvedValueOnce(Response.json([{ type: 'publishable', api_key: publicKey }]))
      .mockResolvedValueOnce(new Response('must not escape', { status: 403 }));
    const deploy = vi.fn();
    await expect(setupMapping(f.root, approved, fetcher, deploy)).rejects.toThrow(
      'database_migrations_read',
    );
    expect(deploy).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  } finally {
    await f.clean();
  }
});
