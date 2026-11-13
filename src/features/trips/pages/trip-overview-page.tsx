import { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2, CalendarDays, Check, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useTrips, tripQueryKey } from '../hooks/use-trips';
import { tripRepository } from '../services/trip-repository';
import { dayDates, formatDate, tripPeriod, type Trip } from '../domain/trip';
import { LocalStorageNote, TripCover, TripError } from '../components/trip-shared';
import { TripFacts } from '../components/trip-facts';

export function TripOverviewPage() {
  const { tripId } = useParams();
  const query = useTrips();
  if (query.isPending)
    return (
      <div className="container trips-page" role="status">
        Opening your trip…
      </div>
    );
  if (query.isError)
    return (
      <div className="container trips-page">
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </div>
    );
  const trip = query.data.find((t) => t.id === tripId);
  if (!trip)
    return (
      <div className="container trips-page">
        <h1>Trip not found on this device.</h1>
        <p>
          It may have been removed or created in another browser. Import a backup from My trips to
          restore it.
        </p>
        <Button asChild>
          <Link to="/trips">Back to My trips</Link>
        </Button>
      </div>
    );
  return <TripOverview key={trip.id} trip={trip} />;
}
function TripOverview({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const days = dayDates(trip.startDate, trip.endDate);
  async function remove() {
    setBusy(true);
    try {
      await tripRepository.delete(trip.id, trip.revision);
      await client.invalidateQueries({ queryKey: tripQueryKey });
      void navigate('/trips', {
        replace: true,
        state: { message: 'Trip deleted from this device.' },
      });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container trips-page overview-page">
      <Link className="back-link" to="/trips">
        <ArrowLeft aria-hidden="true" />
        Back to My trips
      </Link>
      <div className="trip-overview-heading">
        <div>
          <p className="eyebrow">
            {trip.destination.name} {trip.destination.country && `/ ${trip.destination.country}`}
          </p>
          <h1>{trip.title}</h1>
          <p>
            {tripPeriod(trip)} · {trip.status} · Last edited{' '}
            {new Date(trip.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link to={`/trips/${trip.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit trip details
          </Link>
        </Button>
      </div>
      {(location.state as { message?: string } | null)?.message && (
        <p className="trip-success" role="status">
          <Check aria-hidden="true" />
          {(location.state as { message: string }).message}
        </p>
      )}
      <div className="trip-overview-grid">
        <div className="trip-overview-cover">
          <TripCover destination={trip.destination} />
          <Badge tone="accent">
            {trip.destination.source === 'manual'
              ? 'Your destination entry'
              : trip.destination.source === 'curated'
                ? 'Curated destination'
                : 'Geoapify destination'}
          </Badge>
        </div>
        <section className="trip-summary" aria-labelledby="summary-title">
          <p className="eyebrow">THE SHAPE OF YOUR JOURNEY</p>
          <h2 id="summary-title">A plan to call your own.</h2>
          <TripFacts trip={trip} />
        </section>
      </div>
      <LocalStorageNote />
      <section className="organizer-section">
        <p className="eyebrow">BEFORE THE JOURNEY BEGINS</p>
        <h2>A little preparation goes a long way.</h2>
        <p>
          Keep trip notes, travel checklists and packing lists together. Save your progress here on
          your device, then take a printed summary with you.
        </p>
        <div className="trip-actions">
          <Button asChild>
            <Link to={`/trips/${trip.id}/organizer`}>Open organizer</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/trips/${trip.id}/print`}>Print summary</Link>
          </Button>
        </div>
      </section>
      <section className="days-foundation" aria-labelledby="days-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A LITTLE SPACE FOR WHAT’S NEXT</p>
            <h2 id="days-title">Your days, waiting to unfold.</h2>
          </div>
          <Button asChild>
            <Link to={`/trips/${trip.id}/itinerary`}>Open itinerary</Link>
          </Button>
        </div>
        <p>
          Shape each day with activities, your own timing, and notes. Open your itinerary to see and
          edit your plan.
        </p>
        <ol className="day-preview-list">
          {days.slice(0, 7).map((date, index) => (
            <li key={date}>
              <CalendarDays aria-hidden="true" />
              <div>
                <strong>Day {index + 1}</strong>
                <span>{formatDate(date)}</span>
              </div>
              <small>View in itinerary</small>
            </li>
          ))}
        </ol>
        {days.length > 7 && (
          <p className="field-hint">
            And {days.length - 7} more days, through {formatDate(trip.endDate)}.
          </p>
        )}
      </section>
      <section className="future-trip-note">
        <Compass aria-hidden="true" />
        <p>
          Your itinerary map follows your saved activity locations. Manual planning stays useful
          without a connection. Optional AI proposals are available in the itinerary workspace
          during controlled local development.
        </p>
      </section>
      <section className="organizer-section">
        <p className="eyebrow">PLAN THE PRACTICAL DETAILS</p>
        <h2>Budget and weather</h2>
        <p>
          Editable estimates, actual expenses and static currency references. Weather loads only
          when you ask.
        </p>
        <Link className="button button-secondary" to={`/trips/${trip.id}/budget`}>
          Open budget &amp; weather
        </Link>
      </section>
      <div className="trip-danger-zone">
        <div>
          <h2>Change of direction?</h2>
          <p>
            Deleting removes this trip, all activities, day notes, organizer content and
            budgets/expenses from this browser. Export a copy from My trips first if you want to
            keep it.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (!busy) setOpen(value);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 aria-hidden="true" />
              Delete trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Delete this trip?</DialogTitle>
            <DialogDescription>
              “{trip.title}”, all its activities, day notes, organizer content and budgets/expenses
              will be removed from this device. This cannot be undone here. Other trips and saved
              destinations stay unchanged.
            </DialogDescription>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="trip-actions">
              <DialogClose asChild>
                <Button variant="secondary" disabled={busy}>
                  Keep trip
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                loading={busy}
                onClick={() => {
                  void remove();
                }}
              >
                Delete permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
