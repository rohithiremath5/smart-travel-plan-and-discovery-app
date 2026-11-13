// Public contracts only. Named coordinates are converted at the provider/render boundaries.
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface MapLocation extends Coordinates {
  id: string;
  name: string;
  address: string;
  source: 'geoapify' | 'curated';
}
export type TravelMode = 'walk' | 'drive';
export type LngLat = [number, number];
export interface RouteGeometry {
  type: 'MultiLineString';
  coordinates: LngLat[][];
}
export interface MapRoute {
  mode: TravelMode;
  geometry: RouteGeometry;
  distanceMeters: number;
  durationSeconds: number;
  source: 'geoapify';
  waypoints: Coordinates[];
}
export type MappingRequest =
  | { operation: 'location'; query: string; near?: Coordinates }
  | { operation: 'route'; mode: TravelMode; waypoints: Coordinates[] };
export interface MappingResponse {
  locations: MapLocation[];
  route: MapRoute | null;
  fetchedAt: string;
  cached: boolean;
}
export const maximumRouteWaypoints = 6;
// Conservative reservation; no premium options, optimization, avoidance or detailed outputs.
export const routeCreditReservation = 20;
export function coordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.latitude !== 'number' ||
    !Number.isFinite(v.latitude) ||
    Math.abs(v.latitude) > 90 ||
    typeof v.longitude !== 'number' ||
    !Number.isFinite(v.longitude) ||
    Math.abs(v.longitude) > 180
  )
    return null;
  return {
    latitude: Math.round(v.latitude * 100000) / 100000,
    longitude: Math.round(v.longitude * 100000) / 100000,
  };
}
export function toLngLat(value: Coordinates): LngLat {
  return [value.longitude, value.latitude];
}
export function sphericalDistance(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const dlat = rad(b.latitude - a.latitude),
    dlon = rad(b.longitude - a.longitude);
  const n =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, n)), Math.sqrt(Math.max(0, 1 - n)));
}
export function parseMappingRequest(value: unknown): MappingRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const exact = (keys: string[]) => Object.keys(v).every((key) => keys.includes(key));
  if (
    v.operation === 'location' &&
    exact(['operation', 'query', 'near']) &&
    typeof v.query === 'string'
  ) {
    const query = v.query.trim().replace(/\s+/g, ' ');
    if (
      query.length < 3 ||
      query.length > 100 ||
      [...query].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    )
      return null;
    const near = v.near === undefined ? undefined : coordinates(v.near);
    if (near === null) return null;
    return { operation: 'location', query, ...(near ? { near } : {}) };
  }
  if (
    v.operation === 'route' &&
    exact(['operation', 'mode', 'waypoints']) &&
    (v.mode === 'walk' || v.mode === 'drive') &&
    Array.isArray(v.waypoints) &&
    v.waypoints.length >= 2 &&
    v.waypoints.length <= maximumRouteWaypoints
  ) {
    const points = v.waypoints.map(coordinates);
    if (points.some((p) => !p)) return null;
    const waypoints = points as Coordinates[];
    // Day-scale routing only: all stops must be within 25 km of the first stop.
    if (
      waypoints.some((p) => sphericalDistance(p, waypoints[0]!) > 25000) ||
      waypoints.some((p, i) => i > 0 && sphericalDistance(p, waypoints[i - 1]!) < 1)
    )
      return null;
    return { operation: 'route', mode: v.mode, waypoints };
  }
  return null;
}
