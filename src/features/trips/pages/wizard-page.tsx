import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getGuide } from '@/features/discovery/data/curated';
import { useTrips, tripQueryKey } from '../hooks/use-trips';
import { tripRepository } from '../services/trip-repository';
import { tripInputSchema, type Trip, type TripInput } from '../domain/trip';
import { itineraryRepository } from '@/features/itinerary/services/itinerary-repository';
import {
  hasDayContent,
  type Itinerary,
  type DateChangeChoice,
} from '@/features/itinerary/domain/itinerary';
import { DateChangeReview } from '../components/date-change-review';
import { initialDraft, draftInput, validateStep, wizardSteps } from '../domain/wizard';
import { DestinationPicker } from '../components/destination-picker';
import { WizardFields } from '../components/wizard-fields';
import { TripError } from '../components/trip-shared';

export function WizardPage() {
  const { tripId } = useParams();
  const query = useTrips();
  if (tripId) {
    if (query.isPending)
      return (
        <div className="container trips-page" role="status">
          Opening your trip…
        </div>
      );
    if (query.isError)
      return (
        <div className="container trips-page">
          <TripError
            error={query.error}
            retry={() => {
              void query.refetch();
            }}
          />
        </div>
      );
    const trip = query.data.find((t) => t.id === tripId);
    if (!trip)
      return (
        <div className="container trips-page">
          <h1>Trip not found on this device.</h1>
          <p>Return to My trips or import a backup.</p>
        </div>
      );
    return <TripWizard key={trip.id} trip={trip} />;
  }
  return <TripWizard />;
}
function TripWizard({ trip }: { trip?: Trip }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(() => {
    const value = initialDraft(trip);
    const guide = getGuide(params.get('destination') ?? '');
    if (!trip && guide) {
      const { id, name, country, source, latitude, longitude } = guide.destination;
      value.destination = { id, name, country, source, latitude, longitude };
      value.title = `${name}, at your pace`;
    }
    return value;
  });
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [expectedRevision] = useState(trip?.revision);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [cancel, setCancel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dateReview, setDateReview] = useState<{ input: TripInput; plan: Itinerary } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const completed = useRef(false);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      if (!completed.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, [dirty]);
  function change<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setErrors({});
    setSaveError('');
  }
  function changeStep(next: number) {
    setErrors({});
    setFurthest((previous) => Math.max(previous, next));
    setStep(next);
  }
  function check() {
    const next = validateStep(draft, step);
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return false;
    }
    return true;
  }
  async function save(choice?: DateChangeChoice) {
    if (!check()) return;
    const parsed = tripInputSchema.safeParse(draftInput(draft));
    if (!parsed.success) return;
    setSaving(true);
    setSaveError('');
    try {
      if (
        trip &&
        !choice &&
        (trip.startDate !== parsed.data.startDate || trip.endDate !== parsed.data.endDate)
      ) {
        const current = await itineraryRepository.load(trip.id);
        if (current.trip.revision !== expectedRevision)
          throw new Error(
            'This trip changed in another tab. Reload before reviewing the date changes.',
          );
        if (current.plan.days.some(hasDayContent)) {
          setDateReview({ input: parsed.data, plan: current.plan });
          return;
        }
      }
      const record = trip
        ? await tripRepository.update(trip.id, parsed.data, expectedRevision!, choice)
        : await tripRepository.create(parsed.data);
      completed.current = true;
      await client.invalidateQueries({ queryKey: tripQueryKey });
      await client.invalidateQueries({ queryKey: ['itinerary', record.id] });
      void navigate(`/trips/${record.id}`, {
        replace: true,
        state: { message: 'Saved on this device.' },
      });
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="container trips-page wizard-page">
      <div className="wizard-topline">
        <Button variant="ghost" onClick={() => setCancel(true)}>
          <ArrowLeft aria-hidden="true" />
          {trip ? 'Back to trip' : 'My trips'}
        </Button>
        <Badge tone="accent">Guest workspace · On this device</Badge>
      </div>
      <header className="wizard-heading">
        <p className="eyebrow">A JOURNEY, SHAPED AROUND YOU</p>
        <h1>{trip ? 'A little change of plans.' : 'Let’s make room for adventure.'}</h1>
        <p>
          {trip
            ? 'Update the details. Your saved trip changes only when you confirm.'
            : 'Seven small steps. One place to begin.'}
        </p>
      </header>
      <div className="wizard-layout">
        <aside className="wizard-rail" aria-label="Trip creation progress">
          <ol>
            {wizardSteps.map((label, index) => (
              <li key={label} aria-current={index === step ? 'step' : undefined}>
                <button
                  type="button"
                  disabled={index > furthest}
                  onClick={() => {
                    if (index <= step || check()) changeStep(index);
                  }}
                >
                  <span>
                    {index < step ? (
                      <Check aria-hidden="true" />
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="wizard-rail-note">
            <Compass aria-hidden="true" />
            <p>A plan can begin with a feeling. Make it yours as you go.</p>
          </div>
        </aside>
        <form
          className="wizard-surface"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 6) {
              void save();
            } else if (check()) changeStep(step + 1);
          }}
        >
          <div className="wizard-step-heading">
            <p className="eyebrow">STEP {step + 1} OF 7</p>
            <h2 ref={heading} tabIndex={-1}>
              {wizardSteps[step]}
            </h2>
          </div>
          {Object.keys(errors).length > 0 && (
            <div ref={summary} className="wizard-error-summary" role="alert" tabIndex={-1}>
              <strong>Check these details before continuing.</strong>
              <ul>
                {Object.entries(errors).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {step === 0 && (
            <DestinationPicker
              selected={draft.destination}
              onSelect={(value) => {
                change('destination', value);
                if (!draft.title) change('title', `${value.name}, at your pace`.slice(0, 100));
              }}
            />
          )}
          <WizardFields
            step={step}
            draft={draft}
            errors={errors}
            change={change}
            changeStep={changeStep}
          />
          {saveError && (
            <p role="alert" className="field-error">
              {saveError}
            </p>
          )}
          <footer className="wizard-footer">
            <Button
              variant="ghost"
              disabled={step === 0 || saving}
              onClick={() => changeStep(step - 1)}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button type="submit" loading={saving}>
              {step === 6
                ? trip
                  ? 'Save changes'
                  : 'Create trip'
                : `Next: ${wizardSteps[step + 1]}`}
              <ArrowRight aria-hidden="true" />
            </Button>
          </footer>
          <p className="wizard-unsaved">
            {saving
              ? 'Saving on this device…'
              : 'Not saved until you confirm the final step. No account required.'}
          </p>
        </form>
      </div>
      <Dialog open={cancel} onOpenChange={setCancel}>
        <DialogContent>
          <DialogTitle>Leave this plan for now?</DialogTitle>
          <DialogDescription>
            Unsaved wizard entries will be lost. Your previously saved trips will stay unchanged.
          </DialogDescription>
          <div className="trip-actions">
            <Button variant="secondary" onClick={() => setCancel(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                completed.current = true;
                void navigate(trip ? `/trips/${trip.id}` : '/trips');
              }}
            >
              Discard changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {dateReview && trip && (
        <DateChangeReview
          trip={trip}
          input={dateReview.input}
          plan={dateReview.plan}
          busy={saving}
          error={saveError}
          cancel={() => setDateReview(null)}
          save={(choice) => {
            void save(choice);
          }}
        />
      )}
    </div>
  );
}
