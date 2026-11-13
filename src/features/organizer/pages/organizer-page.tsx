import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Download,
  NotebookPen,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LocalStorageNote, TripError } from '@/features/trips/components/trip-shared';
import { formatDate } from '@/features/trips/domain/trip';
import { exportTrips } from '@/features/trips/domain/backup';
import { tripRepository } from '@/features/trips/services/trip-repository';
import { downloadBackup } from '@/features/trips/services/download-backup';
import { tripQueryKey } from '@/features/trips/hooks/use-trips';
import { organizerRepository, type OrganizerState } from '../services/organizer-repository';
import {
  moveItem,
  progress,
  type Organizer,
  type OrganizerItem,
  type OrganizerNote,
  type ListKind,
} from '../domain/organizer';
import { applyTemplate } from '../data/templates';
import { OrganizerEditor, type EditorValue } from '../components/organizer-editor';
import { OrganizerList } from '../components/organizer-list';
import { TemplatePicker } from '../components/template-picker';
const organizerKey = (id: string) => ['organizer', id] as const;
export function OrganizerPage() {
  const { tripId = '' } = useParams();
  const query = useQuery({
    queryKey: organizerKey(tripId),
    queryFn: () => organizerRepository.load(tripId),
    staleTime: 0,
  });
  if (query.isPending)
    return (
      <div className="container trips-page" role="status">
        Opening your organizer…
      </div>
    );
  if (query.isError)
    return (
      <div className="container trips-page">
        <h1>Trip organizer</h1>
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        <Link to="/trips">Back to My trips</Link>
      </div>
    );
  return (
    <OrganizerWorkspace
      key={tripId}
      state={query.data}
      reload={() => {
        void query.refetch();
      }}
    />
  );
}
function OrganizerWorkspace({ state, reload }: { state: OrganizerState; reload: () => void }) {
  const { trip, organizer } = state,
    client = useQueryClient();
  const confirmTrigger = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [templates, setTemplates] = useState(false);
  const [editor, setEditor] = useState<{
    kind: 'note' | ListKind;
    item?: OrganizerNote | OrganizerItem;
    base: OrganizerState;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    next: Organizer;
    base: OrganizerState;
  } | null>(null);
  const checklist = progress(organizer.checklist),
    packing = progress(organizer.packing);
  async function persist(next: Organizer, base = state) {
    setBusy(true);
    setError('');
    try {
      const saved = await organizerRepository.save(
        trip.id,
        next,
        base.organizer.revision,
        base.trip.revision,
      );
      client.setQueryData(organizerKey(trip.id), saved);
      await client.invalidateQueries({ queryKey: tripQueryKey });
      await client.invalidateQueries({ queryKey: ['itinerary'] });
      setMessage('Saved on this device.');
    } finally {
      setBusy(false);
    }
  }
  function perform(next: Organizer) {
    void persist(next).catch((reason) => setError((reason as Error).message));
  }
  function requestDelete(kind: 'notes' | ListKind, item: OrganizerNote | OrganizerItem) {
    confirmTrigger.current = document.activeElement as HTMLElement;
    setConfirm({
      title: `Delete ${kind === 'notes' ? 'this note' : 'this item'}?`,
      description:
        'This removes only the selected organizer record from this trip. Export a backup first if you want to keep it.',
      next: { ...organizer, [kind]: organizer[kind].filter((x) => x.id !== item.id) },
      base: state,
    });
  }
  const openItem = (kind: ListKind, item?: OrganizerItem) =>
    setEditor({ kind, ...(item ? { item } : {}), base: state });
  async function saveEditor(value: EditorValue) {
    if (!editor) return;
    const key = value.kind === 'note' ? 'notes' : value.kind,
      base = editor.base;
    const list = base.organizer[key],
      exists = list.some((x) => x.id === value.value.id);
    const item = editor.item && !exists ? { ...value.value, id: crypto.randomUUID() } : value.value;
    await persist(
      {
        ...base.organizer,
        [key]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item],
      },
      base,
    );
    setEditor(null);
  }
  async function reviewLatest() {
    if (!editor) return '';
    const latest = await organizerRepository.load(trip.id);
    const key = editor.kind === 'note' ? 'notes' : editor.kind;
    const record = latest.organizer[key].find((x) => x.id === editor.item?.id);
    setEditor({ ...editor, base: latest });
    return record
      ? JSON.stringify(record, (key, value) => (key === 'id' ? undefined : value), 2)
      : 'No saved item with this ID. Saving after review adds your draft as a new item; other content is preserved.';
  }
  return (
    <div className="container trips-page organizer-page">
      <Link className="text-link" to={`/trips/${trip.id}`}>
        <ArrowLeft aria-hidden="true" />
        Trip overview
      </Link>
      <div className="organizer-heading">
        <div>
          <Badge>Guest workspace · On this device</Badge>
          <p className="eyebrow">A LITTLE PREPARATION. MORE ROOM TO EXPLORE.</p>
          <h1 id="organizer-title" tabIndex={-1}>
            Your journey, gathered.
          </h1>
          <p className="organizer-destination">
            {trip.title} · {trip.destination.name}
          </p>
          <p>
            {formatDate(trip.startDate)} — {formatDate(trip.endDate)} · {trip.travelers}{' '}
            {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </p>
        </div>
        <NotebookPen className="organizer-heading-icon" aria-hidden="true" />
      </div>
      <nav className="trip-actions organizer-nav" aria-label="Trip workspace">
        <Link className="button button-secondary" to={`/trips/${trip.id}/budget`}>
          Budget &amp; weather
        </Link>
        <Button asChild variant="secondary">
          <Link to={`/trips/${trip.id}`}>Overview</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to={`/trips/${trip.id}/itinerary`}>Itinerary</Link>
        </Button>
        <Button asChild>
          <Link aria-current="page" to={`/trips/${trip.id}/organizer`}>
            Organizer
          </Link>
        </Button>
      </nav>
      <LocalStorageNote />
      <div className="organizer-stats" aria-label="Preparation progress">
        <div>
          <span>Travel checklist</span>
          <strong>
            {checklist.complete}
            <small> / {checklist.total}</small>
          </strong>
          <p>{checklist.remaining} still to do</p>
        </div>
        <div>
          <span>Packing</span>
          <strong>
            {packing.complete}
            <small> / {packing.total}</small>
          </strong>
          <p>{packing.remaining} still to pack</p>
        </div>
        <div>
          <span>Your reminders</span>
          <strong>{organizer.notes.length}</strong>
          <p>Notes, kept close</p>
        </div>
      </div>
      {checklist.remaining + packing.remaining > 0 && (
        <aside className="organizer-outstanding">
          <h2>A few things still to do</h2>
          <ul>
            {[
              ...organizer.checklist
                .filter((x) => !x.complete)
                .map((x) => ({ label: x.label, href: '#checklist-heading' })),
              ...organizer.packing
                .filter((x) => !x.complete)
                .map((x) => ({ label: x.label, href: '#packing-heading' })),
            ]
              .slice(0, 3)
              .map((x, index) => (
                <li key={index}>
                  <a href={x.href}>{x.label}</a>
                </li>
              ))}
          </ul>
          <p>{checklist.remaining + packing.remaining} items remaining across your lists.</p>
        </aside>
      )}
      <div className="organizer-toolbar">
        <Button variant="secondary" disabled={busy} onClick={() => setTemplates(true)}>
          Browse list templates
        </Button>
        <Button asChild variant="secondary">
          <Link to={`/trips/${trip.id}/print`}>
            <Printer aria-hidden="true" />
            Print summary
          </Link>
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void tripRepository
              .exportSnapshot([trip.id])
              .then((snapshot) => {
                downloadBackup(
                  exportTrips(
                    snapshot.trips,
                    snapshot.itineraries,
                    snapshot.organizers,
                    snapshot.budgets,
                  ),
                );
                setMessage(
                  'Complete backup download prepared. This file includes private organizer notes and is not encrypted.',
                );
              })
              .catch((reason) => setError((reason as Error).message))
              .finally(() => setBusy(false));
          }}
        >
          <Download aria-hidden="true" />
          Export this trip
        </Button>
      </div>
      {message && (
        <p className="trip-success" role="status">
          <Check aria-hidden="true" />
          {message}
        </p>
      )}
      {error && (
        <div role="alert" className="field-error">
          <p>{error}</p>
          <Button variant="secondary" onClick={reload}>
            Reload organizer
          </Button>
        </div>
      )}
      <section className="organizer-section" aria-labelledby="organizer-notes-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THINGS TO KEEP CLOSE</p>
            <h2 id="organizer-notes-heading">Trip notes</h2>
          </div>
          <Button
            variant="secondary"
            disabled={busy || organizer.notes.length >= 40}
            onClick={() => setEditor({ kind: 'note', base: state })}
          >
            <Plus aria-hidden="true" />
            Add trip note
          </Button>
        </div>
        <p className="field-hint">
          Personal reminders for the whole trip. Day-specific notes stay in your itinerary. Notes
          are excluded from printing unless you select them.
        </p>
        {!organizer.notes.length ? (
          <div className="organizer-empty">
            <h3>A place for the details that matter.</h3>
            <p>
              Add a reminder, arrival instructions or a preparation note. Avoid passwords, card
              details and sensitive documents.
            </p>
          </div>
        ) : (
          <div className="organizer-notes">
            {organizer.notes.map((note) => (
              <article className="organizer-note" key={note.id}>
                <span className="eyebrow">{note.category}</span>
                <h3>{note.title || 'Untitled note'}</h3>
                <p>{note.text}</p>
                <div className="trip-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Edit note ${note.title || 'Untitled note'}`}
                    onClick={() => setEditor({ kind: 'note', item: note, base: state })}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Delete note ${note.title || 'Untitled note'}`}
                    onClick={() => requestDelete('notes', note)}
                  >
                    <Trash2 aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {(['checklist', 'packing'] as const).map((kind) => (
        <OrganizerList
          key={kind}
          kind={kind}
          items={organizer[kind]}
          busy={busy}
          onEdit={(item) => openItem(kind, item)}
          onToggle={(item) =>
            perform({
              ...organizer,
              [kind]: organizer[kind].map((x) =>
                x.id === item.id ? { ...x, complete: !x.complete } : x,
              ),
            })
          }
          onMove={(item, direction) =>
            perform({ ...organizer, [kind]: moveItem(organizer[kind], item.id, direction) })
          }
          onDelete={(item) => requestDelete(kind, item)}
          onReset={() => {
            confirmTrigger.current = document.activeElement as HTMLElement;
            setConfirm({
              title: `Reset ${kind === 'packing' ? 'packed' : 'completed'} status?`,
              description:
                'Every item in this list becomes incomplete. Labels, quantities, notes and order stay unchanged.',
              next: {
                ...organizer,
                [kind]: organizer[kind].map((x) => ({ ...x, complete: false })),
              },
              base: state,
            });
          }}
        />
      ))}
      {editor && (
        <OrganizerEditor
          key={`${editor.kind}-${editor.item?.id ?? 'new'}`}
          kind={editor.kind}
          {...(editor.item ? { initial: editor.item } : {})}
          onSave={saveEditor}
          onClose={() => setEditor(null)}
          onReview={reviewLatest}
        />
      )}
      {templates && (
        <TemplatePicker
          organizer={organizer}
          onClose={() => setTemplates(false)}
          onApply={(items, kind) => persist(applyTemplate(organizer, kind, items))}
        />
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (confirmTrigger.current?.isConnected) confirmTrigger.current.focus();
            else document.getElementById('organizer-title')?.focus();
          }}
        >
          <DialogTitle>{confirm?.title ?? 'Confirm organizer change'}</DialogTitle>
          <DialogDescription>{confirm?.description}</DialogDescription>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <div className="trip-actions">
            <Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>
              Keep unchanged
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => {
                if (confirm)
                  void persist(confirm.next, confirm.base)
                    .then(() => setConfirm(null))
                    .catch((reason) => setError((reason as Error).message));
              }}
            >
              Confirm change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
