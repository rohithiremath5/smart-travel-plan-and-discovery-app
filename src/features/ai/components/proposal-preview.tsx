import { useState } from 'react';
import { Check, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationSearch } from '@/features/mapping/components/location-search';
import type { MapLocation } from '@/features/mapping/domain/map';
import type { ItineraryState } from '@/features/itinerary/services/itinerary-repository';
import { formatDate } from '@/features/trips/domain/trip';
import type { AiSuggestion } from '../domain/planning';
export function ProposalPreview({
  state,
  suggestions,
  setSuggestions,
  summary,
  apply,
  busy,
}: {
  state: ItineraryState;
  suggestions: AiSuggestion[];
  setSuggestions: (next: AiSuggestion[]) => void;
  summary: string;
  apply: () => void;
  busy: boolean;
}) {
  const [locationFor, setLocationFor] = useState('');
  const [pendingPlace, setPendingPlace] = useState<MapLocation | null>(null);
  const [replaceConsent, setReplaceConsent] = useState(false);
  const selected = suggestions.filter((s) => s.selected),
    replacements = selected.filter((s) => s.replaceId);
  const update = (id: string, fields: Partial<AiSuggestion>) =>
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  return (
    <section className="ai-preview" aria-label="AI suggestion preview">
      <div className="ai-stage-heading">
        <span className="eyebrow">02 / MAKE IT YOURS</span>
        <h3>A draft, with room for you.</h3>
        <p>{summary}</p>
      </div>
      <p className="ai-trust-note">
        AI ideas, not verified travel facts. Check venue hours, prices and suitability. No changes
        are saved until you select and apply them.
      </p>
      {state.plan.days
        .filter((day) => suggestions.some((s) => s.date === day.date))
        .map((day) => (
          <section className="ai-preview-day" key={day.date}>
            <h4>{formatDate(day.date)}</h4>
            {suggestions
              .filter((s) => s.date === day.date)
              .map((s) => (
                <article key={s.id} className="ai-suggestion" data-selected={s.selected}>
                  <div className="ai-suggestion-top">
                    <label>
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) => update(s.id, { selected: e.target.checked })}
                      />
                      <span>{s.activity.title}</span>
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Reject ${s.activity.title}`}
                      onClick={() => setSuggestions(suggestions.filter((item) => item.id !== s.id))}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  <p>{s.activity.description}</p>
                  <div className="ai-suggestion-facts">
                    <span>{s.activity.startTime ?? 'Flexible time'}</span>
                    <span>{s.activity.durationMinutes} min estimate</span>
                    <span>{s.activity.category}</span>
                  </div>
                  <p className="field-hint">
                    <MapPin aria-hidden="true" />
                    {s.place
                      ? `${s.place.name} · saved/selected coordinate`
                      : `${s.activity.locationName || 'Location not confirmed'} · no verified coordinates`}
                  </p>
                  <label className="field">
                    <span>How to apply {s.activity.title}</span>
                    <select
                      className="input"
                      value={s.replaceId}
                      onChange={(e) => {
                        update(s.id, { replaceId: e.target.value, place: null });
                        setReplaceConsent(false);
                      }}
                    >
                      <option value="">Add after existing activities</option>
                      {day.activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          Replace {a.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {s.replaceId && (
                    <p className="field-hint">
                      Replaces title, description, start time, duration and category. Keeps its ID,
                      position, notes, costs and saved location unless you explicitly choose a new
                      place below.
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLocationFor(locationFor === s.id ? '' : s.id);
                      setPendingPlace(null);
                    }}
                  >
                    <MapPin aria-hidden="true" />
                    Choose a location for {s.activity.title}
                  </Button>
                  {locationFor === s.id && (
                    <div className="ai-place-picker">
                      <LocationSearch
                        near={
                          state.trip.destination.latitude !== undefined &&
                          state.trip.destination.longitude !== undefined
                            ? {
                                latitude: state.trip.destination.latitude,
                                longitude: state.trip.destination.longitude,
                              }
                            : null
                        }
                        select={setPendingPlace}
                      />
                      {pendingPlace && (
                        <div className="ai-place-confirm">
                          <strong>{pendingPlace.name}</strong>
                          <p>{pendingPlace.address}</p>
                          <p>
                            This changes only this draft’s location. Applying the selected
                            suggestion later saves it.
                          </p>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              update(s.id, { place: pendingPlace });
                              setPendingPlace(null);
                              setLocationFor('');
                            }}
                          >
                            Use this place in the draft
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
          </section>
        ))}
      {!suggestions.length && <p>All suggestions rejected. Your saved plan is unchanged.</p>}
      <div className="ai-approval-bar">
        <p>
          <strong>{selected.length} selected</strong> · {selected.length - replacements.length}{' '}
          additions · {replacements.length} replacements
        </p>
        <p className="field-hint">
          Unselected ideas are not saved. Day notes and existing activity order remain intact.
        </p>
        {!!replacements.length && (
          <label className="location-checkbox">
            <input
              type="checkbox"
              checked={replaceConsent}
              onChange={(e) => setReplaceConsent(e.target.checked)}
            />
            I confirm replacing the selected activities as described above.
          </label>
        )}
        <Button
          disabled={!selected.length || (!!replacements.length && !replaceConsent)}
          loading={busy}
          onClick={apply}
        >
          <Check aria-hidden="true" />
          Apply selected suggestions
        </Button>
      </div>
    </section>
  );
}
