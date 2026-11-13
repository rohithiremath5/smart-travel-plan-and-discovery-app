# Phase 5 setup and hosted approval gate

## Authorized hosted verification — 5 November 2026

The owner replaced the short-lived project-scoped setup token to add database_read, and the resumed read-only preflight passed. Project/health/publishable key, reviewed Phase 2 migration identity, discovery identity and exact accepted source hashes matched. The owner’s 5 November Dashboard confirmation of Free with spend cap enabled is manual evidence; no organization metadata endpoint was retried. Current .env is preserved byte-for-byte from the owner-provided replacement-token snapshot; the owner’s token change is not attributed to automation.

Only the approved weighted migration phase_5_mapping_fd8782a1115ed565 was applied (HTTP 200), and only discovery was deployed from the six reviewed files (HTTP 201). Read-back confirmed ACTIVE version 4, verify_jwt=false and matching migration history. No other migration, secret/settings sync, authentication, trip table, billing, subscription, frontend deployment or provider change occurred.

Live Geoapify through the deployed function returned six place candidates (HTTP 200), a walking route of 244 m / 218.647 seconds (14 positions), and a driving route of 257 m / 26.654 seconds (10 positions). Geometry is actual MultiLineString in longitude/latitude order, requested waypoints retain latitude/longitude order, and time is interpreted as seconds. The UI rounds these estimates to 4 min and a minimum 1 min respectively. No traffic claim. Cached walking repeat and legacy Kyoto destination search returned HTTP 200 with cached=true and no extra reservation. Invalid route mode and short discovery query returned HTTP 400 invalid_request with no reservation.

Application usage was confirmed in read-only SQL: 0 → 1 → 21 → 41 credits on 5 November UTC, within 100/day and the approved 41 additional ceiling. Provider invoice accounting was not independently verified. Live browser checks use only those three existing cache entries, checking existence/expiry before forwarding. Expired/missing/changed requests abort instead of spending more credits.

The real production-configured local app was reviewed at 360/768/1024/1440px with OpenFreeMap tiles and actual deployed-function cached responses. Search → explicit selection → activity Save → reload persistence, walking/driving, keyboard marker/card synchronization, day changes and mobile list switching passed. The initial run passed three widths and failed 768px because of asynchronous Playwright response-body instrumentation; awaiting response completion and attaching rejected scan promises fixed the capture, and the focused 768px rerun passed. No application or Edge source correction/redeployment was needed.

Daily exhaustion/upstream unreachable/partial routes are covered by deterministic mocked/embedded-PostgreSQL tests, not deliberately induced live. Browser network aborts and synthetic 429 daily_budget responses prove manual-planning fallback without modifying hosted quota or exceeding the allowance. Live source responses and production assets passed limited confidential-value scans. Full fresh test results and screenshots are below/in the review evidence. Earlier blocked preflight is retained separately.

5 November 2026. Reuse the owner's existing Supabase Free project and Geoapify Free account. No new account, key, billing activation, authentication or source/SQL edit is required. The existing `.env` is preserved byte-for-byte. Never paste credentials into chat, screenshots, logs, support files or review ZIPs.

## Providers at phase start and handoff

