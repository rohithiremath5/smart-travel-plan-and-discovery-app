# Current Phase 9 requirements — authorized local testing and polish

11 November 2026. Validate all implemented guest features A–N against expected behavior, source modules and existing/new tests; maintain a feature matrix and defect inventory. Confirm connected UI outcomes and persistence, safe import/print, four-width accessibility and laboratory performance. Reproduce defects before minimal fixes, retain initial failures, rerun the complete final suite and verify a separate archive/receipt. No P0/P1 may remain for readiness. Automated mocks do not establish live Gemini/Geoapify/Open-Meteo success. No live FX, major new feature, hosted operation, auth/cloud or Phase 10. [Traceability](review/phase-9/feature-matrix.json).

## Historical Phase 8 and earlier requirements — preserved

# Current Phase 8 requirements — authorized local scope

11 November 2026. [Implementation](PHASE_8_IMPLEMENTATION.md) · [review](PHASE_8_REVIEW.md) · [verification](review/phase-8/verification.json).

| Requirement                       | Implementation / verification                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Editable budget formulas/defaults | Pure BigInt/minor-unit calculations; shared transport, meals/days/travelers, ceil rooms/nights, custom/contingency/targets                       |
| Actual expense CRUD               | Separate local records, categories/date validation, frozen rate/date/source, explicit save/conflicts                                             |
| Static currency only              | Official dated ECB snapshot, user references for missing pairs, ISO codes/zero-decimal support, no FX client                                     |
| Optional eligible weather         | Open-Meteo explicit consent/action, verified coordinates only, 16-day/provider-local coverage, cache/cancellation/timeout/validation/attribution |
| Safe local persistence/backup     | Additive DB4, dual revisions, four-store transactions, complete v4 and valid v1–v3 import compatibility                                          |
| Integrated accessible UI/print    | Trip links, separate print opt-ins, 360/768/1024/1440 tests/screenshots, keyboard/errors/overflow/axe                                            |
| Preserve history/providers        | Hash baseline, no live test requests or hosted changes; Gemini/discovery/mapping unchanged                                                       |

No dark mode, AI packing, auth/cloud/collaboration, Phase 9 or Phase 10. Older requirements remain dated history and are superseded only for this scope.

## Historical requirements — retained

# Current Phase 7 requirements — 11 November 2026

Owner attachment dated 10 November authorizes local organizer work independently of pending Phase 6/6.1 live verification. [Implementation](PHASE_7_IMPLEMENTATION.md) · [review](PHASE_7_REVIEW.md) · [machine-readable evidence](review/phase-7/verification.json).

| Requirement                                                       | Implementation and verification                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Integrated per-trip notes/categories/empty and error states       | Trip cards/navigation, organizer route, strict schemas, repository/UI/E2E tests                         |
| Checklist/packing CRUD, quantities/notes/completion/reorder/reset | Stable persisted items, progress/outstanding tasks, explicit destructive confirmations                  |
| Six generic local templates                                       | Unchecked preview, selected additions, normalized duplicate avoidance, preserved custom/completed items |
| Existing records and concurrent-edit safety                       | Additive DB v3, shared opener, atomic dual revisions, v1/v2 upgrade and blocked/quota/conflict tests    |
| Complete compatible backups                                       | Product v3; valid v1/v2 imports; 10 MB bounds; strict relationships; ID remapping and atomic rollback   |
| Selected-trip private print controls                              | Native print/A4 CSS, individual note selection, isolated snapshot and print-media tests                 |
| Responsive accessible guest workflow                              | 360/768/1024/1440 px, keyboard/dialog/overflow/axe checks and synthetic screenshots                     |
| Preserve infrastructure, credentials and history                  | No provider/hosted operations or AI changes; preservation audit                                         |

No login, cloud sync/storage, attachments, collaboration or Phase 8 enhancements. Earlier requirements below retain original timing as history; PHASE_PLAN controls current sequencing. Review readiness does not approve another phase.

## Earlier requirements — retained

# Requirements and scope

Active requirements updated 6 November 2026. Phases 0–5 complete; full Phase 6 only is explicitly authorized. Original source interpretation remains preserved. Login is not a prerequisite for trip creation/planning.

## Source and interpretation

