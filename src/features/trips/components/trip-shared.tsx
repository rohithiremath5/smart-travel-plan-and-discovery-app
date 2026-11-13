import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, CalendarDays, Users, Compass, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notice } from '@/components/feedback/notice';
import { photography, type PhotoKey } from '@/features/discovery/data/photography';
import {
  formatDate,
  tripDuration,
  tripPeriod,
  type Trip,
  type TripDestination,
} from '../domain/trip';

export function LocalStorageNote() {
  return (
    <div className="local-storage-note">
      <HardDrive aria-hidden="true" />
      <p>
        <strong>Saved on this device.</strong> Trips stay in this browser, without an account.
        Browser storage can be cleared; export a backup to keep a copy. No cloud backup or
        synchronization.
      </p>
    </div>
  );
}
export function TripError({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Notice title="Your workspace needs a moment" tone="error">
      <span role="alert">{error.message}</span>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Retry storage
        </Button>
      )}
    </Notice>
  );
}
export function TripCover({ destination }: { destination: TripDestination }) {
  const [failedPhoto, setFailedPhoto] = useState<PhotoKey | null>(null);
  const key =
    destination.source === 'curated' && Object.hasOwn(photography, destination.id)
      ? (destination.id as PhotoKey)
      : undefined;
  const photo = key ? photography[key] : undefined;
  const failed = !!key && failedPhoto === key;
  return (
    <figure className="trip-cover">
      {photo && !failed ? (
        <img
          src={`/images/${key}-640.jpg`}
          srcSet={`/images/${key}-640.jpg 640w, /images/${key}-1280.jpg 1280w`}
          sizes="(max-width:767px) 100vw, 40vw"
          width="1280"
          height="853"
          alt={photo.alt}
          loading="lazy"
          onError={() => setFailedPhoto(key ?? null)}
        />
      ) : (
        <div className="trip-cover-fallback">
          <Compass aria-hidden="true" />
          <span>{failed ? 'Photograph unavailable' : 'A journey of your own'}</span>
        </div>
      )}
      {photo && (
        <figcaption>
          Photo:{' '}
          <a href={photo.source} target="_blank" rel="noreferrer">
            {photo.creator} / Pexels<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </figcaption>
      )}
    </figure>
  );
}
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="trip-card">
      <TripCover destination={trip.destination} />
      <div className="trip-card-content">
        <div className="trip-card-top">
          <span className="eyebrow">{trip.destination.name}</span>
          <Badge tone={tripPeriod(trip) === 'Past' ? 'neutral' : 'accent'}>
            {tripPeriod(trip)} · {trip.status}
          </Badge>
        </div>
        <h3>
          <Link to={`/trips/${trip.id}`}>
            {trip.title}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </h3>
        <p className="trip-card-dates">
          <CalendarDays aria-hidden="true" />
          {formatDate(trip.startDate)} — {formatDate(trip.endDate)}
        </p>
        <div className="trip-card-meta">
          <span>{tripDuration(trip.startDate, trip.endDate)} days</span>
          <span>
            <Users aria-hidden="true" />
            {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </span>
          <span>{trip.pace} pace</span>
        </div>
        <p className="trip-edited">
          Edited {new Date(trip.updatedAt).toLocaleDateString()} · On this device
        </p>
        <Link className="text-link" to={`/trips/${trip.id}/organizer`}>
          Open trip organizer
        </Link>
      </div>
    </article>
  );
}
