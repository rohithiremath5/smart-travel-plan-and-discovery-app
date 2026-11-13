import { beforeEach, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore as FakeStore } from 'fake-indexeddb';
import { createOrganizerRepository } from '@/features/organizer/services/organizer-repository';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import { createItineraryRepository } from '@/features/itinerary/services/itinerary-repository';
import { openTripsDatabase } from '@/features/trips/services/trips-database';
import {
  emptyOrganizer,
  organizerSchema,
  progress,
  moveItem,
} from '@/features/organizer/domain/organizer';
import {
  organizerTemplates,
  applyTemplate,
  templateItems,
} from '@/features/organizer/data/templates';
import { exportTrips, parseTripBackup, planImport } from '@/features/trips/domain/backup';
import { organizerTripInput as input, fixtureItem, fixtureNote } from '../fixtures/organizer';
let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
});
const trips = () => createTripRepository(() => factory),
  repo = () => createOrganizerRepository(() => factory);
async function populated() {
  const trip = await trips().create(input);
  const state = await repo().load(trip.id);
  return repo().save(
    trip.id,
    {
      ...state.organizer,
      notes: [fixtureNote()],
      checklist: [{ ...fixtureItem('Confirm arrival'), category: 'Before departure', quantity: 1 }],
      packing: [fixtureItem()],
    },
    0,
    trip.revision,
  );
}
it('starts empty without inserting samples and persists separately through a new adapter', async () => {
  const a = await populated(),
    b = await trips().create({ ...input, title: 'A different trip' });
  expect((await repo().load(a.trip.id)).organizer).toEqual(a.organizer);
  expect((await repo().load(b.id)).organizer).toEqual(emptyOrganizer(b.id));
  expect(a.trip.revision).toBe(2);
  expect(a.organizer.revision).toBe(1);
  expect((await trips().list()).map((x) => x.id)).toContain(a.trip.id);
});
it('edits and removes notes, checks/unchecks items, quantities/order and explicit reset persist', async () => {
  let state = await populated();
  const second = { ...fixtureItem('Spare cable'), category: 'Electronics' };
  state = await repo().save(
    state.trip.id,
    {
      ...state.organizer,
      notes: [
        { ...state.organizer.notes[0]!, title: 'Updated', text: 'Revised synthetic reminder' },
      ],
      packing: [{ ...state.organizer.packing[0]!, complete: true }, second],
    },
    state.organizer.revision,
    state.trip.revision,
  );
  expect(progress(state.organizer.packing)).toMatchObject({
    complete: 1,
    remaining: 1,
    percent: 50,
  });
  state = await repo().save(
    state.trip.id,
    {
      ...state.organizer,
      notes: [],
      packing: moveItem(state.organizer.packing, second.id, -1).map((x) => ({
        ...x,
        complete: false,
      })),
    },
    state.organizer.revision,
    state.trip.revision,
  );
  const recovered = await repo().load(state.trip.id);
  expect(recovered.organizer.notes).toEqual([]);
  expect(recovered.organizer.packing.map((x) => x.id)).toEqual([
    second.id,
    state.organizer.packing[1]!.id,
  ]);
  expect(progress(recovered.organizer.packing).complete).toBe(0);
});
it('atomically rejects competing organizer revisions without losing the winner', async () => {
  const state = await populated();
  const values = ['First tab', 'Second tab'].map((text) => ({
    ...state.organizer,
    notes: [{ ...state.organizer.notes[0]!, text }],
  }));
  const results = await Promise.allSettled(
    values.map((value) =>
      repo().save(state.trip.id, value, state.organizer.revision, state.trip.revision),
    ),
  );
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((x) => x.status === 'rejected')).toHaveLength(1);
  expect((await repo().load(state.trip.id)).organizer.revision).toBe(2);
  await expect(trips().update(state.trip.id, input, state.trip.revision)).rejects.toThrow(
    'another tab',
  );
});
it('rejects a stale organizer after metadata changed and preserves unrelated content on reviewed save', async () => {
  const state = await populated();
  await trips().update(state.trip.id, { ...input, title: 'New metadata' }, state.trip.revision);
  await expect(
    repo().save(
      state.trip.id,
      { ...state.organizer, notes: [] },
      state.organizer.revision,
      state.trip.revision,
    ),
  ).rejects.toThrow('another tab');
  const latest = await repo().load(state.trip.id);
  expect(latest.organizer).toEqual(state.organizer);
  const saved = await repo().save(
    state.trip.id,
    { ...latest.organizer, notes: [] },
    latest.organizer.revision,
    latest.trip.revision,
  );
  expect(saved.trip.title).toBe('New metadata');
  expect(saved.organizer.packing).toEqual(state.organizer.packing);
});
it.each([1, 2])(
  'additively upgrades IndexedDB v%s while preserving trip/day notes and IDs',
  async (version) => {
    const other = new IDBFactory();
    factory = other;
    const created = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = other.open('smart-travel-trips', version);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('trips', { keyPath: 'id' });
        if (version === 2) request.result.createObjectStore('itineraries', { keyPath: 'tripId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const trip = {
      ...input,
      id: crypto.randomUUID(),
      schemaVersion: 1 as const,
      revision: 1,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    };
    await new Promise<void>((resolve, reject) => {
      const tx = created.transaction([...created.objectStoreNames], 'readwrite');
      tx.objectStore('trips').add(trip);
      if (version === 2)
        tx.objectStore('itineraries').add({
          schemaVersion: 1,
          tripId: trip.id,
          revision: 4,
          days: ['2030-03-20', '2030-03-21', '2030-03-22'].map((date) => ({
            date,
            notes: date === '2030-03-20' ? 'Existing private day reminder' : '',
            activities: [],
          })),
        });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    created.close();
    const state = await repo().load(trip.id);
    expect(state.trip).toEqual(trip);
    expect(state.organizer).toEqual(emptyOrganizer(trip.id));
    const db = await openTripsDatabase(() => other);
    expect(db.version).toBe(4);
    expect([...db.objectStoreNames]).toEqual(['budgets', 'itineraries', 'organizers', 'trips']);
    db.close();
    const itinerary = await createItineraryRepository(() => other).load(trip.id);
    expect(itinerary.plan.days[0]!.notes).toBe(
      version === 2 ? 'Existing private day reminder' : '',
    );
  },
);
it('blocked upgrades fail clearly; an abandoned upgrade never resets the old database', async () => {
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open('smart-travel-trips', 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('trips', { keyPath: 'id' });
      request.result.createObjectStore('itineraries', { keyPath: 'tripId' });
    };
    request.onsuccess = () => resolve(request.result);
  });
  await expect(openTripsDatabase(() => factory)).rejects.toThrow('Close older');
  db.close();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const upgraded = await openTripsDatabase(() => factory);
  expect(upgraded.version).toBe(4);
  upgraded.close();
});
it('unavailable and unsupported future storage fail without pretending to save', async () => {
  await expect(
    createOrganizerRepository(() => undefined).load(crypto.randomUUID()),
  ).rejects.toThrow('storage');
  const db = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open('smart-travel-trips', 5);
    request.onsuccess = () => resolve(request.result);
  });
  db.close();
  await expect(openTripsDatabase(() => factory)).rejects.toThrow('storage');
});
it('a quota/transaction failure preserves earlier organizer and trip revision', async () => {
  const state = await populated(),
    original = FakeStore.prototype.put;
  const mocked = vi.spyOn(FakeStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    if (this.name === 'organizers')
      throw new DOMException('Synthetic full storage', 'QuotaExceededError');
    return original.apply(this, args);
  });
  try {
    await expect(
      repo().save(
        state.trip.id,
        { ...state.organizer, notes: [] },
        state.organizer.revision,
        state.trip.revision,
      ),
    ).rejects.toThrow();
  } finally {
    mocked.mockRestore();
  }
  expect(await repo().load(state.trip.id)).toEqual(state);
});
it('cascade deletion includes organizer and itinerary in the same transaction', async () => {
  const a = await populated(),
    b = await trips().create({ ...input, title: 'Keep me' });
  await expect(trips().delete(a.trip.id, 1)).rejects.toThrow('another tab');
  expect((await repo().load(a.trip.id)).organizer.notes).toHaveLength(1);
  await trips().delete(a.trip.id, a.trip.revision);
  await expect(repo().load(a.trip.id)).rejects.toThrow('not found');
  expect((await trips().exportSnapshot()).organizers?.map((x) => x.tripId)).toEqual([b.id]);
  const db = await openTripsDatabase(() => factory);
  const tx = db.transaction('organizers', 'readonly');
  const request = tx.objectStore('organizers').get(a.trip.id);
  await new Promise<void>((resolve) => {
    request.onsuccess = () => {
      expect(request.result).toBeUndefined();
      resolve();
    };
  });
  db.close();
});
it.each(organizerTemplates)(
  'template $title is explicit, duplicate-safe and preserves completion/custom items',
  async (template) => {
    const state = await populated(),
      before = structuredClone(state.organizer);
    const items = templateItems(template, 'packing');
    const next = applyTemplate(state.organizer, 'packing', items.slice(0, 1));
    expect(state.organizer).toEqual(before);
    expect(next.packing).toHaveLength(
      before.packing.length + (before.packing.some((x) => x.label === items[0]!.label) ? 0 : 1),
    );
    const again = applyTemplate(next, 'packing', items.slice(0, 1));
    expect(again).toEqual(next);
    const saved = await repo().save(
      state.trip.id,
      again,
      state.organizer.revision,
      state.trip.revision,
    );
    expect((await repo().load(state.trip.id)).organizer).toEqual(saved.organizer);
  },
);
it('complete v3 round trip preserves notes, quantities, status, order and original IDs', async () => {
  const state = await populated(),
    snapshot = await trips().exportSnapshot();
  const text = exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers);
  const parsed = parseTripBackup(text);
  expect(parsed.version).toBe(3);
  expect(parsed.organizers[0]).toEqual(state.organizer);
  const fresh = new IDBFactory(),
    target = createTripRepository(() => fresh);
  await target.import(parsed.trips, parsed.itineraries, parsed.organizers);
  const actual = await createOrganizerRepository(() => fresh).load(state.trip.id);
  expect(actual.organizer.notes).toEqual(state.organizer.notes);
  expect(actual.organizer.packing).toEqual(state.organizer.packing);
  expect(await target.import(parsed.trips, parsed.itineraries, parsed.organizers)).toMatchObject({
    skipped: 1,
    added: 0,
  });
});
it.each([1, 2])(
  'valid legacy v%s backups derive empty organizers without overwriting existing content',
  async (version) => {
    const state = await populated(),
      snapshot = await trips().exportSnapshot();
    const parsed = parseTripBackup(
      version === 1
        ? exportTrips(snapshot.trips)
        : exportTrips(snapshot.trips, snapshot.itineraries),
    );
    expect(parsed.version).toBe(version);
    expect(parsed.organizers[0]!.notes).toEqual([]);
    expect(await trips().import(parsed.trips, parsed.itineraries, parsed.organizers)).toMatchObject(
      { copied: 1, added: 1 },
    );
    expect((await repo().load(state.trip.id)).organizer).toEqual(state.organizer);
  },
);
it('organizer differences create conflict copies; every relationship and conflicting item ID is remapped', async () => {
  const state = await populated(),
    snapshot = await trips().exportSnapshot();
  const incoming = {
    ...state.organizer,
    notes: [{ ...state.organizer.notes[0]!, text: 'Different organizer only' }],
  };
  const plan = planImport(
    snapshot.trips,
    snapshot.trips,
    snapshot.itineraries,
    snapshot.itineraries,
    snapshot.organizers,
    [incoming],
  );
  expect(plan.copied).toBe(1);
  expect(plan.organizers[0]!.tripId).toBe(plan.additions[0]!.id);
  expect(plan.organizers[0]!.notes[0]!.id).not.toBe(incoming.notes[0]!.id);
  await trips().import(snapshot.trips, snapshot.itineraries, [incoming]);
  expect(await trips().list()).toHaveLength(2);
  expect(await trips().import(snapshot.trips, snapshot.itineraries, [incoming])).toMatchObject({
    skipped: 1,
    added: 0,
  });
});
it.each([
  { schemaVersion: 9 },
  { revision: -1 },
  { notes: [{ ...fixtureNote(), unexpected: 'field' }] },
  { packing: [{ ...fixtureItem(), quantity: 1.5 }] },
  { packing: [{ ...fixtureItem(), label: 'x'.repeat(161) }] },
])('strictly rejects invalid organizer input without writes: %j', async (override) => {
  const state = await populated();
  expect(organizerSchema.safeParse({ ...state.organizer, ...override }).success).toBe(false);
  await expect(
    repo().save(
      state.trip.id,
      { ...state.organizer, ...override } as typeof state.organizer,
      state.organizer.revision,
      state.trip.revision,
    ),
  ).rejects.toThrow();
  expect(await repo().load(state.trip.id)).toEqual(state);
});
it('remaps colliding organizer IDs on a distinct trip while preserving both owners and completion', async () => {
  const state = await populated();
  const snapshot = await trips().exportSnapshot();
  const incomingTrip = { ...state.trip, id: crypto.randomUUID(), title: 'Distinct synthetic trip' };
  const incomingPlan = { ...snapshot.itineraries[0]!, tripId: incomingTrip.id };
  const incomingOrganizer = {
    ...state.organizer,
    tripId: incomingTrip.id,
    packing: state.organizer.packing.map((item) => ({ ...item, complete: true })),
  };
  await trips().import([incomingTrip], [incomingPlan], [incomingOrganizer]);
  const actual = await repo().load(incomingTrip.id);
  expect(actual.organizer.packing[0]!.id).not.toBe(state.organizer.packing[0]!.id);
  expect(actual.organizer.notes[0]!.id).not.toBe(state.organizer.notes[0]!.id);
  expect(actual.organizer.packing[0]!.complete).toBe(true);
  expect((await repo().load(state.trip.id)).organizer).toEqual(state.organizer);
  expect(await trips().import([incomingTrip], [incomingPlan], [incomingOrganizer])).toMatchObject({
    skipped: 1,
    added: 0,
  });
});
it('rolls back the organizer when its paired trip update fails', async () => {
  const state = await populated();
  const original = FakeStore.prototype.put;
  const mocked = vi.spyOn(FakeStore.prototype, 'put').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['put']>
  ) {
    if (this.name === 'trips')
      throw new DOMException('Synthetic interrupted transaction', 'AbortError');
    return original.apply(this, args);
  });
  try {
    await expect(
      repo().save(
        state.trip.id,
        { ...state.organizer, notes: [] },
        state.organizer.revision,
        state.trip.revision,
      ),
    ).rejects.toThrow();
  } finally {
    mocked.mockRestore();
  }
  expect(await repo().load(state.trip.id)).toEqual(state);
});
it('rejects malformed/oversized/orphaned/duplicate-ID imports before writes; cancelling preview writes nothing', async () => {
  const state = await populated(),
    snapshot = await trips().exportSnapshot();
  const base = JSON.parse(exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers));
  const bad = [
    { ...base, version: 9 },
    { ...base, organizers: [] },
    { ...base, organizers: [{ ...base.organizers[0], tripId: crypto.randomUUID() }] },
    {
      ...base,
      organizers: [
        {
          ...base.organizers[0],
          packing: [...base.organizers[0].packing, ...base.organizers[0].packing],
        },
      ],
    },
    { ...base, privateAttachments: ['not supported'] },
  ];
  for (const value of bad) expect(() => parseTripBackup(JSON.stringify(value))).toThrow();
  expect(() => parseTripBackup(' '.repeat(10_000_001))).toThrow('10 MB');
  planImport(
    snapshot.trips,
    snapshot.trips,
    snapshot.itineraries,
    snapshot.itineraries,
    snapshot.organizers,
    snapshot.organizers,
  );
  expect(await trips().exportSnapshot()).toEqual(snapshot);
  expect((await repo().load(state.trip.id)).organizer).toEqual(state.organizer);
});
it('aborting a three-store import never leaves a partial trip, plan or organizer', async () => {
  const snapshot = await (async () => {
    await populated();
    return trips().exportSnapshot();
  })();
  const targetFactory = new IDBFactory(),
    target = createTripRepository(() => targetFactory);
  await target.list();
  const original = FakeStore.prototype.add;
  const mocked = vi.spyOn(FakeStore.prototype, 'add').mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore['add']>
  ) {
    if (this.name === 'organizers')
      throw new DOMException('Synthetic aborted write', 'QuotaExceededError');
    return original.apply(this, args);
  });
  try {
    await expect(
      target.import(snapshot.trips, snapshot.itineraries, snapshot.organizers),
    ).rejects.toThrow();
  } finally {
    mocked.mockRestore();
  }
  expect((await target.exportSnapshot()).trips).toEqual([]);
});
