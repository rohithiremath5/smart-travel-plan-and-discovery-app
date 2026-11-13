import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { TripPrintSheet } from '@/features/organizer/pages/print-page';
import { defaultPrintOptions } from '@/features/organizer/domain/print';
import { OrganizerEditor } from '@/features/organizer/components/organizer-editor';
import { TemplatePicker } from '@/features/organizer/components/template-picker';
import { emptyOrganizer } from '@/features/organizer/domain/organizer';
import { emptyItinerary } from '@/features/itinerary/domain/itinerary';
import { organizerTripInput, fixtureNote, fixtureItem } from '../fixtures/organizer';
const trip = {
  ...organizerTripInput,
  id: crypto.randomUUID(),
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};
it('print output defaults to no private organizer, day, activity or item notes; explicit selection is selective', () => {
  const note = fixtureNote('PRIVATE ORGANIZER TEXT'),
    other = { ...fixtureNote('UNSELECTED PRIVATE TEXT'), title: 'Other note' };
  const organizer = {
    ...emptyOrganizer(trip.id),
    notes: [note, other],
    packing: [{ ...fixtureItem(), notes: 'PRIVATE ITEM TEXT' }],
  };
  const plan = emptyItinerary(trip);
  plan.days[0]!.notes = 'PRIVATE DAY TEXT';
  plan.days[0]!.activities.push({
    id: crypto.randomUUID(),
    date: trip.startDate,
    title: 'Public activity title',
    description: 'PRIVATE ACTIVITY DESCRIPTION',
    notes: 'PRIVATE ACTIVITY NOTE',
    durationMinutes: 60,
    category: 'Culture',
    locationName: 'Synthetic place',
    currency: 'USD',
  });
  const { rerender } = render(
    <TripPrintSheet trip={trip} plan={plan} organizer={organizer} options={defaultPrintOptions} />,
  );
  expect(screen.queryByText(/PRIVATE/)).not.toBeInTheDocument();
  expect(screen.getByText(trip.title)).toBeVisible();
  expect(screen.getByText(/Phone charger/)).toBeVisible();
  rerender(
    <TripPrintSheet
      trip={trip}
      plan={plan}
      organizer={organizer}
      options={{ ...defaultPrintOptions, noteIds: [note.id] }}
    />,
  );
  expect(screen.getByText('PRIVATE ORGANIZER TEXT')).toBeVisible();
  expect(screen.queryByText('UNSELECTED PRIVATE TEXT')).not.toBeInTheDocument();
  expect(screen.queryByText('PRIVATE DAY TEXT')).not.toBeInTheDocument();
  expect(screen.queryByText('PRIVATE ACTIVITY DESCRIPTION')).not.toBeInTheDocument();
  expect(screen.queryByText('PRIVATE ACTIVITY NOTE')).not.toBeInTheDocument();
});
it('renders malicious-looking note content as plain text without active markup or internal IDs', () => {
  const note = fixtureNote('<img src=x onerror=alert(1)><script>private()</script>');
  const { container } = render(
    <TripPrintSheet
      trip={trip}
      plan={emptyItinerary(trip)}
      organizer={{ ...emptyOrganizer(trip.id), notes: [note] }}
      options={{ ...defaultPrintOptions, noteIds: [note.id] }}
    />,
  );
  expect(screen.getByText(note.text)).toBeVisible();
  expect(container.querySelector('script, img')).toBeNull();
  expect(container.textContent).not.toContain(note.id);
  expect(container.textContent).not.toContain(trip.id);
});
it('template preview selects explicitly, disables duplicates and never applies on open/cancel', async () => {
  const user = userEvent.setup(),
    apply = vi.fn().mockResolvedValue(undefined),
    close = vi.fn();
  render(<TemplatePicker organizer={emptyOrganizer(trip.id)} onApply={apply} onClose={close} />);
  expect(apply).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Add selected items' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'Review your reservations' }));
  await user.click(screen.getByRole('button', { name: 'Add selected items' }));
  await waitFor(() =>
    expect(apply).toHaveBeenCalledWith(
      [{ label: 'Review your reservations', category: 'Before departure' }],
      'checklist',
    ),
  );
});
it('failed/conflicting note saves keep the draft and require explicit reviewed save', async () => {
  const user = userEvent.setup(),
    save = vi
      .fn()
      .mockRejectedValueOnce(new Error('Changed in another tab. Draft kept.'))
      .mockResolvedValueOnce(undefined),
    review = vi.fn().mockResolvedValue('Latest saved note');
  render(<OrganizerEditor kind="note" onSave={save} onClose={vi.fn()} onReview={review} />);
  await user.type(screen.getByLabelText('Title (optional)'), 'A reminder');
  await user.type(screen.getByLabelText('Note'), 'Keep this draft');
  await user.click(screen.getByRole('button', { name: 'Save note' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('another tab');
  expect(screen.getByLabelText('Note')).toHaveValue('Keep this draft');
  await user.click(screen.getByRole('button', { name: 'Review latest saved content' }));
  expect(await screen.findByText('Latest saved note')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Save my draft after review' }));
  expect(save).toHaveBeenCalledTimes(2);
});
it('Escape on a dirty editor opens a safe discard choice without closing the draft', async () => {
  const user = userEvent.setup(),
    close = vi.fn();
  render(<OrganizerEditor kind="packing" onSave={vi.fn()} onClose={close} onReview={vi.fn()} />);
  await user.type(screen.getByLabelText('Item label'), 'Scarf');
  await user.keyboard('{Escape}');
  const dialog = screen.getByRole('dialog', { name: 'Discard unsaved organizer changes?' });
  await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Item label')).toHaveValue('Scarf');
});
