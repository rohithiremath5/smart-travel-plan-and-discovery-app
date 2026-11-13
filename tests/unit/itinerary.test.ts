import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import { openTripsDatabase } from '@/features/trips/services/trips-database';
import { createItineraryRepository } from '@/features/itinerary/services/itinerary-repository';
import {
  activityInputSchema,
  dayWarnings,
  emptyItinerary,
  reconcileDays,
  type ActivityInput,
} from '@/features/itinerary/domain/itinerary';
import { exportTrips, parseTripBackup, type TripSnapshot } from '@/features/trips/domain/backup';
import { type TripInput } from '@/features/trips/domain/trip';

const input: TripInput = {
  title: 'A synthetic Kyoto journey',
  destination: { id: 'kyoto', name: 'Kyoto', country: 'Japan', source: 'curated' },
  startDate: '2030-03-20',
  endDate: '2030-03-23',
  travelers: 2,
  groupType: 'Couple',
  budgetMinor: 120000,
  currency: 'USD',
  budgetPreference: 'Value',
  interests: ['Culture'],
  pace: 'Balanced',
  status: 'Planning',
};
const activity: ActivityInput = {
  date: input.startDate,
  title: 'Temple gardens',
  description: 'A slow walk',
  startTime: '09:30',
  durationMinutes: 90,
  category: 'Culture',
  locationName: 'Garden gate',
  costMinor: 1000,
  currency: 'USD',
  notes: 'Bring water',
  latitude: 35,
  longitude: 135,
};
let factory: IDBFactory;
let trips: ReturnType<typeof createTripRepository>;
let plans: ReturnType<typeof createItineraryRepository>;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
  trips = createTripRepository(() => factory);
  plans = createItineraryRepository(() => factory);
});
async function seeded() {
  const trip = await trips.create(input);
  return plans.saveActivity(trip.id, activity, 0);
}
async function rawOpen(version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open('smart-travel-trips', version);
    req.onupgradeneeded = () => req.result.createObjectStore('trips', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
describe('coordinated itinerary persistence', () => {
  it('rolls back the aggregate when updating trip metadata fails after the itinerary write', async () => {
    const state = await seeded();
    const original = FakeObjectStore.prototype.put;
    const spy = vi.spyOn(FakeObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      if (this.name === 'trips')
        throw new DOMException('Device storage is full.', 'QuotaExceededError');
      return original.call(this, value, key);
    });
    await expect(
      plans.saveNotes(state.trip.id, activity.date, 'Must not partially save', 1),
    ).rejects.toThrow('full');
    spy.mockRestore();
    expect(await plans.load(state.trip.id)).toEqual(state);
  });
  it('upgrades a v1 database additively without rewriting a legacy trip', async () => {
    const now = '2026-11-05T00:00:00.000Z';
    const record = {
      ...input,
      id: crypto.randomUUID(),
      schemaVersion: 1,
      revision: 7,
      createdAt: now,
      updatedAt: now,
    };
    const db = await rawOpen(1);
    await new Promise<void>((resolve) => {
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').add(record);
      tx.oncomplete = () => resolve();
    });
    db.close();
    expect(await trips.get(record.id)).toEqual(record);
    const state = await plans.load(record.id);
    expect(state.plan).toEqual(emptyItinerary(record));
    expect(state.plan.days).toHaveLength(4);
    const upgraded = await openTripsDatabase(() => factory);
    expect(upgraded.version).toBe(4);
    expect([...upgraded.objectStoreNames]).toEqual([
      'budgets',
      'itineraries',
      'organizers',
      'trips',
    ]);
    upgraded.close();
    expect(await trips.get(record.id)).toEqual(record);
  });
  it('reports a blocked upgrade without resetting old data and can retry after old tabs close', async () => {
    const db = await rawOpen(1);
    await expect(plans.load(crypto.randomUUID())).rejects.toThrow('Close older');
    db.close();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await trips.list()).toEqual([]);
  });
  it('persists CRUD, chronological insertion, manual order, day moves and notes across adapters', async () => {
    let state = await seeded();
    const id = state.plan.days[0]!.activities[0]!.id;
    state = await plans.saveActivity(
      state.trip.id,
      { ...activity, title: 'Breakfast', startTime: '08:00', category: 'Food' },
      state.plan.revision,
    );
    expect(state.plan.days[0]!.activities.map((a) => a.title)).toEqual([
      'Breakfast',
      'Temple gardens',
    ]);
    state = await plans.moveActivity(state.trip.id, id, -1, state.plan.revision);
    expect(state.plan.days[0]!.activities[0]!.id).toBe(id);
    state = await plans.saveActivity(
      state.trip.id,
      { ...activity, title: 'Temple, edited' },
      state.plan.revision,
      id,
    );
    expect(state.plan.days[0]!.activities[0]!.id).toBe(id);
    state = await plans.sortDay(state.trip.id, activity.date, state.plan.revision);
    expect(state.plan.days[0]!.activities[0]!.title).toBe('Breakfast');
    state = await plans.saveActivity(
      state.trip.id,
      { ...activity, date: '2030-03-21' },
      state.plan.revision,
      id,
    );
    expect(state.plan.days[0]!.activities).toHaveLength(1);
    expect(state.plan.days[1]!.activities[0]!.id).toBe(id);
    state = await plans.saveNotes(
      state.trip.id,
      '2030-03-21',
      'Meet at the north gate',
      state.plan.revision,
    );
    expect((await createItineraryRepository(() => factory).load(state.trip.id)).plan).toEqual(
      state.plan,
    );
    state = await plans.deleteActivity(state.trip.id, id, state.plan.revision);
    expect(state.plan.days[1]!.activities).toHaveLength(0);
    expect(state.plan.days[1]!.notes).toContain('north gate');
  });
  it('rejects foreign days/activities, stale concurrent saves, and stale metadata writes', async () => {
    const original = await seeded();
    const other = await trips.create({ ...input, title: 'Independent' });
    const id = original.plan.days[0]!.activities[0]!.id;
    await expect(plans.saveActivity(other.id, activity, 0, id)).rejects.toThrow('does not belong');
    await expect(
      plans.saveActivity(original.trip.id, { ...activity, date: '2031-01-01' }, 1),
    ).rejects.toThrow('Choose a day');
    const results = await Promise.allSettled([
      plans.saveNotes(original.trip.id, activity.date, 'First', 1),
      plans.saveNotes(original.trip.id, activity.date, 'Second', 1),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    await expect(trips.update(original.trip.id, input, original.trip.revision)).rejects.toThrow(
      'another tab',
    );
    expect(
      (await plans.load(other.id)).plan.days.every((d) => !d.activities.length && !d.notes),
    ).toBe(true);
  });
  it('cascades only the confirmed trip itinerary in the same transaction', async () => {
    const state = await seeded();
    const other = await trips.create({ ...input, title: 'Keep me' });
    await expect(trips.delete(state.trip.id, 1)).rejects.toThrow('another tab');
    expect((await plans.load(state.trip.id)).plan.days[0]!.activities).toHaveLength(1);
    await trips.delete(state.trip.id, state.trip.revision);
    const snapshot = await trips.exportSnapshot();
    expect(snapshot.trips.map((t) => t.id)).toEqual([other.id]);
    expect(snapshot.itineraries.map((p) => p.tripId)).toEqual([other.id]);
  });
  it('does not claim saves when device storage is unavailable', async () => {
    await expect(
      createItineraryRepository(() => undefined).saveNotes(
        crypto.randomUUID(),
        activity.date,
        'test',
        0,
      ),
    ).rejects.toThrow('unavailable');
  });
});
describe('safe date reconciliation', () => {
  it('previews retain versus shift and requires explicit discard consent', async () => {
    let state = await seeded();
    state = await plans.saveNotes(
      state.trip.id,
      '2030-03-23',
      'Last-day reminder',
      state.plan.revision,
    );
    const shorter = { ...input, startDate: '2030-03-21', endDate: '2030-03-22' };
    const keep = reconcileDays(state.trip, shorter, state.plan, 'keep-dates');
    expect(keep.discardedActivities).toBe(1);
    expect(keep.discardedNotes).toBe(1);
    const shift = reconcileDays(state.trip, shorter, state.plan, 'shift-days');
    expect(shift.days[0]!.activities[0]!.date).toBe('2030-03-21');
    expect(shift.discardedActivities).toBe(0);
    expect(shift.discardedNotes).toBe(1);
    await expect(trips.update(state.trip.id, shorter, state.trip.revision)).rejects.toThrow(
      'Review itinerary',
    );
    await expect(
      trips.update(state.trip.id, shorter, state.trip.revision, {
        mode: 'shift-days',
        discard: false,
      }),
    ).rejects.toThrow('consent');
    expect((await plans.load(state.trip.id)).plan).toEqual(state.plan);
    await trips.update(state.trip.id, shorter, state.trip.revision, {
      mode: 'shift-days',
      discard: true,
    });
    const next = await plans.load(state.trip.id);
    expect(next.plan.days).toHaveLength(2);
    expect(next.plan.days[0]!.activities[0]!.id).toBe(state.plan.days[0]!.activities[0]!.id);
    expect(next.plan.days.every((d) => !d.notes)).toBe(true);
  });
  it('keeps matching dates on extension and can shift all content without losing it', async () => {
    let state = await seeded();
    await trips.update(state.trip.id, { ...input, endDate: '2030-03-24' }, state.trip.revision, {
      mode: 'keep-dates',
      discard: false,
    });
    state = await plans.load(state.trip.id);
    expect(state.plan.days).toHaveLength(5);
    expect(state.plan.days[0]!.activities).toHaveLength(1);
    await trips.update(
      state.trip.id,
      { ...input, startDate: '2030-04-01', endDate: '2030-04-05' },
      state.trip.revision,
      { mode: 'shift-days', discard: false },
    );
    expect((await plans.load(state.trip.id)).plan.days[0]!.activities[0]!.date).toBe('2030-04-01');
  });
});
describe('complete, bounded backups', () => {
  it('round-trips notes, coordinates, money, order and IDs through v2 into an empty workspace', async () => {
    let state = await seeded();
    state = await plans.saveNotes(
      state.trip.id,
      activity.date,
      'Private synthetic reminder',
      state.plan.revision,
    );
    const snapshot = await trips.exportSnapshot();
    const data = parseTripBackup(exportTrips(snapshot.trips, snapshot.itineraries));
    expect(data.version).toBe(2);
    const fresh = new IDBFactory();
    const other = createTripRepository(() => fresh);
    await other.import(data.trips, data.itineraries);
    const restored = await createItineraryRepository(() => fresh).load(state.trip.id);
    expect(restored.plan.days).toEqual(state.plan.days);
    expect(await other.import(data.trips, data.itineraries)).toEqual({
      added: 0,
      copied: 0,
      skipped: 1,
    });
  });
  it('copies conflicting aggregates with remapped activity IDs and deduplicates repeat imports', async () => {
    const state = await seeded();
    const snapshot = await trips.exportSnapshot();
    const incoming: TripSnapshot = {
      trips: [{ ...snapshot.trips[0]!, title: 'Alternative' }],
      itineraries: snapshot.itineraries,
    };
    expect(await trips.import(incoming.trips, incoming.itineraries)).toEqual({
      added: 1,
      copied: 1,
      skipped: 0,
    });
    const result = await trips.exportSnapshot();
    const copied = result.itineraries.find((p) => p.tripId !== state.trip.id)!;
    expect(copied.days[0]!.activities[0]!.id).not.toBe(state.plan.days[0]!.activities[0]!.id);
    expect(copied.days[0]!.activities[0]!.title).toBe(activity.title);
    expect(await trips.import(incoming.trips, incoming.itineraries)).toEqual({
      added: 0,
      copied: 0,
      skipped: 1,
    });
  });
  it('accepts old metadata-only v1 without overwriting a populated itinerary', async () => {
    const state = await seeded();
    const legacy = parseTripBackup(exportTrips([state.trip]));
    expect(legacy.version).toBe(1);
    expect(legacy.itineraries[0]!.days.every((d) => !d.activities.length)).toBe(true);
    expect(await trips.import(legacy.trips, legacy.itineraries)).toEqual({
      added: 1,
      copied: 1,
      skipped: 0,
    });
    expect((await plans.load(state.trip.id)).plan.days[0]!.activities).toHaveLength(1);
  });
  it('rejects orphaned, wrong-day, duplicate-ID and oversized backups before any writes', async () => {
    await seeded();
    const snapshot = await trips.exportSnapshot();
    const base = JSON.parse(exportTrips(snapshot.trips, snapshot.itineraries));
    const variants = [
      { ...base, itineraries: [{ ...base.itineraries[0], tripId: crypto.randomUUID() }] },
      { ...base, itineraries: [] },
      {
        ...base,
        itineraries: [
          {
            ...base.itineraries[0],
            days: base.itineraries[0].days.map((day: unknown, index: number) =>
              index === 0 ? { ...(day as object), date: '2030-03-24' } : day,
            ),
          },
        ],
      },
    ];
    for (const value of variants) expect(() => parseTripBackup(JSON.stringify(value))).toThrow();
    expect(() => parseTripBackup(' '.repeat(10_000_001))).toThrow('10 MB');
    await expect(trips.import(snapshot.trips, [])).rejects.toThrow();
    expect(await trips.exportSnapshot()).toEqual(snapshot);
  });
});
describe('honest destination-local scheduling', () => {
  it('validates paired coordinates, real dates, money, durations and 24-hour wall clocks', () => {
    for (const override of [
      { date: '2030-02-30' },
      { startTime: '24:00' },
      { durationMinutes: 0 },
      { latitude: 91 },
      { longitude: undefined },
      { costMinor: -1 },
      { costMinor: 1.5 },
    ])
      expect(activityInputSchema.safeParse({ ...activity, ...override }).success).toBe(false);
    expect(activityInputSchema.parse({ ...activity, startTime: '00:00' }).startTime).toBe('00:00');
  });
  it('warns about overlap, midnight and manual order without changing data', async () => {
    let state = await seeded();
    state = await plans.saveActivity(
      state.trip.id,
      { ...activity, title: 'Tea break', startTime: '10:00' },
      1,
    );
    state = await plans.saveActivity(
      state.trip.id,
      { ...activity, title: 'Night walk', startTime: '23:30', durationMinutes: 90 },
      2,
    );
    const id = state.plan.days[0]!.activities[1]!.id;
    state = await plans.moveActivity(state.trip.id, id, -1, 3);
    const before = structuredClone(state.plan);
    expect(dayWarnings(state.plan.days[0]!).join(' ')).toMatch(/overlaps.*past midnight.*order/s);
    expect(state.plan).toEqual(before);
  });
});
