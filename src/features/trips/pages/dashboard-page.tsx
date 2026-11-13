import { Link, useLocation } from 'react-router';
import { Plus, ArrowUpRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { useTrips } from '../hooks/use-trips';
import { sortTrips, tripPeriod } from '../domain/trip';
import { LocalStorageNote, TripCard, TripError } from '../components/trip-shared';
import { BackupPanel } from '../components/backup-panel';

export function DashboardPage() {
  const query = useTrips();
  const location = useLocation();
  const trips = query.data ?? [];
  const groups = ['In progress', 'Upcoming', 'Past'] as const;
  return (
    <div className="container trips-page">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h1>
            Welcome to your
            <br />
            <em>travel workspace.</em>
          </h1>
          <p>A few dates. A place that calls. Room for everything to come.</p>
        </div>
        <Button asChild>
          <Link to="/trips/new">
            <Plus aria-hidden="true" />
            Create new trip
          </Link>
        </Button>
      </header>
      <LocalStorageNote />
      {(location.state as { message?: string } | null)?.message && (
        <p className="trip-success" role="status">
          {(location.state as { message: string }).message}
        </p>
      )}
      <div className="trips-section-heading">
        <h2>My trips</h2>
        <span>
          {query.data
            ? `${trips.length} ${trips.length === 1 ? 'journey' : 'journeys'}`
            : 'Device workspace'}
        </span>
      </div>
      {query.isPending ? (
        <p role="status" className="trip-loading">
          Opening your saved trips…
        </p>
      ) : query.isError ? (
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : trips.length ? (
        <>
          {groups.map((group) => {
            const items = sortTrips(trips.filter((t) => tripPeriod(t) === group));
            if (group === 'Past') items.reverse();
            return (
              <section key={group} className="trip-group" aria-label={`${group} trips`}>
                <div className="trip-group-heading">
                  <h3>{group} trips</h3>
                  <span>{items.length}</span>
                </div>
                {items.length ? (
                  <div className="trip-grid">
                    {items.map((trip) => (
                      <TripCard key={trip.id} trip={trip} />
                    ))}
                  </div>
                ) : (
                  <p className="muted-text">
                    {group === 'Past'
                      ? 'Your past journeys will live here.'
                      : `No ${group.toLowerCase()} trips yet.`}
                  </p>
                )}
              </section>
            );
          })}
        </>
      ) : (
        <div className="trip-empty">
          <EmptyState
            icon={Compass}
            title="The world is still unwritten."
            action={
              <Button asChild>
                <Link to="/trips/new">
                  Create your first trip
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            }
          >
            Bring an idea, choose your dates, and make it your own. No account needed.
          </EmptyState>
        </div>
      )}
      {query.data && <BackupPanel trips={trips} />}
    </div>
  );
}
