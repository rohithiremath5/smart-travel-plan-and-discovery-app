import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Budget } from '../domain/budget';
import { amountMinor, formatMoney } from '../domain/currency';
export function CustomEstimates({
  budget,
  onChange,
  confirm,
}: {
  budget: Budget;
  onChange: (value: Budget) => void;
  confirm: (title: string, text: string, apply: () => void) => void;
}) {
  const [label, setLabel] = useState(''),
    [amount, setAmount] = useState(''),
    [error, setError] = useState('');
  return (
    <>
      <h3>Custom estimates</h3>
      <p className="field-hint">
        Only add costs not already covered above. These are not actual expenses.
      </p>
      <div className="budget-custom-form">
        <label>
          Custom estimate label
          <input
            className="input"
            maxLength={100}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <label>
          Custom estimate amount
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <Button
          variant="secondary"
          disabled={budget.custom.length >= 50}
          onClick={() => {
            try {
              if (!label.trim()) throw new Error('Enter an estimate label.');
              onChange({
                ...budget,
                custom: [
                  ...budget.custom,
                  {
                    id: crypto.randomUUID(),
                    label: label.trim(),
                    amountMinor: amountMinor(amount, budget.currency),
                  },
                ],
              });
              setLabel('');
              setAmount('');
              setError('');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Add custom estimate
        </Button>
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <ul className="budget-expenses">
        {budget.custom.map((x) => (
          <li key={x.id}>
            <span>
              {x.label} · {formatMoney(x.amountMinor, budget.currency)}
            </span>
            <Button
              variant="ghost"
              aria-label={`Delete estimate ${x.label}`}
              onClick={() =>
                confirm(
                  'Remove custom estimate?',
                  'Remove only this custom estimate from the draft. Save to persist.',
                  () => onChange({ ...budget, custom: budget.custom.filter((i) => i.id !== x.id) }),
                )
              }
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
