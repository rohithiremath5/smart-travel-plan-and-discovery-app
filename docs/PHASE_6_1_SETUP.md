# Current live-verification stop — 10 November 2026

The owner separately authorized one maximum-five-credit live task after accepting v5 deployment. It is **blocked before all provider calls**: `GET /v1/projects/{ref}/secrets` returned HTTP 403, requiring `edge_functions_secrets_read`. No token permission was changed, broad access requested, or alternate credential/SQL workaround attempted. Local budget remains 100; current hosted budget/key verification was not established. Existing project/key/health/v5 source and quota reads succeeded. Current owner manual confirmations cover Supabase Free/spend cap and Geoapify Free/at least five remaining credits/other searches paused. [Exact findings](PHASE_6_1_LIVE_VERIFICATION.md).

No new account, key, environment variable or source edit is needed. Existing provider/signup/dashboard/public-private guidance below remains applicable. No setup/apply/secrets/deploy or live command should be run to bypass the failed preflight. The requested new review ZIP/receipt records the blocker; all original deployment/local evidence is retained. Further verification awaits owner review and an authorized way to verify the current hosted settings. Phase 7 is not started.

## Prior deployment/setup record — retained verbatim

# Current Phase 6.1 hosted boundary — 10 November 2026

The separately approved **discovery-only redeployment is complete: ACTIVE v5**. No SQL, secret upload, cache deletion, authentication/billing or frontend change was needed. Reviewed six-file hashes and the prior v4 mapping source were verified; project identity/key/health and both migration identities passed. Owner currently reconfirmed Free/spend cap manually and reported the existing token's seven-day lifetime. Required scoped reads and deployment succeeded; no organization-wide access was used. [Exact execution and evidence](PHASE_6_1_DEPLOYMENT.md).

No account/key/environment/source change is required. Reuse the existing provider matrix below; local commands remain `npm.cmd run setup:check` and `npm.cmd run dev`. Do not rerun setup/apply/secrets commands based on historical instructions. **Valid provider-consuming requests remain unauthorized**: no live Geoapify/Gemini request was made, and the earlier five-credit proposal remains pending separate approval. Nine actual invalid-input/gate/CORS checks exited before quota acquisition. The new Phase 6.1 ZIP/receipt includes the deployment addendum and preserves historical evidence. Phase 7 is not started.

## Original local setup and proposed plan — 7 November 2026, retained verbatim

# Phase 6.1 setup and hosted boundary

7 November 2026. Local destination-search correction only; no hosted deployment, migration, secret upload, billing change, real Geoapify request or Gemini request is authorized. Phase 7 is not started. Existing `.env`, Gemini configuration, AI ledger/guards and historical evidence are preserved.

## Existing providers and accounts

