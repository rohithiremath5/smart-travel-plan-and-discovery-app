import { dateNumber, type Trip } from '@/features/trips/domain/trip';
import {
  dailyKeys,
  forecastSchema,
  weatherAvailability,
  type WeatherRecord,
} from '../domain/weather';
const cacheKey = 'smart-travel-weather-v1';
export const weatherCacheMs = 3600000;
function defaultStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}
export function createWeatherClient(
  fetcher: typeof fetch = fetch,
  storage: Storage | null | undefined = defaultStorage(),
  now = () => Date.now(),
  timeoutMs = 10000,
) {
  const memory = new Map<string, WeatherRecord>();
  const lastStart = new Map<string, number>();
  const active = new Set<string>();
  const key = (t: Trip) => `${t.destination.latitude},${t.destination.longitude}`;
  function valid(x: WeatherRecord) {
    try {
      const result = forecastSchema.safeParse(x.forecast);
      return (
        x.schemaVersion === 1 &&
        Number.isFinite(x.latitude) &&
        Math.abs(x.latitude) <= 90 &&
        Number.isFinite(x.longitude) &&
        Math.abs(x.longitude) <= 180 &&
        Number.isFinite(Date.parse(x.fetchedAt)) &&
        Date.parse(x.fetchedAt) <= now() + 1000 &&
        now() - Date.parse(x.fetchedAt) < 172800000 &&
        result.success
      );
    } catch {
      return false;
    }
  }
  function peek(trip: Trip) {
    const id = key(trip);
    let record = memory.get(id);
    if (!record)
      try {
        const text = storage?.getItem(cacheKey);
        if (text && text.length < 1000000) {
          const rows: unknown = JSON.parse(text);
          if (Array.isArray(rows) && rows.length <= 16)
            for (const x of rows)
              if (valid(x as WeatherRecord)) {
                const r = x as WeatherRecord;
                memory.set(`${r.latitude},${r.longitude}`, r);
              }
          record = memory.get(id);
        }
      } catch {
        /* Temporary cache failures do not claim durable storage. */
      }
    if (record && !valid(record)) {
      memory.delete(id);
      return undefined;
    }
    return record;
  }
  async function load(trip: Trip, signal: AbortSignal, refresh = false): Promise<WeatherRecord> {
    const unavailable = weatherAvailability(trip, new Date(now()));
    if (unavailable) throw new Error(unavailable);
    signal.throwIfAborted();
    const id = key(trip),
      cached = peek(trip);
    if (!refresh && cached && now() - Date.parse(cached.fetchedAt) < weatherCacheMs) return cached;
    if (active.has(id)) throw new Error('A forecast request is already in progress.');
    if (lastStart.has(id) && now() - lastStart.get(id)! < 30000)
      throw new Error('Wait 30 seconds before refreshing this forecast. No request was sent.');
    active.add(id);
    lastStart.set(id, now());
    const controller = new AbortController();
    let timeout = false;
    const abort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => {
      timeout = true;
      controller.abort();
    }, timeoutMs);
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      for (const [name, value] of Object.entries({
        latitude: String(trip.destination.latitude),
        longitude: String(trip.destination.longitude),
        daily: dailyKeys.join(','),
        timezone: 'auto',
        forecast_days: '16',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
      }))
        url.searchParams.set(name, value);
      const response = await fetcher(url, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? 'Weather provider quota reached. Try later; no automatic retry.'
            : `Weather provider unavailable (HTTP ${response.status}). Try later.`,
        );
      if (!response.body) throw new Error('Weather response is empty.');
      const reader = response.body.getReader();
      let size = 0;
      const parts: Uint8Array[] = [];
      try {
        while (true) {
          controller.signal.throwIfAborted();
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 65536) throw new Error('Weather response exceeds the safe size limit.');
          parts.push(value);
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
      controller.signal.throwIfAborted();
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const p of parts) {
        bytes.set(p, offset);
        offset += p.length;
      }
      const forecast = forecastSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: forecast.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(now()));
      if (
        forecast.daily.time.some((d) => Math.abs(dateNumber(d) - dateNumber(today)) > 16) ||
        Math.abs(dateNumber(forecast.daily.time[0]!) - dateNumber(today)) > 1
      )
        throw new Error('Weather provider returned an unexpected forecast date range.');
      const record: WeatherRecord = {
        schemaVersion: 1,
        latitude: trip.destination.latitude!,
        longitude: trip.destination.longitude!,
        fetchedAt: new Date(now()).toISOString(),
        forecast,
      };
      memory.delete(id);
      memory.set(id, record);
      while (memory.size > 16) memory.delete(memory.keys().next().value!);
      try {
        storage?.setItem(cacheKey, JSON.stringify([...memory.values()]));
      } catch {
        /* In-memory forecast stays usable; no permanent-save claim. */
      }
      return record;
    } catch (error) {
      if (signal.aborted) throw new Error('Weather request cancelled.', { cause: error });
      if (timeout)
        throw new Error('Weather request timed out. No automatic retry.', { cause: error });
      if (error instanceof Error && /provider|safe size|date range|empty/.test(error.message))
        throw error;
      throw new Error(
        'Weather could not be loaded or validated. Your trip and budget are unchanged.',
        { cause: error },
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      active.delete(id);
    }
  }
  return { peek, load };
}
export const weatherClient = createWeatherClient();
