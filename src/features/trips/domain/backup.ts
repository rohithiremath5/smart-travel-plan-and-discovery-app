import { z } from 'zod';
import { tripInputSchema, tripSchema, type Trip } from './trip';
import {
  emptyBudget,
  budgetSchema,
  validateBudget,
  budgetContent,
  type Budget,
} from '@/features/budget/domain/budget';
import {
  emptyOrganizer,
  organizerSchema,
  validateOrganizer,
  organizerContent,
  type Organizer,
} from '@/features/organizer/domain/organizer';
import {
  emptyItinerary,
  itinerarySchema,
  validateItinerary,
  type Itinerary,
} from '@/features/itinerary/domain/itinerary';
export const maximumBackupBytes = 10_000_000;
export interface TripSnapshot {
  trips: Trip[];
  itineraries: Itinerary[];
  organizers?: Organizer[];
  budgets?: Budget[];
}
const base = {
  format: z.literal('smart-travel-trips'),
  exportedAt: z.iso.datetime(),
  trips: z.array(tripSchema).max(200),
};
const envelope = z.discriminatedUnion('version', [
  z.object({ ...base, version: z.literal(1) }).strict(),
  z
    .object({ ...base, version: z.literal(2), itineraries: z.array(itinerarySchema).max(200) })
    .strict(),
  z
    .object({
      ...base,
      version: z.literal(3),
      itineraries: z.array(itinerarySchema).max(200),
      organizers: z.array(organizerSchema).max(200),
    })
    .strict(),
  z
    .object({
      ...base,
      version: z.literal(4),
      itineraries: z.array(itinerarySchema).max(200),
      organizers: z.array(organizerSchema).max(200),
      budgets: z.array(budgetSchema).max(200),
    })
    .strict(),
]);
export function validateSnapshot(
  snapshot: TripSnapshot,
): TripSnapshot & { organizers: Organizer[]; budgets: Budget[] } {
  const trips = z.array(tripSchema).max(200).parse(snapshot.trips);
  const plans = z.array(itinerarySchema).max(200).parse(snapshot.itineraries);
  const organizers = z
    .array(organizerSchema)
    .max(200)
    .parse(snapshot.organizers ?? trips.map((t) => emptyOrganizer(t.id)));
  const budgets = z
    .array(budgetSchema)
    .max(200)
    .parse(snapshot.budgets ?? trips.map(emptyBudget));
  if (
    new Set(trips.map((t) => t.id)).size !== trips.length ||
    new Set(plans.map((p) => p.tripId)).size !== plans.length ||
    plans.length !== trips.length ||
    organizers.length !== trips.length ||
    new Set(organizers.map((x) => x.tripId)).size !== organizers.length ||
    budgets.length !== trips.length ||
    new Set(budgets.map((x) => x.tripId)).size !== budgets.length
  )
    throw new Error(
      'Unsupported or invalid trip backup: duplicate or missing trip/itinerary/organizer relationships.',
    );
  const ids = new Set<string>();
  const organizerIds = new Set<string>();
  const budgetIds = new Set<string>();
  for (const budget of budgets) {
    if (!trips.some((t) => t.id === budget.tripId))
      throw new Error('Invalid trip backup: orphaned budget.');
    validateBudget(budget.tripId, budget);
    for (const item of [...budget.custom, ...budget.expenses]) {
      if (budgetIds.has(item.id)) throw new Error('Invalid trip backup: duplicate budget IDs.');
      budgetIds.add(item.id);
    }
  }
  for (const organizer of organizers) {
    if (!trips.some((t) => t.id === organizer.tripId))
      throw new Error('Invalid trip backup: orphaned organizer.');
    validateOrganizer(organizer.tripId, organizer);
    for (const item of [...organizer.notes, ...organizer.checklist, ...organizer.packing]) {
      if (organizerIds.has(item.id))
        throw new Error('Invalid trip backup: duplicate organizer item IDs.');
      organizerIds.add(item.id);
    }
  }
  for (const plan of plans) {
    const trip = trips.find((t) => t.id === plan.tripId);
    if (!trip) throw new Error('Invalid trip backup: orphaned itinerary.');
    validateItinerary(trip, plan);
    for (const day of plan.days)
      for (const activity of day.activities) {
        if (ids.has(activity.id)) throw new Error('Invalid trip backup: duplicate activity IDs.');
        ids.add(activity.id);
      }
  }
  return { trips, itineraries: plans, organizers, budgets };
}
export function parseTripBackup(
  text: string,
): TripSnapshot & { organizers: Organizer[]; budgets: Budget[]; version: 1 | 2 | 3 | 4 } {
  if (new TextEncoder().encode(text).length > maximumBackupBytes)
    throw new Error('Choose a JSON backup smaller than 10 MB.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const result = envelope.safeParse(value);
  if (!result.success)
    throw new Error(
      'Unsupported or invalid trip backup. Use a version 1, 2, 3 or 4 Smart Travel export. No data was changed.',
    );
  const data = result.data;
  return {
    ...validateSnapshot({
      trips: data.trips,
      itineraries: data.version !== 1 ? data.itineraries : data.trips.map(emptyItinerary),
      organizers:
        data.version >= 3
          ? (data as { organizers: Organizer[] }).organizers
          : data.trips.map((t) => emptyOrganizer(t.id)),
      budgets: data.version === 4 ? data.budgets : data.trips.map(emptyBudget),
    }),
    version: data.version,
  };
}
export function parseBackup(text: string): Trip[] {
  return parseTripBackup(text).trips;
}
export function exportTrips(
  trips: Trip[],
  itineraries?: Itinerary[],
  organizers?: Organizer[],
  budgets?: Budget[],
) {
  const snapshot = validateSnapshot({
    trips,
    itineraries: itineraries ?? trips.map(emptyItinerary),
    ...(organizers ? { organizers } : {}),
    ...(budgets ? { budgets } : {}),
  });
  const text = JSON.stringify(
    envelope.parse({
      format: 'smart-travel-trips',
      version: budgets ? 4 : organizers ? 3 : itineraries ? 2 : 1,
      exportedAt: new Date().toISOString(),
      trips: snapshot.trips,
      ...(itineraries ? { itineraries: snapshot.itineraries } : {}),
      ...(organizers ? { itineraries: snapshot.itineraries, organizers: snapshot.organizers } : {}),
      ...(budgets
        ? {
            itineraries: snapshot.itineraries,
            organizers: snapshot.organizers,
            budgets: snapshot.budgets,
          }
        : {}),
    }),
    null,
    2,
  );
  if (new TextEncoder().encode(text).length > maximumBackupBytes)
    throw new Error(
      'This selection exceeds the 10 MB backup limit. Export individual trips from their itinerary pages.',
    );
  return text;
}
export function tripContent(trip: Trip) {
  return JSON.stringify(
    tripInputSchema.parse({
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      groupType: trip.groupType,
      budgetMinor: trip.budgetMinor,
      currency: trip.currency,
      budgetPreference: trip.budgetPreference,
      interests: trip.interests,
      pace: trip.pace,
      status: trip.status,
    }),
  );
}
function content(trip: Trip, plan: Itinerary, organizer: Organizer, budget: Budget) {
  return (
    tripContent(trip) +
    JSON.stringify(
      plan.days.map((day) => ({
        date: day.date,
        notes: day.notes,
        activities: day.activities.map((activity) => {
          const { id, ...value } = activity;
          void id;
          return value;
        }),
      })),
    ) +
    organizerContent(organizer) +
    budgetContent(budget)
  );
}
export function planImport(
  existing: Trip[],
  incoming: Trip[],
  existingPlans: Itinerary[] = existing.map(emptyItinerary),
  incomingPlans: Itinerary[] = incoming.map(emptyItinerary),
  existingOrganizers: Organizer[] = existing.map((t) => emptyOrganizer(t.id)),
  incomingOrganizers: Organizer[] = incoming.map((t) => emptyOrganizer(t.id)),
  existingBudgets: Budget[] = existing.map(emptyBudget),
  incomingBudgets: Budget[] = incoming.map(emptyBudget),
) {
  const current = validateSnapshot({
    trips: existing,
    itineraries: existingPlans,
    organizers: existingOrganizers,
    budgets: existingBudgets,
  });
  const source = validateSnapshot({
    trips: incoming,
    itineraries: incomingPlans,
    organizers: incomingOrganizers,
    budgets: incomingBudgets,
  });
  const contents = new Set(
    current.trips.map((trip) =>
      content(
        trip,
        current.itineraries.find((p) => p.tripId === trip.id)!,
        current.organizers.find((o) => o.tripId === trip.id)!,
        current.budgets.find((b) => b.tripId === trip.id)!,
      ),
    ),
  );
  const ids = new Set(existing.map((t) => t.id));
  const activityIds = new Set(
    current.itineraries.flatMap((p) => p.days.flatMap((d) => d.activities.map((a) => a.id))),
  );
  const additions: Trip[] = [];
  const itineraries: Itinerary[] = [];
  const organizers: Organizer[] = [];
  const budgets: Budget[] = [];
  const budgetIds = new Set(
    current.budgets.flatMap((b) => [...b.custom, ...b.expenses].map((x) => x.id)),
  );
  const organizerIds = new Set(
    current.organizers.flatMap((o) => [...o.notes, ...o.checklist, ...o.packing].map((x) => x.id)),
  );
  let copied = 0;
  let skipped = 0;
  for (const trip of source.trips) {
    const plan = source.itineraries.find((p) => p.tripId === trip.id)!;
    const organizer = source.organizers.find((o) => o.tripId === trip.id)!;
    const budget = source.budgets.find((b) => b.tripId === trip.id)!;
    const fingerprint = content(trip, plan, organizer, budget);
    if (contents.has(fingerprint)) {
      skipped++;
      continue;
    }
    const conflict = ids.has(trip.id);
    const id = conflict ? crypto.randomUUID() : trip.id;
    if (conflict) copied++;
    const remapBudget = <T extends { id: string }>(items: T[]) =>
      items.map((x) => {
        const nextId = conflict || budgetIds.has(x.id) ? crypto.randomUUID() : x.id;
        budgetIds.add(nextId);
        return { ...x, id: nextId };
      });
    budgets.push({
      ...budget,
      tripId: id,
      revision: 1,
      custom: remapBudget(budget.custom),
      expenses: remapBudget(budget.expenses),
    });
    additions.push({ ...trip, id, revision: 1 });
    const remap = <T extends { id: string }>(items: T[]) =>
      items.map((item) => {
        const nextId = conflict || organizerIds.has(item.id) ? crypto.randomUUID() : item.id;
        organizerIds.add(nextId);
        return { ...item, id: nextId };
      });
    organizers.push({
      ...organizer,
      tripId: id,
      revision: 1,
      notes: remap(organizer.notes),
      checklist: remap(organizer.checklist),
      packing: remap(organizer.packing),
    });
    itineraries.push({
      ...plan,
      tripId: id,
      revision: 1,
      days: plan.days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) => {
          const aid = conflict || activityIds.has(activity.id) ? crypto.randomUUID() : activity.id;
          activityIds.add(aid);
          return { ...activity, id: aid };
        }),
      })),
    });
    ids.add(id);
    contents.add(fingerprint);
  }
  return { additions, itineraries, organizers, budgets, added: additions.length, copied, skipped };
}
