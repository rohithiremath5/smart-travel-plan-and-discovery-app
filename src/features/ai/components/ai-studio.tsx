import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowLeft, ShieldCheck, Check, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDate, formatBudget, type Trip } from '@/features/trips/domain/trip';
import type {
  ItineraryState,
  ActivityBatchItem,
} from '@/features/itinerary/services/itinerary-repository';
import {
  maximumAiDays,
  type AiContext,
  type AiRequest,
} from '../../../../supabase/functions/_shared/ai/contracts';
import {
  planningContext,
  savedAiPlaces,
  selectedActivityBatch,
  suggestionsFromPlan,
  type AiSuggestion,
} from '../domain/planning';
import {
  aiClientId,
  aiMessage,
  aiStatus,
  requestAi,
  AiClientError,
  type AiStatus,
} from '../services/ai-client';
import { ProposalPreview } from './proposal-preview';
import { AssistantConversation, type ConversationTurn } from './assistant-conversation';
export function AiStudio({
  state,
  selectedDate,
  close,
  apply,
}: {
  state: ItineraryState;
  selectedDate: string;
  close: () => void;
  apply: (items: ActivityBatchItem[], revision: number, tripRevision: number) => Promise<void>;
}) {
  const [snapshot] = useState(state);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [tab, setTab] = useState<'plan' | 'chat'>('plan');
  const [operation, setOperation] = useState<Exclude<AiRequest['operation'], 'chat'>>(
    state.plan.days.length > maximumAiDays ? 'day' : 'trip',
  );
  const [date, setDate] = useState(selectedDate);
  const [pace, setPace] = useState<AiContext['pace']>(state.trip.pace);
  const [interestText, setInterestText] = useState(state.trip.interests.join(', '));
  const interests = interestText
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const [instruction, setInstruction] = useState('');
  const [includeNames, setIncludeNames] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(''),
    [summary, setSummary] = useState('');
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null);
  const [messages, setMessages] = useState<ConversationTurn[]>([]),
    [followUps, setFollowUps] = useState<string[]>([]);
  const [applied, setApplied] = useState(false);
  const [quota, setQuota] = useState<{ globalRemaining: number; clientRemaining: number } | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(0);
  const active = useRef<AbortController | null>(null),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void aiStatus(controller.signal)
      .then(setStatus)
      .catch(() => undefined);
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const dates =
    operation === 'day' || operation === 'alternatives'
      ? [date]
      : snapshot.plan.days.map((d) => d.date);
  function context() {
    return {
      ...planningContext(snapshot, tab === 'chat' ? [date] : dates, pace, includeNames),
      interests,
    };
  }
  async function generate(conversation?: ConversationTurn[]) {
    if (busy) return;
    setError('');
    setBusy(true);
    const controller = new AbortController();
    active.current = controller;
    try {
      if (!consent) throw new Error('Review the sharing notice and confirm before sending.');
      const ctx = context();
      const response = await requestAi(
        {
          requestId: crypto.randomUUID(),
          clientId: aiClientId(),
          operation: conversation ? 'chat' : operation,
          context: ctx,
          instruction,
          messages: conversation ?? [],
          consent: true,
        },
        controller.signal,
      );
      setQuota(response.quota);
      if (response.plan) {
        setSummary(response.plan.summary);
        setSuggestions(suggestionsFromPlan(response.plan, savedAiPlaces(snapshot, dates)));
      }
      if (response.chat) {
        setMessages(
          [...conversation!, { role: 'model' as const, text: response.chat.answer }].slice(-6),
        );
        setFollowUps(response.chat.followUps);
      }
    } catch (e) {
      setError(
        e instanceof AiClientError
          ? aiMessage(e)
          : e instanceof Error
            ? e.message
            : 'Check the brief and try again.',
      );
      if (e instanceof AiClientError && e.retryAfter) setCooldown(e.retryAfter);
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      active.current = null;
      setBusy(false);
    }
  }
  async function accept() {
    if (!suggestions) return;
    setSaving(true);
    setError('');
    try {
      await apply(
        selectedActivityBatch(snapshot, suggestions),
        snapshot.plan.revision,
        snapshot.trip.revision,
      );
      setApplied(true);
      setSuggestions(null);
    } catch (e) {
      setError((e as Error).message);
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      setSaving(false);
    }
  }
  const canSend = !!status?.available && consent && interests.length > 0 && !cooldown;
  const stale =
    state.plan.revision !== snapshot.plan.revision ||
    state.trip.revision !== snapshot.trip.revision;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) close();
      }}
    >
      <DialogContent className="ai-studio">
        <header className="ai-studio-heading">
          <div className="ai-icon">
            <Sparkles aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">YOUR JOURNEY / A FRESH PERSPECTIVE</p>
            <DialogTitle>A little inspiration, thoughtfully.</DialogTitle>
            <DialogDescription>
              Ideas for {snapshot.trip.destination.name}. You make the final plan.
            </DialogDescription>
          </div>
        </header>
        <div className="ai-studio-body">
          <aside className="ai-brief-summary">
            <p className="eyebrow">THE TRIP YOU HAVE IN MIND</p>
            <h2>{snapshot.trip.destination.name}</h2>
            <p>
              {formatDate(snapshot.trip.startDate)} – {formatDate(snapshot.trip.endDate)}
            </p>
            <dl>
              <div>
                <dt>Travelers</dt>
                <dd>{snapshot.trip.travelers}</dd>
              </div>
              <div>
                <dt>Trip budget</dt>
                <dd>{formatBudget(snapshot.trip)}</dd>
              </div>
              <div>
                <dt>Starting pace</dt>
                <dd>{snapshot.trip.pace}</dd>
              </div>
            </dl>
            <p>{snapshot.trip.interests.join(' · ')}</p>
            <div className="ai-local-note">
              <ShieldCheck aria-hidden="true" />
              <p>Saved on this device. AI suggestions are drafts, never automatic edits.</p>
            </div>
            <small>
              Controlled development · 5 requests/day · 3 per client. Client limits are not
              signed-in identities.
            </small>
            {quota && (
              <p role="status">
                {quota.globalRemaining} development requests left today · {quota.clientRemaining}{' '}
                for this client
              </p>
            )}
          </aside>
          <div className="ai-studio-main">
            <div className="ai-mode-switch" aria-label="AI workspace">
              <Button
                variant={tab === 'plan' ? 'secondary' : 'ghost'}
                aria-pressed={tab === 'plan'}
                disabled={busy || saving}
                onClick={() => setTab('plan')}
              >
                Plan ideas
              </Button>
              <Button
                variant={tab === 'chat' ? 'secondary' : 'ghost'}
                aria-pressed={tab === 'chat'}
                disabled={busy || saving}
                onClick={() => setTab('chat')}
              >
                Travel assistant
              </Button>
            </div>
            {!status && <p role="status">Checking local AI availability…</p>}
            {status && !status.available && (
              <div className="ai-notice" role="status">
                {aiMessage(new AiClientError(status.code ?? 'development_only'))}
              </div>
            )}
            {error && (
              <div className="ai-error" role="alert" tabIndex={-1} ref={alert}>
                {error}
              </div>
            )}
            {stale && !applied && (
              <p className="ai-notice">
                The saved trip changed after this studio opened. Applying this preview will stop
                safely; reopen with the latest trip.
              </p>
            )}
            {applied ? (
              <div className="ai-applied" role="status">
                <Check aria-hidden="true" />
                <h3>Your choices, now in your plan.</h3>
                <p>
                  Only selected suggestions were saved on this device. Your day notes and activity
                  order remain intact.
                </p>
                <Button onClick={close}>Return to your itinerary</Button>
              </div>
            ) : (
              <>
                {tab === 'plan' && suggestions ? (
                  <>
                    <Button variant="ghost" onClick={() => setSuggestions(null)} disabled={saving}>
                      <ArrowLeft aria-hidden="true" />
                      Back to your brief
                    </Button>
                    <ProposalPreview
                      state={snapshot}
                      suggestions={suggestions}
                      setSuggestions={setSuggestions}
                      summary={summary}
                      apply={() => {
                        void accept();
                      }}
                      busy={saving}
                    />
                  </>
                ) : (
                  <>
                    <div className="ai-preferences">
                      {tab === 'plan' && (
                        <div className="ai-stage-heading">
                          <p className="eyebrow">01 / SET THE DIRECTION</p>
                          <h3>What would a good day feel like?</h3>
                          <p>Start with your trip’s preferences, then add your own little twist.</p>
                        </div>
                      )}
                      <div className="ai-preference-grid">
                        {tab === 'plan' && (
                          <label className="field">
                            <span>What would you like to plan?</span>
                            <select
                              className="input"
                              value={operation}
                              onChange={(e) => setOperation(e.target.value as typeof operation)}
                            >
                              <option value="trip">Complete trip itinerary</option>
                              <option value="day">Activities for one day</option>
                              <option value="alternatives">Alternatives for a day</option>
                              <option value="refine">Refine the existing itinerary</option>
                            </select>
                          </label>
                        )}
                        {(tab === 'chat' || ['day', 'alternatives'].includes(operation)) && (
                          <label className="field">
                            <span>Day in focus</span>
                            <select
                              className="input"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                            >
                              {snapshot.plan.days.map((d, i) => (
                                <option key={d.date} value={d.date}>
                                  Day {i + 1} · {formatDate(d.date)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="field">
                          <span>Preferred pace</span>
                          <select
                            className="input"
                            value={pace}
                            onChange={(e) => setPace(e.target.value as Trip['pace'])}
                          >
                            {['Relaxed', 'Balanced', 'Packed'].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="field">
                        <span>Interests for this request</span>
                        <input
                          className="input"
                          value={interestText}
                          onChange={(e) => setInterestText(e.target.value)}
                          maxLength={250}
                        />
                        <small>
                          Separate interests with commas. Your saved trip preferences do not change.
                        </small>
                      </label>
                      {tab === 'plan' && (
                        <label className="field">
                          <span>A little more direction (optional)</span>
                          <textarea
                            className="input"
                            rows={3}
                            maxLength={800}
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="More gardens, fewer long walks. Leave time for lunch."
                          />
                        </label>
                      )}
                      <label className="location-checkbox">
                        <input
                          type="checkbox"
                          checked={includeNames}
                          onChange={(e) => setIncludeNames(e.target.checked)}
                        />
                        Include existing activity names (optional)
                      </label>
                      <div className="ai-sharing-notice">
                        <p>
                          Google receives the destination, dates, traveler count, budget, interests,
                          pace, saved place names and your prompt/conversation. Existing activity
                          names are optional. Trip title, IDs, notes, private documents and
                          coordinates are excluded. Free-tier content may be used to improve Google
                          products; share only non-sensitive planning details.
                        </p>
                        <label className="location-checkbox">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                          />
                          I agree to send these planning details to Gemini.
                        </label>
                      </div>
                      {dates.length > maximumAiDays && tab === 'plan' && (
                        <p className="ai-notice">
                          A single AI request supports up to fourteen days. Choose one day for this
                          longer trip; your saved dates are unchanged.
                        </p>
                      )}
                    </div>
                    {tab === 'plan' ? (
                      <div className="ai-generate-footer">
                        <Button
                          disabled={!canSend || dates.length > maximumAiDays}
                          loading={busy}
                          onClick={() => {
                            void generate();
                          }}
                        >
                          <Sparkles aria-hidden="true" />
                          Generate draft
                        </Button>
                        <small>
                          Nothing is saved yet. You’ll review and select the ideas first.
                        </small>
                      </div>
                    ) : (
                      <AssistantConversation
                        messages={messages}
                        followUps={followUps}
                        send={(text) => {
                          const history =
                            messages.at(-1)?.role === 'user' ? messages.slice(0, -1) : messages;
                          const next = [...history, { role: 'user' as const, text }].slice(-5);
                          setMessages(next);
                          void generate(next);
                        }}
                        busy={busy}
                        disabled={!canSend}
                      />
                    )}
                  </>
                )}
              </>
            )}
            {busy && (
              <div className="ai-generation-progress" role="status">
                <LoaderCircle aria-hidden="true" />
                <strong>
                  {tab === 'plan' ? 'Shaping a few possibilities…' : 'Considering your question…'}
                </strong>
                <span>
                  One request, no automatic retries. Cancellation may still use the reserved
                  allowance.
                </span>
                <Button variant="ghost" onClick={() => active.current?.abort()}>
                  Cancel AI request
                </Button>
              </div>
            )}
            {!!cooldown && (
              <p role="status">Please wait {cooldown} seconds before another request.</p>
            )}
            <footer className="ai-studio-footnote">
              {tab === 'chat' ? 'Gemini 3.5 Flash-Lite' : 'Gemini 3.8 Flash'} · AI suggestions need
              your judgment · No live opening-hours, price or booking guarantee.
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
