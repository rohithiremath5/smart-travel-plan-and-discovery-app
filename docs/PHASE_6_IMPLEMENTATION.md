# Current Phase 6 one-use live result — 7 November 2026

The separately authorized single synthetic planner request returned actual upstream HTTP504 at http_headers after 71.398 seconds; local HTTP504/provider_deadline_exceeded. No plan reached parsing, structured validation or preview. Today’s application usage increased 0→1/5; all three earlier records and the old consumed guard remain intact. The new exclusive timeout guard is consumed. No retry, assistant call, fallback, model change or hosted operation occurred. Real Gemini planner inference remains unverified. Phase7 is not authorized; no additional generation is approved.

Fresh post-attempt checks passed: lint, formatting, strict TypeScript, production build/35-asset limited credential scan, 268 unit/integration tests in32files and16mocked Chrome browser regressions at360/768/1024/1440px. Previous68review images and all earlier JSON remain unchanged.

See [one-use live report](PHASE_6_TIMEOUT_LIVE_VERIFICATION.md), [actual result](review/phase-6/timeout-planner-live.json), [preflight](review/phase-6/timeout-planner-preflight.json) and [fresh regression/preservation evidence](review/phase-6/timeout-planner-verification.json). The accepted offline correction and unsuccessful earlier records below remain preserved history.

## Earlier offline and targeted records — retained verbatim

# Current Phase 6 offline timeout correction — 7 November 2026

Local-only correction: provider/SDK 75 seconds, shared handler 80 seconds, browser 85 seconds by default. A bounded optional `AI_PROVIDER_TIMEOUT_MS` setting derives all three. Actual upstream HTTP 504 is now distinct from a local/SDK abort. The installed SDK also sends this deadline upstream, so the old 30-second setting is a plausible contributor, not a proven root cause. Real Gemini planner inference remains unverified. No new live request or hosted change occurred; the consumed guard, ledger, `.env` and historical evidence remain intact. Phase 7 is not authorized.

Fresh offline checks: lint, format, strict TypeScript and production build passed; 254 unit/integration tests in 31 files and 36 responsive Chrome regressions passed, followed by four passing mocked 504 screenshot/accessibility runs. No live inference is included. Four new synthetic timeout screenshots supplement the unchanged 64 earlier review images.

See [offline correction report](PHASE_6_TIMEOUT_CORRECTION.md) and [fresh offline verification](review/phase-6/offline-timeout-verification.json) for changes, exact results, preservation and a proposal for at most one future request requiring separate explicit approval. Older results below remain historical and are not current live-success claims.

## Prior targeted and recovery records — preserved history

# Current Phase 6 targeted planner status

6 November 2026 targeted result: LIVE PLANNER STILL BLOCKED. The single authorized synthetic request received upstream HTTP 504, category provider_http_5xx at http_headers; the local proxy returned HTTP 502. No output reached parsing or validation. Local application usage increased 2 → 3 of 5; no retry, model change or hosted operation occurred. The earlier failure’s upstream cause cannot be reconstructed. Current local regression checks passed; Phase 6 is not finally approved and Phase 7 remains unauthorized.

See [targeted correction](PHASE_6_PLANNER_CORRECTION.md) for root-cause limits, changes, official compatibility references and [actual live evidence](review/phase-6/targeted-planner-live.json).

## Earlier recovered documentation — retained history

# Phase 6 implementation

6 November 2026. Only the owner's full Phase 6 authorization and earlier exact-model amendment are implemented. No hosted mutation or Phase 7 work occurred. Existing `.env`, historical reports/screenshots, Phase 5 archive, discovery function and reviewed Phase 2/5 migrations are preserved.

## Delivered workflow

**Generate with AI** opens a contextual editorial planning studio from the existing itinerary workspace. It reads saved destination, inclusive dates, traveler count, budget/currency, interests and pace. The operator can choose complete trip, single day, day alternatives or refinement, adjust interests/pace, add a brief and explicitly consent to data sharing. Single requests are limited to fourteen consecutive days; longer trips retain single-day generation. No hidden multi-request loop spends the daily allowance. Existing activity-title sharing is separately opt-in; refinement without it still uses the trip's preferences/brief and preserves saved data.

Generation shows cancelable progress. A validated response becomes an unsaved preview grouped by exact day, with descriptions, estimated durations, optional unverified times/categories/place names. Nothing is selected by default. Users can select, reject or discard suggestions, append after manual entries or explicitly replace a same-day activity. Replacement requires a checkbox naming the affected fields. Stable ID, order, notes, estimated costs and saved location remain unless the user explicitly chooses another location. AI never supplies coordinates. Saved user-selected place names can refer back to local coordinates; the existing secure location search also supports an explicitly confirmed place for a draft.

The travel assistant uses the chosen day plus trip preferences for travel/culture/value/pace questions, starter prompts and follow-ups. The six-turn bounded history remains in component memory and is discarded when the studio closes. Failed last-user turns do not create consecutive user-role retries. Chat never applies itinerary changes. Context and generated text are untrusted; React renders text without HTML/Markdown injection.

