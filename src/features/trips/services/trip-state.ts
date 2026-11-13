import { tripSchema, type Trip } from '../domain/trip';
import {
  emptyItinerary,
  validateItinerary,
  type Itinerary,
} from '@/features/itinerary/domain/itinerary';
export function readTrip(value: unknown): Trip {
  const result = tripSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      'A stored trip has an unsupported schema. No data was removed. Restore a supported backup or use the original application version.',
    );
  return result.data;
}
export function readTripState(
  tx: IDBTransaction,
  id: string,
  action: (trip: Trip, plan: Itinerary) => void,
  fail: (error: Error) => void,
) {
  const tripRequest = tx.objectStore('trips').get(id);
  const planRequest = tx.objectStore('itineraries').get(id);
  let ready = 0;
  function finish() {
    if (++ready !== 2) return;
    try {
      if (!tripRequest.result)
        throw new Error('Trip not found on this device. It may have been deleted in another tab.');
      const trip = readTrip(tripRequest.result);
      action(
        trip,
        planRequest.result === undefined
          ? emptyItinerary(trip)
          : validateItinerary(trip, planRequest.result),
      );
    } catch (error) {
      fail(error as Error);
    }
  }
  tripRequest.onsuccess = finish;
  planRequest.onsuccess = finish;
}
export function touchedTrip(trip: Trip): Trip {
  return {
    ...trip,
    revision: trip.revision + 1,
    updatedAt: new Date(Math.max(Date.now(), Date.parse(trip.updatedAt))).toISOString(),
  };
}
