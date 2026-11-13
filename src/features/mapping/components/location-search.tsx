import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscoveryError } from '@/features/discovery/services/discovery-client';
import { curatedGuides } from '@/features/discovery/data/curated';
import { useDebounced } from '@/features/discovery/hooks/use-debounced';
import { coordinates, type Coordinates, type MapLocation } from '../domain/map';
import { requestMapping, mappingErrorMessage } from '../services/mapping-client';
export function LocationSearch({
  near,
  select,
}: {
  near: Coordinates | null;
  select: (place: MapLocation) => void;
}) {
  const [query, setQuery] = useState('');
  const [worldwide, setWorldwide] = useState(false);
  const [nearby, setNearby] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const debounced = useDebounced(query.trim(), 450);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const result = useQuery({
    queryKey: ['map-location', debounced, nearby ? near : null],
    enabled: worldwide && debounced.length >= 3,
    queryFn: ({ signal }) => {
      if (cooldown > 0) throw new DiscoveryError('request_busy', cooldown);
      return requestMapping(
        { operation: 'location', query: debounced, ...(nearby && near ? { near } : {}) },
        signal,
      );
    },
    staleTime: 86400000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useEffect(() => {
    if (!(result.error instanceof DiscoveryError) || !result.error.retryAfter) return;
    const wait = result.error.retryAfter;
    const timer = setTimeout(() => setCooldown(wait), 0);
    return () => clearTimeout(timer);
  }, [result.error, result.errorUpdatedAt]);
  const known = curatedGuides.flatMap((guide) => {
    const point = coordinates(guide.destination);
    return point &&
      (!query ||
        `${guide.destination.name} ${guide.destination.country}`
          .toLowerCase()
          .includes(query.toLowerCase()))
      ? [
          {
            id: guide.destination.id,
            name: guide.destination.name,
            address: `${guide.destination.country} · Curated destination centre`,
            ...point,
            source: 'curated' as const,
          },
        ]
      : [];
  });
  const places = worldwide
    ? query.trim() === debounced
      ? (result.data?.locations ?? [])
      : []
    : known;
  return (
    <section className="location-search" aria-label="Find a location">
      <div className="location-mode">
        <Button
          variant={!worldwide ? 'secondary' : 'ghost'}
          aria-pressed={!worldwide}
          onClick={() => setWorldwide(false)}
        >
          Known destinations
        </Button>
        <Button
          variant={worldwide ? 'secondary' : 'ghost'}
          aria-pressed={worldwide}
          onClick={() => setWorldwide(true)}
        >
          Worldwide places
        </Button>
      </div>
      <label className="field">
        <span>
          <Search aria-hidden="true" />
          Search for a place
        </span>
        <input
          className="input"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={worldwide ? 'A museum, café, address…' : 'Kyoto, Lisbon…'}
        />
      </label>
      {worldwide && (
        <>
          <label className="location-checkbox">
            <input
              type="checkbox"
              disabled={!near}
              checked={!!near && nearby}
              onChange={(e) => setNearby(e.target.checked)}
            />
            Near this destination (25 km)
          </label>
          <p className="field-hint">
            Search text and optional destination coordinates go to Geoapify. No trip title, notes or
            activity IDs are sent.
          </p>
        </>
      )}
      {worldwide && query.trim().length < 3 && (
        <p className="field-hint">Type at least three characters to search.</p>
      )}
      {worldwide && result.isFetching && <p role="status">Finding places…</p>}
      {worldwide && result.isError && (
        <div className="mapping-error" role="alert">
          <p>{mappingErrorMessage(result.error)}</p>
          <Button
            variant="secondary"
            disabled={cooldown > 0}
            onClick={() => {
              setCooldown(5);
              void result.refetch();
            }}
          >
            Try search again
          </Button>
        </div>
      )}
      <ul className="location-results">
        {places.map((place) => (
          <li key={place.id}>
            <button type="button" onClick={() => select(place)}>
              <MapPin aria-hidden="true" />
              <span>
                <strong>{place.name}</strong>
                <small>{place.address}</small>
                <small>
                  {place.source === 'curated'
                    ? 'Curated centre coordinate'
                    : 'Geoapify search result'}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {worldwide && result.isSuccess && !result.isFetching && !places.length && (
        <p>No places matched. Add a city to the name or turn off the nearby filter.</p>
      )}
      {!worldwide && (
        <p className="field-hint">
          Known destination centres are an offline-friendly baseline, not verified venue entrances.
          You can also enter coordinates manually.
        </p>
      )}
      {worldwide && (
        <p className="map-attribution">
          Powered by{' '}
          <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
            Geoapify
          </a>{' '}
          · Data ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </p>
      )}
    </section>
  );
}
