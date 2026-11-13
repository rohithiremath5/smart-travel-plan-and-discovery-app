# Current Phase 6 one-use live result — 7 November 2026

The separately authorized single synthetic planner request returned actual upstream HTTP504 at http_headers after 71.398 seconds; local HTTP504/provider_deadline_exceeded. No plan reached parsing, structured validation or preview. Today’s application usage increased 0→1/5; all three earlier records and the old consumed guard remain intact. The new exclusive timeout guard is consumed. No retry, assistant call, fallback, model change or hosted operation occurred. Real Gemini planner inference remains unverified. Phase7 is not authorized; no additional generation is approved.

Fresh post-attempt checks passed: lint, formatting, strict TypeScript, production build/35-asset limited credential scan, 268 unit/integration tests in32files and16mocked Chrome browser regressions at360/768/1024/1440px. Previous68review images and all earlier JSON remain unchanged.

See [one-use live report](PHASE_6_TIMEOUT_LIVE_VERIFICATION.md), [actual result](review/phase-6/timeout-planner-live.json), [preflight](review/phase-6/timeout-planner-preflight.json) and [fresh regression/preservation evidence](review/phase-6/timeout-planner-verification.json). The accepted offline correction and unsuccessful earlier records below remain preserved history.

## Earlier offline and targeted records — retained verbatim

# Current Phase 6 offline timeout correction — 7 November 2026

Local-only correction: provider/SDK 75 seconds, shared handler 80 seconds, browser 85 seconds by default. A bounded optional `AI_PROVIDER_TIMEOUT_MS` setting derives all three. Actual upstream HTTP 504 is now distinct from a local/SDK abort. The installed SDK also sends this deadline upstream, so the old 30-second setting is a plausible contributor, not a proven root cause. Real Gemini planner inference remains unverified. No new live request or hosted change occurred; the consumed guard, ledger, `.env` and historical evidence remain intact. Phase 7 is not authorized.

Fresh offline checks: lint, format, strict TypeScript and production build passed; 254 unit/integration tests in 31 files and 36 responsive Chrome regressions passed, followed by four passing mocked 504 screenshot/accessibility runs. No live inference is included. Four new synthetic timeout screenshots supplement the unchanged 64 earlier review images.

See [offline correction report](PHASE_6_TIMEOUT_CORRECTION.md) and [fresh offline verification](review/phase-6/offline-timeout-verification.json) for changes, exact results, preservation and a proposal for at most one future request requiring separate explicit approval. Older results below remain historical and are not current live-success claims.

## Current local configuration

No new provider, account or credential is required. Existing Google AI Studio Free/no-billing and Supabase/Geoapify Free confirmations remain manual historical evidence. Exact official signup, dashboard locations, confidentiality and fresh-account steps remain in the retained provider table below. Reuse the existing key and models; do not regenerate credentials. Defaults require no `.env` edit. Optional non-secret `AI_PROVIDER_TIMEOUT_MS=75000` accepts integer 1000–100000; handler/browser derive +5000/+10000. Run `npm.cmd run setup:ai` for zero-request validation, then restart `npm.cmd run dev`. Only the derived duration is public; provider/admin/development secrets remain server-only. No live verifier flags are authorized.

The current undeployed AI plan contains eight source/config files (including shared `timeouts.ts`) and the same six required server-only settings, with the timeout override optional. `ai/index.ts` reads that optional setting; no secrets were uploaded. Earlier seven-file plans below and JSON hash snapshots remain historical. Any future hosted apply requires separate approval of the current plan. No new key is needed for Phase 7 under the roadmap, and Phase 7 is not authorized.

## Prior targeted and recovery records — preserved history

# Current Phase 6 targeted planner status

6 November 2026 targeted result: LIVE PLANNER STILL BLOCKED. The single authorized synthetic request received upstream HTTP 504, category provider_http_5xx at http_headers; the local proxy returned HTTP 502. No output reached parsing or validation. Local application usage increased 2 → 3 of 5; no retry, model change or hosted operation occurred. The earlier failure’s upstream cause cannot be reconstructed. Current local regression checks passed; Phase 6 is not finally approved and Phase 7 remains unauthorized.

