import { z } from 'zod';
import { destinationKinds } from '../../../../supabase/functions/_shared/contracts';
export const maximumTripCount = 200;

export const interestOptions = [
  'Adventure',
  'Nature',
  'Food',
  'Culture',
  'History',
  'Relaxation',
  'Shopping',
  'Nightlife',
  'Art',
  'Wellness',
] as const;
export const currencyOptions = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'KRW',
] as const;
export function currencyDigits(currency: string) {
  return ['JPY', 'KRW'].includes(currency) ? 0 : 2;
}
export function dateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const n = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(n) &&
    new Date(n).toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= '2199-12-31'
    ? n / 86400000
    : NaN;
}
export function tripDuration(start: string, end: string) {
  return dateNumber(end) - dateNumber(start) + 1;
}
export function dayDates(start: string, end: string) {
  const count = tripDuration(start, end);
  if (!Number.isInteger(count) || count < 1 || count > 366) return [];
  return Array.from({ length: count }, (_, index) =>
    new Date((dateNumber(start) + index) * 86400000).toISOString().slice(0, 10),
  );
}
export function todayDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));
}
const calendarDate = z
  .string()
  .refine(
    (value) => Number.isFinite(dateNumber(value)),
    'Choose a valid calendar date between 1900 and 2199.',
  );
export const destinationRefSchema = z
  .object({
    id: z.string().min(1).max(280),
    name: z.string().trim().min(2).max(200),
    country: z.string().trim().max(200),
    kind: z.enum(destinationKinds).optional(),
    state: z.string().max(200).optional(),
    county: z.string().max(200).optional(),
    district: z.string().max(200).optional(),
    source: z.enum(['curated', 'geoapify', 'manual']),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine(
    (v) => (v.latitude === undefined) === (v.longitude === undefined),
    'Coordinates must be supplied together.',
  );
export const tripInputSchema = z
  .object({
    title: z.string().trim().min(2, 'Use at least two characters for the trip name.').max(100),
    destination: destinationRefSchema,
    startDate: calendarDate,
    endDate: calendarDate,
    travelers: z.number().int().min(1).max(50),
    groupType: z.enum(['Solo', 'Couple', 'Friends', 'Family', 'Group']),
    budgetMinor: z.number().int().min(0).max(100_000_000_000),
    currency: z.enum(currencyOptions),
    budgetPreference: z.enum(['Flexible', 'Value', 'Comfort']),
    interests: z
      .array(z.enum(interestOptions))
      .min(1, 'Choose at least one travel interest.')
      .max(10)
      .refine((v) => new Set(v).size === v.length, 'Interests must be unique.'),
    pace: z.enum(['Relaxed', 'Balanced', 'Packed']),
    status: z.enum(['Planning', 'Confirmed']),
  })
  .strict()
  .superRefine((v, ctx) => {
    const days = tripDuration(v.startDate, v.endDate);
    if (Number.isFinite(days) && (days < 1 || days > 366))
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'End date must be on or after the start, with at most 366 days.',
      });
  });
export const tripSchema = tripInputSchema
  .safeExtend({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    revision: z.number().int().min(1),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .refine((v) => v.updatedAt >= v.createdAt, 'Trip timestamps are inconsistent.');
export type TripInput = z.infer<typeof tripInputSchema>;
export type Trip = z.infer<typeof tripSchema>;
export type TripDestination = z.infer<typeof destinationRefSchema>;
export function tripPeriod(trip: Trip, today = todayDate()) {
  return trip.endDate < today ? 'Past' : trip.startDate > today ? 'Upcoming' : 'In progress';
}
export function sortTrips(trips: Trip[]) {
  return [...trips].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      b.updatedAt.localeCompare(a.updatedAt) ||
      a.id.localeCompare(b.id),
  );
}
export function formatBudget(trip: Pick<Trip, 'currency' | 'budgetMinor'>) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: trip.currency,
    maximumFractionDigits: currencyDigits(trip.currency),
  }).format(trip.budgetMinor / 10 ** currencyDigits(trip.currency));
}
export function parseBudget(amount: string, currency: string) {
  const digits = currencyDigits(currency);
  if (!(digits ? /^\d{1,9}(?:\.\d{1,2})?$/ : /^\d{1,11}$/).test(amount)) return NaN;
  const [whole = '', fraction = ''] = amount.split('.');
  return Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
}
