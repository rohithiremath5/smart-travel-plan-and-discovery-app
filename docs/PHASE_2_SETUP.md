# Phase 2 accounts, configuration, and approval boundary

Research checked 4 November 2026. Existing Supabase Free and Geoapify Free accounts and local credentials are reused. Do not recreate accounts or regenerate valid credentials. The existing `.env` is never overwritten or synchronized wholesale.

## Controlled hosted verification preflight

The user explicitly approved only the reviewed cache/quota migration, `discovery` deployment, four allowlisted settings, bounded live checks and documentation/evidence updates. No additional setup approval is needed for those same actions once all prerequisites pass. Phase 3, auth, user/trip tables, billing, frontend publication and unrelated resource changes remain outside scope.

The earlier attempt stopped on an organization-metadata HTTP 403. The user then explicitly confirmed **Free in the Dashboard** and authorized accepting that manual evidence. That is the plan confirmation for this setup; no successful organization API response is claimed and the endpoint was not retried. No additional organization-wide permission, replacement/full-access token or billing setup is required. [Previous failure](review/phase-2/hosted-preflight-previous.json) and [completed preflight](review/phase-2/hosted-preflight.json).

All remaining checks passed with the existing scoped token: URL/reference/remote identity matched, project ACTIVE_HEALTHY, publishable key matched, migration history readable, reviewed SQL unchanged and exact hash already recorded, discovery inventory readable. Existing token secret-write and function-deploy operations subsequently succeeded. Applying the migration was unnecessary, so migration-write permission was not exercised and is not claimed verified. Any required future 403 still stops setup with the operation's exact permission; do not broaden access automatically.

Only discovery was deployed, and exactly GEOAPIFY_API_KEY, FUNCTION_ALLOWED_ORIGINS, GEOAPIFY_DAILY_CREDIT_BUDGET and DISCOVERY_PUBLISHABLE_KEY were synchronized. The configured local and final deployed Geoapify budget is **100 credits/day**. A temporary one-credit cap tested rejection without exhausting 100; it was restored successfully. The existing .env was preserved byte-for-byte. No additional setup or credentials are needed for this installation. Run npm.cmd run setup:check and npm.cmd run dev for local review.

The initial search/detail/nearby/cache sequence used at most three new credits; the subsequent real country search used one, and one nonexistent-ID provider-rejection check used at most one more (at most five total). Browser requests reused cached data. See [actual live checks and limitations](PHASE_2_REVIEW.md). No authentication, user/trip resources, paid services or public frontend hosting was configured.

The full provider/signup/dashboard/environment report below remains applicable for fresh installations. Reuse existing accounts; do not recreate them. Phase 3 would reuse Supabase credentials; optional GitHub OAuth registration requires a separately approved authentication decision.

## Providers at phase start and handoff

| Provider | Phase 2 use                                                                      | Free plan / account                                                                                | Official signup                          |
| -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Supabase | Restricted discovery Edge Function, internal public-data cache and durable quota | Free project; account required only for live mode                                                  | <https://supabase.com/dashboard/sign-up> |
| Geoapify | City/country search, autocomplete, destination details and nearby places         | Free: 3,000 credits/day, up to 5 requests/sec; account required for live mode                      | <https://myprojects.geoapify.com/>       |
| Pexels   | Bundled, licensed and attributed photographs                                     | No account or API key required for the included files; API integration is optional and not enabled | <https://www.pexels.com/join/>           |

