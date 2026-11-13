import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Wallet, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LocalStorageNote, TripError } from '@/features/trips/components/trip-shared';
import { formatDate } from '@/features/trips/domain/trip';
import { WeatherPanel } from '@/features/weather/components/weather-panel';
import { budgetRepository, type BudgetState } from '../services/budget-repository';
import { calculateBudget, emptyBudget, type Budget, type Expense } from '../domain/budget';
import { budgetCurrencies, formatMoney, type Currency } from '../domain/currency';
import { moneyKeys } from '../domain/estimate-fields';
import { ExpenseEditor } from '../components/expense-editor';
import { BudgetSummary } from '../components/budget-summary';
import { EstimateEditor } from '../components/estimate-editor';
import { CustomEstimates } from '../components/custom-estimates';
import { CachedRouteDistance } from '../components/cached-route-distance';
import { CurrencyPanel } from '../components/currency-panel';
export function BudgetPage() {
  const { tripId = '' } = useParams();
  const query = useQuery({
    queryKey: ['budget', tripId],
    queryFn: () => budgetRepository.load(tripId),
    staleTime: 0,
  });
  if (query.isPending)
    return (
      <div className="container trips-page" role="status">
        Opening your budget…
      </div>
    );
  if (query.isError)
    return (
      <div className="container trips-page">
        <h1>Budget and weather</h1>
        <TripError
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
        <Link to="/trips">Back to My trips</Link>
      </div>
    );
  return <BudgetWorkspace key={tripId} initial={query.data} />;
}
function BudgetWorkspace({ initial }: { initial: BudgetState }) {
  const client = useQueryClient(),
    trigger = useRef<HTMLElement | null>(null);
  const [base, setBase] = useState(initial),
    [draft, setDraft] = useState(initial.budget),
    [epoch, setEpoch] = useState(0);
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [fieldError, setFieldError] = useState(''),
    [reviewed, setReviewed] = useState(false),
    [latest, setLatest] = useState('');
  const [expense, setExpense] = useState<{ initial?: Expense } | null>(null),
    [confirmation, setConfirmation] = useState<{
      title: string;
      text: string;
      apply: () => void;
    } | null>(null);
  let summary: ReturnType<typeof calculateBudget> | undefined,
    validation = '';
  try {
    summary = calculateBudget(draft);
  } catch (e) {
    validation =
      e instanceof Error && e.name !== 'ZodError'
        ? e.message
        : 'Review the budget values and supported limits.';
  }
  const money = (n: number) => formatMoney(n, draft.currency);
  function change(next: Budget) {
    setDraft(next);
    setDirty(true);
    setReviewed(false);
    setMessage('');
  }
  function confirm(title: string, text: string, apply: () => void) {
    trigger.current = document.activeElement as HTMLElement;
    setConfirmation({ title, text, apply });
  }
  function resetFields() {
    setEpoch((x) => x + 1);
    setFieldError('');
  }
  async function save() {
    setBusy(true);
    setError('');
    try {
      const saved = await budgetRepository.save(
        base.trip.id,
        draft,
        base.budget.revision,
        base.trip.revision,
      );
      setBase(saved);
      setDraft(saved.budget);
      setDirty(false);
      setLatest('');
      setReviewed(false);
      resetFields();
      setMessage('Budget and expenses saved on this device.');
      client.setQueryData(['budget', base.trip.id], saved);
      for (const key of ['local-trips', 'itinerary', 'organizer', 'trip-print'])
        await client.invalidateQueries({ queryKey: [key] });
    } catch (e) {
      setError((e as Error).message);
      setReviewed(false);
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    try {
      const fresh = await budgetRepository.load(base.trip.id);
      setBase(fresh);
      setLatest(
        `Latest saved: ${formatMoney(calculateBudget(fresh.budget).total, fresh.budget.currency)} estimate; ${fresh.budget.expenses.length} actual expenses. Your draft replaces the complete budget aggregate. Compare before explicitly saving.\n${JSON.stringify(fresh.budget, (key, value) => (['id', 'tripId', 'revision', 'schemaVersion'].includes(key) ? undefined : value), 2)}`,
      );
      setReviewed(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const changedTrip =
    base.trip.travelers !== draft.basis.travelers ||
    base.trip.startDate !== draft.basis.startDate ||
    base.trip.endDate !== draft.basis.endDate;
  return (
    <div className="container trips-page budget-page">
      <Link className="text-link" to={`/trips/${base.trip.id}`}>
        <ArrowLeft aria-hidden="true" />
        Trip overview
      </Link>
      <header className="budget-heading">
        <div>
          <p className="eyebrow">A PLAN WITH ROOM TO BREATHE</p>
          <h1>
            Spend thoughtfully.
            <br />
            Travel your way.
          </h1>
          <p>
            {base.trip.title} · {base.trip.destination.name}
          </p>
          <p>
            {formatDate(base.trip.startDate)} — {formatDate(base.trip.endDate)} ·{' '}
            {base.trip.travelers} travelers
          </p>
        </div>
        <Wallet aria-hidden="true" />
      </header>
      <nav className="trip-actions" aria-label="Trip workspace">
        <Link className="button button-secondary" to={`/trips/${base.trip.id}`}>
          Overview
        </Link>
        <Link className="button button-secondary" to={`/trips/${base.trip.id}/itinerary`}>
          Itinerary
        </Link>
        <Link className="button button-secondary" to={`/trips/${base.trip.id}/organizer`}>
          Organizer
        </Link>
        <Link
          className="button button-primary"
          aria-current="page"
          to={`/trips/${base.trip.id}/budget`}
        >
          Budget & weather
        </Link>
      </nav>
      <LocalStorageNote />
      <p className="budget-info">
        Illustrative estimates, not verified prices. India starting values: ₹10 per vehicle-km, ₹250
        per meal, 3 meals/day, ₹1,500 per room/night, 2 people/room and ₹300 activities/person/day.
        Other destinations start with zero rates for your input. All values are editable.
      </p>
      {changedTrip && (
        <p className="budget-warning" role="status">
          Trip dates or travelers changed. Saved assumptions and expenses are preserved. Review
          travelers, days, nights and expense dates; no manual override was recalculated.
        </p>
      )}
      <section className="budget-stats" aria-label="Budget at a glance">
        <div>
          <span>Estimated total</span>
          <strong>{summary ? money(summary.total) : '—'}</strong>
          <small>
            {summary ? `${money(summary.perTraveler)} per traveler` : 'Check inputs below'}
          </small>
        </div>
        <div>
          <span>Actually spent</span>
          <strong>{summary ? money(summary.actual) : '—'}</strong>
          <small>
            {draft.expenses.length
              ? `${draft.expenses.length} expenses`
              : 'No actual expenses recorded'}
          </small>
        </div>
        <div>
          <span>Remaining {draft.assumptions.targetMinor ? 'target' : 'estimate'}</span>
          <strong>{summary ? money(summary.remaining) : '—'}</strong>
          <small>{summary ? `${money(summary.perDay)} estimated per day` : ''}</small>
        </div>
      </section>
      {!!summary?.overTarget && (
        <p className="budget-warning" role="status">
          Estimate exceeds your target by {money(summary.overTarget)}. Review your assumptions.
        </p>
      )}
      {dirty && (
        <p className="budget-warning" role="status">
          Unsaved budget changes. Save before leaving or reloading.
        </p>
      )}
      {message && (
        <p role="status" className="trip-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {validation && (
        <p role="alert" className="field-error">
          {validation}
        </p>
      )}
      <div className="trip-actions budget-save">
        <Button
          disabled={!!fieldError || !summary || busy || !dirty}
          loading={busy}
          onClick={() => void save()}
        >
          {reviewed ? 'Save my budget after review' : 'Save budget and expenses'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void review()}>
          Review latest saved budget
        </Button>
        <Link className="button button-secondary" to={`/trips/${base.trip.id}/print`}>
          Print summary
        </Link>
      </div>
      {latest && (
        <div className="organizer-latest">
          <p>
            Compare the latest saved content with your draft before replacing it, or discard your
            draft explicitly.
          </p>
          <pre>{latest}</pre>
          <Button
            variant="secondary"
            onClick={() =>
              confirm(
                'Discard budget draft?',
                'Use the latest saved budget and discard all unsaved budget edits.',
                () => {
                  setDraft(base.budget);
                  setDirty(false);
                  setReviewed(false);
                  setLatest('');
                  setError('');
                  resetFields();
                },
              )
            }
          >
            Use latest and discard my draft
          </Button>
        </div>
      )}
      <section className="budget-section" aria-labelledby="assumptions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MAKE THE NUMBERS YOUR OWN</p>
            <h2 id="assumptions-title">Your assumptions</h2>
          </div>
          <Button
            variant="ghost"
            onClick={() =>
              confirm(
                'Reset estimate defaults?',
                'Replace estimate assumptions and custom estimates with documented defaults for this trip. Actual expenses and manual rates stay unchanged.',
                () => {
                  const defaults = emptyBudget(base.trip),
                    a = { ...defaults.assumptions };
                  if (defaults.currency !== draft.currency) for (const k of moneyKeys) a[k] = 0;
                  change({ ...draft, assumptions: a, custom: [], basis: defaults.basis });
                  resetFields();
                },
              )
            }
          >
            Reset estimates
          </Button>
        </div>
        <label>
          Budget currency
          <select
            className="select"
            value={draft.currency}
            disabled={draft.expenses.length > 0}
            onChange={(e) => {
              const currency = e.target.value as Currency;
              confirm(
                'Change budget currency?',
                'No automatic conversion. Reset monetary estimates, custom amounts, target and manual rates to zero/empty. Keep non-monetary assumptions and custom labels, then enter your rates.',
                () => {
                  const a = { ...draft.assumptions };
                  for (const k of moneyKeys) a[k] = 0;
                  change({
                    ...draft,
                    currency,
                    assumptions: a,
                    custom: draft.custom.map((x) => ({ ...x, amountMinor: 0 })),
                    manualRates: [],
                  });
                  resetFields();
                },
              );
            }}
          >
            {budgetCurrencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <p className="field-hint">
          Rates below use {draft.currency}. Budget currency is fixed while actual expenses exist to
          protect saved conversions. Trip metadata is unchanged.
        </p>
        <CachedRouteDistance
          trip={base.trip}
          onUse={(distanceMeters, distanceSource) => {
            if (fieldError) {
              setError('Correct invalid inputs before selecting a cached route.');
              return;
            }
            change({
              ...draft,
              assumptions: {
                ...draft.assumptions,
                distanceMeters,
                distanceSource,
                distanceMode: 'total',
              },
            });
            resetFields();
          }}
        />
        <EstimateEditor
          key={epoch}
          budget={draft}
          onChange={change}
          onValidation={(e) => {
            setFieldError(e);
            if (e) setDirty(true);
          }}
        />
        <CustomEstimates budget={draft} onChange={change} confirm={confirm} />
      </section>
      {summary && (
        <section className="budget-section">
          <BudgetSummary budget={draft} />
        </section>
      )}
      <CurrencyPanel budget={draft} onChange={change} />
      <section className="budget-section" aria-labelledby="expenses-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHAT YOU HAVE ACTUALLY SPENT</p>
            <h2 id="expenses-title">Actual expenses</h2>
          </div>
          <Button
            variant="secondary"
            disabled={draft.expenses.length >= 300 || !!fieldError}
            onClick={() => setExpense({})}
          >
            Add expense
          </Button>
        </div>
        {!draft.expenses.length ? (
          <p>
            No actual expenses recorded. Estimates remain separate and have not been added here.
          </p>
        ) : (
          <>
            <ul className="budget-expenses">
              {draft.expenses.map((x) => (
                <li key={x.id}>
                  <div>
                    <strong>{x.description || x.category}</strong>
                    <p>
                      {formatMoney(x.amountMinor, x.currency)} → {money(x.convertedMinor)} ·{' '}
                      {x.category}
                    </p>
                    <small>
                      {x.date ?? 'No date'} · reference {x.conversion.referenceDate} ·{' '}
                      {x.conversion.source}
                    </small>
                  </div>
                  <div className="trip-actions">
                    <Button
                      variant="ghost"
                      aria-label={`Edit expense ${x.description || x.category}`}
                      onClick={() => setExpense({ initial: x })}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={`Delete expense ${x.description || x.category}`}
                      onClick={() =>
                        confirm(
                          'Delete actual expense?',
                          'Remove this actual expense from the draft. Save to persist deletion.',
                          () =>
                            change({
                              ...draft,
                              expenses: draft.expenses.filter((i) => i.id !== x.id),
                            }),
                        )
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {summary && <BudgetSummary budget={draft} actual />}
          </>
        )}
      </section>
      <WeatherPanel
        key={`${base.trip.id}:${base.trip.destination.latitude}:${base.trip.destination.longitude}`}
        trip={base.trip}
      />
      {expense && (
        <ExpenseEditor
          trip={base.trip}
          budget={draft}
          {...(expense.initial ? { initial: expense.initial } : {})}
          onClose={() => setExpense(null)}
          onSave={(value) => {
            change({
              ...draft,
              expenses: expense.initial
                ? draft.expenses.map((x) => (x.id === value.id ? value : x))
                : [...draft.expenses, value],
            });
            setExpense(null);
          }}
        />
      )}
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
          }}
        >
          <DialogTitle>{confirmation?.title ?? 'Review change'}</DialogTitle>
          <DialogDescription>{confirmation?.text ?? ''}</DialogDescription>
          <div className="trip-actions">
            <Button variant="secondary" onClick={() => setConfirmation(null)}>
              Keep unchanged
            </Button>
            <Button
              onClick={() => {
                confirmation?.apply();
                setConfirmation(null);
              }}
            >
              Confirm change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <p className="field-hint">
        Budgets, rates and expenses stay on this device. Save explicitly, then export a complete
        backup. Unsaved edits can be lost on navigation/reload.
      </p>
    </div>
  );
}
