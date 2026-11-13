import {
  maximumTripCount,
  tripInputSchema,
  sortTrips,
  type Trip,
  type TripInput,
} from '../domain/trip';
import { planImport, validateSnapshot, type TripSnapshot } from '../domain/backup';
import {
  emptyItinerary,
  hasDayContent,
  reconcileDays,
  validateItinerary,
  type DateChangeChoice,
  type Itinerary,
} from '@/features/itinerary/domain/itinerary';
import { defaultDatabaseFactory, tripsTransaction, type DatabaseFactory } from './trips-database';
import { readTrip, readTripState, touchedTrip } from './trip-state';
import { emptyBudget, validateBudget, type Budget } from '@/features/budget/domain/budget';
import {
  emptyOrganizer,
  validateOrganizer,
  type Organizer,
} from '@/features/organizer/domain/organizer';
export interface TripRepository {
  list(): Promise<Trip[]>;
  get(id: string): Promise<Trip | undefined>;
  create(input: TripInput): Promise<Trip>;
  update(id: string, input: TripInput, revision: number, choice?: DateChangeChoice): Promise<Trip>;
  delete(id: string, revision: number): Promise<void>;
  exportSnapshot(ids?: string[]): Promise<TripSnapshot>;
  import(
    trips: Trip[],
    itineraries?: Itinerary[],
    organizers?: Organizer[],
    budgets?: Budget[],
  ): Promise<{ added: number; copied: number; skipped: number }>;
}
export function createTripRepository(
  factory: DatabaseFactory = defaultDatabaseFactory,
): TripRepository {
  const transact = <T>(
    mode: IDBTransactionMode,
    action: Parameters<typeof tripsTransaction<T>>[3],
  ) => tripsTransaction(factory, ['trips', 'itineraries', 'organizers', 'budgets'], mode, action);
  function readAll(
    tx: IDBTransaction,
    action: (snapshot: TripSnapshot) => void,
    fail: (error: Error) => void,
  ) {
    const trips = tx.objectStore('trips').getAll();
    const plans = tx.objectStore('itineraries').getAll();
    const organizers = tx.objectStore('organizers').getAll();
    const budgets = tx.objectStore('budgets').getAll();
    let pending = 4;
    const ready = () => {
      if (--pending) return;
      try {
        const records = (trips.result as unknown[]).map(readTrip);
        const raw = plans.result as Itinerary[];
        const rawOrganizers = organizers.result as Organizer[];
        const rawBudgets = budgets.result as Budget[];
        if (rawBudgets.some((b) => !records.some((t) => t.id === b.tripId)))
          throw new Error('Orphaned budget detected. No data was changed.');
        if (rawOrganizers.some((o) => !records.some((t) => t.id === o.tripId)))
          throw new Error('Orphaned organizer detected. No data was changed.');
        if (raw.some((plan) => !records.some((trip) => trip.id === plan.tripId)))
          throw new Error('Orphaned itinerary detected. No data was changed.');
        action({
          trips: records,
          budgets: records.map((t) =>
            validateBudget(t.id, rawBudgets.find((b) => b.tripId === t.id) ?? emptyBudget(t)),
          ),
          organizers: records.map((t) =>
            validateOrganizer(
              t.id,
              rawOrganizers.find((o) => o.tripId === t.id) ?? emptyOrganizer(t.id),
            ),
          ),
          itineraries: records.map((trip) =>
            validateItinerary(
              trip,
              raw.find((plan) => plan.tripId === trip.id) ?? emptyItinerary(trip),
            ),
          ),
        });
      } catch (error) {
        fail(error as Error);
      }
    };
    trips.onsuccess = ready;
    plans.onsuccess = ready;
    organizers.onsuccess = ready;
    budgets.onsuccess = ready;
  }
  return {
    list: () =>
      transact<Trip[]>('readonly', (tx, set, fail) => {
        const req = tx.objectStore('trips').getAll();
        req.onsuccess = () => {
          try {
            set(sortTrips((req.result as unknown[]).map(readTrip)));
          } catch (error) {
            fail(error as Error);
          }
        };
      }),
    get: (id) =>
      transact<Trip | undefined>('readonly', (tx, set, fail) => {
        const req = tx.objectStore('trips').get(id);
        req.onsuccess = () => {
          try {
            set(req.result === undefined ? undefined : readTrip(req.result));
          } catch (error) {
            fail(error as Error);
          }
        };
      }),
    create: async (input) => {
      const value = tripInputSchema.parse(input);
      const now = new Date().toISOString();
      const trip: Trip = {
        ...value,
        id: crypto.randomUUID(),
        schemaVersion: 1,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      return transact<Trip>('readwrite', (tx, set, fail) => {
        const store = tx.objectStore('trips');
        const req = store.count();
        req.onsuccess = () => {
          if (req.result >= maximumTripCount) {
            fail(
              new Error(
                'This workspace is limited to 200 trips. Export and remove trips before adding more.',
              ),
            );
            return;
          }
          store.add(trip);
          set(trip);
        };
      });
    },
    update: async (id, input, revision, choice) => {
      const value = tripInputSchema.parse(input);
      return transact<Trip>('readwrite', (tx, set, fail) =>
        readTripState(
          tx,
          id,
          (old, plan) => {
            if (old.revision !== revision)
              throw new Error(
                'This trip changed in another tab. Reload to review the latest version before saving.',
              );
            const trip = { ...touchedTrip(old), ...value };
            if (old.startDate !== value.startDate || old.endDate !== value.endDate) {
              if (plan.days.some(hasDayContent) && !choice)
                throw new Error('Review itinerary changes before changing trip dates.');
              if (choice && choice.mode !== 'keep-dates' && choice.mode !== 'shift-days')
                throw new Error('Choose a valid date reconciliation.');
              const preview = reconcileDays(old, value, plan, choice?.mode ?? 'keep-dates');
              if (preview.affected.length && !choice?.discard)
                throw new Error('Explicit consent is required to discard activities or notes.');
              const next = { ...plan, revision: plan.revision + 1, days: preview.days };
              validateItinerary(trip, next);
              tx.objectStore('itineraries').put(next);
            }
            tx.objectStore('trips').put(trip);
            set(trip);
          },
          fail,
        ),
      );
    },
    delete: (id, revision) =>
      transact<void>('readwrite', (tx, set, fail) => {
        const store = tx.objectStore('trips');
        const req = store.get(id);
        req.onsuccess = () => {
          try {
            if (req.result && readTrip(req.result).revision !== revision)
              throw new Error('This trip changed in another tab. Reload before deleting.');
            store.delete(id);
            tx.objectStore('itineraries').delete(id);
            tx.objectStore('organizers').delete(id);
            tx.objectStore('budgets').delete(id);
            set(undefined);
          } catch (error) {
            fail(error as Error);
          }
        };
      }),
    exportSnapshot: (ids) =>
      transact<TripSnapshot>('readonly', (tx, set, fail) =>
        readAll(
          tx,
          (snapshot) => {
            const trips = ids
              ? snapshot.trips.filter((trip) => ids.includes(trip.id))
              : snapshot.trips;
            set({
              trips,
              itineraries: snapshot.itineraries.filter((plan) =>
                trips.some((trip) => trip.id === plan.tripId),
              ),
              organizers: snapshot.organizers!.filter((o) => trips.some((t) => t.id === o.tripId)),
              budgets: snapshot.budgets!.filter((b) => trips.some((t) => t.id === b.tripId)),
            });
          },
          fail,
        ),
      ),
    import: async (trips, itineraries, organizers, budgets) => {
      const incoming = validateSnapshot({
        trips,
        itineraries: itineraries ?? trips.map(emptyItinerary),
        ...(organizers ? { organizers } : {}),
        ...(budgets ? { budgets } : {}),
      });
      return transact('readwrite', (tx, set, fail) =>
        readAll(
          tx,
          (existing) => {
            const plan = planImport(
              existing.trips,
              incoming.trips,
              existing.itineraries,
              incoming.itineraries,
              existing.organizers,
              incoming.organizers,
              existing.budgets,
              incoming.budgets,
            );
            if (existing.trips.length + plan.added > maximumTripCount)
              throw new Error(
                'This device workspace is limited to 200 trips. Export and remove trips before importing more.',
              );
            for (const trip of plan.additions) tx.objectStore('trips').add(trip);
            for (const itinerary of plan.itineraries) tx.objectStore('itineraries').add(itinerary);
            for (const organizer of plan.organizers) tx.objectStore('organizers').add(organizer);
            for (const budget of plan.budgets) tx.objectStore('budgets').add(budget);
            set({ added: plan.added, copied: plan.copied, skipped: plan.skipped });
          },
          fail,
        ),
      );
    },
  };
}
export const tripRepository = createTripRepository();
