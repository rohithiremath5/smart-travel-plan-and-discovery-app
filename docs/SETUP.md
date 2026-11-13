# Current Phase 9 setup — local verification only

11 November 2026. Reuse the existing installation and populated environment without changes. No new provider, account, key, subscription, environment value or hosted setup is required. Run the documented lint/format/typecheck/test/build/E2E commands; tests use synthetic records and mocked/blocked external traffic. Disable all historical capture/live flags. Never execute backend/secret/deployment/live-verifier commands for this phase. [Phase 9 setup and exact commands](PHASE_9_SETUP.md). Authentication/cloud setup remains Phase 10 and needs separate approval.

## Prior setup guidance — retained history

# Current Phase 8 setup — local and keyless

11 November 2026. Reuse existing installation/.env unchanged: `npm.cmd run setup:check`, `npm.cmd run dev`. My trips → trip → Budget & weather. No new account/key/env/source edit. DB4 adds budgets; complete v4 exports accept valid v1–v3 imports. Close older tabs if upgrade is blocked; never reset storage.

[Phase 8 setup](PHASE_8_SETUP.md) explains defaults/formulas, dated references, weather eligibility/privacy/attribution, backups/printing and exact commands. No backend, migration, secrets, live verifier or billing command is needed/authorized. `review:zip` generates the separate Phase 8 ZIP/receipt, preserving earlier artifacts. All browser weather evidence is mocked; live verification and Phase 6/6.1 blockers remain pending. Phase 9 not authorized; auth/cloud remain Phase 10.

## Historical setup — preserved

# Current Phase 7 local setup — 11 November 2026

No provider/account/key or environment change is required. Reuse the existing installation and preserved .env: `npm.cmd run setup:check`, then `npm.cmd run dev`. My trips → trip → Organizer. Database v1/v2 upgrades additively to v3; complete exports are v3 and valid v1/v2 imports remain supported. Close older tabs for blocked upgrades; never reset the database. Organizer/backup/print work without integrations or login. [Full setup, optional existing provider references and privacy](PHASE_7_SETUP.md).

`npm.cmd run review:zip` creates the separate Phase 7 ZIP/receipt. No backend/secrets/migration/deployment/live verifier is needed or authorized. Phase 6/6.1 live blockers remain pending, with no retry. Phase 8 is not authorized; authentication/cloud remain Phase 10. Dated setup records below are preserved and do not authorize old hosted commands.

## Historical setup handoffs — retained

# Current Phase 6.1 live-verification blocker — 10 November 2026

The separately approved limited live task stopped before Geoapify calls: current project/key/health/v5 source/quota checks passed; `GET /v1/projects/{ref}/secrets` returned HTTP 403 (`edge_functions_secrets_read`) and current hosted budget/key could not be established. No permissions, source, `.env`, hosted settings or infrastructure were changed. [Findings](PHASE_6_1_LIVE_VERIFICATION.md) · [Current setup boundary](PHASE_6_1_SETUP.md). No new account/key/env variable is needed. Do not invoke a hosted setup/deploy/secrets/live command as a workaround. Existing curated/manual local development remains available via `npm.cmd run setup:check` and `npm.cmd run dev`; valid provider-consuming searches remain stopped pending owner review. Phase 7 is not started.

## Prior deployment/setup handoff — retained verbatim

# Current Phase 6.1 deployment handoff — 10 November 2026

Existing discovery is now ACTIVE v5, with the six reviewed source hashes verified after deployment. The limited deployment approval was executed once; no migration, secret, cache deletion, billing/auth or public frontend change. Nine actual non-provider checks passed. Reuse existing `.env` and accounts; no new value/source edit. Run `npm.cmd run setup:check`, then `npm.cmd run dev`. Valid live provider requests still need separate approval; no Geoapify/Gemini generation/search/location/route request was executed here. Do not rerun hosted setup/apply/secrets or live verifiers under the consumed approval. [Deployment and preservation report](PHASE_6_1_DEPLOYMENT.md) · [Current provider/setup boundary](PHASE_6_1_SETUP.md). `review:zip` generates the updated separate Phase 6.1 ZIP/receipt. Phase 7 remains unauthorized.

## Prior local setup — retained verbatim

# Current Phase 6.1 setup — 7 November 2026

