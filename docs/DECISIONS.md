# Decision record

**Current authority: owner-approved D039 below, 4 November 2026. Revised Phase 3 is guest/local only; old Phase 3 account, Phase 7 collaboration and Phase 9 publication timing in the retained historical records is superseded. Authentication/cloud/collaboration now wait until final Phase 10.**

Date: 4 November 2026. The user explicitly approved Phase 0 and authorized Phase 1 only. The Phase 0 decision history below is retained; it does not authorize future integrations or phases. Update decisions rather than silently changing providers, scope, or phase authorization.

| ID   | Decision                                                           | Reason and consequence                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D001 | Execute Phase 0 documentation only                                 | The master prompt explicitly gates implementation; no package, source tree, backend, or UI is created.                                                                                                                              |
| D002 | Editorial discovery plus a focused itinerary/map workspace         | Highest design score for clarity, mobile usability, and feasibility; keep imagery secondary inside the planner. See [UX research](UX_RESEARCH.md).                                                                                  |
| D003 | Keep required React/Vite/TS stack; install incrementally           | Meets user requirements without premature feature modules; exact compatible versions are verified at implementation time.                                                                                                           |
| D004 | Use Supabase as the sole planned backend                           | Database, auth, storage, functions, and useful realtime fit one service boundary and a free portfolio scale, subject to quotas.                                                                                                     |
| D005 | Use server proxies for Geoapify/Pexels/Gemini                      | Confidential provider credentials never enter Vite bundles. Phase 2 needs limited proxy/cache/quota infrastructure before Phase 3 account data.                                                                                     |
| D006 | Local/cloud repository contracts with explicit storage choice      | Credential-free demo remains useful; cloud failure never silently changes the source of truth or uploads local data.                                                                                                                |
| D007 | Distinguish persistence from each provider capability              | A cloud trip can contain bundled imagery; missing AI cannot disable manual editing. Demo/AI/provider/user provenance remains visible.                                                                                               |
| D008 | Treat Gemini model as provisional; verify before enabling          | The requested 2.5 Flash is deprecated. Draft uses the user's optional 2.5 Flash-Lite, but 2.5 access may be unavailable to new projects. Explicitly choose a verified free model in Phase 6; never rely on automatic alias routing. |
| D009 | No unrestricted global AI promise                                  | Current free-service terms have age/region restrictions. Phase 6 must resolve audience enforcement; otherwise disable AI rather than use paid processing.                                                                           |
| D010 | Licensed bundled images are the baseline; Pexels optional          | New API keys are paused. Existing-key integration can remain; asset license/provenance review belongs to Phase 2. No provider substitution is needed for a functioning demo.                                                        |
| D011 | Public hosted email auth is conditional; propose GitHub OAuth      | Supabase's default sender cannot deliver general signup/recovery mail. OAuth registration is additional account setup requiring approval in Phase 3. No SMTP provider is selected automatically.                                    |
| D012 | Invitation links initially shared by user action                   | Avoids promising free transactional email; tokens still require identity/role/expiry checks. No messages are sent in Phase 0.                                                                                                       |
| D013 | Weather off until intended use is eligible                         | Open-Meteo excludes commercial/promotional activity from the free endpoint. A portfolio label alone does not settle eligibility.                                                                                                    |
| D014 | Frankfurter v2 with supported pairs and dated estimates            | Current docs go beyond older ECB-only v1 examples. Preserve original money and use default blended rates subject to verified terms.                                                                                                 |
| D015 | Durable global quota reservation, bounded shared cache             | In-memory limits cannot coordinate multiple function instances. Public proxy CORS/publishable keys do not prevent abuse; usage caps bound upstream exposure.                                                                        |
| D016 | One authoritative owner field; roles enforced server-side          | Prevents duplicate owner state, membership escalation and UI-only permissions. Use composite trip/child constraints and adversarial policy tests.                                                                                   |
| D017 | Optimistic version checks and atomic daily reordering              | Realtime notifications alone cannot prevent lost updates; AI drafts must also compare the target version.                                                                                                                           |
| D018 | Private documents never enter AI, demo seeds, logs, or review ZIPs | Protects sensitive organizer content; storage object access is tested separately from metadata.                                                                                                                                     |
| D019 | Cloudflare Pages is a candidate static host, not a deployment      | Retains one backend; free URL removes domain cost. Recheck terms and require explicit live-deployment approval in Phase 9.                                                                                                          |
| D020 | System fonts and self-contained design sketches                    | Avoids extra font providers/accounts; no paid image generation or screenshot fabrication during research.                                                                                                                           |

