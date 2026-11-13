// Realistic provider shapes with synthetic IDs/reference coordinates; not captured live data.
// This test-only module is never bundled into the application or used as discovery results.
export const discoveryStamp = '2026-11-07T00:00:00.000Z';
export function rawDestination(overrides: Record<string, unknown> = {}, index = 1) {
  return {
    properties: {
      place_id: 'c'.repeat(38) + index.toString(16).padStart(2, '0'),
      result_type: 'county',
      name: 'Chikkamagaluru',
      county: 'Chikkamagaluru',
      city: 'Chikkamagaluru City',
      state: 'Karnataka',
      country: 'India',
      lat: 13.316,
      lon: 75.772,
      ...overrides,
    },
  };
}
export const districtDestination = {
  id: 'geo-' + 'c'.repeat(38) + '01',
  name: 'Chikkamagaluru',
  country: 'India',
  kind: 'county' as const,
  state: 'Karnataka',
  county: 'Chikkamagaluru',
  latitude: 13.316,
  longitude: 75.772,
  source: 'geoapify' as const,
  fetchedAt: discoveryStamp,
};
