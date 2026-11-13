import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { DestinationPicker } from '@/features/trips/components/destination-picker';
import { placeNameSuggestions } from '@/features/discovery/data/place-names';
import { destinationContext } from '@/features/discovery/domain/destination';
import { destinationSchema } from '@/features/discovery/services/discovery-client';
import { readSaved, writeSaved } from '@/features/discovery/services/saved-repository';
import { districtDestination, discoveryStamp } from '../fixtures/destination-search';
import { createTripRepository } from '@/features/trips/services/trip-repository';
import { exportTrips, parseTripBackup } from '@/features/trips/domain/backup';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/app/config/environment', () => ({ appConfig: { runtimeMode: 'live' } }));
vi.mock('@/features/discovery/services/discovery-client', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  requestDiscovery: request,
}));
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  request.mockReset();
  request.mockResolvedValue({
    destinations: [districtDestination],
    attractions: [],
    fetchedAt: discoveryStamp,
    cached: false,
  });
});
it.each([
  ['Chikmagalur', 'Chikkamagaluru', false],
  ['Chikkamagaluru', 'Chikkamagaluru', false],
  ['Chikmangalur', 'Chikkamagaluru', true],
  ['Coorg', 'Kodagu', false],
  ['Mysore', 'Mysuru', false],
  ['Belgaum', 'Belagavi', false],
  ['Ooty', 'Udhagamandalam', false],
  ['München', 'Munich', false],
])(
  'offers a cited, explicit alternative for %s without calling a provider',
  (query, name, spelling) => {
    const result = placeNameSuggestions(query);
    expect(result[0]).toMatchObject({ name, spelling });
    expect(result[0]?.source).toMatch(/^https:\/\//);
    expect(request).not.toHaveBeenCalled();
  },
);
it('never offers arbitrary typo rewrites or an India alias for a conflicting region', () => {
  for (const query of ['Chikmangalluur', 'Mysore, Ontario', 'Coorg, Germany', 'zzzz'])
    expect(placeNameSuggestions(query)).toEqual([]);
  expect(placeNameSuggestions('Chikmagalur, Karnataka, India')[0]?.name).toBe('Chikkamagaluru');
});
it('distinguishes districts with the same name using geographic context', () => {
  expect(destinationContext(districtDestination)).toBe('Karnataka · India');
  expect(
    destinationContext({
      ...districtDestination,
      name: 'Springfield',
      county: undefined,
      state: 'Illinois',
      country: 'United States',
    }),
  ).toBe('Illinois · United States');
});
it('preserves legacy city/region saves alongside a new county without changing IDs or coordinates', async () => {
  const legacy = {
    ...districtDestination,
    id: 'legacy',
    kind: 'region' as const,
    name: 'Legacy regional save',
    state: undefined,
    county: undefined,
  };
  expect(destinationSchema.safeParse(legacy).success).toBe(true);
  await writeSaved(legacy, true);
  await writeSaved(districtDestination, true);
  expect(await readSaved()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: districtDestination.id,
        kind: 'county',
        state: 'Karnataka',
        latitude: 13.316,
      }),
      expect.objectContaining({ id: 'legacy', kind: 'region' }),
    ]),
  );
});
function picker(onSelect = vi.fn()) {
  render(
    <AppProviders>
      <MemoryRouter>
        <DestinationPicker selected={null} onSelect={onSelect} />
      </MemoryRouter>
    </AppProviders>,
  );
  return onSelect;
}
it('round-trips district metadata through repository reload and complete v2 backups while accepting v1 records', async () => {
  const repo = createTripRepository(() => indexedDB);
  const { id, name, country, kind, state, county, latitude, longitude, source } =
    districtDestination;
  const trip = await repo.create({
    title: 'District trip',
    destination: { id, name, country, kind, state, county, latitude, longitude, source },
    startDate: '2030-03-20',
    endDate: '2030-03-21',
    travelers: 1,
    groupType: 'Solo',
    budgetMinor: 10000,
    currency: 'INR',
    budgetPreference: 'Value',
    interests: ['Culture'],
    pace: 'Relaxed',
    status: 'Planning',
  });
  expect((await createTripRepository(() => indexedDB).get(trip.id))?.destination).toEqual(
    trip.destination,
  );
  const snapshot = await repo.exportSnapshot();
  const v2 = parseTripBackup(exportTrips(snapshot.trips, snapshot.itineraries));
  expect(v2.version).toBe(2);
  expect(v2.trips[0]?.destination).toEqual(trip.destination);
  const legacy = {
    ...trip,
    destination: { id: 'legacy-city', name: 'Kyoto', country: 'Japan', source: 'curated' as const },
  };
  const v1 = parseTripBackup(exportTrips([legacy]));
  expect(v1.version).toBe(1);
  expect(v1.trips[0]?.destination).toEqual(legacy.destination);
});
it('submits an All destinations district search once by keyboard and selects only on explicit approval', async () => {
  const user = userEvent.setup(),
    select = picker();
  await user.click(screen.getByRole('button', { name: 'Worldwide search' }));
  expect(screen.getByLabelText('Destination type')).toHaveValue('locality');
  await user.type(screen.getByLabelText('Search destinations'), 'Chikkamagaluru');
  expect(request).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: 'Search all destinations for Chikkamagaluru' }),
  ).not.toBeInTheDocument();
  await user.keyboard('{Enter}');
  await screen.findByRole('button', { name: /Chikkamagaluru.*District \/ county/ });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0]?.[0]).toEqual({
    operation: 'search',
    query: 'Chikkamagaluru',
    kind: 'locality',
  });
  expect(select).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: /Chikkamagaluru.*District \/ county/ }));
  expect(select).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: 'county',
      state: 'Karnataka',
      county: 'Chikkamagaluru',
      latitude: 13.316,
    }),
  );
});
it('shows a possible spelling without submitting or rewriting until the suggestion is chosen', async () => {
  const user = userEvent.setup();
  picker();
  await user.click(screen.getByRole('button', { name: 'Worldwide search' }));
  await user.type(screen.getByLabelText('Search destinations'), 'Chikmangalur');
  expect(screen.getByText(/Possible spelling, not a documented alternative name/)).toBeVisible();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Search destinations')).toHaveValue('Chikmangalur');
  await user.click(
    screen.getByRole('button', { name: 'Search all destinations for Chikkamagaluru' }),
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(request.mock.calls[0]?.[0]).toEqual({
    operation: 'search',
    query: 'Chikkamagaluru, Karnataka, India',
    kind: 'locality',
  });
});
it('retains manual entry and safe quota/error feedback without automatic retries', async () => {
  request.mockRejectedValue(new Error('unavailable'));
  const user = userEvent.setup();
  picker();
  await user.click(screen.getByRole('button', { name: 'Worldwide search' }));
  await user.type(screen.getByLabelText('Search destinations'), 'Wayanad{Enter}');
  await screen.findByRole('alert');
  expect(request).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Enter manually' }));
  expect(screen.getByLabelText('Destination name')).toBeVisible();
});