## Decisions awaiting future evidence

- Exact dependency/runtime versions: Phase 1, then recheck later integrations.
- Pexels availability and per-photo licenses: Phase 2.
- Actual Supabase/Cloudflare signup/card flows: when the user provisions the relevant free accounts; stop if payment is required.
- Approval of OAuth account choice vs. an independently verified free SMTP option: Phase 3.
- Geoapify route parameter cost bounds and exact cache sizing: Phase 5.
- Actual Gemini project model/quota, audience eligibility/enforcement, generation size bounds: Phase 6.
- Open-Meteo intended-use eligibility: before Phase 8 live use.
- Final host target, origin/redirect/security headers and live publication: Phase 9 with explicit deployment approval.

These are future integration gates, not blockers to completing documentation or starting the separately approved Phase 1 foundation.

## Phase 1 decisions

| ID   | Decision                                                                       | Reason and consequence                                                                                                                             |
| ---- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| D021 | Implement the foundation locally, without hosting or service integration       | Explicit Phase 1 authorization; preserve all future phase gates.                                                                                   |
| D022 | Adapt shadcn/ui-style source primitives around Radix and semantic CSS tokens   | Own the accessible components without a paid registry or overwriting the approved visual language; include configuration and license notices.      |
| D023 | Use an original SVG compass motif rather than travel content                   | Gives the shell an editorial visual identity while destination discovery/photos remain Phase 2.                                                    |
| D024 | Allowlist public build configuration; disable automatic Vite env-prefix export | Protects accidental `VITE_` secret names and excludes all future provider/admin values from client config; invalid settings report names only.     |
| D025 | Keep all live capability claims disabled in Phase 1                            | Credentials cannot activate unimplemented services. `live` mode shows an unavailable notice. The form example affects only its local sample.       |
| D026 | Lazy-load the design-system page                                               | Keeps form/schema libraries out of the initial shell chunk; no unused future feature modules.                                                      |
| D027 | Pin patched minimatch 11.0.4 through npm overrides                             | The lint tree otherwise included an affected glob parser. Verify compatibility with lint and lockfile checks; no blanket forced audit downgrade.   |
| D028 | Test production output with Playwright and axe at all four widths              | Check real navigation, deep links, focus, dialog/tab/form states, overflow, and accessibility; system Chrome avoids another download.              |
| D029 | Allowlist review inputs, scan secrets, and verify archive hashes               | Reject links/special files and populated credential templates; exclude private files and generated outputs; preserve the separate Phase 0 archive. |

## Phase 2 decisions

