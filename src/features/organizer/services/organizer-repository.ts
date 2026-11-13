import {
  defaultDatabaseFactory,
  tripsTransaction,
  type DatabaseFactory,
} from '@/features/trips/services/trips-database';
import { readTrip, touchedTrip } from '@/features/trips/services/trip-state';
import type { Trip } from '@/features/trips/domain/trip';
import { emptyOrganizer, validateOrganizer, type Organizer } from '../domain/organizer';
export interface OrganizerState {
  trip: Trip;
  organizer: Organizer;
}
export interface OrganizerRepository {
  load(tripId: string): Promise<OrganizerState>;
  save(
    tripId: string,
    value: Organizer,
    expectedRevision: number,
    expectedTripRevision: number,
  ): Promise<OrganizerState>;
}
export function createOrganizerRepository(
  factory: DatabaseFactory = defaultDatabaseFactory,
): OrganizerRepository {
  const run = (id: string, update?: { value: Organizer; revision: number; tripRevision: number }) =>
    tripsTransaction<OrganizerState>(
      factory,
      ['trips', 'organizers'],
      update ? 'readwrite' : 'readonly',
      (tx, set, fail) => {
        const tr = tx.objectStore('trips').get(id),
          org = tx.objectStore('organizers').get(id);
        let pending = 2;
        const ready = () => {
          if (--pending) return;
          try {
            if (!tr.result)
              throw new Error(
                'Trip not found on this device. It may have been deleted in another tab.',
              );
            let trip = readTrip(tr.result);
            let organizer = validateOrganizer(id, org.result ?? emptyOrganizer(id));
            if (update) {
              if (organizer.revision !== update.revision || trip.revision !== update.tripRevision)
                throw new Error(
                  'This trip or organizer changed in another tab. Your draft is kept. Reload and review before saving again.',
                );
              organizer = validateOrganizer(id, {
                ...update.value,
                tripId: id,
                revision: organizer.revision + 1,
              });
              trip = touchedTrip(trip);
              tx.objectStore('organizers').put(organizer);
              tx.objectStore('trips').put(trip);
            }
            set({ trip, organizer });
          } catch (error) {
            fail(error as Error);
          }
        };
        tr.onsuccess = ready;
        org.onsuccess = ready;
      },
    );
  return {
    load: (id) => run(id),
    save: async (id, value, revision, tripRevision) => {
      const validated = validateOrganizer(id, value);
      return run(id, { value: validated, revision, tripRevision });
    },
  };
}
export const organizerRepository = createOrganizerRepository();
