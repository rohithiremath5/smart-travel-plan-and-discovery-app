import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { itineraryRepository } from '@/features/itinerary/services/itinerary-repository';
import type { Trip } from '@/features/trips/domain/trip';
import { availableRouteDistances } from '../domain/cached-route';
export function CachedRouteDistance({
  trip,
  onUse,
}: {
  trip: Trip;
  onUse: (meters: number, source: string) => void;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['budget-route-options', trip.id, trip.revision],
    queryFn: () => itineraryRepository.load(trip.id),
    staleTime: 0,
  });
  const choices = query.data
    ? availableRouteDistances(
        query.data.plan,
        (signature) => client.getQueryData(['map-route', signature]),
        new Date().getTime(),
      )
    : [];
  if (!choices.length)
    return (
      <p className="field-hint">
        No matching recent route is cached locally for this itinerary. Enter total distance
        manually. No Geoapify request is made.
      </p>
    );
  return (
    <div className="budget-info">
      <p>
        Optional: use a previously retrieved route matching this trip’s saved activities. This is
        one day’s route, not an inferred whole-trip or return distance. Review remaining travel
        separately.
      </p>
      {choices.map((choice) => (
        <Button
          key={choice.date + choice.mode}
          variant="secondary"
          onClick={() =>
            onUse(
              choice.distanceMeters,
              `Cached Geoapify ${choice.mode} route for ${choice.date}; retrieved ${choice.fetchedAt}`,
            )
          }
        >
          Use {choice.date} {choice.mode} distance ({(choice.distanceMeters / 1000).toFixed(3)} km)
        </Button>
      ))}
    </div>
  );
}
