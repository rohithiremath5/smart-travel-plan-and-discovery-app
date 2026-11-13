import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { organizerTemplates, templateItems, type OrganizerTemplate } from '../data/templates';
import { itemIdentity, type ListKind, type Organizer } from '../domain/organizer';
export function TemplatePicker({
  organizer,
  onApply,
  onClose,
}: {
  organizer: Organizer;
  onApply: (items: { label: string; category: string }[], kind: ListKind) => Promise<void>;
  onClose: () => void;
}) {
  const trigger = useRef(document.activeElement as HTMLElement | null);
  const [template, setTemplate] = useState<OrganizerTemplate>(organizerTemplates[0]),
    [kind, setKind] = useState<ListKind>('checklist'),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const existing = new Set(organizer[kind].map((x) => itemIdentity(x.label))),
    items = templateItems(template, kind);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="organizer-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus();
        }}
      >
        <DialogTitle>Make this list your own</DialogTitle>
        <DialogDescription>
          Generic starting points, not destination-specific advice. Preview and select items;
          existing lists and completed items stay unchanged.
        </DialogDescription>
        <label className="field-label" htmlFor="template-name">
          Template
        </label>
        <select
          id="template-name"
          className="input"
          value={template.id}
          onChange={(e) => {
            setTemplate(organizerTemplates.find((x) => x.id === e.target.value)!);
            setSelected([]);
          }}
        >
          {organizerTemplates.map((x) => (
            <option value={x.id} key={x.id}>
              {x.title}
            </option>
          ))}
        </select>
        <p>{template.description}</p>
        <label className="field-label" htmlFor="template-list">
          Add to
        </label>
        <select
          id="template-list"
          className="input"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as ListKind);
            setSelected([]);
          }}
        >
          <option value="checklist">Travel checklist</option>
          <option value="packing">Packing list</option>
        </select>
        <div className="template-items">
          {items.map((item) => (
            <label className="organizer-check" key={item.label}>
              <input
                type="checkbox"
                disabled={existing.has(itemIdentity(item.label)) || busy}
                checked={selected.includes(item.label)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, item.label]
                      : selected.filter((x) => x !== item.label),
                  )
                }
              />
              <span>
                {item.label}
                {existing.has(itemIdentity(item.label)) && <small>Already on your list</small>}
              </span>
            </label>
          ))}
        </div>
        <p className="field-hint">
          {selected.length} selected. Nothing is saved until you add these items.
        </p>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="trip-actions">
          <Button
            disabled={!selected.length}
            loading={busy}
            onClick={() => {
              setBusy(true);
              void onApply(
                items.filter((x) => selected.includes(x.label)),
                kind,
              )
                .then(onClose)
                .catch((reason) => setError((reason as Error).message))
                .finally(() => setBusy(false));
            }}
          >
            Add selected items
          </Button>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
