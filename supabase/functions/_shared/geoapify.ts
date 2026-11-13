import type {
  Attraction,
  Destination,
  DestinationKind,
  DiscoveryRequest,
  DiscoveryResponse,
} from './contracts.ts';

export class ProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export function providerUrl(input: DiscoveryRequest, apiKey: string) {
  const url = new URL('https://api.geoapify.com');
  if (input.operation === 'search' || input.operation === 'autocomplete') {
    url.pathname = `/v1/geocode/${input.operation}`;
    url.searchParams.set('text', input.query);
    url.searchParams.set('type', input.kind);
    url.searchParams.set('limit', input.operation === 'autocomplete' ? '10' : '20');
    url.searchParams.set('lang', 'en');
  } else if (input.operation === 'detail') {
    url.pathname = '/v2/place-details';
    url.searchParams.set('id', input.id.slice(4));
    // Exactly one feature = one credit. Never request geometry/isolines.
    url.searchParams.set('features', 'details');
  } else if (input.operation === 'places') {
    url.pathname = '/v2/places';
    const categories = {
      sights: 'tourism.sights,tourism.attraction',
      nature: 'natural,leisure.park',
      food: 'catering.restaurant,catering.cafe',
    };
    url.searchParams.set('categories', categories[input.category]);
    url.searchParams.set('filter', `circle:${input.longitude},${input.latitude},5000`);
    url.searchParams.set('bias', `proximity:${input.longitude},${input.latitude}`);
    url.searchParams.set('limit', '20');
    url.searchParams.set('lang', 'en');
  }
  url.searchParams.set('apiKey', apiKey);
  return url;
}

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const text = (v: unknown, max = 200) =>
  typeof v === 'string'
    ? [...v]
        .filter((char) => {
          const n = char.codePointAt(0)!;
          return (
            n >= 32 &&
            !(n >= 127 && n <= 159) &&
            !(n >= 0x202a && n <= 0x202e) &&
            !(n >= 0x2066 && n <= 0x2069)
          );
        })
        .join('')
        .trim()
        .slice(0, max)
    : '';

function destinationIdentity(
  p: Record<string, unknown>,
  detail: boolean,
): { kind: DestinationKind; name: string } | null {
  const type = text(p.result_type, 30);
  const raw = record(record(p.datasource).raw);
  const settlement = text(raw.place, 30);
  if (type === 'country') return { kind: 'country', name: text(p.country) || text(p.name) };
  if (type === 'state') return { kind: 'state', name: text(p.state) || text(p.name) };
  if (type === 'county') return { kind: 'county', name: text(p.county) || text(p.name) };
  if (type === 'district')
    return {
      kind: 'district',
      name: text(p.district) || text(p.name) || text(p.suburb) || text(p.address_line1),
    };
  if (type === 'city') {
    const specificSettlement = ['town', 'village', 'hamlet'].includes(settlement);
    return {
      kind:
        settlement === 'town'
          ? 'town'
          : ['village', 'hamlet'].includes(settlement)
            ? 'village'
            : 'city',
      name: specificSettlement ? text(p.name) || text(p.city) : text(p.city) || text(p.name),
    };
  }
  if (type === 'suburb' || type === 'locality')
    return { kind: 'locality', name: text(p.name) || text(p.suburb) || text(p.district) };
  // Explicit POI/address/postcode types are never promoted to destinations from their parent city.
  if (type && type !== 'unknown') return null;
  // Details sometimes omit result_type: use OSM place classification when supplied.
  if (
    [
      'country',
      'state',
      'county',
      'district',
      'city',
      'town',
      'village',
      'hamlet',
      'region',
    ].includes(settlement)
  ) {
    const kind: DestinationKind =
      settlement === 'hamlet' ? 'village' : (settlement as DestinationKind);
    return { kind, name: text(p.name) || text(p[kind]) };
  }
  if (detail) {
    const name = text(p.name) || text(p.address_line1);
    const matches = (['country', 'state', 'county', 'district', 'city'] as const).filter(
      (kind) => name && text(p[kind]).toLocaleLowerCase('en') === name.toLocaleLowerCase('en'),
    );
    if (matches.length === 1) return { kind: matches[0]!, name };
  }
  // A missing type cannot prove that a parent's city/county is the actual selected feature.
  // Preserve named detail links as an honestly unclassified region; never invent a city type.
  return detail && text(p.name) ? { kind: 'region', name: text(p.name) } : null;
}