See [targeted correction](PHASE_6_PLANNER_CORRECTION.md) for root-cause limits, changes, official compatibility references and [actual live evidence](review/phase-6/targeted-planner-live.json).

## Earlier recovered documentation — retained history

# Phase 6 setup — controlled development

6 November 2026. Reuse the owner's existing Free, unbilled Google AI Studio project and existing key. The owner explicitly confirmed that billing is not attached. This is manual Dashboard evidence, not a billing API result. No account recreation, key rotation, billing activation or source-code edit is required. Existing `.env` is preserved byte-for-byte.

## Start locally

Use Node 22.13+ within 22.x or Node 24 LTS. From the project root on Windows:

```powershell
npm.cmd ci
npm.cmd run setup:check
npm.cmd run setup:ai
npm.cmd run dev
```

Open `http://127.0.0.1:5173`, open or create a guest trip, then open its itinerary and choose **Generate with AI**. Review the sharing notice and explicitly consent. Planning and assistant calls both use the same server quota. Do not expose Vite through a tunnel, reverse proxy or public host. No login is introduced. Manual planning, local saving and backups remain available when Gemini is unavailable.

`setup:env` is optional for a fresh checkout only and never overwrites an existing `.env`. `setup:ai` validates configuration locally and prepares a hash-based hosted plan; it makes zero provider requests and zero hosted writes. Arguments such as `--apply` are deliberately refused. `verify:ai` without flags prints a plan and makes no generation request.

The production build/preview intentionally has **no AI server**. It reports controlled-development availability guidance. This is not evidence of a failed hosted connection: hosted AI has not been authorized or deployed. Do not put a development bearer or provider key in a browser variable to enable it.

## Providers, accounts and official signup

