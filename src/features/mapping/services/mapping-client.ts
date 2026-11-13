import { z } from 'zod';
import { appConfig } from '@/app/config/environment';
import { publicDiscoveryCode, readBoundedJson } from '@/lib/bounded-json';
import { DiscoveryError } from '@/features/discovery/services/discovery-client';
import {
  parseMappingRequest,
  type MappingRequest,
  type MappingResponse,
} from '../../../../supabase/functions/_shared/mapping-contracts';
const point = z
  .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
  .strict();
export const mapLocationSchema = point.extend({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(120),
  address: z.string().max(300),
  source: z.enum(['geoapify', 'curated']),
});
const geometry = z
  .object({
    type: z.literal('MultiLineString'),
    coordinates: z
      .array(
        z
          .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
          .min(2)
          .max(5000),
      )
      .min(1)
      .max(6),
  })
  .strict();
const responseSchema = z
  .object({
    locations: z.array(mapLocationSchema).max(6),
    route: z
      .object({
        mode: z.enum(['walk', 'drive']),
        geometry,
        distanceMeters: z.number().positive().max(500000),
        durationSeconds: z.number().positive().max(604800),
        source: z.literal('geoapify'),
        waypoints: z.array(point).min(2).max(6),
      })
      .strict()
      .nullable(),
    fetchedAt: z.iso.datetime(),
    cached: z.boolean(),
  })
  .strict();
export function mappingErrorMessage(error: unknown) {
  if (error instanceof DiscoveryError) {
    if (['invalid_request', 'method_denied'].includes(error.code))
      return 'The hosted discovery function does not support Phase 5 yet. Deployment needs separate approval.';
    if (['quota_unavailable', 'backend_unconfigured'].includes(error.code))
      return 'The mapping backend is not ready. The reviewed function and weighted quota migration need separate setup approval.';
    if (['daily_budget', 'provider_quota'].includes(error.code))
      return 'The shared daily allowance has been reached. Manual planning and saved locations remain available.';
    if (error.code === 'request_busy')
      return 'Another request is in progress. Wait a moment and try again.';
    if (error.code === 'unconfigured')
      return 'Worldwide search and routes are unavailable in demo mode. Use known destination coordinates or enter your own.';
    if (error.code === 'route_unavailable' || error.code === 'partial_route')
      return 'A complete route could not be found. Check these locations or try the other travel mode; your plan is unchanged.';
  }
  return 'The map service could not respond. Check your connection and try again; your manual plan is safe.';
}
export async function requestMapping(
  input: MappingRequest,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<MappingResponse> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const valid = parseMappingRequest(input);
  if (!valid) throw new DiscoveryError('invalid_locations');
  if (!appConfig.supabaseUrl || !appConfig.publishableKey || appConfig.requestedMode === 'demo')
    throw new DiscoveryError('unconfigured');
  const deadline = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let response: Response;
  try {
    response = await fetcher(`${appConfig.supabaseUrl}/functions/v1/discovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: appConfig.publishableKey },
      body: JSON.stringify(valid),
      signal: combined,
      redirect: 'error',
      credentials: 'omit',
    });
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new DiscoveryError('timeout');
  }
  if (!response.ok) {
    let code = 'unavailable';
    try {
      code = publicDiscoveryCode(await readBoundedJson(response, 8192, combined));
    } catch {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (combined.aborted) throw new DiscoveryError('timeout');
      /* Safe generic response. */
    }
    throw new DiscoveryError(
      code,
      Math.min(3600, Math.max(0, Number(response.headers.get('retry-after')) || 0)),
    );
  }
  try {
    const result = responseSchema.parse(await readBoundedJson(response, 200000, combined));
    if (
      valid.operation === 'route' &&
      (!result.route ||
        result.route.mode !== valid.mode ||
        JSON.stringify(result.route.waypoints) !== JSON.stringify(valid.waypoints))
    )
      throw new Error();
    if (valid.operation === 'location' && result.route !== null) throw new Error();
    return result;
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (combined.aborted) throw new DiscoveryError('timeout');
    throw new DiscoveryError('malformed');
  }
}
