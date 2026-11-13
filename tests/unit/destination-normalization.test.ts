// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { parseRequest, type DiscoveryRequest } from '../../supabase/functions/_shared/contracts';
import {
  normalizeProvider,
  providerUrl,
  fetchProvider,
} from '../../supabase/functions/_shared/geoapify';
import { createHandler, type DiscoveryStore } from '../../supabase/functions/_shared/handler';
import { rawDestination, discoveryStamp } from '../fixtures/destination-search';
const input = {
  operation: 'search',
  query: 'Chikkamagaluru, Karnataka',
  kind: 'locality',
} as const;
const normalize = (overrides: Record<string, unknown>) =>
  normalizeProvider({ features: [rawDestination(overrides)] }, input, discoveryStamp)
    .destinations[0];
it.each(['locality', 'city', 'state', 'country'] as const)(
  'allows documented %s search/autocomplete with one bounded provider request',
  (kind) => {
    for (const operation of ['search', 'autocomplete'] as const) {
      const request = { ...input, kind, operation };
      expect(parseRequest(request)).toEqual(request);
      const url = providerUrl(request, 'synthetic');
      expect(url.searchParams.get('type')).toBe(kind);
      expect(url.searchParams.get('text')).toBe(input.query);
      expect(url.searchParams.get('limit')).toBe(operation === 'search' ? '20' : '10');
      expect(url.searchParams.has('categories')).toBe(false);
    }
  },
);
it.each(['county', 'district', 'amenity', 'postcode', 'street', 'all'])(
  'refuses unsupported provider request type %s',
  (kind) => {
    expect(parseRequest({ ...input, kind })).toBeNull();
  },
);
it.each([
  ['county', { county: 'Chikkamagaluru', city: 'Unrelated city' }, 'county', 'Chikkamagaluru'],
  [
    'district',
    { district: 'Wayanad', county: 'Parent county', city: 'Parent city' },
    'district',
    'Wayanad',
  ],
  ['state', { state: 'Karnataka', city: 'Mysuru' }, 'state', 'Karnataka'],
  ['country', { country: 'India', city: 'New Delhi' }, 'country', 'India'],
  [
    'city',
    { name: 'Sakleshpur', city: 'Sakleshpur', datasource: { raw: { place: 'town' } } },
    'town',
    'Sakleshpur',
  ],
  [
    'city',
    { name: 'Angadi', city: 'Mudigere', datasource: { raw: { place: 'village' } } },
    'village',
    'Angadi',
  ],
  ['city', { city: 'Mysuru' }, 'city', 'Mysuru'],
  ['suburb', { name: 'Yelahanka', city: 'Bengaluru' }, 'locality', 'Yelahanka'],
] as const)(
  'normalizes %s from its actual feature level, preserving ID/coordinates',
  (type, fields, kind, name) => {
    const result = normalize({ result_type: type, ...fields });
    expect(result).toMatchObject({
      name,
      kind,
      id: 'geo-' + 'c'.repeat(38) + '01',
      latitude: 13.316,
      longitude: 75.772,
      source: 'geoapify',
    });
  },
);
it.each([
  ['Chikmagalur', 'county', 'Chikkamagaluru', 'Karnataka'],
  ['Chikkamagaluru', 'county', 'Chikkamagaluru', 'Karnataka'],
  ['Kodagu', 'county', 'Kodagu', 'Karnataka'],
  ['Coorg', 'county', 'Kodagu', 'Karnataka'],
  ['Mysore', 'city', 'Mysuru', 'Karnataka'],
  ['Mysuru', 'city', 'Mysuru', 'Karnataka'],
  ['Belgaum', 'city', 'Belagavi', 'Karnataka'],
  ['Belagavi', 'city', 'Belagavi', 'Karnataka'],
  ['Wayanad', 'county', 'Wayanad', 'Kerala'],
  ['Sakleshpur', 'town', 'Sakleshpur', 'Karnataka'],
  ['Shivamogga', 'city', 'Shivamogga', 'Karnataka'],
  ['Ooty', 'town', 'Udhagamandalam', 'Tamil Nadu'],
  ['Udhagamandalam', 'town', 'Udhagamandalam', 'Tamil Nadu'],
] as const)(
  'preserves %s query and accepts its explicitly supplied provider feature',
  (query, kind, name, state) => {
    expect(providerUrl({ ...input, query }, 'synthetic').searchParams.get('text')).toBe(query);
    // Synthetic provider-shaped fixtures, not assertions of real Geoapify coverage/coordinates.
    expect(
      normalize({
        result_type: kind === 'town' ? 'city' : kind,
        name,
        [kind === 'town' ? 'city' : kind]: name,
        state,
        country: 'India',
        datasource: { raw: { place: kind } },
      }),
    ).toMatchObject({ name, kind, state, country: 'India', source: 'geoapify' });
  },
);
it('retains duplicate names in distinct regions and removes only duplicate IDs', () => {
  const a = rawDestination(
    {
      result_type: 'city',
      name: 'Springfield',
      city: 'Springfield',
      state: 'Illinois',
      country: 'United States',
    },
    2,
  );
  const b = rawDestination(
    {
      result_type: 'city',
      name: 'Springfield',
      city: 'Springfield',
      state: 'Massachusetts',
      country: 'United States',
    },
    3,
  );
  const result = normalizeProvider({ features: [a, b, a] }, input, discoveryStamp);
  expect(result.destinations.map((d) => d.state)).toEqual(['Illinois', 'Massachusetts']);
});
it('works with non-Indian states, counties and rural settlements', () => {
  expect(normalize({ result_type: 'state', state: 'Québec', country: 'Canada' })).toMatchObject({
    name: 'Québec',
    kind: 'state',
  });
  expect(
    normalize({ result_type: 'county', county: 'Cumbria', country: 'United Kingdom' }),
  ).toMatchObject({ name: 'Cumbria', kind: 'county' });
  expect(
    normalize({
      result_type: 'city',
      city: 'Aldbury',
      name: 'Aldbury',
      country: 'United Kingdom',
      datasource: { raw: { place: 'village' } },
    }),
  ).toMatchObject({ name: 'Aldbury', kind: 'village' });
});
it.each([
  { lat: 91 },
  { lon: 181 },
  { lat: '13.3' },
  { lat: null },
  { lat: NaN },
  { place_id: 'not-an-id' },
  { place_id: 'c'.repeat(300) },
  { result_type: 'county', county: '', name: '' },
])('rejects malformed destination fields %j', (fields) => {
  expect(() => normalize(fields)).toThrow('malformed_provider');
});
it('excludes POI/address/postcode results without disguising parent cities as destinations', () => {
  for (const result_type of ['amenity', 'building', 'street', 'postcode'])
    expect(
      normalizeProvider({ features: [rawDestination({ result_type })] }, input, discoveryStamp)
        .destinations,
    ).toEqual([]);
});
it('does not turn a mismatched country/state filter result into the requested type', () => {
  for (const kind of ['country', 'state'] as const)
    expect(
      normalizeProvider(
        { features: [rawDestination({ result_type: 'city', city: 'Mysuru' })] },
        { ...input, kind },
        discoveryStamp,
      ).destinations,
    ).toEqual([]);
});
it('bounds and sanitizes provider text, supports absent context, and handles empty results', () => {
  expect(
    normalize({
      name: undefined,
      county: ' Chikkamagaluru\u0000\u202e ',
      state: undefined,
      country: undefined,
    }),
  ).toMatchObject({ name: 'Chikkamagaluru', kind: 'county', country: '' });
  expect(normalizeProvider({ features: [] }, input, discoveryStamp).destinations).toEqual([]);
});
it('retains an honestly unclassified named detail if no trustworthy type is supplied', () => {
  const result = normalizeProvider(
    {
      features: [
        rawDestination({ result_type: undefined, name: 'A named area', city: 'A parent city' }),
      ],
    },
    { operation: 'detail', id: 'geo-' + 'c'.repeat(38) + '01' },
    discoveryStamp,
  );
  expect(result.destinations[0]).toMatchObject({ name: 'A named area', kind: 'region' });
});
it('propagates caller cancellation, exposes safe timeout/429/5xx errors and never retries', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn<typeof fetch>(async (_url, options) => {
    expect(options?.signal?.aborted).toBe(true);
    throw new Error('private request URL');
  });
  await expect(fetchProvider(input, 'synthetic', fetcher, controller.signal)).rejects.toMatchObject(
    { code: 'provider_timeout' },
  );
  expect(fetcher).toHaveBeenCalledOnce();
  for (const status of [429, 500, 504]) {
    const failing = vi.fn<typeof fetch>(async () => new Response('PRIVATE', { status }));
    await expect(fetchProvider(input, 'synthetic', failing)).rejects.toMatchObject({
      code: status === 429 ? 'provider_quota' : 'provider_unavailable',
    });
    expect(failing).toHaveBeenCalledOnce();
  }
});
const config = {
  url: 'https://synthetic.example',
  adminKey: 'server',
  publishableKeys: ['public'],
  geoapifyKey: 'private-geo',
  origins: ['http://localhost:5173'],
  budget: 100,
};
const webRequest = (body: DiscoveryRequest | object) =>
  new Request('http://localhost:5173', {
    method: 'POST',
    headers: { origin: config.origins[0]!, apikey: 'public', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const key = async (prefix: string, body: object) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(prefix + ':' + JSON.stringify(body)),
      ),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
it('uses a new search/detail cache namespace, charges once then reuses the corrected payload', async () => {
  const cityInput = { ...input, query: 'Sakleshpur', kind: 'city' } as const;
  const cache = new Map<string, unknown>();
  const oldKey = await key('v1', { ...cityInput, query: 'sakleshpur' });
  cache.set(oldKey, { destinations: [{ name: 'Wrong old city' }] });
  const store: DiscoveryStore = {
    acquire: vi.fn<DiscoveryStore['acquire']>(async (k) =>
      cache.has(k)
        ? { state: 'hit', payload: cache.get(k) as never }
        : { state: 'reserved', lease: 'lease' },
    ),
    complete: async (k, _lease, payload) => {
      cache.set(k, payload);
    },
  };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({
      features: [
        rawDestination({
          result_type: 'city',
          city: 'Sakleshpur',
          name: 'Sakleshpur',
          datasource: { raw: { place: 'town' } },
        }),
      ],
    }),
  );
  const handler = createHandler(config, store, fetcher);
  expect((await (await handler(webRequest(cityInput))).json()).destinations[0].kind).toBe('town');
  expect((await (await handler(webRequest(cityInput))).json()).cached).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(cache.has(oldKey)).toBe(true);
  expect(store.acquire).toHaveBeenCalledWith(
    await key('destinations-v2', { ...cityInput, query: 'sakleshpur' }),
    100,
  );
});
it('keeps mapping and nearby cache namespaces, route quota and authorization safeguards', async () => {
  for (const [body, prefix] of [
    [{ operation: 'location', query: 'Kyoto station' }, 'mapping-v1'],
    [{ operation: 'places', latitude: 13, longitude: 75, category: 'sights' }, 'v1'],
  ] as const) {
    const acquire = vi.fn<DiscoveryStore['acquire']>(async () => ({ state: 'limited' as const })),
      fetcher = vi.fn();
    const handler = createHandler(config, { acquire, complete: vi.fn() }, fetcher);
    expect((await handler(webRequest(body))).status).toBe(429);
    const normalized = 'query' in body ? { ...body, query: body.query.toLowerCase() } : body;
    expect(acquire.mock.calls[0]?.[0]).toBe(await key(prefix, normalized));
    expect(fetcher).not.toHaveBeenCalled();
  }
  const store = { acquire: vi.fn(), complete: vi.fn() },
    fetcher = vi.fn();
  const result = await createHandler({ ...config, budget: 101 }, store, fetcher)(webRequest(input));
  expect(result.status).toBe(503);
  expect(store.acquire).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it('refuses reflected server credentials before caching or returning a normalized provider result', async () => {
  const store: DiscoveryStore = {
    acquire: vi.fn<DiscoveryStore['acquire']>(async () => ({ state: 'reserved', lease: 'lease' })),
    complete: vi.fn<DiscoveryStore['complete']>().mockResolvedValue(undefined),
  };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ features: [rawDestination({ county: config.geoapifyKey })] }),
  );
  const response = await createHandler(config, store, fetcher)(webRequest(input));
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain(config.geoapifyKey);
  expect(store.complete).toHaveBeenCalledWith(expect.any(String), 'lease', null);
  expect(fetcher).toHaveBeenCalledOnce();
});
it('normalizes untyped details only when the feature name unambiguously matches one geographic field', () => {
  const detail = { operation: 'detail', id: 'geo-' + 'c'.repeat(38) + '01' } as const;
  for (const [name, kind] of [
    ['Karnataka', 'state'],
    ['India', 'country'],
    ['Chikkamagaluru', 'county'],
  ] as const) {
    const result = normalizeProvider(
      { features: [rawDestination({ result_type: undefined, name })] },
      detail,
      discoveryStamp,
    );
    expect(result.destinations[0]).toMatchObject({ name, kind });
  }
});
it('versions detail caches without changing the selected provider ID', async () => {
  const detail = { operation: 'detail', id: 'geo-' + 'c'.repeat(38) + '01' } as const;
  const acquire = vi.fn<DiscoveryStore['acquire']>(async () => ({
    state: 'reserved',
    lease: 'lease',
  }));
  const response = await createHandler(
    config,
    { acquire, complete: vi.fn() },
    vi.fn<typeof fetch>(async () => Response.json({ features: [rawDestination()] })),
  )(webRequest(detail));
  expect((await response.json()).destinations[0]).toMatchObject({ id: detail.id, kind: 'county' });
  expect(acquire).toHaveBeenCalledWith(await key('destinations-v2', detail), 100);
});
