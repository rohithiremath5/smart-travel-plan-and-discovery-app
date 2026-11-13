import { useState } from 'react';
import type { Budget } from '../domain/budget';
import {
  estimateFields,
  estimateLabels,
  parseEstimateFields,
  type EstimateKey,
} from '../domain/estimate-fields';
export function EstimateEditor({
  budget,
  onChange,
  onValidation,
}: {
  budget: Budget;
  onChange: (budget: Budget) => void;
  onValidation: (error: string) => void;
}) {
  const [fields, setFields] = useState(() => estimateFields(budget)),
    [error, setError] = useState('');
  return (
    <>
      <div className="budget-input-grid">
        {(Object.keys(estimateLabels) as EstimateKey[]).map((key) => (
          <label key={key}>
            {estimateLabels[key]}
            <input
              className="input"
              inputMode="decimal"
              value={fields[key]}
              onChange={(e) => {
                const next = { ...fields, [key]: e.target.value };
                setFields(next);
                try {
                  const assumptions = parseEstimateFields(next, budget);
                  if (key === 'distanceMeters')
                    assumptions.distanceSource = 'Manual distance (edited)';
                  onChange({ ...budget, assumptions });
                  setError('');
                  onValidation('');
                } catch (reason) {
                  const message = (reason as Error).message;
                  setError(message);
                  onValidation(message);
                }
              }}
            />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error} Totals below retain the last valid inputs. Saving is disabled until corrected.
        </p>
      )}
      <label>
        Distance interpretation
        <select
          className="select"
          value={budget.assumptions.distanceMode}
          onChange={(e) =>
            onChange({
              ...budget,
              assumptions: {
                ...budget.assumptions,
                distanceMode: e.target.value as 'total' | 'return',
              },
            })
          }
        >
          <option value="total">Entered distance is the entire journey (no doubling)</option>
          <option value="return">Entered distance is one way; explicitly double for return</option>
        </select>
      </label>
      <p className="field-hint">
        A zero spending target means no target; remaining spending then compares with the estimate.
        Source: {budget.assumptions.distanceSource}. Manual distance is supported. No route or
        geocoding request. Verified route distances may be entered manually; existing route
        responses are temporary rather than saved trip records.
      </p>
      <details>
        <summary>How the estimate is calculated</summary>
        <ul>
          <li>
            Transport = entered km × return factor (1 or explicitly 2) × vehicle-km rate × vehicles.
            Shared transport is never multiplied by passengers.
          </li>
          <li>Food = travelers × meals/person/day × days × price/meal.</li>
          <li>
            Rooms = ceil(travelers ÷ occupants). Accommodation = rooms × nights × room/night price.
          </li>
          <li>Activities = travelers × days × person/day activity budget.</li>
          <li>
            Add custom estimates once. Contingency applies to this subtotal. Nights initially
            suggest days minus one, then stay independently editable.
          </li>
          <li>
            Integer minor-unit arithmetic; half-up rounding. Per-person/daily averages are rounded
            illustrative shares.
          </li>
        </ul>
      </details>
    </>
  );
}