No new account or key is needed. Local curated/manual planning and mocked review work without credentials. Worldwide search continues to use the existing Supabase discovery proxy and server-only Geoapify key. [Geoapify Free](https://www.geoapify.com/pricing/) offers 3,000 credits/day and up to five requests/second, without a credit card, subject to attribution and feature limits; the application's stricter shared ceiling remains **100 reserved credits/day**, not 3,000. Supabase remains the owner's existing Free project. No current Dashboard or remote billing verification was performed in this offline task.

| Provider                  | Official signup for fresh installations only                         | Required now                                             |
| ------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| Geoapify                  | <https://myprojects.geoapify.com/>                                   | Reuse existing Free account/key; zero live requests here |
| Supabase                  | <https://supabase.com/dashboard/sign-up>                             | Reuse existing Free project; no remote changes           |
| Gemini / Google AI Studio | <https://aistudio.google.com/>, <https://accounts.google.com/signup> | No Gemini use or configuration change in Phase 6.1       |
| OpenFreeMap / MapLibre    | <https://openfreemap.org/>, <https://maplibre.org/>                  | Existing keyless map behavior unchanged                  |
| Pexels                    | <https://www.pexels.com/join/>                                       | No API use; existing licensed bundled images unchanged   |

For a fresh installation only: sign in/up to Supabase, select/create a Free organization, choose New project, provide a name/region/private database password, and wait for healthy status. Confirm Free/spend cap in Billing/Subscription. Sign in/up to Geoapify, create/select a Free project, and open API Keys. Existing owners skip all account/project creation and keep their valid credentials. Never attach billing or regenerate keys to resolve this compatibility correction.

## Environment values and local commands

| Variable                                        | Dashboard/source                                          | Visibility                                                                          |
| ----------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                             | Existing project Connect → Project URL                    | Public HTTPS project origin                                                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY`                 | Project Settings → API Keys → Publishable key             | Public `sb_publishable_…`; never an administrative credential                       |
| `GEOAPIFY_API_KEY`                              | Existing Geoapify My Projects → project → API Keys        | Confidential, server only; never a `VITE_` setting                                  |
| `GEOAPIFY_DAILY_CREDIT_BUDGET`                  | Existing local/function configuration                     | Keep `100`; no quota increase or hosted change                                      |
| `FUNCTION_ALLOWED_ORIGINS`                      | Existing exact localhost development origins              | Non-secret server CORS configuration; not an authentication boundary                |
| `DISCOVERY_PUBLISHABLE_KEY`                     | Existing deployment uses the same project publishable key | Existing function setting; no synchronization here                                  |
| `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN` | Project Settings → General / account Access Tokens        | Reference identifies target; access token is confidential local administration only |

No new environment variable is introduced. Existing Gemini/model/timeouts/quota/development settings remain unchanged and server-only where applicable. No key is needed for Phase 7 under the current roadmap, and Phase 7 is not authorized.

```powershell
npm.cmd run setup:check
npm.cmd run dev
```

Use the curated collection or manual destination entry for credential-free review. Local frontend changes do **not** update the hosted discovery function. Until the reviewed backend is separately deployed, its existing city/country contract may reject `locality`/`state`. There is no automatic city-only fallback, parallel multi-type search or hidden retry. The browser displays an error and keeps curated/manual options available. Mocked tests exercise the corrected backend source locally, not the deployed older version.

Do not run hosted setup/apply commands, `setup:secrets`, `verify:live`, or any Gemini verifier under this authorization. `npm.cmd run review:zip` now produces the separate Phase 6.1 ZIP/receipt and preserves the Phase 6 artifacts.

## Proposed deployment after separate approval

The sanitized [hosted plan](review/phase-6-1/hosted-plan.json) records exact file hashes. Only the existing `discovery` function would require redeployment with these six files:

1. `supabase/functions/discovery/index.ts` — unchanged entry/configuration.
2. `supabase/functions/_shared/contracts.ts` — expanded request/destination types and version constant.
3. `supabase/functions/_shared/geoapify.ts` — corrected destination normalization/cancellation.
4. `supabase/functions/_shared/handler.ts` — versioned destination cache namespace.
5. `supabase/functions/_shared/mapping-contracts.ts` — unchanged mapping safeguards.
6. `supabase/functions/_shared/mapping-provider.ts` — unchanged location/routing adapter.

No database migration, cache deletion, new table, secret update, AI deployment, authentication change or frontend publication is needed or approved. Old cache rows expire normally; new search/autocomplete/detail hashes use `destinations-v2`. Nearby-place `v1` and mapping `mapping-v1` namespaces remain unchanged, so routing cache/quota behavior is preserved.

A future separately approved setup must first verify configured project identity/URL/reference/key/health, reviewed migration history and deployed function identity with scoped read permissions; accept the owner's applicable manual Free/spend-cap confirmation without requesting organization-wide privileges. Read current UTC-day reserved Geoapify usage and stop if remaining allowance cannot be established. Stop on permission failures; never broaden permissions automatically.

Proposed bounded live sequence, **not executed here**: one `locality` Chikkamagaluru search, one state search, one country search, one rural-town city search, one selected district detail lookup and one repeat of the exact locality search to verify caching. Reserve at most **five additional application credits**, all within the existing 100/day ceiling; the cached repeat must consume zero new credits. Do not fan out alias queries, invoke routing, exhaust quota, change settings or retry failures. Record actual provider fields/type/context/coordinates and safe outcomes, and correct genuine data compatibility issues only under the next approved scope. Search-result coverage, district details, aliases and live cache behavior remain unverified until that separate approval and execution.
