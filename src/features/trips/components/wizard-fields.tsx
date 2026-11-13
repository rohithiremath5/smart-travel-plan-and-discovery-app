import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripFacts } from './trip-facts';
import {
  currencyOptions,
  interestOptions,
  currencyDigits,
  tripDuration,
  type TripInput,
} from '../domain/trip';
import { draftInput, wizardSteps, type TripDraft } from '../domain/wizard';
function Field({
  name,
  label,
  error,
  children,
  hint,
}: {
  name: string;
  label: string;
  error: string | undefined;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="wizard-field">
      <label className="field-label" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function WizardFields({
  step,
  draft,
  errors,
  change,
  changeStep,
}: {
  step: number;
  draft: TripDraft;
  errors: Record<string, string>;
  change: <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => void;
  changeStep: (next: number) => void;
}) {
  function attrs(name: string) {
    return {
      id: name,
      'aria-invalid': !!errors[name],
      'aria-describedby': errors[name] ? `${name}-error` : undefined,
    };
  }
  const data = draftInput(draft);
  const days = tripDuration(draft.startDate, draft.endDate);

  return (
    <>
      {' '}
      {step === 1 && (
        <>
          <p className="step-description">
            When does your next chapter begin? Arrival and departure both count as travel days.
          </p>
          <div className="wizard-fields two-fields">
            <Field name="startDate" label="Start date" error={errors.startDate}>
              <input
                {...attrs('startDate')}
                className="input"
                type="date"
                min="1900-01-01"
                max="2199-12-31"
                value={draft.startDate}
                onChange={(e) => change('startDate', e.target.value)}
              />
            </Field>
            <Field name="endDate" label="End date" error={errors.endDate}>
              <input
                {...attrs('endDate')}
                className="input"
                type="date"
                min={draft.startDate || '1900-01-01'}
                max="2199-12-31"
                value={draft.endDate}
                onChange={(e) => change('endDate', e.target.value)}
              />
            </Field>
          </div>
          {Number.isFinite(days) && days > 0 && days <= 366 && (
            <p className="wizard-inline-note">
              {days} {days === 1 ? 'day' : 'days'} to make your own.
            </p>
          )}
          <p className="field-hint">
            Trips may span up to 366 days. Dates are saved as calendar dates, without timezone
            shifts.
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <p className="step-description">Solo moments or shared memories. Who’s coming along?</p>
          <div className="wizard-fields two-fields">
            <Field name="travelers" label="Number of travelers" error={errors.travelers}>
              <input
                {...attrs('travelers')}
                className="input"
                type="number"
                min={1}
                max={50}
                step={1}
                value={draft.travelers || ''}
                onChange={(e) => change('travelers', Number(e.target.value))}
              />
            </Field>
            <Field name="groupType" label="Travel group" error={errors.groupType}>
              <select
                {...attrs('groupType')}
                className="input"
                value={draft.groupType}
                onChange={(e) => change('groupType', e.target.value as TripInput['groupType'])}
              >
                {['Solo', 'Couple', 'Friends', 'Family', 'Group'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="field-hint">
            A traveler count is a planning preference, not an invitation or shared account.
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <p className="step-description">
            Set a starting point for the whole trip. You can change this later.
          </p>
          <div className="wizard-fields two-fields">
            <Field
              name="budgetMinor"
              label="Total trip budget"
              error={errors.budgetMinor}
              hint="Use 0 if you haven’t set a budget yet."
            >
              <input
                {...attrs('budgetMinor')}
                className="input"
                inputMode="decimal"
                type="text"
                maxLength={14}
                value={draft.budgetAmount}
                onChange={(e) => change('budgetAmount', e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field name="currency" label="Currency" error={errors.currency}>
              <select
                {...attrs('currency')}
                className="input"
                value={draft.currency}
                onChange={(e) => {
                  change('currency', e.target.value as TripInput['currency']);
                }}
              >
                {currencyOptions.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field
              name="budgetPreference"
              label="Budget preference"
              error={errors.budgetPreference}
            >
              <select
                {...attrs('budgetPreference')}
                className="input"
                value={draft.budgetPreference}
                onChange={(e) =>
                  change('budgetPreference', e.target.value as TripInput['budgetPreference'])
                }
              >
                {['Flexible', 'Value', 'Comfort'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="field-hint">
            {currencyDigits(draft.currency)} decimal places for {draft.currency}. This is your
            estimate, not live pricing or a currency conversion.
          </p>
        </>
      )}
      {step === 4 && (
        <>
          <p className="step-description">
            Follow your curiosity. Choose at least one thing you’d love to find.
          </p>
          <fieldset className="interest-choices">
            <legend className="sr-only">Travel interests</legend>
            {interestOptions.map((interest) => (
              <label className="interest-choice" key={interest}>
                <input
                  type="checkbox"
                  checked={draft.interests.includes(interest)}
                  onChange={(e) =>
                    change(
                      'interests',
                      e.target.checked
                        ? [...draft.interests, interest]
                        : draft.interests.filter((v) => v !== interest),
                    )
                  }
                />
                <span>{interest}</span>
              </label>
            ))}
          </fieldset>
          {errors.interests && (
            <p id="interests-error" className="field-error">
              {errors.interests}
            </p>
          )}
        </>
      )}
      {step === 5 && (
        <>
          <p className="step-description">
            Leave space to linger, or fill the days with possibility.
          </p>
          <fieldset className="pace-choices">
            <legend className="sr-only">Travel pace</legend>
            {[
              { name: 'Relaxed', text: 'Slow mornings. Fewer plans. Time to wander.' },
              { name: 'Balanced', text: 'A little exploring, a little breathing room.' },
              { name: 'Packed', text: 'Full days for a curious, energetic traveler.' },
            ].map((item) => (
              <label key={item.name} className="pace-choice">
                <input
                  type="radio"
                  name="pace"
                  value={item.name}
                  checked={draft.pace === item.name}
                  onChange={() => change('pace', item.name as TripInput['pace'])}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.text}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      {step === 6 && (
        <>
          <p className="step-description">
            The beginnings of something good. Check your details before saving.
          </p>
          <div className="wizard-fields two-fields">
            <Field name="title" label="Trip name" error={errors.title}>
              <input
                {...attrs('title')}
                className="input"
                maxLength={100}
                value={draft.title}
                onChange={(e) => change('title', e.target.value)}
              />
            </Field>
            <Field name="status" label="Trip status" error={errors.status}>
              <select
                {...attrs('status')}
                className="input"
                value={draft.status}
                onChange={(e) => change('status', e.target.value as TripInput['status'])}
              >
                <option>Planning</option>
                <option>Confirmed</option>
              </select>
            </Field>
          </div>
          {draft.destination && <TripFacts trip={{ ...data, destination: draft.destination }} />}
          <div className="review-corrections" aria-label="Correct trip details">
            {wizardSteps.slice(0, 6).map((label, index) => (
              <Button variant="ghost" size="sm" key={label} onClick={() => changeStep(index)}>
                Change {label.toLowerCase()}
              </Button>
            ))}
          </div>
          <p className="wizard-inline-note">
            <LockKeyhole aria-hidden="true" />
            Your trip stays in this browser. Export a backup after saving; browser storage can be
            cleared.
          </p>
        </>
      )}
    </>
  );
}