| ID   | Decision                                                                         | Reason and consequence                                                                                                                     |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D030 | Separate curated and worldwide search with truthful labels                       | Curated keywords/interests cannot honestly be inferred from geocoding. Live mode uses city/country types and nearby categories.            |
| D031 | Bundle four licensed Pexels scenes at 640/1280 widths                            | No API key or runtime image CDN; provenance accompanies each image. Unknown live places get an honest photo fallback.                      |
| D032 | Save versioned snapshots in IndexedDB only                                       | No Phase 3 accounts/trips. Confirm only after transaction completion; storage failures visible.                                            |
| D033 | Restrict one function to four bounded operations                                 | No arbitrary paths/URLs, geometry/isolines, traveler data, or secret forwarding. Pure shared contracts; runtime platform secrets.          |
| D034 | Database-serialized quota/cache with leases and hard bounds                      | 2000 credits/day maximum, 275 ms spacing, one-credit operations, 24-hour/256-record cache. Fail closed; outside exhaustion still possible. |
| D035 | Setup defaults to local plans; apply requires separate approval and exact target | Content-hash migration names, single function deployment without pruning, allowlisted HTTPS secret bodies; no secret temp files.           |
| D036 | Validate the public key against authoritative project metadata                   | Anonymous REST schema returned 401 despite a matching key. Metadata confirmed it; no rotation/auth change justified.                       |
| D037 | Test SQL in embedded PostgreSQL and browsers with synthetic public config        | No private .env dependency or provider credits. Full Supabase/Deno and distributed hosted checks remain separate.                          |
| D038 | Report provider setup at every phase start and handoff                           | User-added permanent requirement; reuse accounts and preserve existing credentials.                                                        |

### Phase 2 hosted verification addendum — 4 November 2026

- Accept the user's explicit Supabase Dashboard Free-plan confirmation as manual evidence for this approved setup. Do not represent it as an organization API response or retry the earlier organization 403 with broader access. Identity, key, migration-history and project-permission checks still apply.
- Deploy only discovery through the documented multipart Management API after the CLI upload returned a transport failure. Keep the same scoped token/project and upload only the entrypoint plus its three shared dependencies. This changes setup transport, not application architecture or deployment scope.
- Accept empty successful acknowledgments only on the secret-upsert write; metadata reads still require valid JSON. Redact deployment diagnostics and retain finite deadlines. No automatic permission broadening.
- Use the approved 100-credit final application limit. Exercise live quota rejection with a temporary one-credit setting and restore 100, without exhausting credits or mutating quota tables directly. Retain explicitly reviewed PNGs only in the dedicated Phase 2 screenshot directory of the review archive.

## D039 — Guest-first, local-first development; authentication deferred to final phase

Date: 4 November 2026. Explicit owner architecture change; supersedes authentication-first timing in D011 and the old future Phase 3/7/9 roadmap, without deleting historical decisions or completion evidence.

Reason: validate a genuinely useful complete travel application before account infrastructure. Advantages: lower setup burden, usable guest planning, offline local metadata and independent repository testing. Trade-offs: browser/profile-specific storage, eviction and no automatic cross-device backup, no authenticated collaboration or private cloud documents until Phase 10. Local data is not an authorization boundary or encrypted vault.

Phase 3 implements typed TripRepository plus IndexedDB adapter, UUID relationships, date-only dates, minor-unit budget and revision conflicts; preserve saved destinations in their established database. Explicit bounded validated JSON export/import provides user-controlled recovery without overwrites. Later itinerary/checklist/expense repositories arrive only in their own phases.

Supabase remains selected for the existing secure discovery proxy/cache/quota, future secure Gemini, and final Auth/RLS/cloud/storage/realtime. Do not deploy new hosted infrastructure now. Guest trip data never enters discovery shared caches or silent cloud writes. Phase 6 anonymous AI is restricted to controlled development if public abuse protection is insufficient; no early login workaround.

Future Phase 10 import needs consent, preview/duplicate/conflict handling, local→cloud ID mapping, idempotent import receipts, progress/retry and recovery, retained originals and safe rollback of newly imported records. Guest access continues alongside explicitly selected cloud workspaces. OAuth provider choice is deferred until Phase 10. No personal document upload/sharing before authenticated authorization is approved. Phase 4 needs no new keys.

## D040 — Atomic local itinerary aggregates and coordinated upgrade

5 November 2026. Phase 4 authorizes a central smart-travel-trips database version 2 opener used by every repository. Add an itineraries store keyed by trip ID; retain version-1 trip records and the independent saved-destination database. One bounded itinerary aggregate contains dated days, notes and stable activity IDs with revision conflicts. Trip date edits reconcile by calendar date or explicit relative-day shift with preview and explicit consent for any discarded content. Deletion cascades atomically; version-2 backups include complete aggregates, accept old version-1 metadata exports, remap conflict-copy IDs and never overwrite originals. No hosted migration or Phase 5 integration is authorized.

