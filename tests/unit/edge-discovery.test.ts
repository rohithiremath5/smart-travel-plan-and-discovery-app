// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  createHandler,
  type DiscoveryStore,
  type EdgeConfig,
} from '../../supabase/functions/_shared/handler';
import { parseRequest } from '../../supabase/functions/_shared/contracts';
import { fetchProvider, providerUrl } from '../../supabase/functions/_shared/geoapify';

const config: EdgeConfig = {
  url: 'https://abcdefghijklmnopqrst.supabase.co',
  adminKey: 'synthetic-admin',
  publishableKeys: ['synthetic-public'],
  geoapifyKey: 'synthetic-provider',
  origins: ['http://localhost:5173'],
  budget: 2,
};
const input = { operation: 'search', query: 'Kyoto', kind: 'city' } as const;
const fixture = {
  features: [
    {
      properties: {
        place_id: 'a'.repeat(40),
        city: 'Kyoto',
        country: 'Japan',
        lat: 35,
        lon: 135,
        result_type: 'city',
      },
    },
  ],
};
const request = (body: unknown = input, headers: Record<string, string> = {}) =>
  new Request('https://example.test', {
    method: 'POST',
    headers: {
      origin: config.origins[0]!,
      apikey: 'synthetic-public',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
const store = (): DiscoveryStore => ({
  acquire: vi.fn().mockResolvedValue({ state: 'reserved', lease: 'synthetic-lease' }),
  complete: vi.fn().mockResolvedValue(undefined),
});
describe('restricted discovery edge integration (mocked upstream/store)', () => {
  it.each([
    {},
    { ...input, url: 'https://evil.test' },
    { ...input, query: 'ab' },
    { ...input, query: 'x'.repeat(101) },
    { operation: 'places', latitude: 91, longitude: 0, category: 'sights' },
    { operation: 'places', latitude: 0, longitude: 0, category: 'adult' },
    { operation: 'detail', id: 'https://evil.test' },
  ])('rejects malformed or unallowlisted requests', (value) =>
    expect(parseRequest(value)).toBeNull(),
  );
  it('bounds paths, credit-cost features, result limits and coordinate order', () => {
    expect(providerUrl(input, 'key').pathname).toBe('/v1/geocode/search');
    const detail = providerUrl({ operation: 'detail', id: 'geo-' + 'a'.repeat(40) }, 'key');
    expect(detail.searchParams.get('features')).toBe('details');
    const places = providerUrl(
      { operation: 'places', latitude: 35, longitude: 135, category: 'sights' },
      'key',
    );
    expect(places.searchParams.get('filter')).toBe('circle:135,35,5000');
    expect(places.searchParams.get('limit')).toBe('20');
  });
  it('reserves before fetching and returns only normalized public data', async () => {
    const storage = store();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      expect(storage.acquire).toHaveBeenCalledOnce();
      return Response.json(fixture);
    });
    const response = await createHandler(config, storage, fetcher)(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.destinations[0]).toMatchObject({ name: 'Kyoto', source: 'geoapify' });
    expect(JSON.stringify(body)).not.toContain(config.geoapifyKey);
    expect(storage.complete).toHaveBeenCalledOnce();
  });
  it('uses cached payloads without provider traffic or another reservation charge', async () => {
    const storage = store();
    const fetcher = vi.fn<typeof fetch>();
    vi.mocked(storage.acquire).mockResolvedValue({
      state: 'hit',
      payload: {
        destinations: [],
        attractions: [],
        fetchedAt: '2026-11-04T00:00:00Z',
        cached: false,
      },
    });
    const response = await createHandler(config, storage, fetcher)(request());
    expect((await response.json()).cached).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['busy', 'limited'] as const)(
    'honors durable %s without hitting provider',
    async (state) => {
      const storage = store();
      vi.mocked(storage.acquire).mockResolvedValue({ state });
      const fetcher = vi.fn<typeof fetch>();
      const response = await createHandler(config, storage, fetcher)(request());
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeTruthy();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('fails closed when quota storage is unavailable', async () => {
    const storage = store();
    vi.mocked(storage.acquire).mockRejectedValue(new Error('private detail'));
    const fetcher = vi.fn<typeof fetch>();
    const response = await createHandler(config, storage, fetcher)(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private detail');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ['origin', 'https://evil.test', 403],
    ['apikey', 'wrong', 401],
  ] as const)('rejects invalid %s before reserving credits', async (name, value, status) => {
    const storage = store();
    const response = await createHandler(config, storage)(request(input, { [name]: value }));
    expect(response.status).toBe(status);
    expect(storage.acquire).not.toHaveBeenCalled();
  });
  it('handles preflight and caps request size even without a declared length', async () => {
    const handler = createHandler(config, store());
    expect(
      (
        await handler(
          new Request('https://example.test', {
            method: 'OPTIONS',
            headers: { origin: config.origins[0]! },
          }),
        )
      ).status,
    ).toBe(204);
    expect((await handler(request({ ...input, query: 'x'.repeat(3000) }))).status).toBe(413);
  });
  it.each([429, 401, 500])('redacts upstream HTTP %s bodies and never retries', async (status) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('private upstream apiKey=secret', { status }));
    const response = await createHandler(config, store(), fetcher)(request());
    expect(response.status).toBe(status === 429 ? 429 : 502);
    expect(await response.text()).not.toContain('secret');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('rejects malformed payloads and bounds upstream bytes', async () => {
    for (const body of [
      'not-json',
      JSON.stringify({ features: [{ properties: {} }] }),
      'x'.repeat(1000001),
    ]) {
      const response = await createHandler(
        config,
        store(),
        vi.fn<typeof fetch>().mockResolvedValue(new Response(body)),
      )(request());
      expect(response.status).toBe(502);
    }
  });
  it('maps timeout/network failure to a bounded safe error', async () => {
    await expect(
      fetchProvider(
        input,
        'private',
        vi.fn<typeof fetch>().mockRejectedValue(new DOMException('private', 'TimeoutError')),
      ),
    ).rejects.toMatchObject({ status: 504, code: 'provider_timeout' });
  });
  it('returns a genuine empty result instead of fabricated recommendations', async () => {
    const response = await createHandler(
      config,
      store(),
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({ features: [] })),
    )(request());
    expect((await response.json()).destinations).toEqual([]);
  });
});
