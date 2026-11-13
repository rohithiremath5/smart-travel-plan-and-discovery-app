import { describe, it, expect, vi } from 'vitest';
vi.mock('@/app/config/environment', () => ({
  appConfig: {
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    publishableKey: ['sb_publishable_', 'synthetic_public_fixture'].join(''),
    requestedMode: 'auto',
  },
}));
import { requestMapping, mappingErrorMessage } from '@/features/mapping/services/mapping-client';
import { DiscoveryError } from '@/features/discovery/services/discovery-client';
const input = {
  operation: 'location',
  query: 'Kyoto',
  near: { latitude: 35, longitude: 135 },
} as const;
const result = {
  locations: [
    {
      id: 'fixture',
      name: 'Kyoto',
      address: 'Japan',
      latitude: 35,
      longitude: 135,
      source: 'geoapify',
    },
  ],
  route: null,
  fetchedAt: '2026-11-05T00:00:00.000Z',
  cached: true,
};
describe('mapping browser transport', () => {
  it('sends only normalized coordinates/query and a public key, omitting browser cookies/admin authorization', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));
    expect((await requestMapping(input, undefined, fetcher)).cached).toBe(true);
    const options = fetcher.mock.calls[0]![1]!;
    expect(options.credentials).toBe('omit');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(String(options.body))).toEqual(input);
    expect(JSON.stringify(options.headers)).not.toContain('GEOAPIFY');
  });
  it('rejects malformed results and request coordinates before provider data can enter the map', async () => {
    await expect(
      requestMapping(
        input,
        undefined,
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ ...result, locations: [{ ...result.locations[0], latitude: 91 }] }),
          ),
      ),
    ).rejects.toMatchObject({ code: 'malformed' });
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      requestMapping({ ...input, near: { latitude: 91, longitude: 0 } }, undefined, fetcher),
    ).rejects.toMatchObject({ code: 'invalid_locations' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('retains bounded quota cooldown without exposing response details and clearly identifies hosted setup blockers', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { code: 'daily_budget', private: 'must not escape' },
          { status: 429, headers: { 'retry-after': '99999' } },
        ),
      );
    await expect(requestMapping(input, undefined, fetcher)).rejects.toMatchObject({
      code: 'daily_budget',
      retryAfter: 3600,
    });
    expect(mappingErrorMessage(new DiscoveryError('invalid_request'))).toContain(
      'Deployment needs separate approval',
    );
    expect(mappingErrorMessage(new DiscoveryError('partial_route'))).toContain('complete route');
  });
  it('propagates cancellation and bounds oversized responses', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      requestMapping(input, controller.signal, vi.fn().mockRejectedValue(new Error('private'))),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      requestMapping(input, undefined, vi.fn().mockResolvedValue(new Response('x'.repeat(200001)))),
    ).rejects.toMatchObject({ code: 'malformed' });
  });
});