Phase 4 completion addendum: product exports use strict v2 snapshots; keep the v1 metadata helper for compatibility but never use it from product export controls. Raise the UTF-8 file cap to 10 MB for complete itineraries, retain 200-trip capacity and bounded 200 activities/trip (100/day), and provide complete per-trip export when a workspace exceeds the cap. Canonical content fingerprints include ordered itinerary data and notes while excluding IDs/revisions/timestamps; conflict copies remap IDs, duplicates skip, and originals never overwrite. Manual ordering persists independently of wall-clock times. Loaded-session offline editing does not imply a service-worker/cold-reload guarantee. All future integrations remain gated.

## D041 — Approved Phase 5 mapping and separate hosted gate

5 November 2026. Owner approved Phase 4 and authorized maps/location intelligence only. MapLibre and keyless OpenFreeMap render a lazy, optional map beside the existing local itinerary. Geoapify geocoding/routing stays behind the existing discovery function with explicit request actions, cache and shared durable quota. No new account/key, personal cloud records or auth. Extend contracts locally and preserve v1/v2 backups and database version 2. Hosted changes remain separately gated; do not deploy or claim live routing from mocks.

## D042 — Bound local routing, keep existing persistence, and report live gates honestly

Phase 5 reuses existing activity locationName/latitude/longitude; no IndexedDB or backup version change. Saved coordinates mean user selected/entered, not permanent provider verification. Fit handles the antimeridian and actual provider route extents. Optional map loading isolates large renderer/worker assets and offline/WebGL failures from manual planning. Shared quota gets an additive service-only weighted overload, with non-refundable 20-credit route reservations, max six stops within 25km and accepted geometry ≤500km/5000 points; preserve old discovery RPC/migration. Official long-distance pricing examples differ, so live billing compatibility remains explicitly unverified until approved. No source/SQL edit or new secret is required from the owner. setup:mapping is default-local; only a subsequent explicit hosted approval permits migration/deploy/≤41 reserved-credit live review.

## D043 — Limited hosted approval stops on mandatory quota-read permission

5 November 2026. The owner accepted local Phase 5 and approved only its reviewed weighted migration, discovery deployment and ≤41 additional reserved-credit live verification. Exact project/health/key, Phase 2 history and ACTIVE discovery identity passed read-only checks; accepted ZIP source hashes match. The required current-usage read returned HTTP 403 for project-scoped database_read. Stop before all writes/provider calls; no workaround, organization access, secret change or broader token. The owner subsequently satisfied the Dashboard reconfirmation requirement, confirming Free with spend cap enabled as manual evidence. Record the blocked attempt separately from accepted local/mock/tile results. Phase 6 remains unauthorized.

## D044 — Scoped read permission resolved; execute only the reviewed mapping setup

5 November 2026. Owner replaced the setup token with project-scoped database_read, retaining intended migration/function permissions. Fresh preflight confirmed 0/100 usage and manual Free/spend-cap evidence; no organization endpoint. Apply only reviewed weighted SQL and discovery six-file deployment (ACTIVE v4). Actual Geoapify search, walk/drive, repeated walking cache and legacy Kyoto cache succeeded; invalid inputs return 400. Usage 0→1→21→41, provider invoice cost not independently verified. Browser review reuses only checked unexpired cache entries; no extra upstream calls. One response-body instrumentation race was fixed locally and the failed 768px capture rerun successfully. No Edge/application source change, secret sync, auth/billing/frontend hosting or Phase 6 work. Preserve prior blocked evidence separately.

## D045 — Exact Gemini models and controlled local implementation

