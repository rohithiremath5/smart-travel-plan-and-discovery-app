import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { progress, type OrganizerItem, type ListKind } from '../domain/organizer';
export function OrganizerList({
  kind,
  items,
  busy,
  onEdit,
  onToggle,
  onDelete,
  onMove,
  onReset,
}: {
  kind: ListKind;
  items: OrganizerItem[];
  busy: boolean;
  onEdit: (item?: OrganizerItem) => void;
  onToggle: (item: OrganizerItem) => void;
  onDelete: (item: OrganizerItem) => void;
  onMove: (item: OrganizerItem, direction: -1 | 1) => void;
  onReset: () => void;
}) {
  const title = kind === 'packing' ? 'Packing list' : 'Travel checklist',
    count = progress(items);
  const categories = [...new Set(items.map((x) => x.category))];
  return (
    <section className="organizer-section" aria-labelledby={`${kind}-heading`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {kind === 'packing' ? 'A LITTLE LESS TO CARRY IN YOUR HEAD' : 'BEFORE YOU GO'}
          </p>
          <h2 id={`${kind}-heading`}>{title}</h2>
        </div>
        <Button variant="secondary" disabled={busy || items.length >= 200} onClick={() => onEdit()}>
          <Plus aria-hidden="true" />
          Add {kind === 'packing' ? 'packing' : 'checklist'} item
        </Button>
      </div>
      <div className="organizer-progress">
        <progress
          max={count.total || 1}
          value={count.complete}
          aria-label={`${title} completion`}
        />
        <span>
          {count.complete} of {count.total} {kind === 'packing' ? 'packed' : 'complete'} ·{' '}
          {count.remaining} remaining
        </span>
      </div>
      {!items.length && (
        <div className="organizer-empty">
          <h3>A fresh list, ready for you.</h3>
          <p>Add your own items or preview a template. Nothing is added automatically.</p>
        </div>
      )}
      {categories.map((category) => (
        <div className="organizer-category" key={category}>
          <h3>{category}</h3>
          <ul>
            {items
              .filter((x) => x.category === category)
              .map((item, index, group) => (
                <li
                  className={`organizer-item ${item.complete ? 'is-complete' : ''}`}
                  key={item.id}
                >
                  <label className="organizer-check">
                    <input
                      type="checkbox"
                      aria-label={`${kind === 'packing' ? 'Packed' : 'Complete'}: ${item.label}`}
                      checked={item.complete}
                      disabled={busy}
                      onChange={() => onToggle(item)}
                    />
                    <span>
                      <strong>{item.label}</strong>
                      {kind === 'packing' && <small>Quantity {item.quantity}</small>}
                      {item.notes && <small className="organizer-item-note">{item.notes}</small>}
                    </span>
                  </label>
                  <div className="organizer-item-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || index === 0}
                      aria-label={`Move ${item.label} up`}
                      onClick={() => onMove(item, -1)}
                    >
                      <ArrowUp aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || index === group.length - 1}
                      aria-label={`Move ${item.label} down`}
                      onClick={() => onMove(item, 1)}
                    >
                      <ArrowDown aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Edit ${item.label}`}
                      onClick={() => onEdit(item)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Delete ${item.label}`}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {!!count.complete && (
        <Button variant="ghost" disabled={busy} onClick={onReset}>
          Reset {kind === 'packing' ? 'packed' : 'completed'} status
        </Button>
      )}
    </section>
  );
}
