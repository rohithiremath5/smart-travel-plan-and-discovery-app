import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Footprints, Car, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscoveryError } from '@/features/discovery/services/discovery-client';
import { parseMappingRequest } from '../../../../supabase/functions/_shared/mapping-contracts';
import type { Activity } from '@/features/itinerary/domain/itinerary';
import {
  routeWaypoints,
  routeKey,
  distanceLabel,
  durationLabel,
  maximumRouteWaypoints,
  routeCreditReservation,
  type MapRoute,
  type TravelMode,
} from '../domain/map';
import { requestMapping, mappingErrorMessage } from '../services/mapping-client';
export function RoutePanel({
  activities,
  onRoute,
}: {
  activities: Activity[];
  onRoute: (route: MapRoute | null) => void;
}) {
  const [mode, setMode] = useState<TravelMode>('walk');
  const [confirmed, setConfirmed] = useState(false);
  const [requested, setRequested] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const points = useMemo(
    () =>
      routeWaypoints(activities).filter(
        (p, i, all) =>
          !i || p.latitude !== all[i - 1]!.latitude || p.longitude !== all[i - 1]!.longitude,
      ),
    [activities],
  );
  const signature = routeKey(mode, points);
  const valid = !!parseMappingRequest({ operation: 'route', mode, waypoints: points });
  const query = useQuery({
    queryKey: ['map-route', signature],
    queryFn: ({ signal }) =>
      requestMapping({ operation: 'route', mode, waypoints: points }, signal),
    // Route requests require an explicit Calculate action, including after an error.
    enabled: false,
    staleTime: 86400000,
    gcTime: 86400000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useEffect(() => {
    onRoute(requested === signature && query.isSuccess ? query.data.route : null);
  }, [requested, signature, query.isSuccess, query.data, onRoute]);
  useEffect(() => {
    if (!(query.error instanceof DiscoveryError) || !query.error.retryAfter) return;
    const wait = query.error.retryAfter;
    const timer = setTimeout(() => setCooldown(wait), 0);
    return () => clearTimeout(timer);
  }, [query.error, query.errorUpdatedAt]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const result = requested === signature ? query.data?.route : null;
  return (
    <section className="route-panel" aria-labelledby="route-title">
      <div className="route-heading">
        <Route aria-hidden="true" />
        <h3 id="route-title">The way between.</h3>
      </div>
      <div className="route-mode" aria-label="Travel mode">
        <Button
          variant={mode === 'walk' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'walk'}
          onClick={() => {
            if (mode === 'walk') return;
            setMode('walk');
            setConfirmed(false);
            setRequested('');
          }}
        >
          <Footprints aria-hidden="true" />
          Walking
        </Button>
        <Button
          variant={mode === 'drive' ? 'secondary' : 'ghost'}
          aria-pressed={mode === 'drive'}
          onClick={() => {
            if (mode === 'drive') return;
            setMode('drive');
            setConfirmed(false);
            setRequested('');
          }}
        >
          <Car aria-hidden="true" />
          Driving
        </Button>
      </div>
      {points.length < 2 ? (
        <p className="field-hint">
          {points.length
            ? 'Add another location to calculate a route.'
            : 'Add coordinates to at least two activities to calculate a route.'}
        </p>
      ) : !valid ? (
        <p className="field-hint">
          Routes support 2–{maximumRouteWaypoints} distinct stops within 25 km of the first stop.
          Adjust this day’s locations to continue.
        </p>
      ) : (
        <>
          <p className="field-hint">
            {points.length} coordinate stops in your chosen order.{' '}
            {activities.length - points.length > 0
              ? `${activities.length - points.length} ${activities.length - points.length === 1 ? 'activity' : 'activities'} without distinct coordinates ${activities.length - points.length === 1 ? 'is' : 'are'} excluded.`
              : ''}{' '}
            No stops are reordered.
          </p>
          <label className="location-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I confirm these saved coordinates and agree to send this ordered route to Geoapify.
          </label>
          <Button
            variant="secondary"
            disabled={!confirmed || cooldown > 0}
            loading={query.isFetching}
            onClick={() => {
              setRequested(signature);
              if (query.data && Date.now() - query.dataUpdatedAt < 86400000) return;
              if (query.isError) {
                setCooldown(
                  query.error instanceof DiscoveryError ? Math.max(5, query.error.retryAfter) : 5,
                );
              }
              void query.refetch({ cancelRefetch: false });
            }}
          >
            <Route aria-hidden="true" />
            {cooldown ? `Wait ${cooldown}s` : result ? 'Route loaded' : 'Calculate route'}
          </Button>
          <p className="field-hint">
            Reuse saved results when possible. A new route reserves {routeCreditReservation} credits
            from the shared 100/day development allowance.
          </p>
        </>
      )}
      {requested === signature && query.isError && (
        <p className="mapping-error" role="alert">
          {mappingErrorMessage(query.error)}
        </p>
      )}
      {result && (
        <div className="route-summary" role="status">
          <strong>
            {distanceLabel(result.distanceMeters)} <span>·</span>{' '}
            {durationLabel(result.durationSeconds)}
          </strong>
          <span>
            {mode === 'walk' ? 'Walking' : 'Driving'} estimate ·{' '}
            {query.data?.cached ? 'Server-cached Geoapify route' : 'Geoapify route'}
          </span>
          <small>Not real-time traffic. Check conditions before travelling.</small>
        </div>
      )}
      <p className="map-attribution">
        Powered by{' '}
        <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
          Geoapify
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap contributors
        </a>
      </p>
    </section>
  );
}
