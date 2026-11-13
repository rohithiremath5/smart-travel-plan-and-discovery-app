import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripError } from '@/features/trips/components/trip-shared';
import { tripRepository } from '@/features/trips/services/trip-repository';
import { formatDate, type Trip } from '@/features/trips/domain/trip';
import type { Itinerary } from '@/features/itinerary/domain/itinerary';
import { emptyOrganizer, type Organizer } from '../domain/organizer';
import { defaultPrintOptions, type PrintOptions } from '../domain/print';
import { emptyBudget, type Budget } from '@/features/budget/domain/budget';
import { BudgetSummary } from '@/features/budget/components/budget-summary';
export function PrintPage() {
  const { tripId = '' } = useParams();
  const query = useQuery({
    queryKey: ['trip-print', tripId],
    queryFn: () => tripRepository.exportSnapshot([tripId]),
    staleTime: 0,
  });
  if (query.isPending)
    return (
      <div className="container trips-page" role="status">
        Preparing your summary…
      </div>
    );
  if (query.isError)
    return (
      <div className="container trips-page">
        <h1>Trip summary</h1>
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </div>
    );
  const trip = query.data.trips[0],
    plan = query.data.itineraries[0];
  if (!trip || !plan)
    return (
      <div className="container trips-page">
        <h1>Trip not found on this device</h1>
        <Link to="/trips">Back to My trips</Link>
      </div>
    );
  return (
    <PrintWorkspace
      key={tripId}
      trip={trip}
      plan={plan}
      organizer={query.data.organizers?.[0] ?? emptyOrganizer(tripId)}
      budget={query.data.budgets?.[0] ?? emptyBudget(trip)}
    />
  );
}
function PrintWorkspace({
  trip,
  plan,
  organizer,
  budget,
}: {
  trip: Trip;
  plan: Itinerary;
  organizer: Organizer;
  budget: Budget;
}) {
  const [options, setOptions] = useState<PrintOptions>({ ...defaultPrintOptions, noteIds: [] });
  const choices: { key: Exclude<keyof PrintOptions, 'noteIds'>; label: string }[] = [
    { key: 'activities', label: 'Itinerary activities' },
    { key: 'checklist', label: 'Travel checklist' },
    { key: 'packing', label: 'Packing list' },
    { key: 'dayNotes', label: 'Include private day notes' },
    { key: 'activityDetails', label: 'Include activity descriptions and private notes' },
    { key: 'itemNotes', label: 'Include private checklist and packing item notes' },
    { key: 'budget', label: 'Include estimated budget breakdown' },
    { key: 'expenses', label: 'Include actual expense totals (no descriptions)' },
  ];
  return (
    <div className="container trips-page trip-print-page">
      <div className="no-print">
        <Link className="text-link" to={`/trips/${trip.id}/organizer`}>
          <ArrowLeft aria-hidden="true" />
          Back to organizer
        </Link>
        <div className="section-heading">
          <div>
            <p className="eyebrow">TAKE A LITTLE OF THE JOURNEY WITH YOU</p>
            <h1>Your travel summary</h1>
          </div>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print this summary
          </Button>
        </div>
        <p>
          Choose what to include. Private notes are excluded by default. Your browser can print or
          save to PDF; keep the resulting personal document private.
        </p>
        <fieldset className="print-options">
          <legend>Summary contents</legend>
          {choices.map(({ key, label }) => (
            <label className="organizer-check" key={key}>
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {!!organizer.notes.length && (
          <fieldset className="print-options">
            <legend>Select organizer notes to include</legend>
            {organizer.notes.map((note) => (
              <label className="organizer-check" key={note.id}>
                <input
                  type="checkbox"
                  checked={options.noteIds.includes(note.id)}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      noteIds: e.target.checked
                        ? [...options.noteIds, note.id]
                        : options.noteIds.filter((id) => id !== note.id),
                    })
                  }
                />
                <span>
                  {note.title || 'Untitled note'} · {note.category}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <p className="field-hint">
          Preview below includes only this trip. Review your selections before printing.
        </p>
      </div>
      <TripPrintSheet
        trip={trip}
        plan={plan}
        organizer={organizer}
        budget={budget}
        options={options}
      />
    </div>
  );
}
export function TripPrintSheet({
  trip,
  plan,
  organizer,
  options,
  budget,
}: {
  trip: Trip;
  plan: Itinerary;
  organizer: Organizer;
  options: PrintOptions;
  budget?: Budget;
}) {
  return (
    <article className="print-sheet" aria-label="Selected trip print summary">
      <p className="eyebrow">SMART TRAVEL · YOUR JOURNEY</p>
      <h1>{trip.title}</h1>
      <p className="print-destination">
        {trip.destination.name}
        {trip.destination.country ? `, ${trip.destination.country}` : ''}
      </p>
      <p>
        {formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {trip.travelers}{' '}
        {trip.travelers === 1 ? 'traveler' : 'travelers'}
      </p>
      {options.activities && (
        <section>
          <h2>Your itinerary</h2>
          {plan.days.map((day, index) => (
            <section className="print-day" key={day.date}>
              <h3>
                Day {index + 1} · {formatDate(day.date)}
              </h3>
              {!day.activities.length && <p>Room for something unplanned.</p>}
              <ol>
                {day.activities.map((activity) => (
                  <li key={activity.id}>
                    <strong>
                      {activity.startTime ? `${activity.startTime} · ` : ''}
                      {activity.title}
                    </strong>
                    <span>
                      {' '}
                      · {activity.durationMinutes} min
                      {activity.locationName ? ` · ${activity.locationName}` : ''}
                    </span>
                    {options.activityDetails && (
                      <>
                        {activity.description && <p>{activity.description}</p>}
                        {activity.notes && <p>{activity.notes}</p>}
                      </>
                    )}
                  </li>
                ))}
              </ol>
              {options.dayNotes && day.notes && <p className="print-private-text">{day.notes}</p>}
            </section>
          ))}
        </section>
      )}
      {(['checklist', 'packing'] as const).map(
        (kind) =>
          options[kind] && (
            <section key={kind}>
              <h2>{kind === 'packing' ? 'Packing list' : 'Travel checklist'}</h2>
              {!organizer[kind].length && <p>No items added.</p>}
              {[...new Set(organizer[kind].map((x) => x.category))].map((category) => (
                <div key={category}>
                  <h3>{category}</h3>
                  <ul className="print-checklist">
                    {organizer[kind]
                      .filter((x) => x.category === category)
                      .map((item) => (
                        <li key={item.id}>
                          <span aria-label={item.complete ? 'Complete' : 'Incomplete'}>
                            {item.complete ? '✓' : '□'}
                          </span>{' '}
                          {item.label}
                          {kind === 'packing' ? ` × ${item.quantity}` : ''}
                          {options.itemNotes && item.notes && <p>{item.notes}</p>}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          ),
      )}
      {organizer.notes.some((x) => options.noteIds.includes(x.id)) && (
        <section>
          <h2>Selected trip notes</h2>
          {organizer.notes
            .filter((x) => options.noteIds.includes(x.id))
            .map((note) => (
              <div className="print-note" key={note.id}>
                <h3>{note.title || note.category}</h3>
                <p>{note.text}</p>
              </div>
            ))}
        </section>
      )}
      <p className="print-footnote">
        Budget references are static estimates, not verified prices or current exchange rates.
      </p>
      {options.budget && <BudgetSummary budget={budget ?? emptyBudget(trip)} />}
      {options.expenses && <BudgetSummary budget={budget ?? emptyBudget(trip)} actual />}
      <p className="print-footnote">
        Prepared from your device. A personal copy, not a live update or cloud backup. Times and
        arrangements are your own plan; confirm details before travelling.
      </p>
    </article>
  );
}
