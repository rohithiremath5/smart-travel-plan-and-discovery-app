// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  parseMappingRequest,
  toLngLat,
  routeCreditReservation,
  type MappingRequest,
} from '../../supabase/functions/_shared/mapping-contracts';
import {
  mappingProviderUrl,
  normalizeMapping,
  fetchMapping,
} from '../../supabase/functions/_shared/mapping-provider';
import {
  createHandler,
  createStore,
  type DiscoveryStore,
  type EdgeConfig,
} from '../../supabase/functions/_shared/handler';
const waypoints = [
  { latitude: 35.0142, longitude: 135.7481 },
  { latitude: 35.0116, longitude: 135.7727 },
];
const input: MappingRequest = { operation: 'route', mode: 'walk', waypoints };
const fixture = {
  features: [
    {
      properties: { distance: 2600, time: 1900, legs: [{ distance: 2600, time: 1900 }] },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [
            [135.7481, 35.0142],
            [135.76, 35.0142],
            [135.7727, 35.0116],
          ],
        ],
      },
    },
  ],
};
const stamp = '2026-11-05T00:00:00.000Z';
const config: EdgeConfig = {
  url: 'https://example.test',
  adminKey: 'synthetic-admin',
  geoapifyKey: 'synthetic-private',
  publishableKeys: ['synthetic-public'],
  budget: 100,
  origins: ['http://localhost:5173'],
};
const request = (body: unknown = input) =>
  new Request('https://example.test', {
    method: 'POST',
    headers: {
      origin: config.origins[0]!,
      apikey: 'synthetic-public',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
const store = (): DiscoveryStore => ({
  acquire: vi.fn().mockResolvedValue({ state: 'reserved', lease: 'synthetic-lease' }),
  complete: vi.fn().mockResolvedValue(undefined),
});
describe('bounded mapping contracts and provider normalization', () => {
  it.each([
    { ...input, mode: 'fly' },
    { ...input, waypoints: [] },
    { ...input, waypoints: [waypoints[0]] },
    { ...input, waypoints: Array(7).fill(waypoints[0]) },
    { ...input, waypoints: [waypoints[0], waypoints[0]] },
    { ...input, waypoints: [waypoints[0], { latitude: 0, longitude: 0 }] },
    { ...input, waypoints: [{ latitude: 91, longitude: 0 }, waypoints[1]] },
    { ...input, url: 'https://evil.test' },
    { operation: 'location', query: 'ab' },
    { operation: 'location', query: 'x'.repeat(101) },
    { operation: 'location', query: 'Place', near: { latitude: 0 } },
  ])('rejects unsupported modes, bounds and arbitrary paths', (value) =>
    expect(parseMappingRequest(value)).toBeNull(),
  );
  it('centralizes reversed wire orders and never enables premium route options', () => {
    expect(toLngLat(waypoints[0]!)).toEqual([135.7481, 35.0142]);
    const url = mappingProviderUrl(input, 'synthetic');
    expect(url.pathname).toBe('/v1/routing');
    expect(url.searchParams.get('waypoints')).toBe('35.0142,135.7481|35.0116,135.7727');
    expect(url.searchParams.get('mode')).toBe('walk');
    for (const key of ['avoid', 'route_details', 'elevation', 'optimize_stops', 'details'])
      expect(url.searchParams.has(key)).toBe(false);
    const search = mappingProviderUrl(
      { operation: 'location', query: 'Garden', near: waypoints[0]! },
      'synthetic',
    );
    expect(search.searchParams.get('filter')).toBe('circle:135.7481,35.0142,25000');
    expect(search.searchParams.get('type')).toBeNull();
    expect(search.searchParams.get('limit')).toBe('6');
  });
  it('normalizes real route geometry and units without inventing a straight line', () => {
    const result = normalizeMapping(fixture, input, stamp);
    expect(result.route).toMatchObject({
      distanceMeters: 2600,
      durationSeconds: 1900,
      mode: 'walk',
      waypoints,
      geometry: { type: 'MultiLineString', coordinates: fixture.features[0]!.geometry.coordinates },
    });
    const line = structuredClone(fixture);
    line.features[0]!.geometry = {
      type: 'LineString',
      coordinates: fixture.features[0]!.geometry.coordinates[0] as never,
    };
    expect(normalizeMapping(line, { ...input, mode: 'drive' }, stamp).route?.mode).toBe('drive');
  });
  it('deduplicates bounded place results and removes private/provider extras', () => {
    const place = {
      properties: {
        place_id: 'place-a',
        name: 'A real result',
        formatted: 'Kyoto, Japan',
        lat: 35,
        lon: 135,
        apiKey: 'must-not-escape',
      },
    };
    const result = normalizeMapping(
      { features: [place, place] },
      { operation: 'location', query: 'Kyoto' },
      stamp,
    );
    expect(result.locations).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain('must-not-escape');
    expect(result.locations[0]).toMatchObject({
      name: 'A real result',
      latitude: 35,
      longitude: 135,
      source: 'geoapify',
    });
  });
  it.each([
    'missing-legs',
    'wrong-legs',
    'wrong-geometry',
    'invalid-position',
    'long-route',
    'partial-end',
  ])('rejects %s without drawing partial or fabricated routes', (variant) => {
    const value = structuredClone(fixture);
    const feature = value.features[0]!;
    if (variant === 'missing-legs')
      delete (feature.properties as Partial<typeof feature.properties>).legs;
    if (variant === 'wrong-legs') feature.properties.legs = [];
    if (variant === 'wrong-geometry') feature.geometry.type = 'Polygon';
    if (variant === 'invalid-position') feature.geometry.coordinates[0]![0] = [999, 35];
    if (variant === 'long-route') feature.properties.distance = 500001;
    if (variant === 'partial-end') feature.geometry.coordinates[0]![0] = [0, 0];
    expect(() => normalizeMapping(value, input, stamp)).toThrow();
  });
  it('fails safely on timeout, quota and malformed provider bodies', async () => {
    await expect(
      fetchMapping(input, 'private', vi.fn().mockRejectedValue(new Error('private-url'))),
    ).rejects.toMatchObject({ code: 'provider_timeout' });
    await expect(
      fetchMapping(
        input,
        'private',
        vi.fn().mockResolvedValue(new Response('private', { status: 429 })),
      ),
    ).rejects.toMatchObject({ code: 'provider_quota' });
    await expect(
      fetchMapping(
        input,
        'private',
        vi.fn().mockResolvedValue(Response.json({ apiKey: 'private' })),
      ),
    ).rejects.toMatchObject({ code: 'malformed_provider' });
  });
});
describe('shared discovery function mapping extension — mocked HTTP/storage', () => {
  it('reserves the conservative routing cost before fetching, returns sanitized output and caches it', async () => {
    const storage = store();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      expect(storage.acquire).toHaveBeenCalledWith(expect.any(String), 100, routeCreditReservation);
      return Response.json(fixture);
    });
    const result = await createHandler(config, storage, fetcher)(request());
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.route.distanceMeters).toBe(2600);
    expect(JSON.stringify(body)).not.toContain(config.geoapifyKey);
    expect(storage.complete).toHaveBeenCalledWith(
      expect.any(String),
      'synthetic-lease',
      expect.objectContaining({ route: expect.any(Object) }),
    );
  });
  it('serves a cached route without provider traffic, even when the daily reservation is exhausted', async () => {
    const storage = store();
    vi.mocked(storage.acquire).mockResolvedValue({
      state: 'hit',
      payload: normalizeMapping(fixture, input, stamp),
    });
    const fetcher = vi.fn<typeof fetch>();
    const result = await createHandler(config, storage, fetcher)(request());
    expect((await result.json()).cached).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['limited', 'busy'] as const)(
    'does not call providers when weighted storage returns %s',
    async (state) => {
      const storage = store();
      vi.mocked(storage.acquire).mockResolvedValue({ state });
      const fetcher = vi.fn<typeof fetch>();
      const response = await createHandler(config, storage, fetcher)(request());
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBeTruthy();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('fails closed if weighted quota is missing and refuses budgets above 100', async () => {
    const storage = store();
    vi.mocked(storage.acquire).mockRejectedValue(new Error('missing RPC'));
    const fetcher = vi.fn<typeof fetch>();
    expect((await createHandler(config, storage, fetcher)(request())).status).toBe(503);
    expect(
      (await createHandler({ ...config, budget: 101 }, storage, fetcher)(request())).status,
    ).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('uses the three-argument RPC only for weighted mapping operations', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ state: 'limited' }));
    const storage = createStore(config, fetcher);
    await storage.acquire('a'.repeat(64), 100, 20);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      p_key: 'a'.repeat(64),
      p_budget: 100,
      p_cost: 20,
    });
    await storage.acquire('b'.repeat(64), 100);
    expect(JSON.parse(String(fetcher.mock.calls[1]![1]!.body))).not.toHaveProperty('p_cost');
  });
});
