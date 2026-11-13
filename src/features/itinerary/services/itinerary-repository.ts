import {
  tripsTransaction,
  defaultDatabaseFactory,
  type DatabaseFactory,
} from '@/features/trips/services/trips-database';
import { readTripState, touchedTrip } from '@/features/trips/services/trip-state';
import type { Trip } from '@/features/trips/domain/trip';
import {
  activityInputSchema,
  chronological,
  maximumActivities,
  maximumDayActivities,
  validateItinerary,
  type ActivityInput,
  type Itinerary,
} from '../domain/itinerary';
export interface ItineraryState {
  trip: Trip;
  plan: Itinerary;
}
export interface ActivityBatchItem {
  input: ActivityInput;
  replaceId?: string;
}
export interface ItineraryRepository {
  load(tripId: string): Promise<ItineraryState>;
  saveActivity(
    tripId: string,
    input: ActivityInput,
    revision: number,
    id?: string,
  ): Promise<ItineraryState>;
  deleteActivity(tripId: string, id: string, revision: number): Promise<ItineraryState>;
  moveActivity(
    tripId: string,
    id: string,
    direction: -1 | 1,
    revision: number,
  ): Promise<ItineraryState>;
  sortDay(tripId: string, date: string, revision: number): Promise<ItineraryState>;
  saveNotes(tripId: string, date: string, notes: string, revision: number): Promise<ItineraryState>;
  applyActivities(
    tripId: string,
    items: ActivityBatchItem[],
    revision: number,
    tripRevision: number,
  ): Promise<ItineraryState>;
}
export function createItineraryRepository(
  factory: DatabaseFactory = defaultDatabaseFactory,
): ItineraryRepository {
  const load = (id: string) =>
    tripsTransaction<ItineraryState>(
      factory,
      ['trips', 'itineraries'],
      'readonly',
      (tx, set, fail) => readTripState(tx, id, (trip, plan) => set({ trip, plan }), fail),
    );
  const mutate = (
    id: string,
    revision: number,
    change: (plan: Itinerary) => void,
    tripRevision?: number,
  ) =>
    tripsTransaction<ItineraryState>(
      factory,
      ['trips', 'itineraries'],
      'readwrite',
      (tx, set, fail) =>
        readTripState(
          tx,
          id,
          (trip, plan) => {
            if (tripRevision !== undefined && trip.revision !== tripRevision)
              throw new Error(
                'Trip preferences or dates changed after this preview. Reopen AI with the latest trip; nothing was saved.',
              );
            if (plan.revision !== revision)
              throw new Error(
                'This itinerary changed in another tab. Reload the latest plan before saving; your form has been kept.',
              );
            const updated = structuredClone(plan);
            change(updated);
            updated.revision++;
            validateItinerary(trip, updated);
            const metadata = touchedTrip(trip);
            tx.objectStore('itineraries').put(updated);
            tx.objectStore('trips').put(metadata);
            set({ trip: metadata, plan: updated });
          },
          fail,
        ),
    );
  function day(plan: Itinerary, date: string) {
    const result = plan.days.find((value) => value.date === date);
    if (!result) throw new Error('Choose a day in this trip.');
    return result;
  }
  function activityDay(plan: Itinerary, id: string) {
    const result = plan.days.find((value) =>
      value.activities.some((activity) => activity.id === id),
    );
    if (!result) throw new Error('This activity does not belong to this trip, or was removed.');
    return result;
  }
  return {
    load,
    applyActivities: (tripId, items, revision, tripRevision) => {
      if (!items.length || items.length > 100)
        throw new Error('Select between 1 and 100 suggestions.');
      const values = items.map((item) => ({
        input: activityInputSchema.parse(item.input),
        replaceId: item.replaceId,
      }));
      const replacing = values.flatMap((v) => (v.replaceId ? [v.replaceId] : []));
      if (new Set(replacing).size !== replacing.length)
        throw new Error('An activity can be replaced only once.');
      return mutate(
        tripId,
        revision,
        (plan) => {
          for (const value of values) {
            const target = day(plan, value.input.date);
            const name = value.input.title
              .normalize('NFKC')
              .toLocaleLowerCase('en')
              .replace(/\s+/g, ' ')
              .trim();
            if (
              target.activities.some(
                (a) =>
                  a.id !== value.replaceId &&
                  a.title.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim() ===
                    name,
              )
            )
              throw new Error('A selected activity duplicates an existing activity on this day.');
            if (value.replaceId) {
              const previous = activityDay(plan, value.replaceId);
              if (previous !== target) throw new Error('Replacement must stay on the same day.');
              const index = target.activities.findIndex((a) => a.id === value.replaceId);
              target.activities[index] = { ...value.input, id: value.replaceId };
            } else target.activities.push({ ...value.input, id: crypto.randomUUID() });
          }
          // Validation below checks day/trip capacity; the transaction rolls back all items on failure.
        },
        tripRevision,
      );
    },
    saveActivity: async (tripId, input, revision, id) => {
      const value = activityInputSchema.parse(input);
      return mutate(tripId, revision, (plan) => {
        const target = day(plan, value.date);
        const activity = { ...value, id: id ?? crypto.randomUUID() };
        if (id) {
          const previous = activityDay(plan, id);
          const index = previous.activities.findIndex((activity) => activity.id === id);
          const old = previous.activities[index]!;
          if (previous === target && old.startTime === value.startTime) {
            target.activities[index] = activity;
            return;
          }
          if (previous !== target && target.activities.length >= maximumDayActivities)
            throw new Error('A day supports up to 100 activities.');
          previous.activities.splice(index, 1);
        } else if (
          plan.days.reduce((sum, day) => sum + day.activities.length, 0) >= maximumActivities ||
          target.activities.length >= maximumDayActivities
        )
          throw new Error('Limit reached: 200 activities per trip and 100 per day.');
        target.activities.push(activity);
        target.activities = chronological(target.activities);
      });
    },
    deleteActivity: (tripId, id, revision) =>
      mutate(tripId, revision, (plan) => {
        const target = activityDay(plan, id);
        target.activities = target.activities.filter((activity) => activity.id !== id);
      }),
    moveActivity: (tripId, id, direction, revision) =>
      mutate(tripId, revision, (plan) => {
        if (direction !== -1 && direction !== 1) throw new Error('Invalid reorder direction.');
        const target = activityDay(plan, id);
        const index = target.activities.findIndex((activity) => activity.id === id);
        const next = index + direction;
        if (next < 0 || next >= target.activities.length)
          throw new Error('This activity is already at the edge of the day.');
        [target.activities[index], target.activities[next]] = [
          target.activities[next]!,
          target.activities[index]!,
        ];
      }),
    sortDay: (tripId, date, revision) =>
      mutate(tripId, revision, (plan) => {
        const target = day(plan, date);
        target.activities = chronological(target.activities);
      }),
    saveNotes: (tripId, date, notes, revision) =>
      mutate(tripId, revision, (plan) => {
        if (notes.length > 2000) throw new Error('Day notes must be 2000 characters or fewer.');
        day(plan, date).notes = notes;
      }),
  };
}
export const itineraryRepository = createItineraryRepository();