## Feature and repository architecture

- `src/features/ai/domain`: minimized context, transient proposal selections and explicit activity batches; no IndexedDB access.
- `src/features/ai/services`: same-origin typed transport, deadline and streaming byte bounds, exact response-model/schema/day validation and human-safe errors.
- `src/features/ai/components`: studio, proposal review and conversation; established Radix dialog/focus primitives, system/serif editorial typography, restrained teal, loading/error/empty states and reduced motion.
- `ItineraryRepository.applyActivities`: one bounded atomic transaction with expected **trip and itinerary** revisions, same-day replacement validation, duplicate title/ID checks, existing aggregate capacity validation and full rollback. Existing manual content and unselected proposals are untouched.
- `server/ai`: Vite development middleware, loopback peer/Host/same-Origin checks, ephemeral confidential server capability and a persistent locked quota ledger. Development only; it is absent from production preview.
- `supabase/functions/_shared/ai`: common strict Zod contracts, exact config, dedicated official SDK adapter, handler and future PostgreSQL quota adapter. `ai/index.ts` and additive SQL are prepared locally, not deployed.

Central IndexedDB opening/database v2, record schemas v1 and complete backup v2 remain unchanged. Valid v1 metadata imports still work. Accepted AI activities use existing description/notes/location fields and round-trip through the existing complete backup, without a second AI data store or silent cloud persistence.

## Model and security controls

Planning uses only `gemini-3.8-flash`; assistant uses only `gemini-3.5-flash-lite`. Official `@google/genai` **3.0.0** is server only. `models.generateContent` is supported by both verified metadata records and documented structured output; Google's newer Interactions endpoint is not required for this bounded stateless adapter. No SDK/provider key is imported by browser code. No search/grounding/tools, Vertex billing, automatic continuation, model fallback or retry.

The handler requires a confidential development capability independently of Origin/client ID. Local middleware injects it server-side only after loopback/same-origin checks. Request limit 24 KiB; server/provider deadline 30 s, client 32 s; provider HTTP bound 1 MB and generated JSON 64 KiB; client envelope 128 KiB. Structured provider schemas are followed by strict Zod/date/order/day-count/duplicate/place-reference checks. Planner output token cap grows from 1,536 to at most 8,192; chat 1,200. Incomplete, malformed, extra-coordinate and inconsistent responses fail without saving. The SDK adapter permits one HTTPS provider HTTP attempt, disables retries/continuation and redirects, and sanitizes errors. Numeric upstream status may be returned without raw provider text or credentials.

All started inference attempts reserve before access: global ≤5/day, client ≤3/day, UTC-day durable accounting, 10-second global spacing, 60-second content suppression, request-ID deduplication, seven-day bounded hash-only retention and fail-closed storage errors. Local quotas persist across server/verifier restarts. Client IDs are untrusted counters; the global limit and controlled local access are the protection. Future SQL uses an advisory transaction lock and service-role-only grants. No prompt/output/shared AI cache or sensitive log exists. Cancellation does not guarantee a provider stopped and never refunds a reservation.

Only minimized consented planning fields leave the machine. Notes, trip IDs/titles, coordinates, exports and private documents are excluded; free text must not contain sensitive data. Google Free-tier privacy/eligibility limits are disclosed before consent and in setup. No public anonymous endpoint, login workaround, cloud personal records or hosted AI configuration is enabled.

## UX research and review

Official [Mindtrip planning guidance](https://resources.mindtrip.ai/business/dmo-playbook/best-practices) and [Wanderlog's product overview](https://wanderlog.com/) informed contextual trip questions, small follow-up prompts and keeping AI beside a user's own plan. These are public-page observations, not logged-in competitor testing. The interface uses this project's existing design and components; no external layout was copied.

Four-width screenshots cover brief, progress, preview, explicit application, conversation, quota, stale edit and missing key. All screenshot provider responses are **mocked** and the preview/chat content identifies that. Actual browser IndexedDB, selection, persistence, backup export, keyboard interaction, dialog focus/restore, overflow and axe checks are exercised. The first focused browser pass found a non-focusable scrollable chat log; it was fixed with keyboard focus/visible outline and retested. Bundled Chromium was unavailable, so installed Chrome is used.

Current actual checks, live limitations and final artifacts are recorded in [Phase 6 review](PHASE_6_REVIEW.md) and [evidence](review/phase-6/README.md). Live model metadata is distinct from inference, and mocked/embedded database checks are distinct from Supabase runtime verification. Phase 0–5 evidence remains historical.

## Recovery continuation

The owner reported an unexpected VS Code closure. Inspection found the complete feature files and initial test evidence intact; only final verification, an interrupted screenshot and packaging remained. No feature was rebuilt and no model changed. The recovery adds atomic, explicitly named review capture to the browser test helper, preserves valid existing captures and runs fresh checks without additional live inference. Historical baseline comparison substitutes for Git history because Git is not initialized.
