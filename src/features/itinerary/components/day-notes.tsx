import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ItineraryDay } from '../domain/itinerary';
export function DayNotes({
  day,
  revision,
  save,
  onDirty,
}: {
  day: ItineraryDay;
  revision: number;
  save: (notes: string, revision: number) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [base, setBase] = useState(revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = draft ?? day.notes;
  const dirty = value !== day.notes;
  return (
    <section className="day-notes" aria-labelledby="day-notes-title">
      <div className="notes-heading">
        <NotebookPen aria-hidden="true" />
        <h3 id="day-notes-title">A note for the day</h3>
      </div>
      <p>Reservations, a meeting point, or a reminder to slow down.</p>
      <label className="sr-only" htmlFor="day-notes">
        Day notes
      </label>
      <textarea
        id="day-notes"
        rows={3}
        maxLength={2000}
        value={value}
        disabled={busy}
        onChange={(event) => {
          if (!dirty) setBase(revision);
          setDraft(event.target.value);
          onDirty(event.target.value !== day.notes);
        }}
        placeholder="Leave yourself a little reminder…"
      />
      <div className="notes-footer">
        <small>
          {value.length}/2000 · {dirty ? 'Unsaved changes' : 'Saved on this device'}
        </small>
        <Button
          variant="secondary"
          disabled={!dirty}
          loading={busy}
          onClick={() => {
            setBusy(true);
            setError('');
            void save(value, base)
              .then(() => {
                setDraft(null);
                onDirty(false);
              })
              .catch((error: Error) => setError(error.message))
              .finally(() => setBusy(false));
          }}
        >
          Save day notes
        </Button>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
