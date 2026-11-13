import { z } from 'zod';
import { appConfig } from '@/app/config/environment';
import { publicDiscoveryCode, readBoundedJson } from '@/lib/bounded-json';
import { destinationKinds } from '../../../../supabase/functions/_shared/contracts';
import type {
  DiscoveryRequest,
  DiscoveryResponse,
} from '../../../../supabase/functions/_shared/contracts';

export const destinationSchema = z.object({
  id: z.string().min(1).max(260),
  name: z.string().min(1).max(200),
  country: z.string().max(200),
  kind: z.enum(destinationKinds),
  state: z.string().max(200).optional(),
  county: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  source: z.enum(['curated', 'geoapify']),
  fetchedAt: z.iso.datetime(),
});
const responseSchema = z.object({
  destinations: z.array(destinationSchema).max(20),
  attractions: z
    .array(
      z.object({
        id: z.string().max(256),
        name: z.string().min(1).max(200),
        description: z.string().max(500),
        address: z.string().max(400),
        category: z.enum(['sights', 'nature', 'food']),
      }),
    )
    .max(20),
  fetchedAt: z.iso.datetime(),
  cached: z.boolean(),
});
export class DiscoveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryAfter = 0,
  ) {
    super(code);
  }
}
export function discoveryErrorMessage(error: unknown) {
  if (!(error instanceof DiscoveryError))
    return 'Discovery is unavailable. Check your connection and try again.';
  if (error.code === 'daily_budget' || error.code === 'provider_quota')
    return 'The discovery allowance has been reached. Try again later or browse the curated collection.';
  if (error.code === 'request_busy')
    return 'Discovery is handling another request. Wait a moment, then try again.';
  if (error.code === 'timeout' || error.code === 'provider_timeout')
    return 'Discovery took too long to respond. Your search is still here; try again.';
  if (
    error.code === 'unconfigured' ||
    error.code === 'backend_unconfigured' ||
    error.code === 'quota_unavailable'
  )
    return 'Worldwide discovery is not ready. Backend setup may still need approval. The curated collection is available.';
  if (error.code === 'malformed')
    return 'Discovery returned an unreadable response. Try again later.';
  if (error.code === 'invalid_request')
    return 'This destination search is not available yet. Try another destination type or the curated collection.';
  return 'Worldwide discovery could not be reached. Check your connection or try the curated collection.';
}
export async function requestDiscovery(
  input: DiscoveryRequest,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<DiscoveryResponse> {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!appConfig.supabaseUrl || !appConfig.publishableKey || appConfig.requestedMode === 'demo')
    throw new DiscoveryError('unconfigured');
  const deadline = AbortSignal.timeout(15000);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  let response: Response;
  try {
    response = await fetcher(`${appConfig.supabaseUrl}/functions/v1/discovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: appConfig.publishableKey },
      body: JSON.stringify(input),
      signal: combined,
      credentials: 'omit',
      redirect: 'error',
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
      /* Safe generic error. */
    }
    throw new DiscoveryError(
      code,
      Math.min(3600, Math.max(0, Number(response.headers.get('Retry-After')) || 0)),
    );
  }
  try {
    const result = responseSchema.safeParse(await readBoundedJson(response, 200000, combined));
    if (!result.success) throw new Error();
    return result.data;
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (combined.aborted) throw new DiscoveryError('timeout');
    throw new DiscoveryError('malformed');
  }
}
