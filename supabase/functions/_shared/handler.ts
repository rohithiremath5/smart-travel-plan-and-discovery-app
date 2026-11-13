import { parseRequest, destinationCacheVersion, type DiscoveryResponse } from './contracts.ts';
import { fetchProvider, ProviderError } from './geoapify.ts';
import {
  parseMappingRequest,
  routeCreditReservation,
  type MappingResponse,
} from './mapping-contracts.ts';
import { fetchMapping } from './mapping-provider.ts';

export interface EdgeConfig {
  url: string;
  adminKey: string;
  publishableKeys: string[];
  geoapifyKey: string;
  origins: string[];
  budget: number;
}
export interface Reservation {
  state: 'hit' | 'reserved' | 'busy' | 'limited';
  payload?: DiscoveryResponse | MappingResponse;
  lease?: string;
}
export interface DiscoveryStore {
  acquire(key: string, budget: number, cost?: number): Promise<Reservation>;
  complete(
    key: string,
    lease: string,
    payload: DiscoveryResponse | MappingResponse | null,
  ): Promise<void>;
}

export function createStore(config: EdgeConfig, fetcher: typeof fetch = fetch): DiscoveryStore {
  async function rpc(name: string, body: object) {
    const response = await fetcher(`${config.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: config.adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('storage_unavailable');
    return response.status === 204 ? null : response.json();
  }
  return {
    acquire: (key, budget, cost) =>
      rpc('discovery_acquire', {
        p_key: key,
        p_budget: budget,
        ...(cost === undefined ? {} : { p_cost: cost }),
      }) as Promise<Reservation>,
    complete: async (key, lease, payload) => {
      await rpc('discovery_complete', { p_key: key, p_lease: lease, p_payload: payload });
    },
  };
}

export function createHandler(
  config: EdgeConfig,
  store: DiscoveryStore,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? '';
    const allowed = config.origins.includes(origin);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      'X-Content-Type-Options': 'nosniff',
    };
    if (allowed) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Headers'] = 'apikey, content-type';
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Expose-Headers'] = 'Retry-After';
    }
    const respond = (status: number, body: object) => Response.json(body, { status, headers });
    if (!allowed) return respond(403, { code: 'origin_denied' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond(405, { code: 'method_denied' });
    if (!config.publishableKeys.includes(request.headers.get('apikey') ?? ''))
      return respond(401, { code: 'invalid_public_key' });
    if (
      !config.geoapifyKey ||
      !config.adminKey ||
      !config.url ||
      !Number.isInteger(config.budget) ||
      config.budget < 1 ||
      config.budget > 100
    )
      return respond(503, { code: 'backend_unconfigured' });
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return respond(415, { code: 'json_required' });
    let input;
    try {
      if (Number(request.headers.get('content-length')) > 2048)
        return respond(413, { code: 'request_too_large' });
      const reader = request.body?.getReader();
      if (!reader) return respond(400, { code: 'invalid_request' });
      let body = '';
      let size = 0;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2048) {
          await reader.cancel();
          return respond(413, { code: 'request_too_large' });
        }
        body += decoder.decode(value, { stream: true });
      }
      const raw: unknown = JSON.parse(body + decoder.decode());
      input = parseRequest(raw) ?? parseMappingRequest(raw);
    } catch {
      return respond(400, { code: 'invalid_request' });
    }
    if (!input) return respond(400, { code: 'invalid_request' });
    // Cache is versioned and case-normalized; no key, IP or personal identifier is stored.
    const cacheInput =
      'query' in input ? { ...input, query: input.query.toLocaleLowerCase('en') } : input;
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        `${input.operation === 'location' || input.operation === 'route' ? 'mapping-v1' : input.operation === 'places' ? 'v1' : destinationCacheVersion}:${JSON.stringify(cacheInput)}`,
      ),
    );
    const key = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    let reservation: Reservation;
    try {
      reservation =
        input.operation === 'route' || input.operation === 'location'
          ? await store.acquire(
              key,
              config.budget,
              input.operation === 'route' ? routeCreditReservation : 1,
            )
          : await store.acquire(key, config.budget);
    } catch {
      return respond(503, { code: 'quota_unavailable' });
    }
    if (!reservation || typeof reservation !== 'object')
      return respond(503, { code: 'quota_unavailable' });
    if (reservation.state === 'hit' && reservation.payload)
      return respond(200, { ...reservation.payload, cached: true });
    if (reservation.state === 'limited' || reservation.state === 'busy') {
      headers['Retry-After'] = reservation.state === 'limited' ? '60' : '1';
      return respond(429, {
        code: reservation.state === 'limited' ? 'daily_budget' : 'request_busy',
      });
    }
    if (reservation.state !== 'reserved' || !reservation.lease)
      return respond(503, { code: 'quota_unavailable' });
    try {
      const result =
        input.operation === 'location' || input.operation === 'route'
          ? await fetchMapping(input, config.geoapifyKey, fetcher, request.signal)
          : await fetchProvider(input, config.geoapifyKey, fetcher, request.signal);
      if (config.geoapifyKey.length >= 8 && JSON.stringify(result).includes(config.geoapifyKey))
        throw new ProviderError(502, 'malformed_provider');
      await store.complete(key, reservation.lease, result);
      return respond(200, result);
    } catch (error) {
      await store.complete(key, reservation.lease, null).catch(() => undefined);
      if (error instanceof ProviderError) {
        if (error.status === 429) headers['Retry-After'] = '60';
        return respond(error.status, { code: error.code });
      }
      return respond(503, { code: 'cache_unavailable' });
    }
  };
}