6 November 2026. The owner supplied full Phase 6 scope after the model amendment and manually confirmed Free/no billing. Keep exact stable gemini-3.8-flash planner and gemini-3.5-flash-lite assistant; SDK 3.0.0 remains server-only. Metadata visibility is not generation proof. Use a loopback Vite backend with network/Host/Origin checks, internal confidential capability and durable hash-only global5/client3 quotas. Client IDs are untrusted counters; no public anonymous endpoint or early login. Prepare only an undeployed ai function and additive quota SQL; hosted apply/secrets need separate approval. No retry, continuation, paid tools or model fallback.

## D046 — Transient AI drafts and atomic explicit application

6 November 2026. AI context excludes private notes/documents/exports/IDs/coordinates; sharing is explicit, existing activity names separately optional. Exact-day structured/Zod validation rejects inconsistent/incomplete output. Drafts/chat stay in memory; select/reject/cancel has no persistence. Selected additions/replacements use one repository transaction with expected trip+itinerary revisions. Preserve stable IDs/order/notes/cost/location by default; replacement and new coordinates require explicit consent. Retain DBv2/recordsv1/backupv2 and validv1 imports. Cap one request at14days to avoid hidden multi-call spending. Actual assistant inference passed; the first planner attempt failed and was not retried, with its reservation retained. Do not turn mocked previews into a live-generation claim.

## D047 — Single targeted planner attempt and safe stage diagnostics

6 November 2026. Owner provisionally accepted the local Phase 6 implementation but withheld final approval pending real planner verification. Keep exact models, request schema, LOW thinking and bounded token/deadline settings. Classify HTTP status before SDK error-body parsing and combine SDK/caller abort signals. Record only stages/categories/numeric statuses. A persistent one-attempt guard protects the new verify:planner command; the old two-model verifier is not used. Offline tests pass. Exactly one actual request received upstream HTTP504 at http_headers, provider_http_5xx; local usage2→3/5. No output JSON/preview success is claimed. The original failure remains retrospectively undetermined; the current measured blocker is upstream HTTP504, not local timeout or serialization. Stop without retry or model/billing/hosted change. Phase7 remains unapproved.

## D048 — Offline bounded timeout policy

7 November 2026. Owner authorizes local timeout correction only, with zero live generation and zero hosted changes. The installed SDK sends X-Server-Timeout from httpOptions.timeout; the prior 30-second value plausibly contributed to upstream 504, without proving causation. Default provider/handler/browser deadlines become 75/80/85 seconds, derived from optional bounded AI_PROVIDER_TIMEOUT_MS (1000–100000). Preserve cancellation, quotas, models, one-attempt guard and all historical evidence. Separate actual upstream504/provider_deadline_exceeded from ai_timeout; no retry/fallback. Any future single synthetic attempt needs new explicit approval and a new exclusively created guard, preserving the old consumed guard and ledger. Phase7 remains unauthorized.

## D049 — New one-use guard and measured upstream deadline

7 November2026. Owner separately authorized one local synthetic planner request after accepted offline correction. Reuse manual Free/no-billing evidence for unchanged key/project; verify published Free Standard eligibility and local quota, disclose inaccessible active project rate limits. New verifier uses fresh documented preflight, exact75/80/85 deadlines, exclusive new guard and existing local handler/SDK/durable quota. Single request received actual upstream/local HTTP504 at http_headers after71.398s; no output parsing. Usage0→1/5 today, all three prior records preserved. No retry/assistant/fallback/hosted change. Both guards remain consumed; real planner generation remains unverified, Phase6 not finally approved, Phase7 unapproved.

## D050 — Local administrative destination compatibility

7 November 2026. Owner authorizes Phase 6.1 discovery compatibility only. Default to documented locality search, expose explicit city/state/country filters and preserve actual response geography, IDs and coordinates. Reject POIs and invalid required fields; optional type/context extends saved destination references without a database or backup version change. A small official-source name registry offers explicit choices, separately labels a possible typo, and never invents provider results or silently retries. Version destination caches as destinations-v2 without deleting old rows; nearby/mapping namespaces and the 100-credit daily budget remain unchanged. Offline/provider-mocked tests and new before/after screenshots only. No live provider request, hosted deployment/migration/secret or Gemini/ledger/guard change; Phase 7 remains unauthorized. A separate six-file discovery deployment and bounded live plan await future explicit approval.

