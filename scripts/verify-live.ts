import { loadBackendConfig } from './lib/backend-config';
import { setupArguments, requireSetupApproval } from './setup-backend';
import { isMain, reportFailure, SafeToolingError } from './lib/cli';

export async function verifyLive(root: string, args: string[], fetcher: typeof fetch = fetch) {
  const config = loadBackendConfig(root);
  const options = setupArguments(args);
  requireSetupApproval(config, options);
  const origin =
    config.origins.find((value) => value === 'http://127.0.0.1:4173') ?? config.origins[0]!;
  const invoke = async (body: object) => {
    const response = await fetcher(`${config.url}/functions/v1/discovery`, {
      method: 'POST',
      headers: {
        Origin: origin,
        apikey: config.publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new SafeToolingError(
        `Live discovery returned HTTP ${response.status}; no response body or credential printed. Verify approved backend/secret setup and quotas.`,
      );
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== 'object' ||
      !('destinations' in value) ||
      !Array.isArray(value.destinations) ||
      !('attractions' in value) ||
      !Array.isArray(value.attractions)
    )
      throw new SafeToolingError('Live response contract invalid.');
    return value as {
      destinations: { id: string; source: string; latitude: number; longitude: number }[];
      attractions: unknown[];
      cached: boolean;
    };
  };
  const search = await invoke({ operation: 'search', query: 'Kyoto', kind: 'city' });
  const destination = search.destinations[0];
  if (!destination || destination.source !== 'geoapify')
    throw new SafeToolingError('Live search did not return a Geoapify destination.');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const detail = await invoke({ operation: 'detail', id: destination.id });
  if (!detail.destinations.length) throw new SafeToolingError('Live detail response was empty.');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const places = await invoke({
    operation: 'places',
    latitude: destination.latitude,
    longitude: destination.longitude,
    category: 'sights',
  });
  const repeated = await invoke({ operation: 'search', query: 'Kyoto', kind: 'city' });
  if (!repeated.cached) throw new SafeToolingError('Live cache reuse was not confirmed.');
  return {
    searchCount: search.destinations.length,
    detailCount: detail.destinations.length,
    placesCount: places.attractions.length,
    cached: true,
  };
}
if (isMain(import.meta.url))
  verifyLive(process.cwd(), process.argv.slice(2))
    .then((result) =>
      console.log(
        `LIVE Geoapify through Supabase verified: search ${result.searchCount}, detail ${result.detailCount}, places ${result.placesCount}; repeated search cache hit. At most 3 new Geoapify credits. Values suppressed.`,
      ),
    )
    .catch(reportFailure);