| Provider              | Phase 5 use                                                        | Free/account/key/signup                                                                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MapLibre GL JS 6.16.0 | Open-source WebGL renderer, locally installed/lazy loaded          | BSD-3-Clause; no service account, key or signup. [Official documentation](https://maplibre.org/maplibre-gl-js/docs/)                                                                                                                                                                           |
| OpenFreeMap           | Public Positron style/vector tiles                                 | Free public instance, no account/key/card/signup. [Official site](https://openfreemap.org/), [quick start](https://openfreemap.org/quick_start/), [terms](https://openfreemap.org/tos/), [privacy](https://openfreemap.org/privacy/). No SLA; no offline tile-download feature is implemented. |
| Geoapify              | Existing secure geocoding/place search and walking/driving routing | Existing Free account/key reused. Advertised 3000 credits/day, 5 requests/second; app development ceiling stays **100 reserved credits/day**, shared with discovery. [Pricing](https://www.geoapify.com/pricing/). Fresh-account signup only: https://myprojects.geoapify.com/                 |
| Supabase              | Existing discovery Edge Function and public-data quota/cache       | Existing Free project reused. [Free plan](https://supabase.com/pricing). Fresh-account signup only: https://supabase.com/dashboard/sign-up                                                                                                                                                     |
| Pexels                | Existing bundled licensed images only                              | No new API/account/key; existing attribution retained. No Pexels API call is added.                                                                                                                                                                                                            |

Fresh installations only: (1) Sign up to Supabase, select/create a Free organization, choose New project, enter name/region/database password, and wait for healthy status. (2) Sign up to Geoapify My Projects, create a Free project and open its API Keys tab. (3) Populate only the environment settings below, run local validation, and request separate hosted setup approval. Existing owners skip account creation and reuse valid credentials. Never attach billing to satisfy setup.

## Environment and dashboard locations

| Variable                                   | Obtain from                                                                     | Visibility and purpose                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VITE_SUPABASE_URL                          | Supabase project Connect → Project URL                                          | Public HTTPS origin; existing browser discovery endpoint                                                                                                                                                |
| VITE_SUPABASE_PUBLISHABLE_KEY              | Supabase Settings → API Keys → Publishable and secret API keys → Publishable    | Public `sb_publishable_` key; sent as `apikey`, never as an admin credential/Bearer JWT                                                                                                                 |
| GEOAPIFY_API_KEY                           | Geoapify My Projects → existing project → API Keys                              | Confidential; function runtime only, never VITE_                                                                                                                                                        |
| GEOAPIFY_DAILY_CREDIT_BUDGET               | Existing local .env; verify value ≤100                                          | Server setting; existing value 100 is retained. Local validation/function reject >100 for this development setup.                                                                                       |
| FUNCTION_ALLOWED_ORIGINS                   | Existing local exact-origin allowlist                                           | Server-only setting, unchanged. Existing localhost/127.0.0.1 dev/preview origins remain supported.                                                                                                      |
| SUPABASE_PROJECT_REF                       | Supabase Settings → General → Reference ID                                      | Local setup target; must match the URL hostname                                                                                                                                                         |
| SUPABASE_ACCESS_TOKEN                      | Supabase account → Access Tokens: https://supabase.com/dashboard/account/tokens | Confidential local setup only. Needed only for a separately approved remote preflight/deployment. Renew only if an actual approved operation reports expiry/permission failure. Never share it in chat. |
| SUPABASE_DB_PASSWORD                       | Password chosen at project creation; Database → Settings                        | Confidential; preserved, not used by this Phase 5 setup path                                                                                                                                            |
| VITE_APP_NAME, VITE_APP_MODE, VITE_APP_URL | Existing .env                                                                   | Public app settings. auto/demo/live is configuration, not evidence of live provider success.                                                                                                            |

Supabase runtime injects its confidential admin credentials; they are not browser configuration. Existing `DISCOVERY_PUBLISHABLE_KEY` runtime compatibility setting remains unchanged. **No secret synchronization is needed for Phase 5.** Do not rerun setup:secrets as part of this phase. No new environment names are required; setup changes never require manual source or SQL modifications.

## Local commands — authorized now

```powershell
npm.cmd ci
npm.cmd run setup:check
npm.cmd run setup:mapping
npm.cmd run dev
```

setup:mapping defaults to local validation and a concrete plan, without network or hosted writes. setup:check safely validates presence/formats, matching project URL/reference, public key format, origins and budget; values are suppressed. Existing credentials are not overwritten. The owner's browser data is untouched by automated tests, which use separate synthetic profiles. Open a local trip → itinerary. OpenFreeMap works without Supabase/Geoapify; known destination centres/manual coordinates work without provider search. Use Open interactive map to load the separate renderer/worker and public tiles. Below 1024px use Itinerary / Map & routes; desktop retains the split view.

Worldwide places and routes require the reviewed function extension. An older deployed discovery function will reject the new operation with an honest setup-needed message. Curated/manual planning, location editing and backups remain usable.

## Exact approved hosted changes — now deployed

The separate approval has now been executed for the exact scope below; see the deployment and live evidence above. The owner has explicitly authorized **only**:

1. Apply `supabase/migrations/202611050001_mapping_quota.sql`, an additive overload `public.discovery_acquire(text, integer, integer)` for weighted reservations. It uses existing cache/usage/gate tables and adds no table, personal record, auth policy, bucket or billing. Existing reviewed Phase 2 SQL and its two-argument RPC are preserved. Unrecorded overload collisions fail instead of overwriting.
2. Deploy only `discovery` with six reviewed files: discovery/index.ts and _shared/handler.ts, geoapify.ts, contracts.ts, mapping-contracts.ts, mapping-provider.ts. Existing four discovery operations remain. New operations are `location` and `route` only. Keep existing origins/public-key checks and `verify_jwt=false`; no authentication setup.
3. Perform bounded live place search, walking, driving and repeat-cache verification after deployment: at most **41 application-reserved credits** (1 search + 20 walking + 20 driving; repeat uses cache). Use fewer requests if existing cache applies; no polling/retries/credit-limit increase. Check existing daily usage and stop if insufficient. Unexpected provider billing/data behavior must be reported before further calls.

No setting/secret change, Phase 2 migration replay, database reset, trip table, frontend publication or other function deployment is included. The old setup:backend apply path refuses to deploy the extended function and directs to the Phase 5 workflow, preventing deployment without the matching quota migration.

## Setup commands and repeat-run safety

The owner already reconfirmed Free and spend cap enabled on 5 November 2026. Retain this **manual evidence**, not an organization metadata API response. Do not request a broad token or retry the earlier organization endpoint. Then load only the non-secret reference into a shell variable, without echoing it:

```powershell
$travelProjectRef = (Select-String -LiteralPath .env -Pattern '^SUPABASE_PROJECT_REF=').Line.Split('=',2)[1].Trim().Trim('"').Trim("'")
npm.cmd run setup:mapping -- --apply --approved --free-plan-confirmed --confirm-project $travelProjectRef
```

These flags acknowledge a real approval; they do not grant authorization by themselves. The script checks identity, health, authoritative publishable key, exact baseline migration hash, Phase 5 history/hash and existing discovery function before any write. It skips an identical Phase 5 migration on repeat, refuses conflicts, then deploys only discovery. A successful migration may remain if deployment fails; no destructive rollback occurs. Inspect uncertain remote state before retrying. Local `.env` stays unchanged.

Required project scopes: project_admin_read, api_gateway_keys_read, database_migrations_read, edge_functions_read, **database_read** for the read-only usage/quota check; database_migrations_write only when the new reviewed migration is absent and approved, edge_functions_write for the approved deployment. No organization-wide permission or secrets-write scope is needed. HTTP 401 means the local setup token is invalid/expired; HTTP 403 names the missing permission and stops. Do not broaden permissions automatically or request the actual token in chat.

Bounded live verification completed using existing public function configuration. The approved 41-credit reservation is spent; do not rerun uncached probes under this approval. Mocked upstream errors remain distinct from actual successful Geoapify results.

## Request and credit contracts

`location`: trimmed 3–100 character query, optional named near coordinates, six results maximum; geocode/search with optional 25km circle/proximity bias. No arbitrary URL, provider key, trip ID, title or note is accepted. Results are validated and deduplicated. Explicit Use this location plus activity Save confirms replacement; saved values are locationName/latitude/longitude, not a permanent provider-verification claim.

`route`: walk/drive, 2–6 distinct consecutive coordinate stops, all within 25km of the first. Preserve user order; no optimization, avoidance, elevation or premium detailed outputs. Provider format is lat,lon; GeoJSON and MapLibre use lon,lat. Only validated complete geometry/metrics return; no straight-line or invented-time fallback. Route display accepts ≤500km, ≤5000 positions, correct leg count/endpoints and no disconnected legs. Unlocated/consecutive duplicate stops are excluded visibly; over-bound days are rejected rather than silently truncated. User confirms sending the ordered coordinates.

Current official routing references describe per-leg credits plus long-distance charges, with inconsistent examples/rounding between pages: [routing docs](https://apidocs.geoapify.com/docs/routing/), [pricing details](https://www.geoapify.com/pricing-details/). The application deliberately reserves **20 credits per uncached route**, never refunds failed/cancelled attempts, and retains the 100/day development ceiling. Successful accepted short routes require at most five base leg credits plus distance headroom; the reservation is conservative, not a provider invoice prediction. A pathological or changed provider result can be billed before response validation; coordinate bounds alone cannot prove an upstream billing maximum. Confirm actual project billing/cost behavior during the approved bounded live review; do not describe mocked tests as proof of provider-side accounting. Separate keys/apps may also consume the account's free allowance.

Shared durable cache/quota uses atomic global reservations, 275ms spacing, 24h cache and 256-record bounds. Discovery still consumes one reserved credit per miss. Cache hits consume no extra credits; missing weighted RPC fails closed before provider fetch. Browser requests debounce/cancel, cache/deduplicate, and do not poll/retry automatically. Public key/CORS are not authentication or protection against deliberate outside quota exhaustion. No unrestricted public frontend deployment is approved.

## Reproduce local and cached hosted browser checks

Run npm.cmd run lint, npm.cmd run format:check, npm.cmd run typecheck, npm.cmd run test, npm.cmd run build, then npm.cmd run build:e2e and npx.cmd playwright test. The default suite uses synthetic public configuration and deliberately skips opt-in network cases. In Windows set PLAYWRIGHT_BROWSER_CHANNEL=chrome if using installed Chrome.

The approved hosted browser review uses the real production build (dist), not the synthetic E2E build. Set NODE_OPTIONS=--use-system-ca, PLAYWRIGHT_BROWSER_CHANNEL=chrome and SMART_TRAVEL_LIVE_MAPPING=1, then run npx.cmd playwright test --config playwright.hosted.config.ts. It requires the existing scoped setup token with database_read for cache-presence checks; credentials are read by the Node test runner, never browser code. The three public request inputs/expected metrics are in review/phase-5/live-inputs.json. The test refuses new/expired cache keys and has no retry/warmup/provider-spending path. After 24h expiry it must stop; fresh uncached verification needs a newly approved credit allowance. No source edit, new account or secret synchronization is required.

## Following phase — documentation only

Phase 6 introduces Gemini, after explicit approval only. It will need confidential server-side `GEMINI_API_KEY` from Google AI Studio → API Keys (https://aistudio.google.com/api-keys), an eligible unbilled Google project/model and adequate anonymous abuse controls or restricted development access. Existing Google account can be reused; new-account signup if ever needed is https://accounts.google.com/signup. [Official pricing](https://ai.google.dev/gemini-api/docs/pricing) has model-dependent free access and data-use conditions; recheck actual model/region/age/quota then. No Gemini credential is requested, used or synchronized in Phase 5. Google/GitHub OAuth remains Phase 10, not Phase 6. Future setup scripts/settings must be reviewed in their own phase.
