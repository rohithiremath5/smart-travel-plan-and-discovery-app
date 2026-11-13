import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Budget } from '../domain/budget';
import {
  budgetCurrencies,
  amountMinor,
  convertMinor,
  formatMoney,
  manualRate,
  referenceRate,
  rateSourceUrl,
  type Currency,
} from '../domain/currency';
export function CurrencyPanel({
  budget,
  onChange,
}: {
  budget: Budget;
  onChange: (value: Budget) => void;
}) {
  const [from, setFrom] = useState<Currency>('USD'),
    [amount, setAmount] = useState('1'),
    [manual, setManual] = useState(''),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [error, setError] = useState('');
  const rate = referenceRate(from, budget.currency, budget.manualRates);
  let converted: string;
  try {
    converted = rate
      ? formatMoney(convertMinor(amountMinor(amount, from), rate), budget.currency)
      : 'Reference rate required';
  } catch {
    converted = 'Enter a valid amount.';
  }
  return (
    <section className="budget-section" aria-labelledby="currency-title">
      <p className="eyebrow">A REFERENCE, NOT A MARKET QUOTE</p>
      <h2 id="currency-title">Currency references</h2>
      <p>
        Static reference — not a live exchange rate.{' '}
        <a href={rateSourceUrl} target="_blank" rel="noreferrer">
          ECB
        </a>{' '}
        · 10 November 2026 · EUR base: INR 105.3315, USD 1.1214, GBP 0.83545, JPY 177.38; EUR 1. AED
        and other unquoted currencies require a manual rate. No currency network requests.
      </p>
      <div className="budget-input-grid">
        <label>
          Convert from
          <select
            className="select"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value as Currency);
              setManual('');
            }}
          >
            {budgetCurrencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Reference amount
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>
      <p className="currency-result">{converted}</p>
      <p className="field-hint">
        {rate
          ? `${rate.source} · ${rate.referenceDate} · 1 ${from} = ${(Number(rate.numerator) / Number(rate.denominator)).toPrecision(8)} ${budget.currency}`
          : 'No reliable rate available. Enter one below.'}
      </p>
      <div className="budget-input-grid">
        <label>
          Manual rate: {budget.currency} per 1 {from}
          <input
            className="input"
            inputMode="decimal"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
        </label>
        <label>
          Rate reference date
          <input
            className="input"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <Button
        variant="secondary"
        disabled={from === budget.currency}
        onClick={() => {
          try {
            if (date > new Date().toISOString().slice(0, 10)) throw new Error();
            const next = manualRate(from, budget.currency, manual, date);
            const rates = [
              ...budget.manualRates.filter((r) => r.from !== from || r.to !== budget.currency),
              next,
            ];
            if (rates.length > 30) throw new Error();
            onChange({ ...budget, manualRates: rates });
            setError('');
          } catch {
            setError(
              'Enter a positive rate (up to eight decimals), valid non-future date and at most 30 references.',
            );
          }
        }}
      >
        Keep manual rate in draft
      </Button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <p className="field-hint">
        New expenses use the selected reference. Existing conversions keep their original rate/date
        unless explicitly replaced while editing that expense. Save the budget to preserve manual
        rates.
      </p>
    </section>
  );
}
