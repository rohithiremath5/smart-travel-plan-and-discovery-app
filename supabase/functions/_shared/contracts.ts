export const destinationSearchKinds = ['locality', 'city', 'state', 'country'] as const;
export type PlaceKind = (typeof destinationSearchKinds)[number];
export const destinationKinds = [
  'country',
  'state',
  'county',
  'district',
  'city',
  'town',
  'village',
  'locality',
  'region',
] as const;
export type DestinationKind = (typeof destinationKinds)[number];
export const destinationCacheVersion = 'destinations-v2';
export type Interest = 'culture' | 'nature' | 'coast' | 'city';
export type AttractionCategory = 'sights' | 'nature' | 'food';
export interface Destination {
  id: string;
  name: string;
  country: string;
  kind: DestinationKind;
  state?: string | undefined;
  county?: string | undefined;
  district?: string | undefined;
  latitude: number;
  longitude: number;
  source: 'curated' | 'geoapify';
  fetchedAt: string;
}
export interface Attraction {
  id: string;
  name: string;
  description: string;
  address: string;
  category: AttractionCategory;
}
export interface DiscoveryResponse {
  destinations: Destination[];
  attractions: Attraction[];
  fetchedAt: string;
  cached: boolean;
}
export type DiscoveryRequest =
  | { operation: 'search' | 'autocomplete'; query: string; kind: PlaceKind }
  | { operation: 'detail'; id: string }
  | { operation: 'places'; latitude: number; longitude: number; category: AttractionCategory };

export function parseRequest(value: unknown): DiscoveryRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const exact = (keys: string[]) => Object.keys(v).every((key) => keys.includes(key));
  if (
    (v.operation === 'search' || v.operation === 'autocomplete') &&
    exact(['operation', 'query', 'kind'])
  ) {
    if (typeof v.query !== 'string' || !destinationSearchKinds.includes(v.kind as PlaceKind))
      return null;
    const query = v.query.trim().replace(/\s+/g, ' ');
    if (
      query.length < 3 ||
      query.length > 100 ||
      [...query].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    )
      return null;
    return { operation: v.operation, query, kind: v.kind as PlaceKind };
  }
  if (
    v.operation === 'detail' &&
    exact(['operation', 'id']) &&
    typeof v.id === 'string' &&
    /^geo-[a-f0-9]{20,256}$/i.test(v.id)
  )
    return { operation: 'detail', id: v.id };
  if (
    v.operation === 'places' &&
    exact(['operation', 'latitude', 'longitude', 'category']) &&
    typeof v.latitude === 'number' &&
    Number.isFinite(v.latitude) &&
    Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' &&
    Number.isFinite(v.longitude) &&
    Math.abs(v.longitude) <= 180 &&
    ['sights', 'nature', 'food'].includes(String(v.category))
  )
    return {
      operation: 'places',
      latitude: Math.round(v.latitude * 10000) / 10000,
      longitude: Math.round(v.longitude * 10000) / 10000,
      category: v.category as AttractionCategory,
    };
  return null;
}
