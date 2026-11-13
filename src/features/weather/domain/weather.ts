import { z } from 'zod';
import { dateNumber, type Trip } from '@/features/trips/domain/trip';
export const dailyKeys = [
  'temperature_2m_min',
  'temperature_2m_max',
  'weather_code',
  'precipitation_probability_max',
  'precipitation_sum',
  'wind_speed_10m_max',
] as const;
const numeric = (min: number, max: number) =>
  z.array(z.number().min(min).max(max).nullable()).min(1).max(16);
export const forecastSchema = z
  .object({
    timezone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
    utc_offset_seconds: z.number().int().min(-50400).max(50400),
    daily_units: z.object({
      time: z.literal('iso8601'),
      temperature_2m_min: z.literal('°C'),
      temperature_2m_max: z.literal('°C'),
      weather_code: z.literal('wmo code'),
      precipitation_probability_max: z.literal('%'),
      precipitation_sum: z.literal('mm'),
      wind_speed_10m_max: z.literal('km/h'),
    }),
    daily: z.object({
      time: z
        .array(z.string().refine((v) => Number.isFinite(dateNumber(v))))
        .min(1)
        .max(16),
      temperature_2m_min: numeric(-100, 70),
      temperature_2m_max: numeric(-100, 70),
      weather_code: numeric(0, 99).refine((values) =>
        values.every((value) => value === null || Number.isInteger(value)),
      ),
      precipitation_probability_max: numeric(0, 100),
      precipitation_sum: numeric(0, 3000),
      wind_speed_10m_max: numeric(0, 500),
    }),
  })
  .superRefine((v, ctx) => {
    if (
      dailyKeys.some((k) => v.daily[k].length !== v.daily.time.length) ||
      v.daily.time.some(
        (d, i) => i > 0 && dateNumber(d) !== dateNumber(v.daily.time[i - 1]!) + 1,
      ) ||
      v.daily.temperature_2m_min.some(
        (x, i) =>
          x !== null &&
          v.daily.temperature_2m_max[i] !== null &&
          x > v.daily.temperature_2m_max[i]!,
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Inconsistent daily forecast arrays.' });
  });
export type Forecast = z.infer<typeof forecastSchema>;
export interface WeatherRecord {
  schemaVersion: 1;
  latitude: number;
  longitude: number;
  fetchedAt: string;
  forecast: Forecast;
}
export function weatherAvailability(trip: Trip, now = new Date()) {
  if (
    trip.destination.source === 'manual' ||
    trip.destination.latitude === undefined ||
    trip.destination.longitude === undefined ||
    !Number.isFinite(trip.destination.latitude) ||
    !Number.isFinite(trip.destination.longitude) ||
    Math.abs(trip.destination.latitude) > 90 ||
    Math.abs(trip.destination.longitude) > 180
  )
    return 'Location verification required. Choose a destination with verified coordinates; no geocoding request is made here.';
  const utc = dateNumber(now.toISOString().slice(0, 10));
  if (dateNumber(trip.endDate) < utc - 1)
    return 'Past travel dates: this forecast feature does not provide historical weather.';
  if (dateNumber(trip.startDate) > utc + 16)
    return 'Weather forecast is not available for these travel dates yet.';
  return '';
}
export function weatherDescription(code: number | null) {
  if (code === null) return 'Condition unavailable';
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return ['Mainly clear', 'Partly cloudy', 'Overcast'][code - 1]!;
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Condition unavailable';
}
export function temperature(c: number | null, unit: 'C' | 'F') {
  return c === null ? 'Unavailable' : `${Math.round(unit === 'F' ? (c * 9) / 5 + 32 : c)}°${unit}`;
}
