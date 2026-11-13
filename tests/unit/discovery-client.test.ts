import { describe, expect, it, vi } from 'vitest';
vi.mock('@/app/config/environment', () => ({
  appConfig: {
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    publishableKey: ['sb_publishable_', 'synthetic_public_fixture'].join(''),
    requestedMode: 'auto',
  },
}));
import { requestDiscovery } from '@/features/discovery/services/discovery-client';

const input = { operation: 'search', query: 'Kyoto', kind: 'city' } as const;
describe('browser proxy adapter (mocked HTTP)', () => {
  it('sends only public apikey on a narrow POST and validates normalized output', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        destinations: [],
        attractions: [],
        fetchedAt: '2026-11-04T00:00:00Z',
        cached: true,
      }),
    );
    expect((await requestDiscovery(input, undefined, fetcher)).cached).toBe(true);
    const options = fetcher.mock.calls[0]![1]!;
    expect(options.credentials).toBe('omit');
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(String(options.body))).toEqual(input);
  });
  it('preserves safe quota codes and a bounded Retry-After without echoing bodies', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { code: 'daily_budget', private: 'must not escape' },
          { status: 429, headers: { 'Retry-After': '99999' } },
        ),
      );
    await expect(requestDiscovery(input, undefined, fetcher)).rejects.toMatchObject({
      code: 'daily_budget',
      retryAfter: 3600,
    });
  });
  it('rejects malformed normalized responses and maps timeout failures', async () => {
    await expect(
      requestDiscovery(
        input,
        undefined,
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ destinations: [{ name: 'invented' }] })),
      ),
    ).rejects.toMatchObject({ code: 'malformed' });
    await expect(
      requestDiscovery(
        input,
        undefined,
        vi.fn<typeof fetch>().mockRejectedValue(new Error('private request URL')),
      ),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
  it('preserves cancellation so obsolete requests do not become visible provider errors', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    await expect(requestDiscovery(input, controller.signal, fetcher)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