Official evidence: [Supabase Free](https://supabase.com/pricing), [Geoapify Free and attribution](https://www.geoapify.com/pricing/), [Pexels license](https://www.pexels.com/license/), [paused new Pexels keys](https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key). No billing activation or paid fallback. Supabase Free has finite database/egress/function allowances and pauses inactive projects. The general app setting permits 1–2,000/day; this approved verification uses the existing **100/day** setting and final deployed cap. Do not raise it for review.

For an entirely fresh installation only:

1. Supabase: open the signup URL, sign in/register, create an organization on **Free**, choose **New project**, select that organization, enter a name and a strong database password, choose a region, and create the project. Wait for healthy status. Decline paid upgrades; stop if the flow requires payment. Copy the values below into local `.env` without editing source or SQL.
2. Geoapify: open My Projects, register/sign in, create a project on **Free**, then open its **API Keys** tab and copy the key. No credit card is required by the published Free offer. Do not configure a browser-only referrer restriction on the server key; use restrictions compatible with Edge Function requests.
3. Pexels: nothing is required. New API keys are paused. Keep `PEXELS_API_KEY` blank unless already held; Phase 2 deliberately uses bundled photos and does not call its API.

## Exact variable names and dashboard locations

| Environment variable            | Obtain/configure where                                                                                | Exposure                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Existing project → **Connect** dialog → project URL                                                   | Public browser origin                                                                                               |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Settings → API Keys → Publishable and secret API keys → Publishable key**                           | Public `sb_publishable_…`; never use an administrative key here                                                     |
| `SUPABASE_PROJECT_REF`          | **Settings → General → Reference ID**, also the dashboard project URL                                 | Local setup target identifier; must match project URL                                                               |
| `SUPABASE_ACCESS_TOKEN`         | Dashboard account menu → **Account → Access Tokens**, <https://supabase.com/dashboard/account/tokens> | Confidential local administration only; never browser/function secret                                               |
| `SUPABASE_DB_PASSWORD`          | Password chosen at project creation; **Database → Settings** manages reset                            | Confidential, preserved; not needed by Phase 2's Management API migration path; reserved for later database tooling |
| `GEOAPIFY_API_KEY`              | My Projects → existing project → **API Keys**                                                         | Confidential, server only                                                                                           |
| `FUNCTION_ALLOWED_ORIGINS`      | Your local `.env`: comma-separated exact app origins                                                  | Server configuration, no wildcard                                                                                   |
| `GEOAPIFY_DAILY_CREDIT_BUDGET`  | Your local `.env`: integer 1–2000                                                                     | Server budget; default 2000                                                                                         |
| `VITE_APP_MODE`                 | Your local `.env`: `auto`, `demo`, or `live`                                                          | Public behavior; not proof of connection                                                                            |
| `VITE_APP_URL`                  | Your local `.env`: exact local/approved application origin                                            | Public                                                                                                              |
| `VITE_APP_NAME`                 | Your local `.env`: desired application name                                                           | Public                                                                                                              |
| `PEXELS_API_KEY`                | Optional existing Pexels API account only                                                             | Confidential, unused and never synchronized in this phase                                                           |

The Edge runtime receives `SUPABASE_URL`, named `SUPABASE_SECRET_KEYS` and `SUPABASE_PUBLISHABLE_KEYS` from Supabase. Runtime fallback supports its injected service-role key during migration; users do not put that key in browser config. The setup script also synchronizes the public key under `DISCOVERY_PUBLISHABLE_KEY` for runtime compatibility. Send publishable keys in `apikey`, never as a Bearer JWT. The function intentionally uses `verify_jwt=false` and checks the public key itself. Public keys and CORS do not authenticate a traveler or prevent outside abuse; durable limits bound provider use. [Current key guidance](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

When an allowed origin is loopback, scripts include localhost and 127.0.0.1 at documented dev/preview ports 5173/4173. The derived origin list and `VITE_APP_URL` are synchronized without changing `.env`. Nonlocal origins require explicit entries; no wildcard/domain expansion is used.

## Local commands: no hosted changes

```powershell
npm.cmd ci
npm.cmd run setup:env
npm.cmd run setup:check
npm.cmd run setup:backend
npm.cmd run setup:secrets
npm.cmd run dev
```

`setup:env` preserves an existing file. Default backend/secrets invocations validate locally and show names and a plan only; they do not contact or mutate the hosted project. Missing optional live configuration leaves demo development usable. Existing credentials passed local presence/format/project-match inspection in this session; no values were displayed.

Optional read-only remote preflight, permitted without infrastructure changes:

```powershell
npm.cmd run setup:backend -- --check-remote
```

This checks the configured project's identity/healthy state with the Management API and matches the publishable key against authoritative project key metadata. It does not deploy, synchronize secrets, query traveler data, create accounts, test Geoapify, or prove write permissions. No response bodies, names, project references, URLs, or token values are logged.

## Hosted setup: separate explicit approval required

The user explicitly approved the five limited operations, and this installation has completed them. Manual Dashboard Free-plan evidence resolved the organization preflight. Re-running a mutation is unnecessary for review; the guarded commands below document recovery or a separately authorized installation. Outside that authorization, the user must explicitly approve **the setup operation**. The flags acknowledge that approval; they are not permission for an agent to infer it. Confirmation must exactly match the existing environment project reference. In PowerShell, load only that non-secret reference without echoing it:

```powershell
$travelProjectRef = (Select-String -LiteralPath .env -Pattern '^SUPABASE_PROJECT_REF=').Line.Split('=',2)[1].Trim().Trim('"').Trim("'")
npm.cmd run setup:backend -- --apply --approved --confirm-project $travelProjectRef
npm.cmd run setup:secrets -- --apply --approved --confirm-project $travelProjectRef
npm.cmd run verify:live -- --approved --confirm-project $travelProjectRef
```

No manual source or SQL modification is needed. The agent's approval request identifies the configured project by safe matching checks without displaying credentials. Scripts always recheck remote identity and healthy status before mutation.

Concrete backend plan:

- Apply only `supabase/migrations/202611040001_discovery.sql` using the official Management API migration endpoint, with a content-hash migration name. Repeated runs skip the exact recorded migration and refuse a conflicting earlier hash. Transactional DDL introduces **three** internal tables and **two** RPCs; no reset, auth change, profile/trip/user-content table, bucket, or deletion of existing user resources.
- Deploy only discovery using the [official multipart Management API](https://supabase.com/docs/reference/api/v1-deploy-a-function), explicit discovery slug, entrypoint discovery/index.ts, and verify_jwt=false. Upload exactly that file and _shared/handler.ts, _shared/geoapify.ts, _shared/contracts.ts. No CLI target resolution, Docker, pruning or extra function deployment is used. The earlier CLI transport error is documented in the review.
- Separately synchronize exactly `GEOAPIFY_API_KEY`, `FUNCTION_ALLOWED_ORIGINS`, `GEOAPIFY_DAILY_CREDIT_BUDGET`, and `DISCOVERY_PUBLISHABLE_KEY` via HTTPS Management API. No temporary secret file or secret command argument. Existing unrelated secrets remain untouched; these four settings are upserted. No local `.env` changes.
- Verify actual search, destination detail, nearby sights, and repeated-search cache hit through the function. At most **3 new provider credits**; cache hits may reduce this. The endpoint reserves credits before each uncached attempt, including failed attempts. No automatic upstream retries.

Required project token permissions: project_admin_read for project confirmation; api_gateway_keys_read for publishable metadata; database_migrations_read for history; database_migrations_write **only if the reviewed migration is absent and application is approved**; edge_functions_read for inventory; edge_functions_write for discovery deployment; edge_functions_secrets_write for the four settings. Supabase requires Owner or Administrator for production-secret changes. No organization permission is required for this manually confirmed plan, and no CLI target-resolution or organization-wide privilege is requested. [Token scopes](https://supabase.com/docs/guides/platform/personal-access-tokens), [secret roles](https://supabase.com/docs/guides/functions/secrets), [migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration), [secret API](https://supabase.com/docs/reference/api/v1-bulk-create-secrets). HTTP 401 means check the local token's validity/expiry; HTTP 403 means stop at the exact denied operation. Never send tokens in chat or broaden permissions automatically. Identity and migration history must pass even when plan confirmation is manual.

Partially completed setup is reported honestly: a successful migration may remain if deployment fails. Re-running skips the same migration and retries only the discovery deployment; nothing is rolled back destructively. Check dashboard state before retrying an uncertain timeout. Stop if project identity or migration hash conflicts.

## Local verification and following phase

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
npm.cmd run test:e2e
npm.cmd run review:zip
```

Browser suites mock provider responses and block unexpected external requests; they never spend provider credits. Unit/integration tests use synthetic keys and embedded PostgreSQL, not the hosted project. No mock result is a live test. Build includes only intentionally public config; bundle scanning still rejects configured confidential values. The review ZIP excludes all actual environment files, real keys, dependencies, builds, browser traces/reports, caches, private documents, and previous ZIPs. Explicitly reviewed PNGs under docs/review/phase-2/screenshots are included; arbitrary PNG paths are not allowlisted.

Phase 3 will reuse `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, and the local admin token (database password only if its tooling needs it). No Gemini/Pexels key is required. If the user separately approves the proposed GitHub OAuth path, `GITHUB_OAUTH_CLIENT_ID` and confidential `GITHUB_OAUTH_CLIENT_SECRET` will be needed from an approved GitHub OAuth registration. No OAuth registration, auth configuration, dashboard, or trip database is implemented or approved now.
