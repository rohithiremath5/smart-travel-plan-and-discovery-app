import { afterEach, expect, it, vi } from 'vitest';
import { createWeatherClient } from '@/features/weather/services/weather-client';
import {
  forecastSchema,
  temperature,
  weatherAvailability,
  weatherDescription,
} from '@/features/weather/domain/weather';
import { weatherFixture } from '../fixtures/weather';
import { organizerTripInput } from '../fixtures/organizer';
const trip = {
  ...organizerTripInput,
  id: crypto.randomUUID(),
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
const time = Date.parse('2030-03-20T09:00:00Z');
afterEach(() => vi.useRealTimers());
it('validates daily arrays, timezone, units, date order and nullable provider values', () => {
  expect(forecastSchema.safeParse(weatherFixture()).success).toBe(true);
  for (const bad of [
    { ...weatherFixture(), timezone: 'Invalid/Timezone' },
    {
      ...weatherFixture(),
      daily_units: { ...weatherFixture().daily_units, temperature_2m_min: '°F' },
    },
    { ...weatherFixture(), daily: { ...weatherFixture().daily, temperature_2m_min: [18] } },
  ])
    expect(forecastSchema.safeParse(bad).success).toBe(false);
  expect(temperature(20, 'F')).toBe('68°F');
  expect(temperature(null, 'C')).toBe('Unavailable');
  expect(weatherDescription(99)).toBe('Thunderstorm');
  expect(weatherDescription(17)).toBe('Condition unavailable');
});
it('makes no unsolicited request, uses one-hour cache and preserves stale results after errors', async () => {
  let now = time;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(weatherFixture())));
  const client = createWeatherClient(fetcher, null, () => now);
  expect(client.peek(trip)).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
  const first = await client.load(trip, new AbortController().signal);
  expect(await client.load(trip, new AbortController().signal)).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = fetcher.mock.calls[0]!;
  expect(String(url)).toContain('timezone=auto');
  expect(String(url)).not.toContain('key');
  expect(options?.credentials).toBe('omit');
  expect(options?.referrerPolicy).toBe('no-referrer');
  now += 3600001;
  fetcher.mockResolvedValue(new Response('', { status: 503 }));
  await expect(client.load(trip, new AbortController().signal, true)).rejects.toThrow('HTTP 503');
  expect(client.peek(trip)).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each([429, 500, 504])('reports HTTP %i once without retry', async (status) => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }));
  await expect(
    createWeatherClient(fetcher, null, () => time).load(trip, new AbortController().signal),
  ).rejects.toThrow(status === 429 ? 'quota' : `HTTP ${status}`);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each(['bad JSON', '{}', 'x'.repeat(65537)])(
  'rejects malformed or oversized weather payload %#',
  async (body) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    await expect(
      createWeatherClient(fetcher, null, () => time).load(trip, new AbortController().signal),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it('propagates cancellation and distinguishes a bounded timeout, with no retry', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          ),
        ),
    );
  const client = createWeatherClient(fetcher, null, () => time, 1000);
  const controller = new AbortController(),
    cancel = client.load(trip, controller.signal);
  const rejected = expect(cancel).rejects.toThrow('cancelled');
  controller.abort();
  await rejected;
  const deadline = createWeatherClient(fetcher, null, () => time, 1000).load(
    trip,
    new AbortController().signal,
  );
  const timed = expect(deadline).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(1001);
  await timed;
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('checks missing/manual coordinates and past/far dates before making any provider call', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const client = createWeatherClient(fetcher, null, () => time);
  for (const t of [
    { ...trip, destination: { ...trip.destination, source: 'manual' as const } },
    { ...trip, startDate: '2031-01-01', endDate: '2031-01-02' },
    { ...trip, startDate: '2020-01-01', endDate: '2020-01-02' },
  ]) {
    expect(weatherAvailability(t, new Date(time))).not.toBe('');
    await expect(client.load(t, new AbortController().signal)).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('uses provider local calendar at UTC midnight and rejects outdated response dates', async () => {
  const now = Date.parse('2030-03-19T22:00:00Z');
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(weatherFixture())));
  const result = await createWeatherClient(fetcher, null, () => now).load(
    trip,
    new AbortController().signal,
  );
  expect(result.forecast.daily.time[0]).toBe('2030-03-20');
  fetcher.mockResolvedValue(new Response(JSON.stringify(weatherFixture('2020-01-01'))));
  await expect(
    createWeatherClient(fetcher, null, () => now).load(trip, new AbortController().signal),
  ).rejects.toThrow('date range');
});
it('cancels before sending, enforces cooldown and reads a safe cache across adapters', async () => {
  const storage = window.sessionStorage;
  storage.clear();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(weatherFixture())));
  const client = createWeatherClient(fetcher, storage, () => time);
  const cancelled = new AbortController();
  cancelled.abort();
  await expect(client.load(trip, cancelled.signal)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  await client.load(trip, new AbortController().signal);
  expect(createWeatherClient(fetcher, storage, () => time).peek(trip)?.forecast.timezone).toBe(
    'Asia/Kolkata',
  );
  await expect(client.load(trip, new AbortController().signal, true)).rejects.toThrow('30 seconds');
  expect(fetcher).toHaveBeenCalledTimes(1);
  storage.clear();
});
