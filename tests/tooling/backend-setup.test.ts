// @vitest-environment node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { backendConfig, functionSecrets } from '../../scripts/lib/backend-config';
import {
  setupBackend,
  safeDeploymentDiagnostic,
  deployDiscovery,
} from '../../scripts/setup-backend';
import { setupSecrets } from '../../scripts/setup-secrets';
import { managementApi } from '../../scripts/lib/management-api';
import { createFixture } from './helpers';

const reference = 'abcdefghijklmnopqrst';
const environment = {
  VITE_SUPABASE_URL: `https://${reference}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: ['sb_publishable_', 'fixture_public_value'].join(''),
  SUPABASE_PROJECT_REF: reference,
  SUPABASE_ACCESS_TOKEN: 'synthetic-private-token',
  GEOAPIFY_API_KEY: 'a'.repeat(32),
  SUPABASE_DB_PASSWORD: 'synthetic-private-password',
};
async function fixture() {
  const f = await createFixture();
  await writeFile(
    join(f.root, '.env'),
    Object.entries(environment)
      .map(([name, value]) => `${name}=${value}`)
      .join('\n'),
  );
  await mkdir(join(f.root, 'supabase/migrations'), { recursive: true });
  await writeFile(join(f.root, 'supabase/migrations/202611040001_discovery.sql'), 'select 1;');
  return f;
}
describe('backend automation approval and secret boundaries', () => {
  it('deploys only discovery with six allowlisted files and stops on the exact write permission', async () => {
    const f = await fixture();
    try {
      for (const file of [
        'discovery/index.ts',
        '_shared/handler.ts',
        '_shared/geoapify.ts',
        '_shared/contracts.ts',
        '_shared/mapping-contracts.ts',
        '_shared/mapping-provider.ts',
      ]) {
        await mkdir(join(f.root, 'supabase/functions', file, '..'), { recursive: true });
        await writeFile(join(f.root, 'supabase/functions', file), 'export {};');
      }
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ slug: 'discovery', status: 'ACTIVE' }));
      const config = backendConfig(environment);
      await deployDiscovery(f.root, config, fetcher);
      const call = fetcher.mock.calls[0]!;
      expect(String(call[0])).toBe(
        `https://api.supabase.com/v1/projects/${reference}/functions/deploy?slug=discovery`,
      );
      const form = call[1]?.body as FormData;
      expect(JSON.parse(String(form.get('metadata')))).toEqual({
        name: 'discovery',
        entrypoint_path: 'discovery/index.ts',
        verify_jwt: false,
      });
      expect(form.getAll('file').map((value) => (value as File).name)).toEqual([
        'discovery/index.ts',
        '_shared/handler.ts',
        '_shared/geoapify.ts',
        '_shared/contracts.ts',
        '_shared/mapping-contracts.ts',
        '_shared/mapping-provider.ts',
      ]);
      fetcher.mockResolvedValue(new Response(null, { status: 403 }));
      await expect(deployDiscovery(f.root, config, fetcher)).rejects.toThrow(
        'edge_functions_write',
      );
    } finally {
      await f.clean();
    }
  });
  it('reports useful CLI errors while suppressing configured credentials and target values', () => {
    const config = backendConfig(environment);
    const diagnostic = safeDeploymentDiagnostic(
      `HTTP 403 requires edge_functions_write ${config.accessToken} ${config.geoapifyKey} ${config.publishableKey} ${config.url} ${config.ref} other-private-fixture`,
      config,
      ['other-private-fixture'],
    );
    expect(diagnostic).toContain('HTTP 403 requires edge_functions_write');
    for (const value of [
      config.accessToken,
      config.geoapifyKey,
      config.publishableKey,
      config.url,
      config.ref,
      'other-private-fixture',
    ])
      expect(diagnostic).not.toContain(value);
  });
  it('accepts an empty successful secrets acknowledgement while rejecting empty metadata reads', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    const api = managementApi(backendConfig(environment), fetcher);
    expect(await api('/secrets', 'POST', [])).toBeNull();
    await expect(api('/database/migrations')).rejects.toThrow('unreadable management response');
  });
  it('validates target and budget without printing values', () => {
    expect(backendConfig(environment).ref).toBe(reference);
    expect(() => backendConfig({ ...environment, SUPABASE_PROJECT_REF: 'z'.repeat(20) })).toThrow(
      'must match',
    );
    expect(() => backendConfig({ ...environment, GEOAPIFY_DAILY_CREDIT_BUDGET: '3001' })).toThrow(
      '1 to 100',
    );
    expect(() =>
      backendConfig({ ...environment, FUNCTION_ALLOWED_ORIGINS: 'https://*.example.test' }),
    ).toThrow();
  });
  it('allows exactly four function settings and no administrative credentials', () => {
    const settings = functionSecrets(backendConfig(environment));
    expect(settings.map((item) => item.name)).toEqual([
      'GEOAPIFY_API_KEY',
      'FUNCTION_ALLOWED_ORIGINS',
      'GEOAPIFY_DAILY_CREDIT_BUDGET',
      'DISCOVERY_PUBLISHABLE_KEY',
    ]);
    expect(JSON.stringify(settings)).not.toContain(environment.SUPABASE_ACCESS_TOKEN);
    expect(JSON.stringify(settings)).not.toContain(environment.SUPABASE_DB_PASSWORD);
  });
  it('default plans never call remote APIs and preserve .env bytes', async () => {
    const f = await fixture();
    try {
      const before = await readFile(join(f.root, '.env'));
      const fetcher = vi.fn<typeof fetch>();
      const deploy = vi.fn();
      expect((await setupBackend(f.root, [], fetcher, deploy)).applied).toBe(false);
      expect((await setupSecrets(f.root, [], fetcher)).applied).toBe(false);
      expect(fetcher).not.toHaveBeenCalled();
      expect(deploy).not.toHaveBeenCalled();
      expect(await readFile(join(f.root, '.env'))).toEqual(before);
    } finally {
      await f.clean();
    }
  });
  it('refuses apply without approval and exact target confirmation before any network call', async () => {
    const f = await fixture();
    try {
      const fetcher = vi.fn<typeof fetch>();
      await expect(setupBackend(f.root, ['--apply'], fetcher)).rejects.toThrow('approval');
      await expect(
        setupSecrets(f.root, ['--apply', '--approved', '--confirm-project', 'wrong'], fetcher),
      ).rejects.toThrow('approval');
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      await f.clean();
    }
  });
  it.each([401, 403])(
    'reports HTTP %s permissions safely and stops before mutation',
    async (status) => {
      const f = await fixture();
      try {
        const fetcher = vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response('private upstream', { status }));
        await expect(setupBackend(f.root, ['--check-remote'], fetcher)).rejects.toThrow(
          status === 401 ? 'expired' : 'project_admin_read',
        );
        expect(fetcher).toHaveBeenCalledOnce();
      } finally {
        await f.clean();
      }
    },
  );
  it('applies only the reviewed migration and named function after mocked confirmation', async () => {
    const f = await fixture();
    try {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ id: reference, status: 'ACTIVE_HEALTHY' }))
        .mockResolvedValueOnce(
          Response.json([
            { type: 'publishable', api_key: environment.VITE_SUPABASE_PUBLISHABLE_KEY },
          ]),
        )
        .mockResolvedValueOnce(Response.json([]))
        .mockResolvedValueOnce(Response.json({}));
      const deploy = vi.fn().mockResolvedValue(undefined);
      const result = await setupBackend(
        f.root,
        ['--apply', '--approved', '--confirm-project', reference],
        fetcher,
        deploy,
      );
      expect(result.applied).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(4);
      expect(deploy).toHaveBeenCalledOnce();
      const migration = JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body));
      expect(migration.query).toBe('select 1;');
    } finally {
      await f.clean();
    }
  });
  it('skips an identical recorded migration and refuses conflicting history without mutation', async () => {
    const f = await fixture();
    try {
      const plan = await setupBackend(f.root, []);
      for (const matching of [true, false]) {
        const fetcher = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(Response.json({ id: reference, status: 'ACTIVE_HEALTHY' }))
          .mockResolvedValueOnce(
            Response.json([
              { type: 'publishable', api_key: environment.VITE_SUPABASE_PUBLISHABLE_KEY },
            ]),
          )
          .mockResolvedValueOnce(
            Response.json([{ name: matching ? plan.migration : 'phase_2_discovery_different' }]),
          );
        const deploy = vi.fn().mockResolvedValue(undefined);
        const action = setupBackend(
          f.root,
          ['--apply', '--approved', '--confirm-project', reference],
          fetcher,
          deploy,
        );
        if (matching) {
          expect((await action).applied).toBe(true);
          expect(deploy).toHaveBeenCalledOnce();
        } else {
          await expect(action).rejects.toThrow('different content hash');
          expect(deploy).not.toHaveBeenCalled();
        }
        expect(fetcher.mock.calls.every((call) => (call[1]?.method ?? 'GET') === 'GET')).toBe(true);
      }
    } finally {
      await f.clean();
    }
  });
  it('synchronizes only allowlisted settings after mocked project confirmation and preserves .env', async () => {
    const f = await fixture();
    try {
      const before = await readFile(join(f.root, '.env'));
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ id: reference, status: 'ACTIVE_HEALTHY' }))
        .mockResolvedValueOnce(
          Response.json([
            { type: 'publishable', api_key: environment.VITE_SUPABASE_PUBLISHABLE_KEY },
          ]),
        )
        .mockResolvedValueOnce(Response.json({}));
      expect(
        (
          await setupSecrets(
            f.root,
            ['--apply', '--approved', '--confirm-project', reference],
            fetcher,
          )
        ).applied,
      ).toBe(true);
      const call = fetcher.mock.calls[2]!;
      expect(String(call[0])).toBe(`https://api.supabase.com/v1/projects/${reference}/secrets`);
      const body = String(call[1]?.body);
      expect(JSON.parse(body).map((value: { name: string }) => value.name)).toEqual(
        functionSecrets(backendConfig(environment)).map((value) => value.name),
      );
      expect(body).not.toContain(environment.SUPABASE_ACCESS_TOKEN);
      expect(body).not.toContain(environment.SUPABASE_DB_PASSWORD);
      expect(await readFile(join(f.root, '.env'))).toEqual(before);
    } finally {
      await f.clean();
    }
  });
});
