import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import {
  tripInputSchema,
  tripDuration,
  dayDates,
  dateNumber,
  parseBudget,
  formatDate,
  sortTrips,
  tripPeriod,
  type TripInput,
} from '@/features/trips/domain/trip';
import { exportTrips, parseBackup, planImport } from '@/features/trips/domain/backup';
import { initialDraft, validateStep } from '@/features/trips/domain/wizard';
import { readSaved, writeSaved } from '@/features/discovery/services/saved-repository';
import { curatedGuides } from '@/features/discovery/data/curated';

const input: TripInput = {
  title: 'Kyoto in spring',
  destination: {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    source: 'curated',
    latitude: 35,
    longitude: 135,
  },
  startDate: '2028-03-25',
  endDate: '2028-03-28',
  travelers: 2,
  groupType: 'Couple',
  budgetMinor: 123456,
  currency: 'USD',
  budgetPreference: 'Value',
  interests: ['Culture', 'Nature'],
  pace: 'Balanced',
  status: 'Planning',
};
let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
});
describe('local-first trip contract', () => {
  it('creates independent UUID trips, reads through a new adapter and sorts by date', async () => {
    const repo = createTripRepository(() => factory);
    const a = await repo.create(input);
    const b = await repo.create({
      ...input,
      title: 'Later trip',
      startDate: '2029-03-01',
      endDate: '2029-03-02',
    });
    expect(a.id).not.toBe(b.id);
    expect(a.revision).toBe(1);
    expect(a.schemaVersion).toBe(1);
    expect(await createTripRepository(() => factory).get(a.id)).toEqual(a);
    expect((await repo.list()).map((t) => t.id)).toEqual([a.id, b.id]);
  });
  it('updates only the intended trip and rejects stale saves/deletes', async () => {
    const repo = createTripRepository(() => factory);
    const a = await repo.create(input);
    const b = await repo.create({ ...input, title: 'Independent' });
    const changed = await repo.update(a.id, { ...input, title: 'Edited trip' }, a.revision);
    expect(changed.revision).toBe(2);
    expect(changed.createdAt).toBe(a.createdAt);
    await expect(repo.update(a.id, input, a.revision)).rejects.toThrow('another tab');
    await expect(repo.delete(a.id, a.revision)).rejects.toThrow('another tab');
    expect((await repo.get(b.id))?.title).toBe('Independent');
    await repo.delete(a.id, changed.revision);
    expect(await repo.get(a.id)).toBeUndefined();
    expect(await repo.get(b.id)).toEqual(b);
  });
  it('preserves version-1 saved destinations while opening and using trip storage', async () => {
    const saved = curatedGuides[0]!.destination;
    await writeSaved(saved, true);
    const repo = createTripRepository(() => factory);
    const trip = await repo.create(input);
    await repo.update(trip.id, { ...input, title: 'Changed' }, 1);
    expect(await readSaved()).toEqual([saved]);
    await writeSaved(saved, false);
    expect(await repo.list()).toHaveLength(1);
    const databases = await factory.databases();
    expect(databases.find((d) => d.name === 'smart-travel-discovery')?.version).toBe(1);
    expect(databases.find((d) => d.name === 'smart-travel-trips')?.version).toBe(4);
  });
  it('fails visibly when storage is unavailable rather than claiming a save', async () => {
    const repo = createTripRepository(() => undefined);
    await expect(repo.create(input)).rejects.toThrow('unavailable');
    await expect(repo.list()).rejects.toThrow('unavailable');
  });
  it('rejects unsupported stored records without resetting them', async () => {
    const repo = createTripRepository(() => factory);
    await repo.list();
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = factory.open('smart-travel-trips', 4);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').add({ id: 'future-record', schemaVersion: 99 });
      tx.oncomplete = () => resolve();
    });
    db.close();
    await expect(repo.list()).rejects.toThrow('unsupported schema');
    const check = await new Promise<IDBDatabase>((resolve) => {
      const req = factory.open('smart-travel-trips', 4);
      req.onsuccess = () => resolve(req.result);
    });
    const count = await new Promise<number>((resolve) => {
      const req = check.transaction('trips').objectStore('trips').count();
      req.onsuccess = () => resolve(req.result);
    });
    check.close();
    expect(count).toBe(1);
  });
  it('rejects a future database version without destructive downgrade', async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = factory.open('smart-travel-trips', 5);
      req.onupgradeneeded = () => req.result.createObjectStore('trips', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
    });
    db.close();
    await expect(createTripRepository(() => factory).list()).rejects.toThrow('unavailable');
    expect((await factory.databases()).find((d) => d.name === 'smart-travel-trips')?.version).toBe(
      5,
    );
  });
  it('imports atomically, preserves conflicting originals and deduplicates repeated copies', async () => {
    const repo = createTripRepository(() => factory);
    const original = await repo.create(input);
    const changed = { ...original, title: 'Imported correction' };
    expect(planImport([original], [changed])).toMatchObject({ added: 1, copied: 1, skipped: 0 });
    expect(await repo.import([changed])).toEqual({ added: 1, copied: 1, skipped: 0 });
    expect((await repo.get(original.id))?.title).toBe(input.title);
    expect(await repo.import([changed])).toEqual({ added: 0, copied: 0, skipped: 1 });
    expect(await repo.list()).toHaveLength(2);
  });
  it('does not partially import when one record is invalid', async () => {
    const repo = createTripRepository(() => factory);
    const original = await repo.create(input);
    await expect(
      repo.import([
        { ...original, id: crypto.randomUUID() },
        { ...original, id: crypto.randomUUID(), endDate: '2020-01-01' },
      ]),
    ).rejects.toThrow();
    expect(await repo.list()).toEqual([original]);
  });
  it('bounds workspace capacity to a single complete backup without partial writes', async () => {
    const repo = createTripRepository(() => factory);
    const record = await repo.create(input);
    const records = Array.from({ length: 199 }, (_, index) => ({
      ...record,
      id: crypto.randomUUID(),
      title: `Synthetic trip ${index}`,
    }));
    await repo.import(records);
    expect(parseBackup(exportTrips(await repo.list()))).toHaveLength(200);
    await expect(repo.create({ ...input, title: 'Over the limit' })).rejects.toThrow('200 trips');
    await expect(
      repo.import([{ ...record, id: crypto.randomUUID(), title: 'Excess import' }]),
    ).rejects.toThrow('200 trips');
    expect(await repo.list()).toHaveLength(200);
  });
  it('evaluates duplicate imports inside each write transaction', async () => {
    const repo = createTripRepository(() => factory);
    const original = await repo.create(input);
    const changed = { ...original, id: crypto.randomUUID(), title: 'New' };
    const results = await Promise.all([repo.import([changed]), repo.import([changed])]);
    expect(results.reduce((n, r) => n + r.added, 0)).toBe(1);
    expect(await repo.list()).toHaveLength(2);
  });
});
describe('calendar, money and backup safety', () => {
  it('uses real inclusive Gregorian dates across leap day and DST boundaries', () => {
    expect(tripDuration('2028-02-28', '2028-03-01')).toBe(3);
    expect(dayDates('2028-03-11', '2028-03-13')).toEqual([
      '2028-03-11',
      '2028-03-12',
      '2028-03-13',
    ]);
    expect(formatDate('2028-03-12')).toBe('12 Mar 2028');
    expect(dateNumber('2027-02-29')).toBeNaN();
    expect(dateNumber('2028-13-01')).toBeNaN();
    expect(tripDuration('2028-12-31', '2029-01-01')).toBe(2);
  });
  it.each([
    ['2028-03-02', '2028-03-01'],
    ['2028-01-01', '2029-01-01'],
    ['2028-02-30', '2028-03-01'],
  ])('rejects invalid date range %s to %s', (startDate, endDate) => {
    expect(tripInputSchema.safeParse({ ...input, startDate, endDate }).success).toBe(false);
    const draft = { ...initialDraft(), startDate, endDate };
    expect(Object.keys(validateStep(draft, 1)).length).toBeGreaterThan(0);
  });
  it('allows one-day trips and rejects invalid travelers and preferences', () => {
    expect(tripInputSchema.parse({ ...input, endDate: input.startDate }).endDate).toBe(
      input.startDate,
    );
    expect(tripInputSchema.safeParse({ ...input, travelers: 0 }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...input, travelers: 1.2 }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...input, interests: [] }).success).toBe(false);
  });
  it('parses minor units without accepting rounding or exponent tricks', () => {
    expect(parseBudget('12.34', 'USD')).toBe(1234);
    expect(parseBudget('12.1', 'USD')).toBe(1210);
    expect(parseBudget('500', 'JPY')).toBe(500);
    for (const amount of ['1.234', '1e5', '-1', 'Infinity'])
      expect(parseBudget(amount, 'USD')).toBeNaN();
    expect(parseBudget('1.1', 'JPY')).toBeNaN();
  });
  it('validates only the current wizard step, with final whole-record validation', () => {
    const draft = initialDraft();
    expect(validateStep(draft, 0)).toHaveProperty('destination');
    expect(validateStep({ ...draft, destination: input.destination }, 0)).toEqual({});
    expect(validateStep({ ...draft, interests: ['Food'] }, 4)).toEqual({});
    expect(validateStep(draft, 6)).toHaveProperty('budgetMinor');
  });
  it('exports only a validated versioned trip envelope and rejects unknown/sensitive fields', async () => {
    const record = await createTripRepository(() => factory).create(input);
    const text = exportTrips([record]);
    expect(parseBackup(text)).toEqual([record]);
    const invalid = { ...JSON.parse(text), SUPABASE_ACCESS_TOKEN: 'synthetic-secret' };
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow('invalid trip backup');
    expect(() => parseBackup('{')).toThrow('not valid JSON');
    expect(() => parseBackup(' '.repeat(10_000_001))).toThrow('10 MB');
    expect(() => parseBackup(JSON.stringify({ ...JSON.parse(text), version: 2 }))).toThrow(
      'Unsupported',
    );
    expect(() =>
      parseBackup(JSON.stringify({ ...JSON.parse(text), trips: [record, record] })),
    ).toThrow('invalid trip backup');
  });
  it('groups and sorts trips without timestamp timezone shifts', async () => {
    const repo = createTripRepository(() => factory);
    const a = await repo.create(input);
    const b = await repo.create({ ...input, startDate: '2027-01-01', endDate: '2027-01-02' });
    expect(sortTrips([a, b])[0]?.id).toBe(b.id);
    expect(tripPeriod(a, '2028-03-26')).toBe('In progress');
    expect(tripPeriod(a, '2028-03-24')).toBe('Upcoming');
    expect(tripPeriod(a, '2028-03-29')).toBe('Past');
  });
});