Reuse existing accounts and `.env`; no new value or source edit. Run `npm.cmd run setup:check`, then `npm.cmd run dev`. All Phase 6.1 browser evidence uses mocked providers; no live verifier or hosted setup command is authorized. The current frontend's locality/state requests need a separately approved discovery deployment; curated/manual fallback works with the older function. See [PHASE_6_1_SETUP](PHASE_6_1_SETUP.md) for exact provider/signup/environment/dashboard/public-private reporting and pending six-file plan. `npm.cmd run review:zip` now creates the separate `smart-travel-phase-6-1-review.zip` and matching receipt, preserving accepted Phase 6 artifacts. Gemini, ledger and guards are unchanged. Phase 7 remains unauthorized.

## Historical Phase 6 setup — preserved

# Current Phase 6 setup

6 November 2026. Reuse the existing unbilled Free Gemini project/key; no account recreation or source edits. Run npm.cmd run setup:check, npm.cmd run setup:ai, then npm.cmd run dev. Open an itinerary → Generate with AI. AI is loopback-only; production preview has no AI backend. Existing Supabase/Geoapify discovery/mapping remains deployed and unchanged. No new hosted operation is authorized.

The authoritative current provider/signup/account creation/env/dashboard/public-private/command matrix, quota/privacy controls and exact pending hosted plan are in [PHASE_6_SETUP](PHASE_6_SETUP.md). review:zip now creates smart-travel-phase-6-review.zip plus its matching receipt. Phase7 needs no new credentials. Existing .env is preserved byte-for-byte, DBv2/completebackupv2/validv1 imports retained. Actual inference: assistant passed, planner failed/unverified; UI screenshots use mocks.

## Historical setup notes through Phase 5

The following dated setup text preserves prior context; its phase authorization and pending hosted statements are superseded by the current Phase6 instructions above and the completed historical Phase5 review. Do not execute old hosted commands based on this history.

# Current Phase 5 setup

5 November 2026. Phase 4 is approved; Phase 5 maps/location intelligence is authorized locally. Reuse the existing Supabase Free/Geoapify Free configuration; no new account/key, OAuth or source edit. The full current signup/account creation/env/dashboard/key visibility/command matrix and exact pending hosted gate are in [PHASE_5_SETUP](PHASE_5_SETUP.md). Local commands: npm.cmd run setup:check, npm.cmd run setup:mapping, npm.cmd run dev. setup:mapping without --apply makes no hosted/network changes. No secrets synchronization is needed.

Guest database version 2 and backup version 2 stay unchanged; valid v1 imports remain supported. Location name/coordinates use existing activity fields. The map is keyless and optional; live Geoapify location/routing needs a separately approved additive quota migration plus discovery deployment. No remote modification or new live Geoapify test has occurred in Phase 5. The earlier local storage/provider guidance below remains applicable; its old Phase 4 approval timing is historical. Phase 6 will need a separately reviewed server-only GEMINI_API_KEY and eligible unbilled Google AI Studio project, not OAuth; no credential is requested now.

# Setup and configuration

Updated 5 November 2026 for the owner-approved guest-first roadmap. Phase 3 requires no new accounts, OAuth, Auth settings, migrations or hosted operations. Phase 4 also requires no additional credentials. Existing Supabase/Geoapify configuration and Phase 2 live infrastructure remain intact. Historical Phase 0–3 implementation/review reports and archives retain their actual evidence; their future account timing is superseded by the revised PHASE_PLAN and decision D039.

## Local development

Use Node 22.13+ within 22.x or Node 24 LTS and npm. This Windows workspace uses Node 22.17.1/npm 10.9.2. Run from the project root:

    npm.cmd ci
    npm.cmd run setup:env
    npm.cmd run setup:check
    npm.cmd run dev

setup:env never overwrites an existing .env. On other shells use npm. Open http://127.0.0.1:5173. Guest dashboard, manual itineraries and curated discovery need no credentials. Existing live discovery uses the previously configured backend. Configuration presence is not a fresh live test. No application source or SQL changes are required from the user.

Open My trips, create a trip through seven steps, review and save. Reopen after refresh in the same browser profile and origin. Different browsers/ports/origins have separate storage. Curated destination references reuse approved photography; manual/provider places without licensed imagery use an honest placeholder.

## Local storage and recovery

