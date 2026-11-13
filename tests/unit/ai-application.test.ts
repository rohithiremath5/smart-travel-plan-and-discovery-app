import { beforeEach, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import { createItineraryRepository } from '@/features/itinerary/services/itinerary-repository';
import { exportTrips, parseTripBackup } from '@/features/trips/domain/backup';
import {
  planningContext,
  savedAiPlaces,
  selectedActivityBatch,
  suggestionsFromPlan,
} from '@/features/ai/domain/planning';
import { aiPlan } from '../fixtures/ai';
let factory: IDBFactory;
beforeEach(() => {
  factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
});
async function seeded() {
  const trips = createTripRepository(() => factory),
    plans = createItineraryRepository(() => factory);
  const trip = await trips.create({
    title: 'A private local title',
    destination: { id: 'kyoto', name: 'Kyoto', country: 'Japan', source: 'curated' },
    startDate: '2030-03-20',
    endDate: '2030-03-21',
    travelers: 2,
    groupType: 'Couple',
    budgetMinor: 120000,
    currency: 'USD',
    budgetPreference: 'Value',
    interests: ['Culture'],
    pace: 'Relaxed',
    status: 'Planning',
  });
  let state = await plans.saveActivity(
    trip.id,
    {
      date: trip.startDate,
      title: 'A manual garden',
      description: 'Original description',
      durationMinutes: 60,
      category: 'Culture',
      locationName: 'Selected garden gate',
      latitude: 35,
      longitude: 135,
      costMinor: 1000,
      currency: 'USD',
      notes: 'Private manual note',
    },
    0,
  );
  state = await plans.saveNotes(trip.id, trip.startDate, 'Private day note', state.plan.revision);
  return { trips, plans, state };
}
it('shares only consented bounded context, excluding IDs, notes and coordinates', async () => {
  const { state } = await seeded();
  const context = planningContext(state, ['2030-03-20'], 'Balanced', false),
    json = JSON.stringify(context);
  for (const privateText of [
    state.trip.id,
    state.trip.title,
    'Private manual note',
    'Private day note',
    'latitude',
    'longitude',
    'A manual garden',
  ])
    expect(json).not.toContain(privateText);
  expect(planningContext(state, ['2030-03-20'], 'Balanced', true).existing[0]!.title).toBe(
    'A manual garden',
  );
});
it('accepts selected items atomically, preserves manual order/notes/locations, and survives v2 backup', async () => {
  const { trips, plans, state } = await seeded();
  const draft = suggestionsFromPlan(
    aiPlan(),
    savedAiPlaces(
      state,
      state.plan.days.map((d) => d.date),
    ),
  );
  draft[0]!.selected = true;
  const result = await plans.applyActivities(
    state.trip.id,
    selectedActivityBatch(state, draft),
    state.plan.revision,
    state.trip.revision,
  );
  expect(result.plan.days[0]!.activities.map((a) => a.title)).toEqual([
    'A manual garden',
    'A garden afternoon',
  ]);
  expect(result.plan.days[0]!.activities[0]).toEqual(state.plan.days[0]!.activities[0]);
  expect(result.plan.days[0]!.notes).toBe('Private day note');
  expect(result.plan.days[1]!.activities).toEqual([]);
  const snapshot = await trips.exportSnapshot([state.trip.id]);
  const backup = parseTripBackup(exportTrips(snapshot.trips, snapshot.itineraries));
  expect(backup.version).toBe(2);
  expect((await plans.load(state.trip.id)).plan).toEqual(result.plan);
});
it('rejects stale itinerary and trip-preference revisions without partial application', async () => {
  const { trips, plans, state } = await seeded();
  const suggestions = suggestionsFromPlan(aiPlan(), []);
  suggestions[0]!.selected = true;
  const items = selectedActivityBatch(state, suggestions);
  await plans.saveNotes(state.trip.id, state.trip.startDate, 'A newer note', state.plan.revision);
  await expect(
    plans.applyActivities(state.trip.id, items, state.plan.revision, state.trip.revision),
  ).rejects.toThrow();
  const latest = await plans.load(state.trip.id);
  const {
    id: _id,
    schemaVersion: _schema,
    revision: _revision,
    createdAt: _created,
    updatedAt: _updated,
    ...input
  } = latest.trip;
  void _id;
  void _schema;
  void _revision;
  void _created;
  void _updated;
  await trips.update(latest.trip.id, { ...input, pace: 'Packed' }, latest.trip.revision);
  await expect(
    plans.applyActivities(state.trip.id, items, latest.plan.revision, latest.trip.revision),
  ).rejects.toThrow('preferences');
  expect((await plans.load(state.trip.id)).plan.days[0]!.activities).toHaveLength(1);
});
it('explicit replacements keep stable ID/position and manual private fields', async () => {
  const { plans, state } = await seeded();
  const original = state.plan.days[0]!.activities[0]!;
  const draft = suggestionsFromPlan(aiPlan(), []);
  draft[0]!.selected = true;
  draft[0]!.replaceId = original.id;
  const items = selectedActivityBatch(state, draft),
    result = await plans.applyActivities(
      state.trip.id,
      items,
      state.plan.revision,
      state.trip.revision,
    );
  expect(result.plan.days[0]!.activities[0]).toMatchObject({
    id: original.id,
    title: 'A garden afternoon',
    notes: original.notes,
    locationName: original.locationName,
    latitude: 35,
    longitude: 135,
    costMinor: 1000,
  });
});
it('rejects duplicate/foreign replacements and invalid-date batches atomically', async () => {
  const { plans, state } = await seeded();
  const draft = suggestionsFromPlan(aiPlan(), []);
  draft.forEach((s) => (s.selected = true));
  const items = selectedActivityBatch(state, draft);
  items[1]!.input.date = '2030-03-29';
  await expect(
    plans.applyActivities(state.trip.id, items, state.plan.revision, state.trip.revision),
  ).rejects.toThrow('day');
  expect((await plans.load(state.trip.id)).plan).toEqual(state.plan);
  const duplicate = { ...items[0]!, input: { ...items[0]!.input, title: 'A manual garden' } };
  await expect(
    plans.applyActivities(state.trip.id, [duplicate], state.plan.revision, state.trip.revision),
  ).rejects.toThrow('duplicates');
  await expect(
    plans.applyActivities(
      state.trip.id,
      [{ ...items[0]!, replaceId: crypto.randomUUID() }],
      state.plan.revision,
      state.trip.revision,
    ),
  ).rejects.toThrow('belong');
});
