import { ProviderError } from './geoapify.ts';
import {
  coordinates,
  sphericalDistance,
  toLngLat,
  type MappingRequest,
  type MappingResponse,
  type LngLat,
} from './mapping-contracts.ts';
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, max: number) =>
  typeof value === 'string'
    ? [...value.slice(0, max)]
        .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
        .join('')
    : '';
export function mappingProviderUrl(input: MappingRequest, key: string) {
  const url = new URL('https://api.geoapify.com');
  url.searchParams.set('apiKey', key);
  if (input.operation === 'location') {
    url.pathname = '/v1/geocode/search';
    url.searchParams.set('text', input.query);
    url.searchParams.set('limit', '6');
    url.searchParams.set('lang', 'en');
    if (input.near) {
      url.searchParams.set('bias', `proximity:${input.near.longitude},${input.near.latitude}`);
      url.searchParams.set('filter', `circle:${input.near.longitude},${input.near.latitude},25000`);
    }
  } else {
    url.pathname = '/v1/routing';
    url.searchParams.set(
      'waypoints',
      input.waypoints.map((p) => `${p.latitude},${p.longitude}`).join('|'),
    );
    url.searchParams.set('mode', input.mode);
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('units', 'metric');
  }
  return url;
}
export function normalizeMapping(
  value: unknown,
  input: MappingRequest,
  fetchedAt: string,
): MappingResponse {
  const root = record(value);
  if (!Array.isArray(root.features) || root.features.length > 20)
    throw new ProviderError(502, 'malformed_provider');
  if (input.operation === 'location') {
    const locations = root.features.slice(0, 6).flatMap((feature) => {
      const p = record(record(feature).properties);
      const point = coordinates({ latitude: p.lat, longitude: p.lon });
      const id = text(p.place_id, 256),
        name = text(p.name || p.address_line1 || p.formatted, 120);
      if (!point || !name || !id) return [];
      return [{ id, name, address: text(p.formatted, 300), ...point, source: 'geoapify' as const }];
    });
    if (root.features.length && !locations.length)
      throw new ProviderError(502, 'malformed_provider');
    return {
      locations: [
        ...new Map(
          locations.map((place) => [`${place.id}:${place.latitude}:${place.longitude}`, place]),
        ).values(),
      ],
      route: null,
      fetchedAt,
      cached: false,
    };
  }
  if (root.features.length !== 1) throw new ProviderError(502, 'route_unavailable');
  const feature = record(root.features[0]),
    p = record(feature.properties),
    geometry = record(feature.geometry);
  const distance = p.distance,
    duration = p.time;
  if (
    typeof distance !== 'number' ||
    !Number.isFinite(distance) ||
    distance <= 0 ||
    distance > 500000 ||
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 604800
  )
    throw new ProviderError(502, 'route_unavailable');
  const lines =
    geometry.type === 'LineString'
      ? [geometry.coordinates]
      : geometry.type === 'MultiLineString'
        ? geometry.coordinates
        : null;
  if (!Array.isArray(lines) || !lines.length || lines.length > 6)
    throw new ProviderError(502, 'malformed_provider');
  let count = 0;
  const normalized = lines.map((line) => {
    if (!Array.isArray(line) || line.length < 2) throw new ProviderError(502, 'malformed_provider');
    return line.map((position) => {
      if (++count > 5000 || !Array.isArray(position) || position.length < 2)
        throw new ProviderError(502, 'malformed_provider');
      const point = coordinates({ longitude: position[0], latitude: position[1] });
      if (!point) throw new ProviderError(502, 'malformed_provider');
      return toLngLat(point) as LngLat;
    });
  });
  // A missing/disconnected leg must never be presented as a complete day route.
  if (!Array.isArray(p.legs) || p.legs.length !== input.waypoints.length - 1)
    throw new ProviderError(502, 'partial_route');
  const first = normalized[0]![0]!,
    last = normalized.at(-1)!.at(-1)!;
  if (
    sphericalDistance({ longitude: first[0], latitude: first[1] }, input.waypoints[0]!) > 2000 ||
    sphericalDistance({ longitude: last[0], latitude: last[1] }, input.waypoints.at(-1)!) > 2000
  )
    throw new ProviderError(502, 'partial_route');
  for (let i = 1; i < normalized.length; i++) {
    const a = normalized[i - 1]!.at(-1)!,
      b = normalized[i]![0]!;
    if (
      sphericalDistance({ longitude: a[0], latitude: a[1] }, { longitude: b[0], latitude: b[1] }) >
      100
    )
      throw new ProviderError(502, 'partial_route');
  }
  return {
    locations: [],
    route: {
      mode: input.mode,
      geometry: { type: 'MultiLineString', coordinates: normalized },
      distanceMeters: distance,
      durationSeconds: duration,
      waypoints: input.waypoints,
      source: 'geoapify',
    },
    fetchedAt,
    cached: false,
  };
}
export async function fetchMapping(
  input: MappingRequest,
  key: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<MappingResponse> {
  let response: Response;
  try {
    response = await fetcher(mappingProviderUrl(input, key), {
      redirect: 'error',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : AbortSignal.timeout(8000),
    });
  } catch {
    throw new ProviderError(504, 'provider_timeout');
  }
  if (!response.ok)
    throw new ProviderError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? 'provider_quota'
        : input.operation === 'route'
          ? 'route_unavailable'
          : 'provider_unavailable',
    );
  if (Number(response.headers.get('content-length')) > 1000000)
    throw new ProviderError(502, 'malformed_provider');
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError(502, 'malformed_provider');
  let size = 0,
    body = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 1000000) {
        await reader.cancel();
        throw new Error();
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return normalizeMapping(JSON.parse(body + decoder.decode()), input, new Date().toISOString());
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new ProviderError(502, 'malformed_provider');
  }
}
