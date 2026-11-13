import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  checklistCategories,
  packingCategories,
  noteCategories,
  organizerItemSchema,
  organizerNoteSchema,
  type OrganizerItem,
  type OrganizerNote,
  type ListKind,
} from '../domain/organizer';
export type EditorValue =
  { kind: 'note'; value: OrganizerNote } | { kind: ListKind; value: OrganizerItem };
export function OrganizerEditor({
  kind,
  initial,
  onSave,
  onClose,
  onReview,
}: {
  kind: 'note' | ListKind;
  initial?: OrganizerNote | OrganizerItem;
  onSave: (value: EditorValue) => Promise<void>;
  onClose: () => void;
  onReview: () => Promise<string>;
}) {
  const trigger = useRef(document.activeElement as HTMLElement | null);
  const note = kind === 'note';
  const [label, setLabel] = useState(
    initial ? (note ? (initial as OrganizerNote).title : (initial as OrganizerItem).label) : '',
  );
  const [category, setCategory] = useState(
    initial?.category ?? (note ? 'General' : kind === 'packing' ? 'Clothing' : 'Before departure'),
  );
  const [text, setText] = useState(
    initial ? (note ? (initial as OrganizerNote).text : (initial as OrganizerItem).notes) : '',
  );
  const [quantity, setQuantity] = useState(
    String(initial && !note ? (initial as OrganizerItem).quantity : 1),
  );
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [latest, setLatest] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const title = `${initial ? 'Edit' : 'Add'} ${note ? 'trip note' : kind === 'packing' ? 'packing item' : 'checklist item'}`;
  async function save() {
    setBusy(true);
    setError('');
    try {
      const id = initial?.id ?? crypto.randomUUID();
      if (note) {
        const parsed = organizerNoteSchema.safeParse({ id, title: label, category, text });
        if (!parsed.success)
          throw new Error(
            'Use a valid category and a note of 1–4,000 characters; title is optional (80 characters maximum).',
          );
        await onSave({ kind: 'note', value: parsed.data });
      } else {
        const parsed = organizerItemSchema.safeParse({
          id,
          label,
          category,
          notes: text,
          quantity: Number(quantity),
          complete: initial ? (initial as OrganizerItem).complete : false,
        });
        if (!parsed.success)
          throw new Error(
            'Use a label, category and a whole quantity from 1–99. Item notes are limited to 300 characters.',
          );
        await onSave({ kind, value: parsed.data });
      }
    } catch (reason) {
      setError((reason as Error).message);
      setReviewed(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) {
            if (dirty) setDiscard(true);
            else onClose();
          }
        }}
      >
        <DialogContent
          className="organizer-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
            else document.getElementById('organizer-title')?.focus();
          }}
        >
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {note
              ? 'Private organizer notes, separate from itinerary day notes. Avoid passwords, card details and sensitive identity documents.'
              : 'Saved only for this trip. Categories and items are yours to adapt.'}
          </DialogDescription>
          <form
            className="organizer-form"
            onChange={() => {
              setDirty(true);
              setReviewed(false);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div>
              <label className="field-label" htmlFor="organizer-label">
                {note ? 'Title (optional)' : 'Item label'}
              </label>
              <input
                id="organizer-label"
                className="input"
                autoFocus
                maxLength={note ? 80 : 160}
                required={!note}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="organizer-category">
                Category
              </label>
              {note ? (
                <select
                  id="organizer-category"
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {noteCategories.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id="organizer-category"
                    className="input"
                    required
                    maxLength={60}
                    list="organizer-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                  <datalist id="organizer-categories">
                    {(kind === 'packing' ? packingCategories : checklistCategories).map((x) => (
                      <option key={x} value={x} />
                    ))}
                  </datalist>
                  <p className="field-hint">Choose a suggestion or write your own category.</p>
                </>
              )}
            </div>
            {!note && kind === 'packing' && (
              <div>
                <label className="field-label" htmlFor="organizer-quantity">
                  Quantity
                </label>
                <input
                  id="organizer-quantity"
                  className="input"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="organizer-text">
                {note ? 'Note' : 'Item notes (optional)'}
              </label>
              <textarea
                id="organizer-text"
                className="input"
                rows={note ? 6 : 3}
                required={note}
                maxLength={note ? 4000 : 300}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            {error && (
              <div className="field-error" role="alert">
                <p>{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void onReview()
                      .then((value) => {
                        setLatest(value);
                        setReviewed(true);
                      })
                      .catch((reason) => setError((reason as Error).message));
                  }}
                >
                  Review latest saved content
                </Button>
              </div>
            )}
            {latest !== null && (
              <div className="organizer-latest">
                <strong>Latest saved content</strong>
                <pre>{latest}</pre>
                <p>
                  Your draft is still in the fields above. Saving after review explicitly applies it
                  to the latest revision; unrelated items are preserved. A deleted item becomes a
                  new copy.
                </p>
              </div>
            )}
            <div className="trip-actions">
              <Button loading={busy} type="submit">
                {reviewed ? 'Save my draft after review' : note ? 'Save note' : 'Save item'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => (dirty ? setDiscard(true) : onClose())}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent>
          <DialogTitle>Discard unsaved organizer changes?</DialogTitle>
          <DialogDescription>
            Your saved content stays unchanged. The draft in this editor will be discarded.
          </DialogDescription>
          <div className="trip-actions">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={onClose}>
              Discard draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