Saved destinations keep database smart-travel-discovery version 1 and their existing object store unchanged. Trips and itineraries share smart-travel-trips version 2, centrally opened/migrated by trips-database.ts. The additive upgrade retains every existing v1 trip record and adds an itineraries store keyed by tripId; UUIDs, schema/revision/timestamps, date-only travel dates and minor-unit budgets. UI uses typed TripRepository and ItineraryRepository contracts, never IndexedDB transactions directly. Every itinerary mutation validates day/activity references, checks its revision and updates trip metadata in the same transaction. Date edits preview keeping calendar dates versus shifting by day number; removing any content requires explicit consent. Trip deletion atomically cascades to its itinerary. Unsupported future records/versions are not deleted or reset. A stale edit/delete fails until the user reloads the latest record. Close older application tabs if storage is blocked.

Browser storage may be evicted, cleared, unavailable in private mode or full. It is not encrypted cloud backup, account isolation or cross-device synchronization. No guest trip is silently sent to Supabase. Keep sensitive documents out of this manual planning workflow. Wizard entries remain transient until the final confirmation; use its Back/step controls to retain edits, and save before leaving. Refresh/closing warns about unsaved edits where the browser supports beforeunload; browser history navigation does not provide draft recovery.

From My trips choose Export trips. It downloads an unencrypted version-2 JSON envelope containing validated trip metadata and complete itineraries: dates, activities, IDs, ordering, wall-clock times, descriptions, notes, location/coordinates and estimated costs/currencies, with no credentials, provider settings or private documents. Keep the file outside this repository and private. Limits: at most 200 trips, 366 days per trip, 200 activities per trip, 100 per day, 2000 characters per day note and 10 MB per file; at most 200 trips in the device workspace. A heavily populated workspace can exceed the byte limit. Export individual complete trips using Export this trip in the planner; each bounded trip fits within the file limit. No partial backup is downloaded on size failure. A size or browser error reports failure; do not assume a backup was created. Delete only after retaining a copy if needed.

Choose Import trips and select a valid v1 metadata-only or v2 complete export. Legacy v1 imports create empty itineraries; a populated existing trip is preserved as the original and conflicting metadata-only imports become separate copies. Review the counts/names, then explicitly Confirm import. Identical trip-plus-itinerary content is skipped; a divergent record with an existing ID is copied under a new trip ID with new activity IDs. Originals are never overwritten. Commit rechecks the current store atomically, so another tab cannot turn preview into an overwrite. Reimporting a copied trip skips the identical content. Invalid/unknown schemas, date ranges, fields, duplicate file IDs and oversized files are rejected before any write. Failed imports preserve existing records. Exports are not attachments for support/review ZIPs; never include actual user trips in review artifacts.

## Providers at phase start and handoff

| Provider | Phase 4 requirement                                                                               | Free/account/signup                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase | Existing discovery proxy/cache/quota only; not needed for guest trip persistence                  | Existing Free project reused. Fresh installations only: https://supabase.com/dashboard/sign-up                                                        |
| Geoapify | Optional existing worldwide destination selection; local/curated/manual creation works without it | Existing Free account reused; provider advertises 3,000 credits/day. Existing app cap remains 100/day. Fresh signup: https://myprojects.geoapify.com/ |
| Pexels   | No API; already bundled licensed/attributed files                                                 | No account/key needed. Optional signup https://www.pexels.com/join/ is not required; do not request a new API key                                     |

No existing account or valid key needs recreation. Full provider evidence and historical live setup are in [Phase 2 setup](PHASE_2_SETUP.md) and [Phase 2 review](PHASE_2_REVIEW.md). Do not rerun hosted apply/secrets commands in Phase 4: no new hosted modifications are authorized.

For a fresh discovery installation only (not needed here): sign up to Supabase, create an organization on Free, choose New project, name/region/password and wait for healthy status. Sign up to Geoapify My Projects, create a Free project, open API Keys. Copy only the appropriate values below into .env; backend setup still needs separate explicit approval. Never enable billing or create OAuth credentials for guest trips.

