import { ArrowUpRight, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { getGuide } from '../data/curated';
import { DestinationPhoto } from './destination-photo';
import { SaveButton } from './save-button';
import type { Destination } from '../../../../supabase/functions/_shared/contracts';
import { destinationContext, destinationTypeLabel } from '../domain/destination';

export function DestinationCard({ destination }: { destination: Destination }) {
  const guide = destination.source === 'curated' ? getGuide(destination.id) : undefined;
  return (
    <article className="destination-card">
      <div className="card-photo-wrap">
        <DestinationPhoto photo={guide?.photo} />
        <div className="card-save">
          <SaveButton destination={destination} compact />
        </div>
      </div>
      <div className="destination-card-body">
        <p className="destination-region">
          <MapPin aria-hidden="true" />
          {destinationContext(destination) || destination.country || 'Region not supplied'}
          <span>{destination.source === 'curated' ? 'Curated demo' : 'Geoapify'}</span>
        </p>
        <h3>
          <Link to={`/destinations/${encodeURIComponent(destination.id)}`}>
            {destination.name}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </h3>
        <p>
          {guide?.headline ??
            `${destinationTypeLabel(destination.kind)} · Explore the place and its surroundings.`}
        </p>
        {guide && (
          <div className="destination-tags">
            {guide.interests.map((interest) => (
              <span key={interest}>{interest}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