The [NamasteDev specification](https://namastedev.com/project-ideas/smart-travel-planner-discovery-app) was read directly. It describes trip CRUD, interest-based daily AI plans, destination discovery, maps, recommendations, shared trips, organizer uploads/checklists, and responsive layouts. Its technology and provider lists are suggestions; the user's master prompt supplies the binding stack, free-service policy, and phase gates.

The original includes ratings and hotel map locations. This project will show accommodation POIs when supplied by a suitable source, but will omit unavailable ratings, availability, and transaction prices. It is a planning product; booking, payment processing, and live inventory are outside scope. This resolves the source's richer display suggestions without fabricating data.

The source lists weather, conversion, summarization, journals, public itineraries, and dark mode as bonuses. The user's roadmap commits selected enhancements and leaves others optional. The user's roadmap takes precedence. Additional source ideas such as visa checks and mood-based travel are not implied commitments.

## Core functional requirements

| ID  | Requirement and measurable acceptance                                                                                                                                                                           | Delivery                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| C01 | Find cities/countries and curated keyword/tag matches; query and category filters combine predictably; search handles empty/error/no-result states. Global POI keyword coverage depends on provider capability. | 2                                         |
| C02 | Open destination details and attractions, see sourced imagery, save/remove destinations locally, and retain saves after reload. Missing fields remain unknown.                                                  | 2                                         |
| C03 | Register/sign in/out with real Supabase sessions; guard private routes; guest storage is visibly local. Unrelated users cannot query private trips directly.                                                    | 10; final phase only                      |
| C04 | Create trip title, destination, inclusive start/end dates, traveler count, budget currency, interests, and pace; reject invalid ranges and counts; review before creation.                                      | Revised 3; guest/local                    |
| C05 | Add/edit/remove/reorder activities by day with time, estimated duration, notes, and optional location; persist changes; keyboard alternatives exist for reordering.                                             | 4                                         |
| C06 | Display day-specific destination/attraction/activity markers, fit bounds, select in either list or map, and retrieve walking/driving routes when available. A missing map never blocks list editing.            | 5                                         |
| C07 | Generate genuine interest-aware itineraries, validate duration/day structure, refine a day or trip, and offer contextual travel chat. User reviews AI changes before applying; manual plans survive AI failure. | 6                                         |
| C08 | Invite people, accept/reject invitations, share itineraries, enforce owner/editor/viewer roles, revoke access, and handle concurrent edits without silent loss.                                                 | 10; final phase only                      |
| C09 | Save local notes/checklists in Phase 7. Authenticated private cloud document upload/download/delete with type/size/authorization checks waits until Phase 10.                                                   | 7 local organizer; 10 private cloud files |
| C10 | All introduced workflows operate at mobile and desktop widths with keyboard access, visible focus, and readable feedback.                                                                                       | Every implementation phase                |

## Committed enhancements

| ID  | Commitment                                        | Delivery and limits                                                                             |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| E01 | Weather by destination and date                   | 8; only where free-service use qualifies, within available forecast dates, with freshness       |
| E02 | Currency preference and conversion                | 8; supported currencies only; indicative daily rates and rate date                              |
| E03 | Budget dashboard and categorized expense tracking | 8; preserve original amounts/currencies, distinguish estimates from actual expenses             |
| E04 | Dark mode                                         | 8; Phase 1 tokens must allow this without implementing the toggle early                         |
| E05 | AI packing suggestions and printable trip summary | 8; packing requires verified AI capability, print remains usable without AI                     |
| E06 | Trip summarization                                | 8; human-readable summary from saved data; optional AI prose uses the same verified AI controls |

## Optional, not authorized by the roadmap alone

Travel journals, public itinerary publishing, bill splitting/settlement, additional export formats beyond the required validated JSON backup and print, full offline app installation, reservation email import, live flight alerts, public reviews, a travel quiz, local event booking, historical audio guides, automatic route optimization, and multi-city trip composition require separate scoping. Local itinerary persistence is committed; offline tiles and automatic cloud synchronization are not.

No visa advice engine, passport extraction, live hotel inventory, payments, or paid fallback is planned. Do not collect passport numbers to power recommendations.

## Cross-cutting requirements

| ID  | Rule                                                                    | Verification                                                                                                                                                              |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | Only non-trial free endpoints/plans; never activate billing             | Provider recheck in each integration phase; stop/disable when no eligible free option exists                                                                              |
| N02 | Environment-driven configuration; zero manual source/SQL edits          | Fresh setup using templates and scripts; hosted secrets must be synchronized separately                                                                                   |
| N03 | Confidential keys stay server-side; public key is not authorization     | Inspect built artifacts; adversarial endpoint tests; database and storage RLS tests                                                                                       |
| N04 | Feature modules, strict types, normalized adapters, narrow repositories | ESLint, typecheck, review; avoid adding unused dependencies or future folders                                                                                             |
| N05 | Every primary interactive control works                                 | Journey tests; pending features use explanatory text rather than fake working actions                                                                                     |
| N06 | Honest provenance                                                       | Label demo fixtures, AI drafts, user entries, provider data, cache dates, and local/cloud storage independently                                                           |
| N07 | Graceful failure                                                        | Test missing keys, 401/403, 429, timeout, malformed responses, unavailable model, offline saving, and full browser storage                                                |
| N08 | Responsive and accessible                                               | WCAG 2.2 AA target; keyboard/manual review plus automated checks at 360/768/1024/1440 px                                                                                  |
| N09 | Responsible usage                                                       | Debounce/deduplicate/cache; server quota reservation and finite retries; no key/account rotation to bypass limits                                                         |
| N10 | Reproducible review                                                     | Update status/decisions/setup every phase; safe archive excludes credentials, uploads, logs, dependencies, and prior archives                                             |
| N11 | Performance                                                             | Proposed targets: LCP <=2.5 s, INP <=200 ms, CLS <=0.1 under a documented mobile test profile; lazy-load maps and responsive photos. These are targets, not measurements. |
| N12 | Persistence integrity                                                   | Money uses integer minor units with currency metadata; trip dates are calendar dates; activity scheduling respects destination timezone; conflicts are surfaced           |

## Honest capability states

Track persistence, places, photos, AI, weather, and currency separately. A trip can be cloud-persisted while its cover photo is bundled. `auto` chooses available capabilities; `demo` deliberately uses labeled local fixtures; `live` reports absent services and offers an explicit local path. A network error on a cloud trip must never switch that trip into a local demo repository.

Demo AI is an unavailable state with manual planning guidance, not canned chat impersonating a model. Demo collaboration explains the need for cloud accounts. Local demo travel documents must be fictional; real sensitive documents belong only in an approved private-storage workflow.

## Phase boundary

Phase 6 only is authorized now. Existing discovery, guest trips, complete itineraries/backups and maps remain implemented. AI proposals/assistant are controlled local development only; proposed hosted AI requires separate explicit setup approval. Organizer (7), tools (8), polish (9) and auth/cloud/collaboration (10) are future gated work.

## Guest data safety acceptance — revised Phase 3

Stable IDs, schema/revision/timestamps; actual date-only validation and inclusive duration; minor-unit money; CRUD/reload/multiple trips/sorting; explicit local-save success/failure; optimistic conflicts and confirmed deletion; bounded validated JSON import preview, duplicate skip and conflict copies without overwrites. Preserve Phase 2 saved records and existing secrets. Export is unencrypted user data, not guaranteed cloud backup. No fake account, owner or automatic upload. Optional local documents and additional export formats require later review. Historical C01/C02 discovery is completed; C03/C08 are final-phase auth-dependent requirements.

## Phase 4 acceptance addendum — 5 November 2026

C05 includes title/description, trip day, optional HH:mm destination-local start, 1–1440 minute duration, ten categories, optional location/paired bounded coordinates, optional integer minor-unit estimate/currency and notes. No timezone conversion, venue-hours verification or map. New/retimed entries sort chronologically with stable ties and unscheduled entries last; explicit up/down ordering persists without altering times. Display overlap/past-midnight reminders. Daily notes save explicitly.

Central IndexedDB v2 opening/migrations preserve legacy trip records and saved-destination v1 storage. Additive itinerary aggregates validate date membership and unique activity IDs; transaction-complete success, expected revisions, storage failures, atomic cascading deletion and explicit date-change loss consent are required. Complete version-2 backups must include itinerary content and order; accept valid v1 metadata-only exports. Enforce 10 MB, 200 trips, 200 activities/trip, 100/day, 366 days/trip and bounded text. Preview and confirm; originals survive; conflict copies remap IDs and repeated copies deduplicate. Test migration, references, concurrency, atomic failures, offline loaded-session saving, complete restoration and four-width keyboard/accessibility workflows.

## Phase 5 acceptance addendum

C06 now includes lazy interactive OpenFreeMap/MapLibre, destination and day-specific stable-ID markers, bidirectional selection/card focus, fit/zoom/attribution, desktop split and mobile toggle/resizing, reduced motion and an accessible location-list fallback. Unknown coordinates remain unknown; manual editing survives unavailable WebGL/tiles/network.

Real location lookup must debounce/cancel/deduplicate/bound results and require explicit confirmation before replacing saved values. Persist location name/paired coordinates through existing repository revisions and complete backups without a format/database change. Routing must preserve order, support walk/drive, validate coordinate/waypoint/geometry/leg/size constraints, show only actual supplied distance/duration and visibly exclude unlocated stops. No optimization/traffic/premium options or fake line/time. Shared durable 100/day reservations, cache reuse, no polling/automatic retries, conservative 20-credit route reservation and fail-closed missing backend are required. Existing discovery regression tests remain. Live routing and new hosted SQL/function deployment require separate approval. That Phase 5 acceptance statement predates the separately approved Phase 6 AI implementation below; all later phases remain gated.

## Phase 6 acceptance addendum — 6 November 2026

C07 delivers trip/day/alternatives/refinement from saved preferences and custom brief, useful bounded descriptions/durations, exact ordered dates and user-reviewed selections. One request supports ≤14 consecutive days/1–6 suggestions per day; longer trips use explicit day requests. Chat uses selected day and ≤6 context turns; never saves automatically. Exact fixed models and server-only official SDK, explicit consent/minimized context, no invented verified facts/coordinates, strict output validation and safe fallback are required.

Apply selected activities through one dual-revision atomic repository transaction. Append by default, preserve manual order/notes/locations, require explicit replacement/coordinate confirmation and retain existing schema/backup compatibility. Stale edits must fail without partial writes. Server input/output/deadline/token bounds, one HTTP attempt, no continuation/tools/paid fallback, durable global ≤5/client ≤3, spacing/deduplication and fail-closed quota protection apply. Controlled local access is mandatory; no public anonymous proxy or early auth workaround. Separate mocked/embedded PostgreSQL/browser evidence from real model metadata/inference. Actual live planner failure must remain disclosed rather than inferred successful from chat or mocks. No hosted AI change is authorized.