| Provider                                | Current use / free plan                                                                                              | Account and official signup                                                                                                                  | Action for this owner                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Google AI Studio / Gemini Developer API | Optional Phase 6 inference, eligible unbilled Free tier; both exact approved models currently list free input/output | Google account and AI Studio project; [AI Studio](https://aistudio.google.com/), [Google account signup](https://accounts.google.com/signup) | Reuse existing project/key; Free/no billing manually confirmed     |
| Supabase                                | Existing discovery proxy/cache/quota on Free; proposed AI function/SQL only                                          | [Supabase signup](https://supabase.com/dashboard/sign-up)                                                                                    | Existing project reused; no remote action in Phase 6               |
| Geoapify                                | Existing discovery/location/routing on Free; application budget 100/day                                              | [Geoapify My Projects](https://myprojects.geoapify.com/)                                                                                     | Existing server key/settings unchanged; no new live Geoapify calls |
| OpenFreeMap / MapLibre                  | Existing optional map tiles/open-source renderer; keyless                                                            | [OpenFreeMap](https://openfreemap.org/), [MapLibre](https://maplibre.org/)                                                                   | No signup/key                                                      |
| Pexels                                  | No API use; licensed bundled photography                                                                             | [Optional Pexels signup](https://www.pexels.com/join/)                                                                                       | No account/key required                                            |

For a fresh Gemini installation only: (1) create/sign in to the Google account; (2) open AI Studio and accept applicable terms only if eligible; (3) open API keys / Projects, create or select a project without attaching billing; (4) choose Create API key for that project; (5) inspect its tier and model rate-limit page, confirming Free and eligibility; (6) copy the key privately into `.env`, set the exact models/budgets below, run `setup:ai`, then restart `dev`. Do not paste keys in chat. An operator must meet the [API terms](https://ai.google.dev/gemini-api/terms), age, country and permitted-use requirements. This prototype is controlled developer testing, not a public consumer AI service.

For a fresh Supabase discovery installation only: sign up, create/select a Free organization, choose New project, region/name and a private database password, then wait for healthy status. Confirm Free/spend cap in Billing/Subscription. For Geoapify, sign up, create a Free project and open API Keys. These steps are unnecessary for the existing owner. Discovery setup remains separately authorized; do not rerun old hosted apply commands merely to enable local AI.

## Exact environment configuration

| Variable                                         | Value/source and dashboard location                                                                  | Visibility / use                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                 | Existing AI Studio → API keys → key associated with the confirmed Free project                       | Confidential, server only; never `VITE_`                                                |
| `GEMINI_MODEL`                                   | `gemini-3.8-flash`                                                                                   | Non-secret server selection, exact allowlist                                            |
| `GEMINI_CHAT_MODEL`                              | `gemini-3.5-flash-lite`                                                                              | Non-secret server selection, exact allowlist                                            |
| `AI_DAILY_REQUEST_BUDGET`                        | `5`, local configuration; may be reduced to 1–5                                                      | Server limit; never raised automatically                                                |
| `AI_REQUESTS_PER_USER_PER_DAY`                   | `3`, local configuration; may be reduced to 1–3                                                      | Anonymous client counter, **not authenticated user identity**                           |
| `AI_DEVELOPMENT_TOKEN`                           | Blank template; not required locally because the server creates an ephemeral confidential capability | Future separately approved hosted AI only; at least 32 characters, server/operator only |
| `VITE_SUPABASE_URL`                              | Existing Supabase project Connect → Project URL                                                      | Intentionally public discovery URL                                                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                  | Project Settings → API Keys → Publishable key (`sb_publishable_…`)                                   | Intentionally public, not an admin credential or authorization boundary                 |
| `SUPABASE_PROJECT_REF`                           | Project Settings → General → Reference ID, matching URL                                              | Local setup target, no browser need                                                     |
| `SUPABASE_ACCESS_TOKEN`                          | Existing Account → [Access Tokens](https://supabase.com/dashboard/account/tokens)                    | Confidential scoped administration only; not used by local AI                           |
| `SUPABASE_DB_PASSWORD`                           | Existing project creation password / Database settings                                               | Confidential, unused by local AI                                                        |
| `GEOAPIFY_API_KEY`                               | Existing Geoapify My Projects → project → API Keys                                                   | Confidential discovery function only, unchanged                                         |
| `GEOAPIFY_DAILY_CREDIT_BUDGET`                   | Existing `.env` value `100`                                                                          | Existing server setting, unchanged                                                      |
| `FUNCTION_ALLOWED_ORIGINS`                       | Existing exact discovery origin list                                                                 | Unchanged; local AI derives exact loopback origins internally                           |
| `VITE_APP_NAME`, `VITE_APP_MODE`, `VITE_APP_URL` | Existing local public application configuration                                                      | Public; does not enable or secure AI                                                    |

After editing only environment values, run `setup:check`, `setup:ai`, then restart `dev`. Never edit application/SQL source for setup. Do not run discovery secret synchronization for Gemini. Supabase automatically supplies its runtime admin environment to Edge Functions; never put an administrative key into `VITE_` or the client.

## Quotas, privacy and failure recovery

The durable checkout-wide ledger is `.cache/ai-development-ledger.json`. It contains only request/client/content SHA-256 hashes and timestamps, never prompts, responses or trip records. All local callers, including live verification, share the UTC-day global ceiling of five. Anonymous clients have a three-request convenience ceiling, ten-second global spacing and sixty-second identical-content suppression. Changing client IDs cannot exceed the global budget. Started attempts remain consumed after cancellation/provider errors; there are no refunds, retries, continuation or paid/model fallbacks.

Do not delete/reset the ledger to bypass limits. It survives process restarts; this protects one controlled checkout, not other apps/keys/projects. A corrupt ledger, backward clock, linked file or unavailable quota store fails closed. A lock left by an interrupted process requires operator inspection that no server/verifier is running before removing only the stale `.lock`; never clear reservations. Untrusted people must not have local machine/file access. Provider RPM/TPM/RPD are separate project/model limits, not established by metadata. Provider daily resets can differ from the application's UTC day. Check [AI Studio rate limits](https://aistudio.google.com/usage?timeRange=last-28-days&tab=rate-limit) before intentional future verification; 429 stops without retries.

Only destination/country, selected dates, traveler count, budget/currency, interests, pace and the typed brief/chat are sent after consent. Existing activity titles are separately opt-in; selected saved place names may be sent without coordinates. Trip IDs/titles, day/activity notes, local exports, private documents, email and other personal records are excluded. Do not type sensitive information into free text. Free-tier content can be used for service improvement/human review under Google's terms; there is no private-document AI workflow. [Pricing](https://ai.google.dev/gemini-api/docs/pricing) and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) were checked on 6 November 2026, not guaranteed indefinitely.

## Live verification and safe commands

`npm.cmd run verify:ai -- --approved --free-project-confirmed` deliberately makes at most two small synthetic requests, one planning and one chat, through the shared handler/SDK/durable ledger. It requires two remaining reservations and stops at the first failure. Flags are an operator acknowledgment, not billing-tier verification. Do not run repeatedly to fill the daily allowance. Current actual outcomes are in [live evidence](review/phase-6/live-verification.json); metadata HTTP 200 alone is never inference proof. No prompt/response content is retained in review evidence.

Mocked regression checks make no Gemini requests:

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run build:e2e
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
npx.cmd playwright test
npm.cmd run review:zip
```

Use installed Chrome because bundled Chromium is unavailable here. On a machine with Playwright Chromium installed, omit the channel variable. Browser fixtures compile synthetic public configuration and use actual browser IndexedDB with mocked Gemini/Geoapify responses. Browser screenshot labels and the evidence manifest distinguish mocks from live checks. No confidential environment values are compiled into tests.

Normal browser screenshots go to ignored timestamped test output. The recovery review run sets `$env:SMART_TRAVEL_REVIEW_CAPTURE='phase-6-recovery'` immediately before `npx.cmd playwright test`, producing separately named `recovery-` images in the dedicated review folder. Do not add this test-only variable to `.env`. Existing valid review images are preserved; any incomplete screenshot is repaired from a completed new capture.

## Exact proposed hosted changes — NOT executed

Separate explicit setup approval is required before **any** hosted operation. `setup:ai` returns hashes without exposing keys. The proposed scope is:

1. Add only `supabase/migrations/202611060001_ai_quota.sql`, using its content-derived migration identity. It adds `ai_requests` (hashes/timestamps only), RLS/restricted grants, and atomic service-role-only `ai_reserve`; no personal trip/user tables or changes to discovery SQL.
2. Deploy only function `ai` from exactly seven files: `ai/index.ts`, `ai/deno.json`, `_shared/ai/contracts.ts`, `_shared/ai/config.ts`, `_shared/ai/gemini-provider.ts`, `_shared/ai/handler.ts`, `_shared/ai/postgres-quota.ts`. Its proposed `verify_jwt=false` is paired with an independent confidential operator capability; absent capability fails closed. CORS/client IDs alone never authorize it.
3. Synchronize only `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_CHAT_MODEL`, `AI_DAILY_REQUEST_BUDGET`, `AI_REQUESTS_PER_USER_PER_DAY`, `AI_DEVELOPMENT_TOKEN`. Reuse `FUNCTION_ALLOWED_ORIGINS` without changing discovery's settings. No secret upload tool is implemented/enabled by local approval.
4. Before an approved apply, reverify project identity/health/key, exact migration history/source hashes, scoped database/migration/function/secret permissions, owner Free/spend-cap confirmation and sufficient allowance. Any 403/mismatch stops; never broaden a token automatically or query organization metadata to override manual confirmation.

The proposed hosted function is for controlled operator/server-to-server verification only. A browser cannot receive its development capability. The local frontend currently uses the loopback backend, not this undeployed endpoint. Public AI exposure and production proxy deployment are not authorized. Deno/Supabase runtime, distributed quota and actual hosted AI remain unverified; embedded PostgreSQL and mocked HTTP are not a hosted test.

## Next phase

Phase 7 local organizer needs **no new provider, account or key**. Existing discovery/mapping stays optional; authentication, private cloud files, cloud trip sync and collaboration remain Phase 10. No Phase 7 implementation is authorized by this handoff.
