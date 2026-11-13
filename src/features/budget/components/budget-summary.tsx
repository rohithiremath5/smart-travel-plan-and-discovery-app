import { calculateBudget, type Budget } from '../domain/budget';
import { formatMoney } from '../domain/currency';
export function BudgetSummary({ budget, actual = false }: { budget: Budget; actual?: boolean }) {
  const result = calculateBudget(budget),
    money = (v: number) => formatMoney(v, budget.currency);
  return (
    <section aria-label={actual ? 'Actual expense totals' : 'Estimated budget breakdown'}>
      <h2>{actual ? 'Actual expense totals' : 'Estimated budget breakdown'}</h2>
      <p>
        {actual
          ? `${budget.expenses.length} actual expenses · ${money(result.actual)}`
          : `Illustrative estimate · ${money(result.total)}`}
      </p>
      <dl className="budget-breakdown">
        {Object.entries(actual ? result.actualCategories : result.categories).map(
          ([category, value]) => (
            <div key={category}>
              <dt>
                {category}
                {!actual && result.total > 0
                  ? ` · ${Math.round((value / result.total) * 100)}%`
                  : ''}
              </dt>
              <dd>{money(value)}</dd>
            </div>
          ),
        )}
      </dl>
      {!actual && (
        <p className="field-hint">
          Per traveler {money(result.perTraveler)} · daily average {money(result.perDay)}. Rounded
          independently to currency minor units.
        </p>
      )}
    </section>
  );
}
