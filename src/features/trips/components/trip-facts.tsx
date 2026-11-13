import { formatBudget, formatDate, tripDuration, type TripInput } from '../domain/trip';
import {
  destinationContext,
  destinationTypeLabel,
  isAreaDestination,
  referencePointNotice,
} from '@/features/discovery/domain/destination';
export function TripFacts({ trip }: { trip: TripInput }) {
  return (
    <dl className="trip-facts">
      <div>
        <dt>Destination</dt>
        <dd>
          {trip.destination.name}
          {destinationContext(trip.destination) ? ` · ${destinationContext(trip.destination)}` : ''}
          {trip.destination.kind && <small>{destinationTypeLabel(trip.destination.kind)}</small>}
          {isAreaDestination(trip.destination.kind) && <small>{referencePointNotice}</small>}
        </dd>
      </div>
      <div>
        <dt>Travel dates</dt>
        <dd>
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
          <small>
            {tripDuration(trip.startDate, trip.endDate)} days, including arrival and departure
          </small>
        </dd>
      </div>
      <div>
        <dt>Travelers</dt>
        <dd>
          {trip.travelers} · {trip.groupType}
        </dd>
      </div>
      <div>
        <dt>Trip budget</dt>
        <dd>
          {formatBudget(trip)}
          <small>{trip.budgetPreference} preference · total, not per person</small>
        </dd>
      </div>
      <div>
        <dt>Interests</dt>
        <dd>{trip.interests.join(' · ')}</dd>
      </div>
      <div>
        <dt>Travel pace</dt>
        <dd>{trip.pace}</dd>
      </div>
    </dl>
  );
}
