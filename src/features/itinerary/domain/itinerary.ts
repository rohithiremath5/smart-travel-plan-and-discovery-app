import { z } from 'zod';
import {
  currencyOptions,
  dateNumber,
  dayDates,
  type Trip,
  type TripInput,
} from '@/features/trips/domain/trip';

export const activityCategories = [
  'Sightseeing',
  'Food',
  'Nature',
  'Adventure',
  'Culture',
  'Shopping',
  'Transportation',
  'Accommodation',
  'Relaxation',
  'Other',
] as const;
export const maximumActivities = 200;
export const maximumDayActivities = 100;
export const activityInputSchema = z
  .object({
    date: z.string().refine((value) => Number.isFinite(dateNumber(value)), 'Choose a valid day.'),
    title: z.string().trim().min(2, 'Use at least two characters for the activity title.').max(120),
    description: z.string().trim().max(1000),
    startTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a time from 00:00 to 23:59.')
      .optional(),
    durationMinutes: z.number().int().min(1).max(1440),
    category: z.enum(activityCategories),
    locationName: z.string().trim().max(160),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    costMinor: z.number().int().min(0).max(100_000_000_000).optional(),
    currency: z.enum(currencyOptions),
    notes: z.string().trim().max(1000),
  })
  .strict()
  .refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
    message: 'Supply both latitude and longitude, or leave both blank.',
    path: ['latitude'],
  });
export const activitySchema = activityInputSchema.safeExtend({ id: z.uuid() });
export const itinerarySchema = z
  .object({
    schemaVersion: z.literal(1),
    tripId: z.uuid(),
    revision: z.number().int().min(0),
    days: z
      .array(
        z
          .object({
            date: z.string().refine((value) => Number.isFinite(dateNumber(value))),
            notes: z.string().max(2000),
            activities: z.array(activitySchema).max(maximumDayActivities),
          })
          .strict(),
      )
      .min(1)
      .max(366),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const ids = plan.days.flatMap((day) => day.activities.map((activity) => activity.id));
    if (ids.length > maximumActivities || new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: 'custom',
        message:
          'Activity IDs must be unique and the itinerary must contain at most 200 activities.',
      });
    if (new Set(plan.days.map((day) => day.date)).size !== plan.days.length)
      ctx.addIssue({ code: 'custom', message: 'Day dates must be unique.' });
    for (const day of plan.days)
      if (day.activities.some((activity) => activity.date !== day.date))
        ctx.addIssue({ code: 'custom', message: 'An activity refers to another day.' });
  });
export type ActivityInput = z.infer<typeof activityInputSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Itinerary = z.infer<typeof itinerarySchema>;
export type ItineraryDay = Itinerary['days'][number];
export function emptyItinerary(trip: Pick<Trip, 'id' | 'startDate' | 'endDate'>): Itinerary {
  return {
    schemaVersion: 1,
    tripId: trip.id,
    revision: 0,
    days: dayDates(trip.startDate, trip.endDate).map((date) => ({
      date,
      notes: '',
      activities: [],
    })),
  };
}
export function validateItinerary(trip: Trip, raw: unknown): Itinerary {
  const parsed = itinerarySchema.safeParse(raw);
  if (
    !parsed.success ||
    parsed.data.tripId !== trip.id ||
    JSON.stringify(parsed.data.days.map((day) => day.date)) !==
      JSON.stringify(dayDates(trip.startDate, trip.endDate))
  )
    throw new Error(
      'Itinerary data has unsupported or invalid trip/day relationships. Existing data was preserved.',
    );
  return parsed.data;
}
export function hasDayContent(day: ItineraryDay) {
  return !!day.notes.trim() || day.activities.length > 0;
}
export type DateChangeMode = 'keep-dates' | 'shift-days';
export type DateChangeChoice = { mode: DateChangeMode; discard: boolean };
export function reconcileDays(trip: Trip, input: TripInput, plan: Itinerary, mode: DateChangeMode) {
  const nextDates = dayDates(input.startDate, input.endDate);
  const retained = new Set<string>();
  const days = nextDates.map((date, index) => {
    const old =
      mode === 'keep-dates' ? plan.days.find((day) => day.date === date) : plan.days[index];
    if (old) {
      retained.add(old.date);
      return {
        ...old,
        date,
        activities: old.activities.map((activity) => ({ ...activity, date })),
      };
    }
    return { date, notes: '', activities: [] };
  });
  const affected = plan.days.filter((day) => !retained.has(day.date) && hasDayContent(day));
  return {
    days,
    affected,
    discardedActivities: affected.reduce((sum, day) => sum + day.activities.length, 0),
    discardedNotes: affected.filter((day) => day.notes.trim()).length,
    shifted: mode === 'shift-days' && trip.startDate !== input.startDate,
  };
}
export function timeMinutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function chronological(activities: Activity[]) {
  return [...activities].sort(
    (a, b) =>
      (a.startTime ? timeMinutes(a.startTime) : Infinity) -
      (b.startTime ? timeMinutes(b.startTime) : Infinity),
  );
}
export function dayWarnings(day: ItineraryDay) {
  const scheduled = day.activities
    .filter((activity) => activity.startTime)
    .sort((a, b) => timeMinutes(a.startTime!) - timeMinutes(b.startTime!));
  const warnings: string[] = [];
  for (let i = 0; i < scheduled.length; i++) {
    const activity = scheduled[i]!;
    const end = timeMinutes(activity.startTime!) + activity.durationMinutes;
    if (end > 1440)
      warnings.push(`${activity.title} continues past midnight; its start remains on this day.`);
    for (let j = i + 1; j < scheduled.length && timeMinutes(scheduled[j]!.startTime!) < end; j++)
      warnings.push(`${activity.title} overlaps ${scheduled[j]!.title}.`);
  }
  const order = day.activities
    .filter((activity) => activity.startTime)
    .map((activity) => activity.id);
  if (order.join() !== scheduled.map((activity) => activity.id).join())
    warnings.push(
      'Your chosen order differs from the scheduled times. Times have not been changed.',
    );
  return warnings;
}
