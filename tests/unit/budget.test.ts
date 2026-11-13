import { beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore as FakeStore } from 'fake-indexeddb';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import { createBudgetRepository } from '@/features/budget/services/budget-repository';
import {
  emptyBudget,
  calculateBudget,
  budgetSchema,
  expenseSchema,
  validateBudget,
} from '@/features/budget/domain/budget';
import {
  amountMinor,
  convertMinor,
  manualRate,
  referenceRate,
  rateDate,
} from '@/features/budget/domain/currency';
import { estimateFields, parseEstimateFields } from '@/features/budget/domain/estimate-fields';
import { availableRouteDistances } from '@/features/budget/domain/cached-route';
import { emptyItinerary } from '@/features/itinerary/domain/itinerary';
import { exportTrips, parseTripBackup, planImport } from '@/features/trips/domain/backup';
import { openTripsDatabase } from '@/features/trips/services/trips-database';
import { organizerTripInput } from '../fixtures/organizer';
let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
});
const trips = () => createTripRepository(() => factory),
  repo = () => createBudgetRepository(() => factory);
async function state() {
  const trip = await trips().create({
    ...organizerTripInput,
    destination: { ...organizerTripInput.destination, country: 'India' },
    currency: 'INR',
    travelers: 3,
  });
  return repo().load(trip.id);
}
it('uses only illustrative India defaults and zero non-India rates; no actual expense is synthesized', async () => {
  const s = await state(),
    b = s.budget;
  expect(b.assumptions).toMatchObject({
    transportRateMinor: 1000,
    meals: 3,
    mealRateMinor: 25000,
    roomRateMinor: 150000,
    occupants: 2,
    activityRateMinor: 30000,
    contingencyBps: 0,
    vehicles: 1,
  });
  expect(b.expenses).toEqual([]);
  const foreign = emptyBudget({
    ...s.trip,
    destination: { ...s.trip.destination, country: 'Japan' },
    currency: 'JPY',
  });
  expect(foreign.assumptions.mealRateMinor).toBe(0);
  expect(foreign.currency).toBe('JPY');
});
it.each([1, 2, 5])(
  'shares transport for %i travelers and rounds room occupancy up',
  async (travelers) => {
    const { budget } = await state();
    budget.assumptions = {
      ...budget.assumptions,
      travelers,
      days: 2,
      nights: 1,
      distanceMeters: 100000,
    };
    const x = calculateBudget(budget);
    expect(x.categories.Transportation).toBe(100000);
    expect(x.categories.Food).toBe(travelers * 3 * 2 * 25000);
    expect(x.rooms).toBe(Math.ceil(travelers / 2));
    expect(x.categories.Accommodation).toBe(Math.ceil(travelers / 2) * 150000);
    expect(x.categories.Activities).toBe(travelers * 2 * 30000);
    expect(x.perTraveler).toBe(Math.floor(x.total / travelers + 0.5));
  },
);
it('calculates explicit return, multiple vehicles, meals, nights, custom and contingency exactly', async () => {
  const { budget } = await state();
  budget.assumptions = {
    ...budget.assumptions,
    days: 2,
    nights: 2,
    distanceMeters: 100000,
    distanceMode: 'return',
    vehicles: 2,
    contingencyBps: 1000,
    targetMinor: 1000000,
  };
  budget.custom = [{ id: crypto.randomUUID(), label: 'Entry permits', amountMinor: 50000 }];
  const x = calculateBudget(budget);
  expect(x.total).toBe(1848000);
  expect(x.categories.Transportation).toBe(400000);
  expect(x.categories.Contingency).toBe(168000);
  expect(x.overTarget).toBe(848000);
  expect(x.actual).toBe(0);
  budget.custom = [];
  expect(calculateBudget(budget).total).toBe(1793000);
});
it('one-day configuration suggests zero nights; zero rates and optional meals are valid', async () => {
  const s = await state();
  const b = emptyBudget({ ...s.trip, endDate: s.trip.startDate });
  expect(b.assumptions.nights).toBe(0);
  b.assumptions = {
    ...b.assumptions,
    transportRateMinor: 0,
    mealRateMinor: 0,
    roomRateMinor: 0,
    activityRateMinor: 0,
    meals: 0,
    targetMinor: 0,
  };
  expect(calculateBudget(b).total).toBe(0);
});
it.each(['-1', 'NaN', 'Infinity', '1.234', '1e3', '', '999999999999'])(
  'rejects invalid/extreme money input %s',
  (value) => {
    expect(() => amountMinor(value, 'INR')).toThrow();
  },
);
it('minor-unit conversion handles exact decimals, zero-decimal JPY and half-up ties', () => {
  expect(amountMinor('0.10', 'USD')).toBe(10);
  expect(amountMinor('100', 'JPY')).toBe(100);
  expect(() => amountMinor('100.1', 'JPY')).toThrow();
  expect(convertMinor(1, manualRate('USD', 'INR', '0.5', rateDate))).toBe(1);
  expect(convertMinor(100, manualRate('USD', 'JPY', '150', rateDate))).toBe(150);
  expect(convertMinor(1, manualRate('JPY', 'INR', '0.5', rateDate))).toBe(50);
  expect(referenceRate('AED', 'INR')).toBeUndefined();
  expect(referenceRate('CAD', 'USD')).toBeUndefined();
  expect(convertMinor(100, referenceRate('EUR', 'INR')!)).toBe(10533);
});
it('freezes each expense rate/date independently from subsequent manual edits', async () => {
  const { budget } = await state();
  const rate = manualRate('USD', 'INR', '80', '2026-11-01');
  budget.expenses = [
    expenseSchema.parse({
      id: crypto.randomUUID(),
      amountMinor: 1000,
      currency: 'USD',
      category: 'Food',
      description: 'Synthetic meal',
      conversion: rate,
      convertedMinor: 80000,
    }),
  ];
  budget.manualRates = [manualRate('USD', 'INR', '90', '2026-11-10')];
  expect(calculateBudget(budget).actual).toBe(80000);
  expect(budget.expenses[0]!.conversion.referenceDate).toBe('2026-11-01');
  expect(referenceRate('USD', 'INR', budget.manualRates)?.numerator).toBe('90');
  expect(expenseSchema.safeParse({ ...budget.expenses[0], convertedMinor: 90000 }).success).toBe(
    false,
  );
});
it.each([
  { travelers: 0 },
  { vehicles: 0 },
  { occupants: 0 },
  { days: 367 },
  { distanceMeters: -1 },
  { contingencyBps: 10001 },
  { meals: 11 },
  { transportRateMinor: 100_000_000_000, distanceMeters: 100000000, vehicles: 50 },
])('rejects invalid or overflowing assumptions %j', async (change) => {
  const { budget } = await state();
  expect(() =>
    validateBudget(budget.tripId, { ...budget, assumptions: { ...budget.assumptions, ...change } }),
  ).toThrow();
});
it('validates editable fields without losing precise distance or contingency fractions', async () => {
  const { budget } = await state();
  const fields = {
    ...estimateFields(budget),
    distanceMeters: '12.345',
    contingencyBps: '1.25',
    mealRateMinor: '250.01',
  };
  expect(parseEstimateFields(fields, budget)).toMatchObject({
    distanceMeters: 12345,
    contingencyBps: 125,
    mealRateMinor: 25001,
  });
  expect(() => parseEstimateFields({ ...fields, days: '' }, budget)).toThrow();
});
it('persists expense edits/deletes, isolates trips, preserves overrides after trip edits and rejects stale writes', async () => {
  const s = await state(),
    other = await trips().create({ ...organizerTripInput, title: 'Other synthetic trip' });
  let saved = await repo().save(
    s.trip.id,
    { ...s.budget, assumptions: { ...s.budget.assumptions, nights: 7 } },
    0,
    s.trip.revision,
  );
  expect((await repo().load(other.id)).budget.assumptions.nights).not.toBe(7);
  const modified = await trips().update(
    s.trip.id,
    { ...organizerTripInput, destination: saved.trip.destination, currency: 'INR', travelers: 4 },
    saved.trip.revision,
  );
  expect((await repo().load(s.trip.id)).budget.assumptions.nights).toBe(7);
  await expect(
    repo().save(s.trip.id, saved.budget, saved.budget.revision, saved.trip.revision),
  ).rejects.toThrow('another tab');
  saved = await repo().save(s.trip.id, saved.budget, saved.budget.revision, modified.revision);
  expect((await createBudgetRepository(() => factory).load(s.trip.id)).budget).toEqual(
    saved.budget,
  );
});
it.each([1, 2, 3])(
  'upgrades DB v%i additively, retaining all existing stores and data',
  async (version) => {
    const seed = await state(),
      other = new IDBFactory();
    await new Promise<void>((resolve, reject) => {
      const r = other.open('smart-travel-trips', version);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('trips', { keyPath: 'id' });
        if (version >= 2) r.result.createObjectStore('itineraries', { keyPath: 'tripId' });
        if (version >= 3) r.result.createObjectStore('organizers', { keyPath: 'tripId' });
      };
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction('trips', 'readwrite');
        tx.objectStore('trips').put(seed.trip);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      r.onerror = () => reject(r.error);
    });
    const recovered = await createBudgetRepository(() => other).load(seed.trip.id);
    expect(recovered.trip).toEqual(seed.trip);
    expect(recovered.budget.expenses).toEqual([]);
    const db = await openTripsDatabase(() => other);
    expect(db.version).toBe(4);
    expect([...db.objectStoreNames]).toEqual(['budgets', 'itineraries', 'organizers', 'trips']);
    db.close();
  },
);
it.each([1, 2, 3, 4])(
  'imports valid backup v%i without overwriting existing budgets',
  async (version) => {
    const s = await state();
    await repo().save(
      s.trip.id,
      {
        ...s.budget,
        custom: [{ id: crypto.randomUUID(), label: 'Personal estimate', amountMinor: 1234 }],
      },
      0,
      s.trip.revision,
    );
    const snapshot = await trips().exportSnapshot();
    const text =
      version === 1
        ? exportTrips(snapshot.trips)
        : version === 2
          ? exportTrips(snapshot.trips, snapshot.itineraries)
          : version === 3
            ? exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers)
            : exportTrips(
                snapshot.trips,
                snapshot.itineraries,
                snapshot.organizers,
                snapshot.budgets,
              );
    const parsed = parseTripBackup(text);
    expect(parsed.version).toBe(version);
    const targetFactory = new IDBFactory(),
      target = createTripRepository(() => targetFactory);
    await target.import(parsed.trips, parsed.itineraries, parsed.organizers, parsed.budgets);
    expect(
      (await createBudgetRepository(() => targetFactory).load(s.trip.id)).budget.custom.length,
    ).toBe(version === 4 ? 1 : 0);
    expect(
      await target.import(parsed.trips, parsed.itineraries, parsed.organizers, parsed.budgets),
    ).toMatchObject({ skipped: 1, added: 0 });
  },
);
it('detects budget-only conflicts, remaps IDs, rejects malformed input and commits nothing on failed import/delete', async () => {
  const s = await state(),
    snapshot = await trips().exportSnapshot();
  const incoming = {
    ...s.budget,
    custom: [{ id: crypto.randomUUID(), label: 'Conflict estimate', amountMinor: 10 }],
  };
  const preview = planImport(
    snapshot.trips,
    snapshot.trips,
    snapshot.itineraries,
    snapshot.itineraries,
    snapshot.organizers,
    snapshot.organizers,
    snapshot.budgets,
    [incoming],
  );
  expect(preview.copied).toBe(1);
  expect(preview.budgets[0]!.tripId).toBe(preview.additions[0]!.id);
  expect(preview.budgets[0]!.custom[0]!.id).not.toBe(incoming.custom[0]!.id);
  const file = JSON.parse(
    exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers, snapshot.budgets),
  );
  for (const bad of [
    { ...file, budgets: [] },
    { ...file, budgets: [{ ...incoming, tripId: crypto.randomUUID() }] },
    { ...file, unknown: 'malicious' },
    { ...file, budgets: [{ ...incoming, custom: [...incoming.custom, ...incoming.custom] }] },
  ])
    expect(() => parseTripBackup(JSON.stringify(bad))).toThrow();
  expect(() => parseTripBackup(' '.repeat(10000001))).toThrow();
  const original = FakeStore.prototype.add;
  const spy = vi.spyOn(FakeStore.prototype, 'add').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['add']>
  ) {
    if (this.name === 'budgets') throw new DOMException('Synthetic quota', 'QuotaExceededError');
    return original.apply(this, args);
  });
  try {
    await expect(
      trips().import(snapshot.trips, snapshot.itineraries, snapshot.organizers, [incoming]),
    ).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect((await trips().list()).length).toBe(1);
  await trips().delete(s.trip.id, s.trip.revision);
  await expect(repo().load(s.trip.id)).rejects.toThrow('not found');
});
it('rolls back budget and trip together on quota failure and reports unavailable storage', async () => {
  const s = await state();
  const spy = vi.spyOn(FakeStore.prototype, 'put').mockImplementation(() => {
    throw new DOMException('Synthetic quota', 'QuotaExceededError');
  });
  try {
    await expect(repo().save(s.trip.id, s.budget, 0, s.trip.revision)).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect((await repo().load(s.trip.id)).budget).toEqual(s.budget);
  await expect(createBudgetRepository(() => undefined).load(s.trip.id)).rejects.toThrow('storage');
});
it('strictly rejects duplicate and unsupported budget schemas', async () => {
  const { budget } = await state();
  expect(budgetSchema.safeParse({ ...budget, schemaVersion: 9 }).success).toBe(false);
  expect(budgetSchema.safeParse({ ...budget, currency: 'XYZ' }).success).toBe(false);
});
it('reuses only fresh cached routes matching this itinerary and mode, without any provider lookup', async () => {
  const { trip } = await state(),
    plan = emptyItinerary(trip);
  plan.days[0]!.activities = [
    {
      id: crypto.randomUUID(),
      date: trip.startDate,
      title: 'First place',
      description: '',
      durationMinutes: 60,
      category: 'Culture',
      locationName: 'Synthetic',
      latitude: 24.5,
      longitude: 73.7,
      currency: 'INR',
      notes: '',
    },
    {
      id: crypto.randomUUID(),
      date: trip.startDate,
      title: 'Second place',
      description: '',
      durationMinutes: 60,
      category: 'Culture',
      locationName: 'Synthetic',
      latitude: 24.6,
      longitude: 73.8,
      currency: 'INR',
      notes: '',
    },
  ];
  const now = Date.parse('2030-03-20T09:00:00Z'),
    data = {
      fetchedAt: new Date(now).toISOString(),
      route: {
        mode: 'drive',
        source: 'geoapify',
        distanceMeters: 1234.5,
        waypoints: [
          { latitude: 24.5, longitude: 73.7 },
          { latitude: 24.6, longitude: 73.8 },
        ],
      },
    };
  const choices = availableRouteDistances(
    plan,
    (key) => (key.includes('drive') ? data : undefined),
    now,
  );
  expect(choices).toEqual([
    { date: trip.startDate, mode: 'drive', distanceMeters: 1235, fetchedAt: data.fetchedAt },
  ]);
  expect(
    availableRouteDistances(
      plan,
      () => ({
        ...data,
        route: {
          ...data.route,
          waypoints: [
            { latitude: 0, longitude: 0 },
            { latitude: 1, longitude: 1 },
          ],
        },
      }),
      now,
    ),
  ).toEqual([]);
  expect(availableRouteDistances(plan, () => data, now + 86400000)).toEqual([]);
});
it('rejects new out-of-trip expense dates while preserving legitimate history after a date change', async () => {
  const s = await state(),
    conversion = manualRate('INR', 'INR', '1', '2026-11-10');
  const expense = expenseSchema.parse({
    id: crypto.randomUUID(),
    amountMinor: 100,
    currency: 'INR',
    category: 'Food',
    date: s.trip.startDate,
    description: 'Synthetic meal',
    conversion,
    convertedMinor: 100,
  });
  let saved = await repo().save(
    s.trip.id,
    { ...s.budget, expenses: [expense] },
    0,
    s.trip.revision,
  );
  const trip = await trips().update(
    s.trip.id,
    {
      ...organizerTripInput,
      destination: s.trip.destination,
      currency: 'INR',
      travelers: 3,
      startDate: '2030-03-21',
      endDate: '2030-03-23',
    },
    saved.trip.revision,
  );
  saved = await repo().save(s.trip.id, saved.budget, saved.budget.revision, trip.revision);
  expect(saved.budget.expenses[0]!.date).toBe(s.trip.startDate);
  await expect(
    repo().save(
      s.trip.id,
      {
        ...saved.budget,
        expenses: [...saved.budget.expenses, { ...expense, id: crypto.randomUUID() }],
      },
      saved.budget.revision,
      saved.trip.revision,
    ),
  ).rejects.toThrow('current travel dates');
  expect((await repo().load(s.trip.id)).budget.expenses).toHaveLength(1);
});
