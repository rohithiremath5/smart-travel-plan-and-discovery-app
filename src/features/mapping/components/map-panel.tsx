import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Compass, MapPin, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ItineraryDay } from '@/features/itinerary/domain/itinerary';
import type { Trip } from '@/features/trips/domain/trip';
import { coordinates, dayMarkers, type MapMarker, type MapRoute } from '../domain/map';
import { RoutePanel } from './route-panel';
import { isAreaDestination, referencePointNotice } from '@/features/discovery/domain/destination';
const MapCanvas = lazy(() => import('./map-canvas'));
class MapBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="map-placeholder" role="alert">
        <h3>Map tools could not load.</h3>
        <p>
          Keep planning with your itinerary and location list. Reopen the page when your connection
          is available to retry the map.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function MapPanel({
  trip,
  day,
  selected,
  select,
  edit,
}: {
  trip: Trip;
  day: ItineraryDay;
  selected: string | null;
  select: (id: string) => void;
  edit: (id: string) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [route, setRoute] = useState<MapRoute | null>(null);
  const point = useMemo(() => coordinates(trip.destination), [trip.destination]);
  const markers = useMemo<MapMarker[]>(
    () => [
      ...(point
        ? [
            {
              id: 'destination',
              label: trip.destination.name,
              coordinates: point,
              kind: 'destination' as const,
              order: 0,
            },
          ]
        : []),
      ...dayMarkers(day),
    ],
    [point, trip.destination.name, day],
  );
  const selectMarker = useCallback(
    (id: string) => {
      if (id !== 'destination') select(id);
    },
    [select],
  );
  const routeChanged = useCallback((next: MapRoute | null) => setRoute(next), []);
  return (
    <aside className="mapping-workspace" aria-label="Day map and routes">
      <header className="map-panel-heading">
        <div>
          <p className="eyebrow">A SENSE OF PLACE</p>
          <h2>Your day, on the map.</h2>
        </div>
        <Compass aria-hidden="true" />
      </header>
      {isAreaDestination(trip.destination.kind) && (
        <p className="map-area-note">{referencePointNotice}</p>
      )}
      {enabled ? (
        <MapBoundary>
          <Suspense
            fallback={
              <div className="map-placeholder" role="status">
                Loading map tools…
              </div>
            }
          >
            <MapCanvas markers={markers} selected={selected} route={route} select={selectMarker} />
          </Suspense>
        </MapBoundary>
      ) : (
        <div className="map-placeholder">
          <MapIcon aria-hidden="true" />
          <h3>See how the day connects.</h3>
          <p>
            Open a free interactive map alongside your plan. Map tiles load from OpenFreeMap; manual
            planning always stays available.
          </p>
          <Button variant="secondary" onClick={() => setEnabled(true)}>
            Open interactive map
          </Button>
        </div>
      )}
      <p className="map-attribution">
        <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>{' '}
        ·{' '}
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">
          © OpenMapTiles
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>
      </p>
      {!point && (
        <p className="field-hint">
          The destination has no saved coordinates. Activity locations can still be mapped.
        </p>
      )}
      <section className="map-place-list" aria-label="Day locations">
        <div className="map-place-heading">
          <strong>
            {day.activities.filter((activity) => coordinates(activity)).length} of{' '}
            {day.activities.length} activities located
          </strong>
          <small>Saved coordinates · selected or entered by you</small>
        </div>
        {!day.activities.length ? (
          <p className="field-hint">Add an activity and choose its location to begin.</p>
        ) : (
          <ol>
            {day.activities.map((activity, index) => (
              <li key={activity.id} data-selected={selected === activity.id}>
                <button
                  type="button"
                  aria-pressed={selected === activity.id}
                  onClick={() => select(activity.id)}
                >
                  <span className="map-list-number">{index + 1}</span>
                  <span>
                    <strong>{activity.title}</strong>
                    <small>
                      {coordinates(activity)
                        ? activity.locationName || 'Saved coordinate'
                        : 'Location unavailable'}
                    </small>
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Set location for ${activity.title}`}
                  onClick={() => edit(activity.id)}
                >
                  <MapPin aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <RoutePanel key={day.date} activities={day.activities} onRoute={routeChanged} />
    </aside>
  );
}
