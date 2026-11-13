import {
  defaultDatabaseFactory,
  tripsTransaction,
  type DatabaseFactory,
} from '@/features/trips/services/trips-database';
import { readTrip, touchedTrip } from '@/features/trips/services/trip-state';
import type { Trip } from '@/features/trips/domain/trip';
import { emptyBudget, validateBudget, type Budget } from '../domain/budget';
export interface BudgetState {
  trip: Trip;
  budget: Budget;
}
export function createBudgetRepository(factory: DatabaseFactory = defaultDatabaseFactory) {
  function run(id: string, update?: { value: Budget; revision: number; tripRevision: number }) {
    return tripsTransaction<BudgetState>(
      factory,
      ['trips', 'budgets'],
      update ? 'readwrite' : 'readonly',
      (tx, set, fail) => {
        const tr = tx.objectStore('trips').get(id),
          br = tx.objectStore('budgets').get(id);
        let pending = 2;
        const ready = () => {
          if (--pending) return;
          try {
            if (!tr.result) throw new Error('Trip not found on this device.');
            let trip = readTrip(tr.result),
              budget = validateBudget(id, br.result ?? emptyBudget(trip));
            if (update) {
              for (const expense of update.value.expenses) {
                if (
                  expense.date &&
                  (expense.date < trip.startDate || expense.date > trip.endDate) &&
                  budget.expenses.find((x) => x.id === expense.id)?.date !== expense.date
                )
                  throw new Error(
                    'New or changed expense dates must be within this trip’s current travel dates.',
                  );
              }
              if (trip.revision !== update.tripRevision || budget.revision !== update.revision)
                throw new Error(
                  'This trip or budget changed in another tab. Your draft is kept. Review the latest saved budget before explicitly saving again.',
                );
              budget = validateBudget(id, { ...update.value, revision: budget.revision + 1 });
              trip = touchedTrip(trip);
              tx.objectStore('budgets').put(budget);
              tx.objectStore('trips').put(trip);
            }
            set({ trip, budget });
          } catch (error) {
            fail(error as Error);
          }
        };
        tr.onsuccess = ready;
        br.onsuccess = ready;
      },
    );
  }
  return {
    load: (id: string) => run(id),
    save: async (id: string, value: Budget, revision: number, tripRevision: number) =>
      run(id, { value: validateBudget(id, value), revision, tripRevision }),
  };
}
export const budgetRepository = createBudgetRepository();
