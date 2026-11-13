import type { TripInput } from '../../src/features/trips/domain/trip';
import type { OrganizerItem, OrganizerNote } from '../../src/features/organizer/domain/organizer';
export const organizerTripInput: TripInput = {
  title: 'A quiet weekend in Kyoto',
  destination: {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    source: 'curated',
    latitude: 35.0116,
    longitude: 135.7681,
  },
  startDate: '2030-03-20',
  endDate: '2030-03-22',
  travelers: 2,
  groupType: 'Couple',
  budgetMinor: 120000,
  currency: 'USD',
  budgetPreference: 'Value',
  interests: ['Culture'],
  pace: 'Balanced',
  status: 'Planning',
};
export const fixtureNote = (text = 'Synthetic arrival instructions'): OrganizerNote => ({
  id: crypto.randomUUID(),
  title: 'Arrival, made easy',
  category: 'Accommodation',
  text,
});
export const fixtureItem = (label = 'Phone charger'): OrganizerItem => ({
  id: crypto.randomUUID(),
  label,
  category: 'Electronics',
  complete: false,
  quantity: 2,
  notes: 'Synthetic USB cable reminder',
});
