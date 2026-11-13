import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  currencyDigits,
  currencyOptions,
  formatDate,
  parseBudget,
  type Trip,
} from '@/features/trips/domain/trip';
import {
  activityCategories,
  activityInputSchema,
  type Activity,
  type ActivityInput,
  type Itinerary,
} from '../domain/itinerary';
import { LocationSearch } from '@/features/mapping/components/location-search';
import { coordinates, type MapLocation } from '@/features/mapping/domain/map';

export function ActivityEditor({
  trip,
  plan,
  date,
  activity,
  save,
  close,
  focusLocation = false,
}: {
  trip: Trip;
  plan: Itinerary;
  date: string;
  activity: Activity | undefined;
  save: (input: ActivityInput) => Promise<void>;
  close: () => void;
  focusLocation?: boolean;
}) {
  const [form, setForm] = useState(() => ({
    title: activity?.title ?? '',
    description: activity?.description ?? '',
    date: activity?.date ?? date,
    startTime: activity?.startTime ?? '',
    durationMinutes: String(activity?.durationMinutes ?? 60),
    category: activity?.category ?? 'Sightseeing',
    locationName: activity?.locationName ?? '',
    latitude: activity?.latitude?.toString() ?? '',
    longitude: activity?.longitude?.toString() ?? '',
    cost:
      activity?.costMinor === undefined
        ? ''
        : String(activity.costMinor / 10 ** currencyDigits(activity.currency)),
    currency: activity?.currency ?? trip.currency,
    notes: activity?.notes ?? '',
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<MapLocation | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  function field(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setError('');
  }
  function leave() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else close();
  }
  async function submit() {
    const { cost, ...fields } = form;
    const parsed = activityInputSchema.safeParse({
      ...fields,
      startTime: form.startTime || undefined,
      durationMinutes: Number(form.durationMinutes),
      latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
      longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
      costMinor: cost.trim() ? parseBudget(cost, form.currency) : undefined,
    });
    // Only the domain fields cross the repository boundary.
    if (!parsed.success) {
      setError(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' '),
      );
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    setError('');
    try {
      await save(parsed.data);
      close();
    } catch (error) {
      setError((error as Error).message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) leave();
      }}
    >
      <DialogContent
        className="activity-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <p className="eyebrow">MAKE TIME FOR WHAT MATTERS</p>
        <DialogTitle>{activity ? 'Edit activity' : 'Add an activity'}</DialogTitle>
        <DialogDescription>
          Times are local to your destination. Leave the start time blank for a little flexibility.
        </DialogDescription>
        {discard ? (
          <>
            <p>You have unsaved activity changes. Discard them?</p>
            <div className="trip-actions">
              <Button variant="secondary" onClick={() => setDiscard(false)}>
                Keep editing
              </Button>
              <Button variant="destructive" onClick={close}>
                Discard activity changes
              </Button>
            </div>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {error && (
              <p role="alert" tabIndex={-1} ref={errorRef} className="wizard-error-summary">
                {error}
              </p>
            )}
            <div className="activity-form-grid">
              <label className="field wide">
                Activity title
                <input
                  autoFocus={!focusLocation}
                  maxLength={120}
                  value={form.title}
                  onChange={(e) => field('title', e.target.value)}
                  required
                />
              </label>
              <label className="field wide">
                Description <span className="field-hint">Optional</span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) => field('description', e.target.value)}
                />
              </label>
              <label className="field">
                Day
                <select
                  aria-label="Day"
                  value={form.date}
                  onChange={(e) => field('date', e.target.value)}
                >
                  {plan.days.map((day, index) => (
                    <option key={day.date} value={day.date}>
                      Day {index + 1} · {formatDate(day.date)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Category
                <select value={form.category} onChange={(e) => field('category', e.target.value)}>
                  {activityCategories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Start time (optional)
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => field('startTime', e.target.value)}
                />
              </label>
              <label className="field">
                Duration in minutes
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={form.durationMinutes}
                  onChange={(e) => field('durationMinutes', e.target.value)}
                  required
                />
              </label>
              <label className="field wide">
                Location name (optional)
                <input
                  maxLength={160}
                  value={form.locationName}
                  onChange={(e) => field('locationName', e.target.value)}
                />
              </label>
              <details className="wide location-search-details" open={focusLocation}>
                <summary>Find a location</summary>
                <LocationSearch near={coordinates(trip.destination)} select={setPendingPlace} />
                {pendingPlace && (
                  <div className="location-confirm">
                    <strong>Use {pendingPlace.name}?</strong>
                    <p>{pendingPlace.address}</p>
                    <p>
                      {form.locationName || form.latitude || form.longitude
                        ? 'This replaces the current location name and coordinates when you save the activity.'
                        : 'Coordinates will be added when you save the activity.'}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setForm((old) => ({
                          ...old,
                          title: old.title || pendingPlace.name,
                          locationName: pendingPlace.name.slice(0, 160),
                          latitude: String(pendingPlace.latitude),
                          longitude: String(pendingPlace.longitude),
                        }));
                        setDirty(true);
                        setPendingPlace(null);
                      }}
                    >
                      Use this location
                    </Button>
                    <Button variant="ghost" onClick={() => setPendingPlace(null)}>
                      Keep current location
                    </Button>
                  </div>
                )}
              </details>
              <label className="field">
                Estimated cost (optional)
                <input
                  inputMode="decimal"
                  value={form.cost}
                  onChange={(e) => field('cost', e.target.value)}
                />
              </label>
              <label className="field">
                Cost currency
                <select value={form.currency} onChange={(e) => field('currency', e.target.value)}>
                  {currencyOptions.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <details className="wide coordinates">
                <summary>Coordinates (optional)</summary>
                <p className="field-hint">
                  Supply both coordinates. Manually entered coordinates are confirmed by you, not
                  provider-verified.
                </p>
                <div className="activity-form-grid">
                  <label className="field">
                    Latitude
                    <input
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      value={form.latitude}
                      onChange={(e) => field('latitude', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Longitude
                    <input
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      value={form.longitude}
                      onChange={(e) => field('longitude', e.target.value)}
                    />
                  </label>
                </div>
              </details>
              <label className="field wide">
                Activity notes (optional)
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => field('notes', e.target.value)}
                />
              </label>
            </div>
            <div className="activity-form-actions">
              <Button type="submit" loading={busy}>
                {activity ? 'Save activity' : 'Add to day'}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={leave}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