## D051 — Controlled discovery-only deployment

10 November 2026. Owner accepted Phase 6.1 locally and authorized only the existing discovery redeployment. Accept current manual Dashboard Free/spend-cap confirmation; use existing scoped token, no organization endpoint/privilege expansion. Verify project/key/health, two migration hash identities, v4 identity/configuration and historical mapping source before the reviewed six-file multipart upload. Invoke deployDiscovery directly, never combined migration setup. Exclusive guard and audited fetch permit one deployment POST only. Result ACTIVE v5, same identity/JWT/entrypoint; six downloaded original source-map hashes match the approved plan, migration/function inventory unchanged. Nine actual fixed invalid/gate/CORS probes exit before quota acquisition; zero live provider request/credits, SQL/secret/billing/auth/frontend changes. Existing Gemini state/history stays unchanged. Live Geoapify functionality remains unverified and requires separate approval; Phase 7 is not started. Preserve earlier Phase 6.1 evidence as dated history and package the new deployment addendum.

## D052 — Limited live task stopped on required read permission

10 November 2026. Owner separately authorized one maximum-five-credit verification with no retries/hosted changes. Reuse today's manual Supabase Free/spend-cap evidence; owner confirmed Geoapify Free, remaining allowance and paused searches. Verify current project/key/health and ACTIVE v5 body, then read quota (used 0/100, no active leases). Read-only secret metadata returned HTTP 403 requiring edge_functions_secrets_read, so current hosted budget/key was not established. Stop before provider calls rather than infer a current secret from local config/history or broaden permissions. Zero provider requests/reservations; no after-stop quota read, SQL write, deployment, secret update or Gemini operation. All planned search/detail/cache/live UI cases remain unattempted. Preserve deployment and prior evidence; record the exact blocker and package offline regressions. Further verification awaits owner review; Phase 7 remains unstarted.

## D053 — Independent local Phase 7 authorization

11 November 2026, owner attachment dated 10 November. Implement only local notes/checklists/packing/templates/progress/backup/native print. Pending Phase 6 planner and Phase 6.1 provider verification do not block local work; preserve failed evidence and restrictions. No live API/hosted change, auth/cloud/attachments or Phase 8–10 work. Complete local checks, separate review archive/receipt and stop for review.

## D054 — Additive organizer aggregate and dual-revision writes

Add only a trip-owned organizers store through shared DB v3 opening. Strict bounded schema-v1 records and stable child IDs, no UI transactions or rewriting old valid records. Save organizer and touched trip atomically after checking both revisions. Deletion/import include all three stores. Conflict editors retain drafts and require reviewing the latest saved content then explicitly saving; failed/blocked/unavailable storage never reports success.

## D055 — Complete v3 backup and opt-in private print content

Product exports include all trip/itinerary/organizer data; valid v1/v2 imports derive missing empty aggregates. Retain 10 MB and 200-trip limits, strict schemas/relationships, previews, conflict copies, child-ID remapping and atomic commits. Organizer content participates in duplicate detection. Native print uses one selected snapshot, A4 CSS and explicit private-note selections, off initially; no PDF service or new dependency. Browser persistence is not cloud backup; exported/printed documents are unencrypted personal data.

## D056 — Resume narrowly approved Phase 8 locally

11 November 2026. Owner reaffirms continuation after interruption. Keep surviving budget/currency/weather code and compatible additive storage changes; finish only local estimates/actual expenses/static currency/eligible explicit-action weather, backup/print/tests/review delivery. Dark mode/AI packing deferred; no hosted/live-provider/auth/cloud/Phase 9 work. Use baseline hashes because Git is not initialized, preserve historical evidence and consumed guards.

## D057 — Exact estimates and frozen actual conversions

