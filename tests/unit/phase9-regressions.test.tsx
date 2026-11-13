import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DestinationPhoto } from '@/features/discovery/components/destination-photo';
import { TripCover } from '@/features/trips/components/trip-shared';
vi.mock('@/app/config/environment', () => ({
  appConfig: {
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    publishableKey: ['sb_publishable_', 'synthetic_public_fixture'].join(''),
    requestedMode: 'auto',
  },
}));
import { requestDiscovery } from '@/features/discovery/services/discovery-client';
import { requestMapping } from '@/features/mapping/services/mapping-client';
import { createWeatherClient } from '@/features/weather/services/weather-client';
import { forecastSchema } from '@/features/weather/domain/weather';
import { weatherFixture } from '../fixtures/weather';
import { organizerTripInput } from '../fixtures/organizer';
import { emptyBudget, calculateBudget } from '@/features/budget/domain/budget';
import { convertMinor, referenceRate, manualRate } from '@/features/budget/domain/currency';
import { dateNumber, dayDates, tripInputSchema } from '@/features/trips/domain/trip';
const discovery = { operation: 'search', query: 'Kyoto', kind: 'city' } as const;
const mapping = {
  operation: 'location',
  query: 'Kyoto',
  near: { latitude: 35, longitude: 135 },
} as const;
const success = {
  destinations: [],
  attractions: [],
  cached: false,
  fetchedAt: '2030-03-20T09:00:00.000Z',
};
const adapters = [
  [
    'discovery',
    (signal: AbortSignal | undefined, fetcher: typeof fetch) =>
      requestDiscovery(discovery, signal, fetcher),
  ],
  [
    'mapping',
    (signal: AbortSignal | undefined, fetcher: typeof fetch) =>
      requestMapping(mapping, signal, fetcher),
  ],
] as const;
it('decodes a destination name split inside a UTF-8 sequence without corrupting geography', async () => {
  const payload = {
    ...success,
    destinations: [
      {
        id: 'fixture-city',
        name: '京都',
        country: 'Japan',
        kind: 'city',
        latitude: 35,
        longitude: 135,
        source: 'geoapify',
        fetchedAt: success.fetchedAt,
      },
    ],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload)),
    split = bytes.indexOf(0xe4) + 1;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, split));
      controller.enqueue(bytes.slice(split));
      controller.close();
    },
  });
  const result = await requestDiscovery(
    discovery,
    undefined,
    vi.fn<typeof fetch>().mockResolvedValue(new Response(body)),
  );
  expect(result.destinations[0]).toMatchObject({
    name: '京都',
    country: 'Japan',
    latitude: 35,
    longitude: 135,
  });
});
beforeEach(() => vi.useRealTimers());
afterEach(() => vi.useRealTimers());

