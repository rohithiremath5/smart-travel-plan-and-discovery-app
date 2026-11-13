# Current Phase 8 provider status — 11 November 2026

Budget/expenses/static currency require no API, account, key or environment change. ECB reference rates dated 2026-11-10 are bundled with source attribution; no live FX integration. Missing quotes require manual rates/date. [Exact rate provenance](PHASE_8_IMPLEMENTATION.md#currency-provenance-and-exact-conversion).

Open-Meteo is the only new runtime client: direct HTTPS keyless forecast after explicit personal/non-commercial acknowledgement/action, existing verified destination coordinates only. Official [docs](https://open-meteo.com/en/docs), [terms](https://open-meteo.com/en/terms), [license](https://open-meteo.com/en/licence), [pricing](https://open-meteo.com/en/pricing) and [browser/CORS support](https://github.com/open-meteo/open-meteo) were researched; no live forecast request was made. Free hosted eligibility is non-commercial, with rate limits and no uptime guarantee; commercial use requires stopping for separate approval, never automatic billing/fallback.

No signup/key/env/secret sync or hosted proxy required. [Setup matrix](PHASE_8_SETUP.md#providers-accounts-and-configuration). Existing Supabase/Geoapify/Gemini code/configuration/guards remain unchanged; Phase 6 planner and Phase 6.1 live blockers remain pending. No Phase 9 setup/key is requested; auth/cloud remain Phase 10.

## Historical provider records — retained

# Current Phase 7 provider status — 11 November 2026

**Required providers/accounts/keys: none.** The local organizer uses IndexedDB and native print only, with no new dependency, signup, quota, environment variable or external request. Existing Supabase/Geoapify/Gemini configuration remains unchanged and optional. No fresh provider eligibility or live functionality claim. [Phase 7 setup](PHASE_7_SETUP.md) reports exact existing optional provider signup URLs, dashboard/key references, public/private distinctions and local commands, without requesting new credentials.

Phase 6 Gemini generation remains pending after HTTP 504; Phase 6.1 discovery v5 remains deployed, with live verification pending after edge_functions_secrets_read HTTP 403. Phase 7 neither retries nor resolves those gates. No hosted resource, secret, model, timeout, application budget, ledger or consumed guard change. Phase 8 requires separate approval before provider/account/key decisions; authentication/cloud/OAuth remain Phase 10. Earlier provider/Free-plan records below are dated evidence, not new verification.

## Historical provider records — retained

# Current Phase 6.1 live preflight blocker — 10 November 2026

The owner authorized one maximum-five-credit Geoapify verification, but **zero provider requests were made**. Reviewed Supabase project/key/health, ACTIVE v5 source and public application quota reads passed (used 0, remaining 100, no active leases); subsequent read-only secret metadata returned HTTP 403 requiring `edge_functions_secrets_read`. Local budget remains 100; current hosted budget/key comparison was not possible. No privilege expansion, retry, SQL write, secret update or deployment followed. Owner manually confirmed current Supabase Free/spend cap and Geoapify Free/headroom/paused searches. Official geocoding/details costs were rechecked; each planned operation costs one credit. [Precise blocker and source links](PHASE_6_1_LIVE_VERIFICATION.md). No new account/key; provider setup guidance remains unchanged. Phase 7 is not started.

## Prior deployment/provider records — retained verbatim

# Current Phase 6.1 deployment — 10 November 2026

Existing Supabase `discovery` is ACTIVE v5 after the separately approved six-file redeployment. Project/key/health and both migration identities matched; downloaded source-map hashes and existing mapping code were verified. Required project-scoped Management API reads and one function-deployment POST succeeded; no organization endpoint or permission expansion. Nine actual invalid/gate/CORS probes returned before quota acquisition. **Zero live Geoapify/Gemini requests; zero SQL/secret/billing/auth/frontend changes.** The existing local daily Geoapify application configuration remains 100; no remote setting was changed. Provider setup/account/env/public-private reporting is retained in [Phase 6.1 setup](PHASE_6_1_SETUP.md); no new account/key is needed. Real provider search/details/location/routing/cache verification remains pending separate approval. [Execution evidence](PHASE_6_1_DEPLOYMENT.md). Phase 7 is not started.

## Prior local compatibility record — retained verbatim

# Current Phase 6.1 discovery compatibility — 7 November 2026

Existing Geoapify Free/Supabase Free accounts and environment names are reused; no new key/account. Official [geocoding](https://apidocs.geoapify.com/docs/geocoding/) and [autocomplete types](https://geoapify.github.io/geocoder-autocomplete/api-reference/geocoder-autocomplete-options/) support broad locality and explicit city/state/country search. Locality covers administrative destinations; city includes towns/villages. District/county are response classifications, not new request parameters. No POI fan-out, paid fallback or automatic retry. [Free terms](https://www.geoapify.com/pricing/) currently list 3,000 daily credits; the application retains its stricter 100/day cap and existing server-only key. Destination search/detail caches move to `destinations-v2`; nearby/mapping are unchanged.

**Zero live provider requests or hosted changes in Phase 6.1.** Corrected live district coverage is unverified; the older hosted function cannot accept the new locality/state contract until separate deployment approval. See [provider signup/environment/dashboard/commands and six-file pending plan](PHASE_6_1_SETUP.md). No Gemini code/configuration/state/request is changed. The most recent separate Phase 6 planner request still failed upstream/local HTTP504; [actual historical evidence](review/phase-6/timeout-planner-live.json) remains unchanged. Phase 7 needs no new key and is not authorized.

## Dated Phase 6 provider history — preserved

# Current Phase 6 provider status — 6 November 2026

Full local Phase 6 is implemented, not just model preflight. The owner manually confirmed Google AI Studio Free/no billing. Two actual local inference attempts consumed two of the five daily application reservations: planner failed with HTTP502/provider_unavailable (upstream status not captured then); assistant returnedHTTP200 with validated JSON. No retries, changed models or hosted AI operation. Actual provider RPM/TPM/RPD remain unverified. See [current setup](PHASE_6_SETUP.md) for exact signup/account/env/dashboard/command reporting and [actual live evidence](review/phase-6/live-verification.json). Phase7 requires no new provider/account/key.

## Earlier model-selection preflight (retained as dated evidence)

# Phase 6 model-selection preflight — 6 November 2026

Owner amendment selects stable `gemini-3.8-flash` for itinerary generation/refinement and `gemini-3.5-flash-lite` for the lightweight assistant. Both appear in the current [model catalogue](https://ai.google.dev/gemini-api/docs/models?hl=en), have free-tier input/output listed in [pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en), and support [structured JSON output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). No preview/latest alias or paid fallback is selected. The maintained SDK is [Google Gen AI](https://ai.google.dev/gemini-api/docs/libraries?hl=en), installed as exact `@google/genai@3.0.0` (Node >=22).

The same existing confidential key returned HTTP 200 for both read-only model metadata endpoints, with generateContent supported. This establishes metadata visibility only: **no inference request was made**. Owner separately confirmed Google AI Studio shows the linked project as Free with no billing attached; that is manual evidence, not a billing API response. Exact project/model RPM/TPM/RPD remain unverified in AI Studio; [limits](https://ai.google.dev/gemini-api/docs/rate-limits?hl=en) are project/model-specific and provider daily resets use Pacific time. Application ceilings remain five requests/day and three per client; anonymous browser identifiers are not secure user identities.

Existing .env already has the approved key/model/budget names and was preserved. .env.example is updated. Full Phase 6 implementation is on hold at the owner's request while they supply the earlier master prompt referenced by this amendment. No AI function, hosted secret, migration, generation request, authentication or Phase 7 work has been implemented. [Sanitized preflight](review/phase-6/model-preflight.json).

# Phase 5 provider verification — 5 November 2026

MapLibre GL JS 6.16.0 (BSD-3-Clause) is installed and lazy loaded using the official [Vite worker setup](https://maplibre.org/maplibre-gl-js/docs/). [OpenFreeMap](https://openfreemap.org/) remains free/keyless/no registration; [terms](https://openfreemap.org/tos/) and [privacy](https://openfreemap.org/privacy/) were read. Integrators must meet provider eligibility; embedded end users do not need accounts. No SLA, offline downloads or paid fallback is assumed. Required OpenFreeMap/OpenMapTiles/OpenStreetMap attribution is retained.

Existing [Geoapify Free](https://www.geoapify.com/pricing/) advertises 3000 credits/day and 5 requests/second; existing application cap remains 100/day. [Terms](https://www.geoapify.com/terms-and-conditions/) require attribution. Current [routing documentation](https://apidocs.geoapify.com/docs/routing/) and [pricing details](https://www.geoapify.com/pricing-details/) describe per-leg and long-distance credits, with inconsistent examples/rounding across official pages. Local route bounds and a non-refundable 20-credit reservation are deliberately conservative. They are not proof of actual provider-side cost for pathological/changed responses; inspect that during separately approved bounded live verification. No premium route options or billing is enabled.

[Supabase Free](https://supabase.com/pricing) remains available within finite quotas; the existing project/account is reused. Only the separately approved Phase 5 migration and discovery deployment were performed. The owner approved and completed the limited location/routing deployment: reviewed weighted quota migration and ACTIVE discovery v4, with existing settings unchanged. Actual place search, walking/driving geometry and cache checks passed within 41 application-reserved credits. Provider invoice usage was not independently verified; quota/unreachable failures remain mocked tests. Manual Dashboard Free/spend-cap confirmation on 5 November is retained; no organization API was retried. Historical Phase 2 live discovery remains separate. Full exact configuration/signup/dashboard/public-private/command report: [PHASE_5_SETUP](PHASE_5_SETUP.md). Earlier dated research below is retained as historical context and is superseded where Phase 5 is now locally implemented.

# Revised guest-first timing — 4 November 2026

Phase 3 needs no new provider, OAuth, Supabase Auth, database migration or hosted setup. Phase 4 also needs no additional credentials. Preserve existing .env and Phase 2 Supabase/Geoapify discovery configuration. Existing provider setup remains documented in PHASE_2_SETUP.md. Authentication/cloud trips/collaboration and optional publication move to final Phase 10; later sections retain technical provider constraints with corrected timing. No hosted mutation is authorized now.

# API and service registry

## Phase 2 implementation addendum

Rechecked 4 November 2026: [Supabase Free](https://supabase.com/pricing), [current keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), [secret permissions](https://supabase.com/docs/guides/functions/secrets), [Geoapify Free](https://www.geoapify.com/pricing/), [Places](https://apidocs.geoapify.com/docs/places/), [detail costs](https://apidocs.geoapify.com/docs/place-details/), [Pexels paused keys](https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key), and [photo license](https://www.pexels.com/license/).

Actual Phase 2 code uses Geoapify only through the restricted `discovery` Supabase function. Autocomplete limit 10; geocoding/places limit 20; details request only `features=details`; each allowed uncached attempt reserves one credit. No routing/isoline/photo API. Database transaction serialization spaces uncached attempts by 275 ms, caps credits at configured 1–2000 per UTC day, coalesces identical requests with a 20-second lease, and bounds cache to 256 records / 200 KB payload each / 24-hour TTL. Fail closed on quota-storage failure; no automatic upstream retries. Public keys/origin checks cannot prevent outsiders exhausting this bounded allowance.

Browser debounce is 350 ms with minimum 3 characters, cancellation and Query deduplication. Explicit live errors never substitute curated records. Attribution and fetch/cache dates accompany normalized provider content. Saves are independent IndexedDB snapshots. Nearby places cover a 5 km reference-point radius, including for countries; no full-country coverage claim.

Pexels API is deliberately omitted as optional. Four photos are bundled in two sizes, with creator/source/license/crop notes and SHA-256 inventory in `public/images/manifest.json`. No Pexels key is needed or synchronized. [Setup matrix](PHASE_2_SETUP.md) and [completed live verification](PHASE_2_REVIEW.md) record actual Phase 2 results separately from mocks. Phase 3 does not rerun or alter that hosted setup. The remaining technical research originated in Phase 0; current timing is corrected below.

Original Phase 0 research was checked against official public sources on **4 November 2026**. At that research stage no provider was integrated, no live credentialed request was made, and no signup or billing flow was exercised. This describes that historical research, not the completed Phase 2 implementation. Future terms/model eligibility remain subject to recheck at integration and deployment.

## Selection summary

| Service               | Planned use                                        | Free-access finding                                                                               | Account/card assessment                                                            | First phase                                       |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| Gemini Developer API  | Structured itineraries and assistant               | Conditional: free text inference exists; model, region, age, and project quota restrictions apply | Google account/project/key needed; keep project unbilled; actual signup not tested | 6                                                 |
| MapLibre GL JS        | Browser map renderer                               | Open-source library; no service subscription                                                      | No account/card                                                                    | 5                                                 |
| OpenFreeMap           | Styles and vector tiles                            | Public instance advertises free use without request/view caps                                     | No account, key, or card                                                           | 5                                                 |
| Geoapify              | Search, geocoding, POIs, routes                    | Free plan: 3,000 credits/day, up to 5 requests/second; shared allowance                           | Account/key; explicitly no credit card required                                    | 2/5                                               |
| Open-Meteo            | Forecasts/current weather                          | Conditional: non-commercial endpoint; intended portfolio use needs review                         | Public endpoint has no key/payment setup                                           | 8                                                 |
| Frankfurter           | Indicative conversion                              | Free public API, no daily/monthly quota; abuse throttling applies                                 | No account/key/card                                                                | 8                                                 |
| Pexels                | Optional destination photo search                  | Existing-key API is free, but **new key issuance is paused**                                      | Existing account/key required for API; new signup path unavailable                 | 2                                                 |
| Supabase Free         | Database, auth, private files, functions, realtime | Suitable within quotas; inactivity pauses and email restrictions matter                           | Existing Free project reused; no new setup in Phase 3                              | 2 discovery infrastructure; 10 personal data/auth |
| Cloudflare Pages Free | Static SPA hosting                                 | Proposed free static host; functions are outside this hosting design                              | Account needed only if separate future publication approved                        | 10, only when requested                           |

For Supabase/Cloudflare, do not supply card details or activate a paid plan if the future provisioning flow changes. Report the discrepancy and retain local demonstration. “Free” here means a presently documented non-trial option under its conditions, not guaranteed perpetual availability or an SLA.

## Gemini

Evidence: [pricing](https://ai.google.dev/gemini-api/docs/pricing), [deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [limits](https://ai.google.dev/gemini-api/docs/rate-limits), [terms](https://ai.google.dev/gemini-api/terms), [regions](https://ai.google.dev/gemini-api/docs/available-regions), [official SDK](https://ai.google.dev/gemini-api/docs/libraries), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

The 6 November 2026 owner amendment supersedes the original provisional 2.5-model recommendation. Current approved stable models are `gemini-3.8-flash` (planner) and `gemini-3.5-flash-lite` (assistant), both listed with free input/output. Legacy 2.5 models are access-limited and are not defaults for this new project. No silent switch, preview/latest alias or paid fallback is permitted. Historical Phase 0–5 reports remain unchanged.

The free service can use submitted content to improve products. Terms require users aged 18+, supported regions, and paid services when API clients are made available in the EEA, Switzerland, or UK. Under the zero-paid constraint, AI must be unavailable to ineligible audiences. India is listed as available; that does not prove project/model eligibility. Phase 6 must resolve audience restriction and enforcement before enabling AI; a user-selected region alone is not sufficient enforcement.

Configuration: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite`, server only. Use the maintained `@google/genai` SDK; schema-constrained output still needs Zod validation and factual checking. Grounding/search/maps tools are disabled to avoid separate charges and dependencies. Limits vary by project/model across RPM, TPM, and RPD; inspect AI Studio instead of hardcoding an internet quota table.

Application policy: Phase 6 guest AI needs bounded input/history/output, no file contents/passports/email lists, a 30-second initial deadline, no automatic generation retry/continuation, durable project ceilings and appropriate anonymous abuse controls. Approved application ceilings are `AI_DAILY_REQUEST_BUDGET=5` and `AI_REQUESTS_PER_USER_PER_DAY=3`; these settings alone do not enable AI. Browser IDs are not secure identities. If public access cannot be protected sufficiently, restrict live AI to controlled development and keep public AI unavailable; never add early login. Final Phase 10 authenticated use additionally verifies trip access and per-user authorization/quotas. Quota exhausted means manual planning remains available. Private outputs never enter a shared cache; logs omit prompts. No public global AI launch is promised.

## MapLibre and OpenFreeMap

Evidence: [MapLibre docs](https://maplibre.org/maplibre-gl-js/docs/), [MapLibre license](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt), [OpenFreeMap service](https://openfreemap.org/), [quick start](https://openfreemap.org/quick_start/), [OSM licensing](https://www.openstreetmap.org/copyright).

MapLibre is a renderer with a BSD 3-Clause license; preserve the dependency notice. It supplies neither place search nor directions. OpenFreeMap's public instance requires no registration/key and advertises no view/request caps. Its published example includes OpenFreeMap, OpenMapTiles, and OpenStreetMap credits. Preserve style/data attribution, including the OSM copyright/license link; renderer licensing does not replace data licensing. OSM data is ODbL, with additional obligations for redistribution of derived databases.

Start with the documented public Liberty style; verify URL, style assets, and current policy in Phase 5. Centralize it in configuration; no user source edits. No self-hosted tile service is required. Do not prefetch cities, bulk-download tiles, or promise offline maps. The public service is an external availability dependency even without a stated quota. Browser requests reveal normal network metadata to the tile host. On WebGL/style/network failure, show an explanation and keep the itinerary/list fully usable. A style URL changing must never trigger an unreviewed paid map provider.

## Geoapify

Evidence: [pricing](https://www.geoapify.com/pricing/), [credit calculator](https://www.geoapify.com/pricing-details/), [terms and attribution](https://www.geoapify.com/terms-and-conditions/), [API docs](https://apidocs.geoapify.com/), [reuse policy overview](https://www.geoapify.com/).

The free plan allows commercial use with attribution, 3,000 shared credits/day and up to 5 requests/second; no credit card required. Geocoding/autocomplete cost 1 credit each. Places costs 1 credit for limits up to 20; larger results cost more. Routing costs waypoint pairs (`waypoints - 1`) plus extra credits for long routes. Thus a multi-stop route is not one credit. Credit rules must be checked per operation. Geoapify allows caching/storage under its terms. Free output requires Geoapify attribution and relevant source credits.

Credentials: `GEOAPIFY_API_KEY`, server only by project policy. Forward only a bounded query/coordinates/categories/route mode through an allowlisted Supabase function; reject arbitrary upstream URLs. Store normalized IDs, attribution and fetch dates. Do not send trip-member lists or notes to geocoding. Display `Powered by Geoapify` near its results and preserve source credits returned in responses.

Application policy: 350 ms autocomplete debounce, >=3 characters, cancel obsolete queries, result limits <=10 for autocomplete and <=20 for places, global pacing below 5 rps, and an initial 2,000-credit daily budget to leave headroom. Cache search/places by normalized query/category/coordinates; no repeated calls on day selection. Phase 5 must bound route parameters and reserve conservative credits before calling, including long-route allowances. A database transaction must reserve credits across all function instances. Fail closed if the limiter cannot be reached. User-facing fallback: labeled curated search results or manual activities; failed directions show ordered markers without a road-route claim.

## Open-Meteo

Evidence: [pricing](https://open-meteo.com/en/pricing), [usage terms](https://open-meteo.com/en/terms), [forecast docs](https://open-meteo.com/en/docs).

The public free endpoint permits non-commercial use, with fewer than 10,000 calls/day and limits of 5,000/hour and 600/minute. Terms identify promotional activities as commercial. An educational, non-monetized implementation is the intended use; a public portfolio cannot automatically be assumed eligible just because users pay nothing. Verify intended deployment before enabling. Weather defaults off; if eligibility remains unclear, use explicitly dated fictional demo fixtures or omit weather. Do not buy a commercial license automatically.

Weather data is CC BY 4.0; provide linked Open-Meteo attribution and relevant modification notices. No key is needed. Forecast docs specify 7 days by default and up to 16 days; variable/model availability varies. Show forecast dates, timezone, and fetch time. Trips beyond coverage receive “Forecast not available yet,” never an exact seasonal prediction.

Application policy: request only destination coordinates and needed variables, cache roughly 30 minutes, batch nearby needs when supported, honor failure responses, and avoid polling inactive views. Direct browser requests expose IP/coordinates to the provider; no traveler identifiers are needed. Weather-aware AI uses only coarse forecast facts and requires separately available AI.

## Frankfurter

Evidence: [API documentation and FAQ](https://frankfurter.dev/). Prefer documented **v2** rather than copying older v1/ECB-only examples. The public API needs no key, has no daily/monthly quotas, and rate-limits abusive traffic. Default blended rates are free for commercial use; direct provider endpoints have their own terms. Daily observations can be cached. v2 returns rates rather than a dedicated conversion endpoint.

Application policy: retrieve the supported-currency list, use default blended rates, cache by date/base/quote for a day, multiply with appropriate decimal handling, and retain original expense values. Display rate date and “indicative estimate.” Rates can be stale across weekends/holidays or unavailable for a pair. Never promise transaction rates or convert via an invented rate. On failure show the original currency and a dated cached conversion only when clearly identified. Credit Frankfurter as the source; do not infer one license for every upstream central bank. No account/payment action is needed. Requests need currency codes, not the user's expense descriptions or amounts.

## Pexels and bundled photography

Evidence: [availability](https://www.pexels.com/api/), [API guidelines/limits](https://www.pexels.com/api/documentation/), [caching guidance](https://help.pexels.com/hc/en-us/articles/900006470063-What-steps-can-I-take-to-avoid-hitting-the-rate-limit), [photo license](https://www.pexels.com/license/).

The API page currently says new keys cannot be requested. Existing-key documentation lists default limits of 200 requests/hour and 20,000/month. Do not tell new users they can obtain a key now. Leave `PEXELS_API_KEY` blank unless they already have access. Recheck issuance in Phase 2. API guidelines require a prominent Pexels link and photographer credit where possible, even though the general photo license does not require attribution. Pexels recommends caching responses for about 24 hours.

Selected baseline: bundle a small, manually reviewed image set with source page, creator, license, retrieval date, and destination-match notes in an asset manifest created in Phase 2. No images were downloaded in Phase 0. Use only photos whose license permits intended distribution; no scraped travel-site images. Do not imply an illustrative country photo depicts a particular attraction. Pexels' license disallows stock-library redistribution and implied endorsement. A small contextual travel UI is distinct from a photo-library product, but image choices still need review.

Optional existing-key integration: server-only `PEXELS_API_KEY`, search-result reuse, 24-hour response cache, responsive source URLs, lazy images, credits, fixed aspect ratios, and a local image-error fallback. Proposed app budgets: 100 requests/hour and 10,000/month. Search only destination names; remote image delivery exposes ordinary browser metadata. Wikimedia Commons remains an unselected alternative requiring per-file license review, not an automatic provider substitution.

## Supabase Free

Evidence: [pricing](https://supabase.com/pricing), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [private storage access](https://supabase.com/docs/guides/storage/security/access-control), [functions deployment](https://supabase.com/docs/guides/functions/deploy), [secrets](https://supabase.com/docs/guides/functions/secrets), [CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [GitHub OAuth setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-github).

Listed Free allowances: two active projects, 500 MB database, 1 GB files, 50,000 monthly active users, 5 GB egress plus 5 GB cached egress, 500,000 monthly function invocations, 2 million realtime messages/month, and 200 peak realtime connections. Projects pause after a week of inactivity. Unlimited API requests do not mean unlimited storage, compute, egress, or functions. Do not use artificial traffic to evade pausing. No free uptime/backup guarantee is assumed.

Public browser configuration: URL and publishable key. Confidential admin credentials stay local; function-runtime admin credentials supplied by Supabase never reach the client. Enable RLS on all exposed private tables and storage objects; test policies with direct API calls. Version all migrations. Store actual travel data only with user intent and limited retention; no passports in logs or AI prompts.

Auth caveat: the default hosted email sender is team-only and currently 2 messages/hour. It cannot power unrestricted public email signup, recovery, or emailed invitations. Proposed free path: GitHub OAuth for public cloud accounts, local email/password testing, and signed in-app invitation links that the user can copy/share. Email/password for a public audience remains conditional on an explicitly approved free SMTP option; none is selected or assumed here. Do not disable email verification merely to claim working production authentication. GitHub requires OAuth app registration/callback setup and introduces an account choice to approve in Phase 10.

Phase 2 live discovery needs only narrowly scoped provider functions and quota/cache infrastructure; Phase 10 adds account/trip tables. Local mode requires no Supabase account. Local backend testing needs a compatible container runtime; do not assume Docker Desktop licensing is appropriate for every user. Export/back up user-owned data through a separately reviewed workflow; review ZIPs never contain the database.

## Cloudflare Pages Free

Evidence: [pricing](https://www.cloudflare.com/plans/developer-platform/), [limits](https://developers.cloudflare.com/pages/platform/limits/), [SPA handling](https://developers.cloudflare.com/pages/configuration/serving-pages/).

Use static hosting only, with Supabase as the backend. Current Pages Free limits include 500 builds/month, one build at a time, a 20-minute build timeout, 20,000 files, and 25 MiB per asset. A supplied `pages.dev` address avoids a paid domain. Functions have separate Workers limits and are not needed in this architecture. SPA fallback works by default when there is no top-level `404.html`; Phase 10 must test nested-path reloads and auth redirects on the actual host.

Credentials: deployment-only Cloudflare account ID and a narrowly scoped API token; optional local CLI authorization instead of storing a token. No token in the browser or review archive. Static public content can be cached; private trip responses and documents must not be made public for CDN convenience. Application security headers and cache behavior need deployment tests. No hosting resources or deployment commands are created in Phase 0; actual deployment needs explicit Phase 10 authorization.

## Cross-provider usage and failure policy

The following are application design choices, not additional service entitlements:

| Operation          | Initial caching target                       | Deadline/retry policy                                 | Quota accounting                                          |
| ------------------ | -------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Destination search | 24 hours; keyed by normalized query/language | 8 s; at most one retry for transient idempotent reads | Reserve Geoapify credits globally                         |
| Places             | 24 hours; keyed by area/category             | 8 s; one transient retry at most                      | Limit <=20, account for detail features separately        |
| Directions         | 24 hours by ordered coordinates/mode         | 12 s; user-triggered retry after failure              | Bound/estimate multi-waypoint and length cost             |
| Pexels search      | 24 hours                                     | 8 s; one transient retry at most                      | Enforce hour and month ceilings                           |
| Weather            | 30 minutes by coordinate/timezone/variables  | 8 s; one transient retry at most                      | Stay below minute/hour/day limits                         |
| Currency           | Daily by date/pair                           | 8 s; one transient retry at most                      | Deduplicate, respect throttling                           |
| AI generation      | Private draft only; no shared personal cache | 30 s initially; no automatic retry                    | Atomic project/user reservations plus token/output bounds |

Reserve quota before network calls, count attempts/retries, coalesce identical in-flight requests, and honor `Retry-After` within a finite retry budget. Cache dates/attribution travel with normalized records. Cap cache size and retention so caching does not exhaust the free database. Shared caches contain public provider data only. No indefinite stale results, infinite retries, key rotation, or extra accounts to bypass caps.

Illustrative Geoapify workload: one session with six autocomplete calls, one geocode, two <=20-place queries, and one five-waypoint short route uses approximately 13 credits before retries/detail/long-route costs. Fifty such sessions would use 650 credits. This is a budgeting example, not a capacity promise. Monitor real provider dashboards and lower application ceilings when other projects share an account.

Public discovery proxies remain susceptible to quota exhaustion by outsiders. CORS and the publishable key are not abuse barriers. Narrow operations, caching, durable global limits, request-size limits, and fail-closed behavior bound upstream usage; they cannot guarantee availability under attack. Verify trustworthy client-network metadata before IP-based throttling; do not trust a caller-supplied forwarding header. Private-data endpoints require Phase 10 authentication and server authorization. Phase 6 AI may use controlled-development access with strict quotas; if anonymous public abuse cannot be protected sufficiently, keep it unavailable publicly rather than adding early authentication.

## Unresolved integration gates

1. Phase 2: Pexels key issuance/existing-key eligibility; selected photo licenses; live Supabase project setup and proxy limits.
2. Phase 10: approve GitHub OAuth/account setup or select and verify a genuinely free SMTP alternative; verify registration, recovery, redirect, and invitation behavior.
3. Phase 5: verify route parameter cost bounds, style/data attribution, and failure behavior.
4. Phase 6: choose a model available to the actual unbilled project, verify quotas and structured-output support, and resolve age/region audience enforcement. If unresolved, AI remains disabled and the phase reports the unmet live-integration criterion.
5. Phase 8: confirm intended weather use is eligible; unsupported live weather stays off.
6. Phase 10: recheck all terms/card requirements and the deployment audience. A global, commercial, unlimited, free deployment is not an accepted assumption.

## Revised provider timing and free-plan feasibility check

Checked official pages on 4 November 2026: [Supabase Free](https://supabase.com/pricing) remains a finite free plan; existing discovery stays unchanged. [OpenFreeMap](https://openfreemap.org/) offers a keyless public instance for Phase 5, paired with open-source MapLibre and required attribution. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) retains limited free models; Phase 6 must recheck actual unbilled model/project quota, eligibility and data-use terms, keep its key server-side and restrict anonymous access to controlled development if needed. [Open-Meteo terms](https://open-meteo.com/en/terms) restrict its free endpoint to eligible non-commercial use; verify intended audience in Phase 8. [Frankfurter](https://frankfurter.dev/) remains keyless/free; recheck coverage and date/rate semantics in Phase 8. OAuth and authenticated Supabase personal trips are Phase 10 only. No future provider is integrated or quota-tested by this documentation check. No paid fallback or public unrestricted AI release is allowed.
