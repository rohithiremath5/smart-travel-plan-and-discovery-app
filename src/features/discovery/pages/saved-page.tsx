import { Bookmark } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/feedback/notice';
import { EmptyState } from '@/components/feedback/empty-state';
import { useSaved } from '../hooks/use-saved';
import { DestinationCard } from '../components/destination-card';

export function SavedPage() {
  const { saved, isPending, isError, refetch } = useSaved();
  return (
    <div className="container saved-page">
      <div className="discovery-page-heading">
        <div>
          <p className="eyebrow">KEEP A LITTLE INSPIRATION</p>
          <h1>Places for someday.</h1>
          <p>
            Saved on this device · {saved.length} {saved.length === 1 ? 'place' : 'places'}
          </p>
        </div>
      </div>
      <p className="saved-explanation">
        Your collection lives in this browser. Clearing browser data removes it; saves do not sync
        between devices.
      </p>
      {isPending ? (
        <p role="status">Opening your saved places…</p>
      ) : isError ? (
        <Notice tone="warning" title="Device storage is unavailable">
          <p>
            Your collection could not be read. Check browser storage permissions and available
            space.
          </p>
          <Button
            onClick={() => {
              void refetch();
            }}
          >
            Retry storage
          </Button>
        </Notice>
      ) : saved.length ? (
        <div className="destination-grid">
          {saved.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="An open page, for now."
          action={
            <Button asChild>
              <Link to="/discover?source=demo">Find a place to save</Link>
            </Button>
          }
        >
          Tap the bookmark on a destination that catches your eye. Your saved places will be waiting
          here.
        </EmptyState>
      )}
    </div>
  );
}
