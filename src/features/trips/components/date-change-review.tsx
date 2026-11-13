import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  reconcileDays,
  type DateChangeChoice,
  type DateChangeMode,
  type Itinerary,
} from '@/features/itinerary/domain/itinerary';
import { formatDate, type Trip, type TripInput } from '../domain/trip';
export function DateChangeReview({
  trip,
  input,
  plan,
  save,
  cancel,
  busy,
  error,
}: {
  trip: Trip;
  input: TripInput;
  plan: Itinerary;
  save: (choice: DateChangeChoice) => void;
  cancel: () => void;
  busy: boolean;
  error: string;
}) {
  const [mode, setMode] = useState<DateChangeMode>('keep-dates');
  const [discard, setDiscard] = useState(false);
  const preview = reconcileDays(trip, input, plan, mode);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) cancel();
      }}
    >
      <DialogContent>
        <DialogTitle>Review your new trip dates</DialogTitle>
        <DialogDescription>
          {formatDate(input.startDate)} – {formatDate(input.endDate)}. Choose how to carry your
          activities and day notes into the new dates. Nothing changes until you confirm.
        </DialogDescription>
        <fieldset className="date-change-options">
          <legend className="sr-only">How to keep your itinerary</legend>
          <label>
            <input
              type="radio"
              name="date-mode"
              checked={mode === 'keep-dates'}
              onChange={() => {
                setMode('keep-dates');
                setDiscard(false);
              }}
            />
            <span>
              Keep on calendar dates
              <small>
                Activities and notes stay on matching dates. Days outside the new range are removed.
              </small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="date-mode"
              checked={mode === 'shift-days'}
              onChange={() => {
                setMode('shift-days');
                setDiscard(false);
              }}
            />
            <span>
              Shift by day number
              <small>
                Day 1 moves to the new start date. If the trip is shorter, days beyond the new
                length are removed.
              </small>
            </span>
          </label>
        </fieldset>
        <div className="date-change-preview">
          <strong>
            {preview.days.reduce((n, day) => n + day.activities.length, 0)} activities retained ·{' '}
            {preview.discardedActivities} removed
          </strong>
          <p>
            {preview.discardedNotes} days of notes removed.{' '}
            {preview.shifted
              ? 'Retained activities and notes shift to the new dates; start times stay unchanged.'
              : 'Retained start times stay unchanged.'}
          </p>
          {preview.affected.length > 0 && (
            <p>
              Content removed from: {preview.affected.map((day) => formatDate(day.date)).join(', ')}
              .
            </p>
          )}
        </div>
        {preview.affected.length > 0 && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={discard}
              onChange={(e) => setDiscard(e.target.checked)}
            />
            I understand these activities and day notes will be permanently discarded from this
            device.
          </label>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="trip-actions">
          <Button
            disabled={preview.affected.length > 0 && !discard}
            loading={busy}
            onClick={() => save({ mode, discard })}
          >
            Confirm date changes
          </Button>
          <Button variant="ghost" disabled={busy} onClick={cancel}>
            Keep current dates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