it.each(adapters)(
  '%s refuses already cancelled work without calling the transport',
  async (_name, request) => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(success));
    await expect(request(controller.signal, fetcher)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it.each(adapters)(
  '%s cancels a stalled success body and preserves caller cancellation',
  async (_name, request) => {
    const controller = new AbortController();
    let cancel = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancel = true;
      },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    const pending = request(controller.signal, fetcher);
    const check = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    controller.abort();
    await check;
    expect(cancel).toBe(true);
  },
);
it.each(adapters)(
  '%s bounds declared and streamed JSON, including non-OK error bodies',
  async (_name, request) => {
    for (const status of [200, 500])
      for (const declared of [true, false]) {
        let cancelled = false;
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(
              new TextEncoder().encode(JSON.stringify({ ...success, padding: 'x'.repeat(200001) })),
            );
          },
          cancel() {
            cancelled = true;
          },
        });
        const fetcher = vi
          .fn<typeof fetch>()
          .mockResolvedValue(
            new Response(body, { status, headers: declared ? { 'content-length': '200002' } : {} }),
          );
        await expect(request(undefined, fetcher)).rejects.toMatchObject({
          code: status === 200 ? 'malformed' : 'unavailable',
        });
        expect(cancelled).toBe(true);
        expect(fetcher).toHaveBeenCalledTimes(1);
      }
  },
);
it.each(adapters)(
  '%s preserves cancellation while receiving a provider error',
  async (_name, request) => {
    const controller = new AbortController();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new ReadableStream<Uint8Array>(), { status: 429 }));
    const pending = request(controller.signal, fetcher);
    const check = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    controller.abort();
    await check;
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it.each(adapters)(
  '%s never reflects an unrecognized provider error code or details',
  async (_name, request) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { code: 'synthetic-confidential-value', details: 'Synthetic private upstream body' },
          { status: 500 },
        ),
      );
    await expect(request(undefined, fetcher)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'unavailable',
    });
  },
);
it.each([400, 401, 403, 429, 500, 504])(
  'discovery handles HTTP %i with safe known codes and no retry',
  async (status) => {
    const code =
      status === 429
        ? 'provider_quota'
        : status === 504
          ? 'provider_timeout'
          : 'provider_unavailable';
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code }, { status }));
    await expect(requestDiscovery(discovery, undefined, fetcher)).rejects.toMatchObject({ code });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it('a failed destination photo does not suppress a different valid photo', () => {
  const { rerender } = render(<DestinationPhoto photo="kyoto" />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Photograph unavailable')).toBeVisible();
  rerender(<DestinationPhoto photo="lisbon" />);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/lisbon-1280.jpg');
});
it('a failed trip cover does not suppress the changed destination or mislabel a manual place', () => {
  const destination = { id: 'kyoto', name: 'Kyoto', country: 'Japan', source: 'curated' as const };
  const { rerender } = render(<TripCover destination={destination} />);
  fireEvent.error(screen.getByRole('img'));
  rerender(<TripCover destination={{ ...destination, id: 'lisbon', name: 'Lisbon' }} />);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/images/lisbon-640.jpg');
  rerender(
    <TripCover
      destination={{ id: 'manual', name: 'Synthetic village', country: 'India', source: 'manual' }}
    />,
  );
  expect(screen.getByText('A journey of your own')).toBeVisible();
});
const trip = {
  ...organizerTripInput,
  id: crypto.randomUUID(),
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
it.each([
  { latitude: 91, longitude: 0 },
  { latitude: 0, longitude: 181 },
  { latitude: NaN, longitude: 0 },
  { latitude: 0, longitude: Infinity },
])('weather refuses invalid coordinates before transport: %j', async (point) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(weatherFixture()));
  const client = createWeatherClient(fetcher, null, () => Date.parse('2030-03-20T09:00:00Z'));
  await expect(
    client.load(
      { ...trip, destination: { ...trip.destination, ...point } },
      new AbortController().signal,
    ),
  ).rejects.toThrow('verified coordinates');
  expect(fetcher).not.toHaveBeenCalled();
});
it('weather rejects a fractional WMO condition code instead of presenting validated weather', () => {
  const fixture = weatherFixture();
  const malformed = {
    ...fixture,
    daily: { ...fixture.daily, weather_code: [1.5, ...fixture.daily.weather_code.slice(1)] },
  };
  expect(forecastSchema.safeParse(malformed).success).toBe(false);
});
it.each(adapters)(
  '%s distinguishes a body-stage deadline from malformed JSON without retry',
  async (_name, request) => {
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
    let cancelled = false;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          cancel() {
            cancelled = true;
          },
        }),
      ),
    );
    const pending = request(undefined, fetcher);
    const check = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    deadline.abort(new DOMException('Deadline', 'TimeoutError'));
    await check;
    expect(cancelled).toBe(true);
    expect(AbortSignal.timeout).toHaveBeenCalledWith(15000);
  },
);
it('rounds half-minor transport and aggregate contingency once, keeping estimates separate', () => {
  const b = emptyBudget({
    ...trip,
    destination: { ...trip.destination, country: 'India' },
    currency: 'INR',
  });
  Object.assign(b.assumptions, {
    distanceMeters: 1,
    transportRateMinor: 500,
    mealRateMinor: 0,
    roomRateMinor: 0,
    activityRateMinor: 0,
    contingencyBps: 5000,
  });
  b.custom = [{ id: crypto.randomUUID(), label: 'Synthetic tiny reference', amountMinor: 2 }];
  const result = calculateBudget(b);
  expect(result.categories.Transportation).toBe(1);
  expect(result.categories.Contingency).toBe(2);
  expect(result.total).toBe(5);
  expect(result.actual).toBe(0);
});
it.each(['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY'] as const)(
  'preserves exact %s minor units at maximum supported same-currency amount',
  (currency) => {
    expect(convertMinor(100_000_000_000, referenceRate(currency, currency)!)).toBe(100_000_000_000);
  },
);
it('rejects overflow conversions, unsupported currencies and invalid reference dates', () => {
  expect(() =>
    convertMinor(100_000_000_000, manualRate('USD', 'INR', '9999999', '2026-11-10')),
  ).toThrow('supported limit');
  expect(() => manualRate('XXX' as never, 'INR', '1', '2026-11-10')).toThrow();
  expect(() => manualRate('USD', 'INR', '80', '2027-02-29')).toThrow();
});
it('accepts leap-day calendar trips and maximum travelers without timezone shifts', () => {
  expect(dateNumber('2028-02-29')).toBe(dateNumber('2028-02-28') + 1);
  expect(dayDates('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
  expect(
    tripInputSchema.safeParse({
      ...organizerTripInput,
      startDate: '2028-02-29',
      endDate: '2028-03-01',
      travelers: 50,
    }).success,
  ).toBe(true);
  expect(tripInputSchema.safeParse({ ...organizerTripInput, travelers: 51 }).success).toBe(false);
});
