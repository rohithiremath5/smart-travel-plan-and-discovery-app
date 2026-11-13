import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/features/trips/domain/trip';
import { expenseCategories, expenseSchema, type Budget, type Expense } from '../domain/budget';
import {
  amountMinor,
  amountText,
  budgetCurrencies,
  convertMinor,
  formatMoney,
  referenceRate,
  type Currency,
} from '../domain/currency';
export function ExpenseEditor({
  trip,
  budget,
  initial,
  onSave,
  onClose,
}: {
  trip: Trip;
  budget: Budget;
  initial?: Expense;
  onSave: (expense: Expense) => void;
  onClose: () => void;
}) {
  const trigger = useRef(document.activeElement as HTMLElement | null);
  const [amount, setAmount] = useState(
      initial ? amountText(initial.amountMinor, initial.currency) : '',
    ),
    [currency, setCurrency] = useState<Currency>(initial?.currency ?? budget.currency),
    [category, setCategory] = useState<Expense['category']>(initial?.category ?? 'Other'),
    [date, setDate] = useState(initial?.date ?? ''),
    [description, setDescription] = useState(initial?.description ?? ''),
    [error, setError] = useState(''),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [refreshRate, setRefreshRate] = useState(false);
  const rate =
    !refreshRate && initial?.currency === currency
      ? initial.conversion
      : referenceRate(currency, budget.currency, budget.manualRates);
  function save() {
    try {
      if (date && date !== initial?.date && (date < trip.startDate || date > trip.endDate))
        throw new Error('Expense date must be within the current trip dates, or left blank.');
      if (!rate)
        throw new Error(
          'Reference rate required. Cancel and add a manual rate in Currency references first.',
        );
      const minor = amountMinor(amount, currency);
      onSave(
        expenseSchema.parse({
          id: initial?.id ?? crypto.randomUUID(),
          amountMinor: minor,
          currency,
          category,
          ...(date ? { date } : {}),
          description,
          conversion: rate,
          convertedMinor: convertMinor(minor, rate),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'ZodError'
          ? e.message
          : 'Enter a positive amount, valid date and a short description.',
      );
    }
  }
  const close = () => (dirty ? setDiscard(true) : onClose());
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogTitle>{initial ? 'Edit expense' : 'Add expense'}</DialogTitle>
          <DialogDescription>
            Record actual spending only. Estimates are never recorded automatically. Amounts use a
            frozen, dated reference conversion.
          </DialogDescription>
          <form
            className="organizer-form"
            onChange={() => setDirty(true)}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Amount
              <input
                className="input"
                autoFocus
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Expense currency
              <select
                className="select"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as Currency);
                  setRefreshRate(true);
                }}
              >
                {budgetCurrencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Expense category
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['category'])}
              >
                {expenseCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Expense date (optional)
              <input
                className="input"
                type="date"
                min={initial?.date && initial.date < trip.startDate ? initial.date : trip.startDate}
                max={initial?.date && initial.date > trip.endDate ? initial.date : trip.endDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Description (optional)
              <input
                className="input"
                maxLength={160}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {rate ? (
              <p className="field-hint">
                {rate.source} · reference {rate.referenceDate}.{' '}
                {(() => {
                  try {
                    return `Converted amount: ${formatMoney(convertMinor(amountMinor(amount, currency), rate), budget.currency)}`;
                  } catch {
                    return '';
                  }
                })()}
              </p>
            ) : (
              <p className="field-error">
                Reference rate required for {currency} → {budget.currency}. No conversion is
                assumed.
              </p>
            )}
            {initial && (
              <label className="organizer-check">
                <input
                  type="checkbox"
                  checked={refreshRate}
                  onChange={(e) => setRefreshRate(e.target.checked)}
                />
                <span>
                  Explicitly replace this expense’s saved rate with the selected reference.
                </span>
              </label>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <div className="trip-actions">
              <Button type="submit" disabled={!rate}>
                Keep expense in draft
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
            </div>
            <p className="field-hint">
              Nothing is persisted until you choose Save budget and expenses on the main page.
            </p>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent>
          <DialogTitle>Discard unsaved expense?</DialogTitle>
          <DialogDescription>This expense draft has not been added.</DialogDescription>
          <div className="trip-actions">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={onClose}>
              Discard expense draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