export function normalizeProvider(
  value: unknown,
  input: DiscoveryRequest,
  fetchedAt: string,
): DiscoveryResponse {
  const root = record(value);
  if (!Array.isArray(root.features) || root.features.length > 100)
    throw new ProviderError(502, 'malformed_provider');
  const destinations: Destination[] = [];
  const attractions: Attraction[] = [];
  let excluded = 0;
  for (const feature of root.features.slice(0, 20)) {
    const p = record(record(feature).properties);
    if (input.operation === 'places') {
      const name = text(p.name);
      const id = text(p.place_id, 256);
      if (name && id)
        attractions.push({
          id,
          name,
          address: text(p.formatted, 400),
          category: input.category,
          description: '',
        });
    } else {
      const id = typeof p.place_id === 'string' ? p.place_id.trim() : '';
      const identity = destinationIdentity(p, input.operation === 'detail');
      if (!identity) {
        if (['amenity', 'building', 'street', 'postcode'].includes(String(p.result_type)))
          excluded++;
        continue;
      }
      const { name, kind } = identity;
      const latitude = p.lat,
        longitude = p.lon;
      if (
        !/^[a-f0-9]{20,256}$/i.test(id) ||
        !name ||
        typeof latitude !== 'number' ||
        !Number.isFinite(latitude) ||
        Math.abs(latitude) > 90 ||
        typeof longitude !== 'number' ||
        !Number.isFinite(longitude) ||
        Math.abs(longitude) > 180
      )
        continue;
      if (
        (input.operation === 'search' || input.operation === 'autocomplete') &&
        ((input.kind === 'country' && kind !== 'country') ||
          (input.kind === 'state' && kind !== 'state') ||
          (input.kind === 'city' && !['city', 'town', 'village'].includes(kind)))
      ) {
        excluded++;
        continue;
      }
      destinations.push({
        id: `geo-${id}`,
        name,
        country: text(p.country),
        kind,
        ...(kind !== 'country' && text(p.state) ? { state: text(p.state) } : {}),
        ...(!['country', 'state'].includes(kind) && text(p.county)
          ? { county: text(p.county) }
          : {}),
        ...(!['country', 'state', 'county'].includes(kind) && text(p.district)
          ? { district: text(p.district) }
          : {}),
        latitude,
        longitude,
        source: 'geoapify',
        fetchedAt,
      });
    }
  }
  if (
    root.features.length &&
    !destinations.length &&
    !attractions.length &&
    excluded !== root.features.slice(0, 20).length
  )
    throw new ProviderError(502, 'malformed_provider');
  return {
    destinations: [...new Map(destinations.map((d) => [d.id, d])).values()],
    attractions,
    fetchedAt,
    cached: false,
  };
}

export async function fetchProvider(
  input: DiscoveryRequest,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetcher(providerUrl(input, apiKey), {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
      redirect: 'error',
    });
  } catch {
    throw new ProviderError(504, 'provider_timeout');
  }
  if (!response.ok)
    throw new ProviderError(
      response.status === 429 ? 429 : 502,
      response.status === 429 ? 'provider_quota' : 'provider_unavailable',
    );
  // Bound both declared and streamed response size; never return upstream errors or URLs.
  if (Number(response.headers.get('content-length')) > 1_000_000)
    throw new ProviderError(502, 'malformed_provider');
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError(502, 'malformed_provider');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return normalizeProvider(
      JSON.parse(new TextDecoder().decode(bytes)),
      input,
      new Date().toISOString(),
    );
  } catch {
    throw new ProviderError(502, 'malformed_provider');
  }
}
