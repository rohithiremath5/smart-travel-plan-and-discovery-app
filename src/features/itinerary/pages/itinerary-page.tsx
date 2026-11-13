import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Clock3,
  Download,
  Leaf,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatBudget, formatDate } from '@/features/trips/domain/trip';
import { exportTrips } from '@/features/trips/domain/backup';
import { tripRepository } from '@/features/trips/services/trip-repository';
import { tripQueryKey } from '@/features/trips/hooks/use-trips';
import { LocalStorageNote, TripError } from '@/features/trips/components/trip-shared';
import { downloadBackup } from '@/features/trips/services/download-backup';
import { dayWarnings, type Activity } from '../domain/itinerary';
import { itineraryRepository, type ItineraryState } from '../services/itinerary-repository';
import { ActivityEditor } from '../components/activity-editor';
import { DayNotes } from '../components/day-notes';
import { MapPanel } from '@/features/mapping/components/map-panel';
import { coordinates } from '@/features/mapping/domain/map';
import { AiStudio } from '@/features/ai/components/ai-studio';

const itineraryKey = (id: string) => ['itinerary', id] as const;
export function ItineraryPage() {
  const { tripId = '' } = useParams();
  const query = useQuery({
    queryKey: itineraryKey(tripId),
    queryFn: () => itineraryRepository.load(tripId),
    staleTime: 0,
  });
  if (query.isPending)
    return (
      <div className="container trips-page" role="status">
        Opening your itinerary…
      </div>
    );
  if (query.isError)
    return (
      <div className="container trips-page">
        <h1>Your itinerary</h1>
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        <Link to="/trips">Back to My trips</Link>
      </div>
    );
  return <ItineraryWorkspace key={tripId} state={query.data} />;
}
function ItineraryWorkspace({ state }: { state: ItineraryState }) {
  const { trip, plan } = state;
  const client = useQueryClient();
  const navigate = useNavigate();
  const editorTrigger = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState(plan.days[0]!.date);
  const [editor, setEditor] = useState<{
    activity?: Activity;
    revision: number;
    focusLocation?: boolean;
  } | null>(null);
  const [view, setView] = useState<'itinerary' | 'map'>('itinerary');
  const [mapSelection, setMapSelection] = useState<{ day: string; id: string } | null>(null);
  const [remove, setRemove] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Saved on this device');
  const [notesDirty, setNotesDirty] = useState(false);
  const [pendingDay, setPendingDay] = useState('');
  const [pendingRoute, setPendingRoute] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const aiTrigger = useRef<HTMLElement | null>(null);
  const day = plan.days.find((day) => day.date === selected) ?? plan.days[0]!;
  const index = plan.days.indexOf(day);
  const count = plan.days.reduce((n, day) => n + day.activities.length, 0);
  const warnings = dayWarnings(day);
  const selectedActivity =
    mapSelection?.day === day.date &&
    day.activities.some((activity) => activity.id === mapSelection.id)
      ? mapSelection.id
      : null;
  const selectFromMap = useCallback(
    (id: string) => {
      setMapSelection({ day: day.date, id });
      setView('itinerary');
      requestAnimationFrame(() => {
        const target = document.getElementById(`activity-card-${id}`);
        target?.scrollIntoView({
          behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
          block: 'nearest',
        });
        target?.focus({ preventScroll: true });
      });
    },
    [day.date],
  );
  useEffect(() => {
    if (!notesDirty && !editor) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [notesDirty, editor]);
  useEffect(() => {
    if (!notesDirty) return;
    const guard = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      const link = (event.target as Element).closest('a[href]');
      if (!link) return;
      const url = new URL((link as HTMLAnchorElement).href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingRoute(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', guard, true);
    return () => document.removeEventListener('click', guard, true);
  }, [notesDirty]);
  function openEditor(activity?: Activity, focusLocation = false) {
    editorTrigger.current = document.activeElement as HTMLElement;
    setEditor(
      activity
        ? { activity, revision: plan.revision, focusLocation }
        : { revision: plan.revision, focusLocation },
    );
  }
  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => editorTrigger.current?.focus());
  }
  async function commit(action: Promise<ItineraryState>, notice = 'Saved on this device') {
    setBusy(true);
    setError('');
    setMessage('Saving on this device…');
    try {
      const next = await action;
      client.setQueryData(itineraryKey(trip.id), next);
      await client.invalidateQueries({ queryKey: tripQueryKey });
      setMessage(notice);
    } catch (error) {
      setMessage('Changes were not saved');
      setError((error as Error).message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  function run(action: Promise<ItineraryState>, notice?: string) {
    void commit(action, notice).catch(() => undefined);
  }
  async function backup() {
    try {
      const snapshot = await tripRepository.exportSnapshot([trip.id]);
      downloadBackup(
        exportTrips(snapshot.trips, snapshot.itineraries, snapshot.organizers, snapshot.budgets),
      );
      setMessage('Complete itinerary backup prepared; keep it private.');
    } catch (error) {
      setError((error as Error).message);
    }
  }
  return (
    <div className="container trips-page itinerary-page">
      <div className="itinerary-topline">
        <Link className="back-link" to={`/trips/${trip.id}`}>
          <ArrowLeft aria-hidden="true" />
          Trip overview
        </Link>
        <Badge tone="accent">Guest workspace · On this device</Badge>
      </div>
      <header className="itinerary-heading">
        <div>
          <p className="eyebrow">{trip.destination.name} / YOUR OWN WAY THERE</p>
          <h1>{trip.title}</h1>
          <p>
            <CalendarDays aria-hidden="true" />
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}{' '}
            <span>
              · {plan.days.length} days · {count} activities
            </span>
          </p>
        </div>
        <div className="trip-actions">
          <Button asChild variant="secondary">
            <Link to={`/trips/${trip.id}/organizer`}>Organizer</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/trips/${trip.id}/budget`}>Budget &amp; weather</Link>
          </Button>
          <Button
            variant="secondary"
            disabled={busy || notesDirty}
            onClick={() => {
              aiTrigger.current = document.activeElement as HTMLElement;
              setAiOpen(true);
            }}
          >
            <Sparkles aria-hidden="true" />
            Generate with AI
          </Button>
          <Button variant="secondary" asChild>
            <Link to={`/trips/${trip.id}/edit`}>
              <Pencil aria-hidden="true" />
              Trip details
            </Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void backup();
            }}
          >
            <Download aria-hidden="true" />
            Export this trip
          </Button>
        </div>
      </header>
      <div className="planner-save-strip">
        <span role="status">
          <Check aria-hidden="true" />
          {message}
        </span>
        <small>Destination-local times · Your manual plan</small>
      </div>
      {error && (
        <div className="wizard-error-summary" role="alert">
          <p>{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              void client.invalidateQueries({ queryKey: itineraryKey(trip.id) });
            }}
          >
            Reload latest plan
          </Button>
          <p className="field-hint">
            Copy unsaved notes before reloading. Existing forms stay open.
          </p>
        </div>
      )}
      <div className="planner-view-toggle" aria-label="Planner view">
        <Button
          variant={view === 'itinerary' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'itinerary'}
          onClick={() => setView('itinerary')}
        >
          Itinerary
        </Button>
        <Button
          variant={view === 'map' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'map'}
          onClick={() => setView('map')}
        >
          Map &amp; routes
        </Button>
      </div>
      <div className={`planner-layout planner-with-map view-${view}`}>
        <nav className="day-rail" aria-label="Itinerary days">
          <p className="eyebrow">THE JOURNEY</p>
          <ol>
            {plan.days.map((item, i) => (
              <li key={item.date}>
                <button
                  type="button"
                  aria-current={item.date === day.date ? 'date' : undefined}
                  onClick={() => {
                    if (item.date === day.date) return;
                    if (notesDirty) setPendingDay(item.date);
                    else setSelected(item.date);
                  }}
                >
                  <span className="day-number">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <strong>Day {i + 1}</strong>
                    <small>{formatDate(item.date)}</small>
                    <small>
                      {item.activities.length}{' '}
                      {item.activities.length === 1 ? 'activity' : 'activities'}
                      {item.notes ? ' · Notes' : ''}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="day-rail-note">
            <Leaf aria-hidden="true" />
            <p>
              A little structure.
              <br />
              Room for serendipity.
            </p>
          </div>
        </nav>
        <section className="day-workspace" aria-labelledby="selected-day-title">
          <header className="selected-day-heading">
            <div>
              <p className="eyebrow">{formatDate(day.date)}</p>
              <h2 id="selected-day-title">
                Day {index + 1}
                <span>Make it a good one.</span>
              </h2>
            </div>
            <Button disabled={busy} onClick={() => openEditor()}>
              <Plus aria-hidden="true" />
              Add activity
            </Button>
          </header>
          <p className="timeline-intro">Choose the moments. Leave room between them.</p>
          {warnings.length > 0 && (
            <aside className="schedule-warnings" aria-label="Schedule reminders">
              <strong>A little timing check</strong>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <p>These are reminders. Venue hours and travel times are not verified.</p>
            </aside>
          )}
          {day.activities.length ? (
            <>
              <div className="timeline-toolbar">
                <span>{day.activities.length} planned moments</span>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      itineraryRepository.sortDay(trip.id, day.date, plan.revision),
                      'Sorted by start time; saved on this device',
                    )
                  }
                >
                  Sort by time
                </Button>
              </div>
              <ol className="activity-timeline">
                {day.activities.map((activity, i) => (
                  <li className="activity-row" key={activity.id}>
                    <div className="activity-time">
                      <Clock3 aria-hidden="true" />
                      <strong>{activity.startTime ?? 'Any time'}</strong>
                      <small>{activity.durationMinutes} min</small>
                    </div>
                    <article
                      className="activity-card"
                      id={`activity-card-${activity.id}`}
                      tabIndex={-1}
                      data-selected={selectedActivity === activity.id}
                      aria-labelledby={`activity-${activity.id}`}
                    >
                      <div className="activity-card-top">
                        <Badge>{activity.category}</Badge>
                        <span className="activity-position">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <h3 id={`activity-${activity.id}`}>{activity.title}</h3>
                      {activity.description && <p>{activity.description}</p>}
                      {activity.locationName && (
                        <p className="activity-location">
                          <MapPin aria-hidden="true" />
                          {activity.locationName}
                        </p>
                      )}
                      <Button
                        className="activity-map-action"
                        variant="ghost"
                        aria-pressed={selectedActivity === activity.id}
                        onClick={() => {
                          if (coordinates(activity)) {
                            setMapSelection({ day: day.date, id: activity.id });
                            setView('map');
                          } else openEditor(activity, true);
                        }}
                      >
                        <MapPin aria-hidden="true" />
                        {coordinates(activity) ? 'Show on map' : 'Find a location'}
                      </Button>
                      {!coordinates(activity) && (
                        <p className="field-hint">
                          Location unavailable · add coordinates to map this activity.
                        </p>
                      )}
                      {activity.costMinor !== undefined && (
                        <p className="activity-cost">
                          Estimated ·{' '}
                          {formatBudget({
                            currency: activity.currency,
                            budgetMinor: activity.costMinor,
                          })}
                        </p>
                      )}
                      {activity.notes && <p className="activity-note">{activity.notes}</p>}
                      <div className="activity-card-actions">
                        <div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${activity.title} up`}
                            disabled={busy || i === 0}
                            onClick={() =>
                              run(
                                itineraryRepository.moveActivity(
                                  trip.id,
                                  activity.id,
                                  -1,
                                  plan.revision,
                                ),
                                `${activity.title} moved up; saved on this device`,
                              )
                            }
                          >
                            <ArrowUp aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${activity.title} down`}
                            disabled={busy || i === day.activities.length - 1}
                            onClick={() =>
                              run(
                                itineraryRepository.moveActivity(
                                  trip.id,
                                  activity.id,
                                  1,
                                  plan.revision,
                                ),
                                `${activity.title} moved down; saved on this device`,
                              )
                            }
                          >
                            <ArrowDown aria-hidden="true" />
                          </Button>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            aria-label={`Edit ${activity.title}`}
                            disabled={busy}
                            onClick={() => openEditor(activity)}
                          >
                            <Pencil aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${activity.title}`}
                            disabled={busy}
                            onClick={() => setRemove(activity)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
              <p className="field-hint">
                Use the arrow buttons to set your own order. Start times stay unchanged.
              </p>
            </>
          ) : (
            <div className="empty-day">
              <div className="empty-day-symbol">
                <Leaf aria-hidden="true" />
              </div>
              <p className="eyebrow">A DAY FULL OF POSSIBILITY</p>
              <h3>Leave a little room for wonder.</h3>
              <p>
                A slow breakfast. A winding street. That place you’ve always wanted to see. Start
                with one thing.
              </p>
              <Button variant="secondary" disabled={busy} onClick={() => openEditor()}>
                <Plus aria-hidden="true" />
                Plan your first activity
              </Button>
              <small>No activities added to this day yet.</small>
            </div>
          )}
          <DayNotes
            key={day.date}
            day={day}
            revision={plan.revision}
            onDirty={setNotesDirty}
            save={(notes, revision) =>
              commit(itineraryRepository.saveNotes(trip.id, day.date, notes, revision))
            }
          />
        </section>
        <MapPanel
          trip={trip}
          day={day}
          selected={selectedActivity}
          select={selectFromMap}
          edit={(id) => {
            const activity = day.activities.find((value) => value.id === id);
            if (activity) openEditor(activity, true);
          }}
        />
      </div>
      <LocalStorageNote />
      {aiOpen && (
        <AiStudio
          state={state}
          selectedDate={day.date}
          close={() => {
            setAiOpen(false);
            requestAnimationFrame(() => aiTrigger.current?.focus());
          }}
          apply={(items, revision, tripRevision) =>
            commit(
              itineraryRepository.applyActivities(trip.id, items, revision, tripRevision),
              'Selected AI suggestions saved on this device',
            )
          }
        />
      )}
      {editor && (
        <ActivityEditor
          trip={trip}
          plan={plan}
          date={day.date}
          activity={editor.activity}
          focusLocation={editor.focusLocation ?? false}
          close={closeEditor}
          save={(input) =>
            commit(
              itineraryRepository.saveActivity(
                trip.id,
                input,
                editor.revision,
                editor.activity?.id,
              ),
            )
          }
        />
      )}
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open && !busy) setRemove(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Remove this activity?</DialogTitle>
          <DialogDescription>
            “{remove?.title}” will be removed from this trip on this device. This cannot be undone
            here.
          </DialogDescription>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="trip-actions">
            <Button variant="secondary" onClick={() => setRemove(null)} disabled={busy}>
              Keep activity
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => {
                if (remove)
                  void commit(itineraryRepository.deleteActivity(trip.id, remove.id, plan.revision))
                    .then(() => setRemove(null))
                    .catch(() => undefined);
              }}
            >
              Remove activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pendingDay || !!pendingRoute}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDay('');
            setPendingRoute('');
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Keep your day notes?</DialogTitle>
          <DialogDescription>
            Your notes have unsaved changes. Stay on this day to save them, or discard the draft.
          </DialogDescription>
          <div className="trip-actions">
            <Button
              onClick={() => {
                setPendingDay('');
                setPendingRoute('');
              }}
            >
              Stay and save notes
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingRoute) {
                  void navigate(pendingRoute);
                  setPendingRoute('');
                } else setSelected(pendingDay);
                setPendingDay('');
                setNotesDirty(false);
              }}
            >
              Discard notes draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