| Variable                                                 | Dashboard/source                                                        | Public or confidential / current use                             |
| -------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| VITE_SUPABASE_URL                                        | Supabase project Connect dialog → Project URL                           | Public discovery origin                                          |
| VITE_SUPABASE_PUBLISHABLE_KEY                            | Settings → API Keys → Publishable and secret API keys → Publishable key | Public sb_publishable format; not a JWT/admin key                |
| SUPABASE_PROJECT_REF                                     | Settings → General → Reference ID                                       | Local target; must match the project URL                         |
| SUPABASE_ACCESS_TOKEN                                    | Account → Access Tokens, https://supabase.com/dashboard/account/tokens  | Confidential local administration only; unused by guest trips    |
| SUPABASE_DB_PASSWORD                                     | Password chosen at creation; Database → Settings                        | Confidential; preserved, unused in Phase 4                       |
| GEOAPIFY_API_KEY                                         | Geoapify My Projects → existing project → API Keys                      | Confidential function-only; never VITE_                          |
| FUNCTION_ALLOWED_ORIGINS                                 | Local .env exact origin allowlist                                       | Server discovery setting, unchanged                              |
| GEOAPIFY_DAILY_CREDIT_BUDGET                             | Local .env, existing value 100                                          | Server budget, unchanged; do not raise for review                |
| VITE_APP_NAME, VITE_APP_MODE, VITE_APP_URL               | Local .env; auto/demo/live and exact local origin                       | Public app configuration; not authentication or connection proof |
| PEXELS_API_KEY, GEMINI_API_KEY and other future settings | Retain existing optional values privately if present                    | Not required/used/synchronized by Phase 4                        |

Only intentionally public app/Supabase config enters browser builds. Admin/provider secrets remain excluded; scripts never synchronize the whole .env. Exact four existing discovery function settings remain described in PHASE_2_SETUP. No source changes are needed after configuring .env; run setup:check then dev. No hosted setup command is required for this installation.

## Verify and review

    npm.cmd run lint
    npm.cmd run format:check
    npm.cmd run typecheck
    npm.cmd run test
    npm.cmd run build
    $env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
    npm.cmd run test:e2e
    npm.cmd run review:zip

Use an installed Chrome or install Playwright Chromium once and omit the channel setting. Tests use synthetic records/public configuration, isolated fake IndexedDB for unit tests and real browser IndexedDB for E2E. Provider responses are mocked for regression tests; no Phase 4 live API result is implied. Real .env files are disabled for Vitest. Vitest uses two isolated workers to keep Windows memory/worker startup bounded. Browser reports use timestamped ignored directories; screenshots in docs/review/phase-4 contain synthetic test trips only. NODE_OPTIONS=--use-system-ca may be used for Node HTTPS in this environment; never disable TLS verification.

review:zip generates smart-travel-phase-5-review.zip from allowlisted source/docs/assets/dedicated review screenshots. It excludes populated env files, dependencies, builds, caches, reports/traces, earlier ZIPs, export directories and trip backup JSON envelopes, scans configured/common credentials without revealing them, and verifies archive inventory/content hashes. Scans do not prove absence of every secret. Earlier ZIPs/receipts are unavailable in the current workspace for archive-baseline comparison; no prior archive was deleted or regenerated in Phase 5. Existing historical reports/screenshots are retained.

## Future setup gates

Phase 4: no new provider, account, credential or hosted migration; local itinerary repository authorized and implemented. Phase 5 (authorized locally; hosted setup separately gated): no new account/key expected for the open-source MapLibre renderer or keyless OpenFreeMap public tiles; official information https://maplibre.org/ and https://openfreemap.org/ (no signup required). Reuse existing GEOAPIFY_API_KEY only server-side and existing public Supabase discovery configuration. Recheck free terms/attribution and existing Geoapify route cost/cap. Phase 6: separately approved server-side Gemini free model/key and controlled-development abuse protection if public anonymous use cannot be secured; no early login. Phase 7: local organizer/backup; private cloud documents remain deferred. Phase 8: verify Open-Meteo intended non-commercial use and keyless Frankfurter; retain manual fallback. Phase 9: complete guest-product review, no OAuth or unrestricted AI publication.

Phase 10 only: approve Google versus GitHub OAuth, obtain its exact credentials then, configure Supabase Auth/profiles/private-trip RLS and cloud repositories through safe scripts, and offer explicit consent/preview/import with retained originals and recovery. No OAuth application is approved now. Publication, billing and messages are never implied by phase approval. If final work is too large, propose separately approved sub-milestones. All provider terms/quotas must be rechecked in their actual integration phase.
