import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSaved } from '../hooks/use-saved';
import type { Destination } from '../../../../supabase/functions/_shared/contracts';

export function SaveButton({
  destination,
  compact = false,
}: {
  destination: Destination;
  compact?: boolean;
}) {
  const { saved, isPending, isError, mutation } = useSaved();
  const [message, setMessage] = useState('');
  const exists = saved.some((value) => value.id === destination.id);
  return (
    <div className={compact ? 'save-control compact' : 'save-control'}>
      <Button
        variant="secondary"
        size={compact ? 'icon' : 'default'}
        disabled={isPending || isError || mutation.isPending}
        aria-pressed={exists}
        aria-label={`${exists ? 'Remove' : 'Save'} ${destination.name}${exists ? ' from saved destinations' : ''}`}
        onClick={() => {
          setMessage('');
          mutation.mutate(
            { destination, save: !exists },
            {
              onSuccess: () =>
                setMessage(exists ? 'Removed from this device.' : 'Saved on this device.'),
              onError: () =>
                setMessage(
                  'Could not update device storage. Check space and browser permissions, then retry.',
                ),
            },
          );
        }}
      >
        {exists ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
        {!compact && (exists ? 'Saved on this device' : 'Save for later')}
      </Button>
      {isError && <p className="storage-error">Device storage unavailable.</p>}
      <p
        role="status"
        className={
          compact && !mutation.isError
            ? 'sr-only'
            : mutation.isError
              ? 'storage-error'
              : 'save-status'
        }
      >
        {message}
      </p>
    </div>
  );
}