Use bounded integer minor units/meters/basis points with BigInt intermediate ratios and half-up rounding. Shared transport depends on vehicles/distance, not passenger count. Explicit total/return choice; ceil rooms and editable nights. India defaults are illustrative, foreign prices start at zero. Estimates and actual expenses remain separate, with each expense preserving its rate/date/source; later edits never silently reprice it. Preserve overrides after trip changes and require explicit reset/currency/conflict review.

## D058 — Dated static currency, no live FX

Bundle only verified 2026-11-10 ECB EUR-base quotes (INR/USD/GBP/JPY) and EUR identity. AED/unquoted pairs require user references. Persist exact ratios/date/source, respect currency decimal conventions, reject unsupported codes and inconsistent converted amounts. No Frankfurter or external FX request.

## D059 — User-controlled non-commercial weather

Open-Meteo's free hosted endpoint requires eligible non-commercial use; no signup/key/env or paid fallback. Direct CORS HTTPS after acknowledgement/action, verified existing coordinates only; no browser location or geocoding. Up to 16 provider-local days, no fabricated future/past data. Ten-second abort, no retry, body/schema/date validation, session cache, cooldown, explicit refresh and visible attribution. All verification uses fixtures/mocks; no live request or hosted proxy.

## D060 — Additive local DB4 and complete backup4

Add only trip-owned budgets through the centralized opener. Dual-revision transactional budget/trip updates, four-store snapshot/import/delete and bounded strict schemas preserve old data. Include budget content in duplicate fingerprints and remap conflict child IDs. Accept valid v1/v2/v3 backups, retain 10 MB/200-trip limits and preview/cancel/no-overwrite semantics. Print estimates/actual category totals only by separate opt-in, private notes off, no expense descriptions or weather cache in printed totals/backups.

## D061 — Local Phase 9 approval and independent baseline

11 November 2026. Owner accepts Phase 8 as baseline and authorizes local full-application testing/targeted fixes only. Current source matches all 626 accepted receipt entries; Git is absent, so preserve baseline hashes and all historical artifacts/private state. Run fresh baseline and final complete commands, record initial failures separately, use isolated synthetic DBs and explicit mocks/blocking before navigation, and stop after verified Phase 9 packaging. No provider request, hosted change, new major feature or Phase 10 implementation.

## D062 — Bounded local discovery transport and targeted UI validation

Keep the existing discovery endpoint, approved models, quotas, configuration and deployed source unchanged. Local discovery/mapping adapters share a 200,000-byte success / 8,192-byte error JSON reader, retain 15-second cancellation through body consumption, and expose only known public codes. Reproduce early cancellation/arbitrary error/photo defects before correction. Scope photo failures to the current key, distinguish workspace titles, reject invalid weather coordinates before transport and require discrete weather condition codes. No migration, provider integration or major feature.

## D063 — Isolated complete regression and measured formatter reuse

Ordinary Chrome tests establish a context-level external-network boundary before navigation; explicit mocks run first and every unexpected request is blocked/fails. Disable historical captures and all live probes, block service workers and use synthetic databases. Connected journeys supplement focused coverage, with fresh four-width evidence and preserved initial failures. Reuse only bounded currency formatters after measuring maximum-list update cost; cache no personal values and change no arithmetic. Local timing/LCP/CLS observations are laboratory samples, never field Web Vitals or INP claims. Native print/privacy and DB4/backup1–4 remain unchanged. Windows preview teardown workaround stops only verified task-owned processes.

## D064 — Preserve full valid long text through reflow

A supplemental 200-character unbroken destination reproduced overflow beyond the first complete expanded run. Discovery flex/card content and trip workspaces now shrink/wrap full valid tokens, with no ellipsis, hidden-overflow workaround or data truncation. The new four-width regression covers saved/explorer/details/wizard, maximum trip title, leap-day creation, near-limit inert private notes, reload and every trip workspace. Preserve intermediate failures and rerun the complete final suite after the CSS fix; prior green results are not proof of final-source readiness.
