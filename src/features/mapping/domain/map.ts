export {
  coordinates,
  toLngLat,
  sphericalDistance,
  maximumRouteWaypoints,
  routeCreditReservation,
  type Coordinates,
  type MapLocation,
  type MapRoute,
  type RouteGeometry,
  type TravelMode,
  type LngLat,
} from '../../../../supabase/functions/_shared/mapping-contracts';
import {
  coordinates,
  type Coordinates,
} from '../../../../supabase/functions/_shared/mapping-contracts';
import type { Activity, ItineraryDay } from '@/features/itinerary/domain/itinerary';
export interface MapMarker {
  id: string;
  label: string;
  coordinates: Coordinates;
  kind: 'destination' | 'activity';
  order: number;
}
export function dayMarkers(day: ItineraryDay): MapMarker[] {
  return day.activities.flatMap((activity, index) => {
    const point = coordinates(activity);
    return point
      ? [
          {
            id: activity.id,
            label: activity.title,
            coordinates: point,
            kind: 'activity' as const,
            order: index + 1,
          },
        ]
      : [];
  });
}
export function routeWaypoints(activities: Activity[]) {
  return activities.flatMap((activity) => {
    const point = coordinates(activity);
    return point ? [point] : [];
  });
}
export function routeKey(mode: string, points: Coordinates[]) {
  return JSON.stringify({ mode, points });
}
export function distanceLabel(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
export function durationLabel(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
