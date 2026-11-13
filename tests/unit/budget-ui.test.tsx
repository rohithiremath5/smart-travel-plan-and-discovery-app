import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ExpenseEditor } from '@/features/budget/components/expense-editor';
import { EstimateEditor } from '@/features/budget/components/estimate-editor';
import { TripPrintSheet } from '@/features/organizer/pages/print-page';
import { defaultPrintOptions } from '@/features/organizer/domain/print';
import { emptyOrganizer } from '@/features/organizer/domain/organizer';
import { emptyItinerary } from '@/features/itinerary/domain/itinerary';
import { emptyBudget, expenseSchema } from '@/features/budget/domain/budget';
import { manualRate } from '@/features/budget/domain/currency';
import { organizerTripInput } from '../fixtures/organizer';
const trip = {
  ...organizerTripInput,
  id: crypto.randomUUID(),
  schemaVersion: 1 as const,
  revision: 1,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};
it('editing an existing expense preserves its legitimate date after trip dates move', async () => {
  const user = userEvent.setup(),
    budget = emptyBudget(trip),
    save = vi.fn();
  const initial = expenseSchema.parse({
    id: crypto.randomUUID(),
    amountMinor: 100,
    currency: budget.currency,
    category: 'Food',
    date: trip.startDate,
    description: 'Earlier meal',
    conversion: manualRate(budget.currency, budget.currency, '1', '2026-11-10'),
    convertedMinor: 100,
  });
  render(
    <ExpenseEditor
      trip={{ ...trip, startDate: '2030-03-21', endDate: '2030-03-23' }}
      budget={budget}
      initial={initial}
      onSave={save}
      onClose={vi.fn()}
    />,
  );
  await user.clear(screen.getByLabelText('Description (optional)'));
  await user.type(screen.getByLabelText('Description (optional)'), 'Updated description');
  await user.click(screen.getByRole('button', { name: 'Keep expense in draft' }));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ date: trip.startDate, description: 'Updated description' }),
  );
});
it('expense editor guards dirty Escape and rejects zero amounts without adding an expense', async () => {
  const save = vi.fn(),
    close = vi.fn(),
    user = userEvent.setup();
  render(<ExpenseEditor trip={trip} budget={emptyBudget(trip)} onSave={save} onClose={close} />);
  await user.type(screen.getByLabelText('Amount'), '0');
  await user.click(screen.getByRole('button', { name: 'Keep expense in draft' }));
  expect(screen.getByRole('alert')).toHaveTextContent('positive amount');
  expect(save).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  expect(screen.getByRole('dialog', { name: 'Discard unsaved expense?' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Keep editing' }));
  expect(close).not.toHaveBeenCalled();
});
it('expense editor exposes a rate-required state instead of inventing AED conversion', async () => {
  const user = userEvent.setup();
  render(
    <ExpenseEditor trip={trip} budget={emptyBudget(trip)} onSave={vi.fn()} onClose={vi.fn()} />,
  );
  await user.selectOptions(screen.getByLabelText('Expense currency'), 'AED');
  expect(screen.getByRole('button', { name: 'Keep expense in draft' })).toBeDisabled();
  expect(screen.getByText(/Reference rate required for AED/)).toBeVisible();
});
it('invalid estimate field text stays visible and prevents valid-change callbacks', () => {
  const budget = emptyBudget(trip),
    change = vi.fn(),
    validation = vi.fn();
  render(<EstimateEditor budget={budget} onChange={change} onValidation={validation} />);
  fireEvent.change(screen.getByLabelText('Distance (km)'), { target: { value: '-5' } });
  expect(screen.getByLabelText('Distance (km)')).toHaveValue('-5');
  expect(validation).toHaveBeenCalledWith(expect.stringContaining('nonnegative'));
  expect(change).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Distance (km)'), { target: { value: '100.25' } });
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({
      assumptions: expect.objectContaining({
        distanceMeters: 100250,
        distanceSource: 'Manual distance (edited)',
      }),
    }),
  );
});
it('print excludes budget/actual details initially and prints totals only with separate explicit choices', () => {
  const budget = emptyBudget(trip);
  budget.expenses = [
    expenseSchema.parse({
      id: crypto.randomUUID(),
      amountMinor: 100,
      currency: budget.currency,
      category: 'Food',
      description: 'PRIVATE PURCHASE DESCRIPTION',
      conversion: manualRate(budget.currency, budget.currency, '1', '2026-11-10'),
      convertedMinor: 100,
    }),
  ];
  const props = { trip, plan: emptyItinerary(trip), organizer: emptyOrganizer(trip.id), budget };
  const { rerender } = render(<TripPrintSheet {...props} options={defaultPrintOptions} />);
  expect(screen.queryByRole('region', { name: 'Actual expense totals' })).not.toBeInTheDocument();
  rerender(
    <TripPrintSheet
      {...props}
      options={{ ...defaultPrintOptions, budget: true, expenses: true }}
    />,
  );
  expect(screen.getByRole('region', { name: 'Actual expense totals' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Estimated budget breakdown' })).toBeVisible();
  expect(screen.queryByText('PRIVATE PURCHASE DESCRIPTION')).not.toBeInTheDocument();
  expect(screen.queryByText(budget.tripId)).not.toBeInTheDocument();
});
