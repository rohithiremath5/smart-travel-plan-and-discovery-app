import { describe, it, expect } from 'vitest';
import {
  dayMarkers,
  routeWaypoints,
  coordinates,
  distanceLabel,
  durationLabel,
} from '@/features/mapping/domain/map';
import { activitySchema } from '@/features/itinerary/domain/itinerary';
describe('geographic activity models', () => {
  it('keeps stable activity identities and user order while excluding missing coordinates', () => {
    const activity = activitySchema.parse({
      id: crypto.randomUUID(),
      date: '2030-03-20',
      title: 'User-entered place',
      description: '',
      durationMinutes: 60,
      category: 'Other',
      locationName: '',
      currency: 'USD',
      notes: '',
      latitude: 35,
      longitude: 135,
    });
    const missing = activitySchema.parse({
      ...activity,
      id: crypto.randomUUID(),
      latitude: undefined,
      longitude: undefined,
    });
    const other = { ...activity, id: crypto.randomUUID(), longitude: 135.01 };
    const day = { date: activity.date, notes: '', activities: [other, missing, activity] };
    expect(dayMarkers(day).map((marker) => [marker.id, marker.order])).toEqual([
      [other.id, 1],
      [activity.id, 3],
    ]);
    expect(routeWaypoints(day.activities)).toEqual([
      { latitude: 35, longitude: 135.01 },
      { latitude: 35, longitude: 135 },
    ]);
    expect(day.activities[1]!.id).toBe(missing.id);
  });
  it('accepts zero coordinates, rejects invalid values and labels only supplied route metrics', () => {
    expect(coordinates({ latitude: 0, longitude: 0 })).toEqual({ latitude: 0, longitude: 0 });
    expect(coordinates({ latitude: NaN, longitude: 0 })).toBeNull();
    expect(coordinates({ latitude: 0, longitude: 181 })).toBeNull();
    expect(coordinates({ latitude: 0 })).toBeNull();
    expect(distanceLabel(800)).toBe('800 m');
    expect(distanceLabel(1600)).toBe('1.6 km');
    expect(durationLabel(3601)).toBe('1 h 0 min');
  });
});
