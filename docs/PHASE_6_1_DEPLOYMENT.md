# Phase 6.1 controlled discovery deployment — 10 November 2026

The owner approved the local correction and separately authorized only redeployment of the existing `discovery` function. Deployment succeeded once: **ACTIVE, version 4 → 5**, with the same function identity/name, `discovery/index.ts` entrypoint, no import map and unchanged `verify_jwt=false`. All six original source contents recovered from the downloaded ESZIP source maps match the reviewed [hosted-plan hashes](review/phase-6-1/hosted-plan.json). No source-code correction was necessary during this deployment.

**No real destination/location/route/Geoapify/Gemini request was made.** No SQL write, migration, cache deletion, secret upload, authentication configuration, billing/subscription change, other function or public frontend deployment occurred. Live provider coverage remains unverified and requires separate approval. Phase 7 is not started.

## Mandatory preflight and evidence

- The owner currently reconfirmed Supabase **Free with spend cap enabled** on 10 November. This is manual Dashboard evidence; no organization endpoint or organization-wide token was requested.
- Configured reference and HTTPS URL matched; Management API project metadata confirmed the exact target and `ACTIVE_HEALTHY`. The configured publishable key matched authoritative public-key metadata. Actual values and remote identifiers are suppressed in review evidence.
- The scoped-token prefix was checked locally. The owner reported a seven-day lifetime, following their earlier project-scoped-token confirmation. Current validity and required reads were confirmed by HTTP 200; `edge_functions_write` was exercised successfully by the specifically approved deployment (HTTP 201). Exact absolute expiry and the complete grant/restriction list were not independently introspected; no account-wide profile/token endpoint or privilege broadening was used.
- The two recorded migration identities match the SHA-256 prefixes of the unchanged reviewed SQL: `phase_2_discovery_7c1c32367c9779ce` and `phase_5_mapping_fd8782a1115ed565`. Source hashes also match historical Phase 5 evidence. This verifies recorded content-hash identities; it is not a fresh audit of every deployed database object. No SQL query or write was executed.
- Existing discovery v4 was uniquely identified as ACTIVE with its approved configuration. Downloaded source maps matched all six historical Phase 5 source hashes, including the mapping contracts/provider and handler. This proves mapping code was deployed; no routing response was requested.
- The six current files matched the Phase 6.1 plan before deployment and again inside the actual multipart upload guard. SQL, secrets and other configuration changes were unnecessary.

See [sanitized preflight](review/phase-6-1/deployment-preflight-2026-11-10.json) and [deployment/source hashes](review/phase-6-1/deployment-2026-11-10.json). The earlier 7 November plan/verification JSON and all previous screenshots remain unchanged historical records.

## Deployment-only invocation

The existing reviewed `deployDiscovery` export in `scripts/setup-backend.ts` was invoked directly from a local guarded runner. **Neither `setupBackend` nor `setupMapping` was invoked**, because their apply paths can write migrations. No CLI project linking, Docker, SQL, secret synchronization or bulk function deployment was used.

The runner first verified the helper offline using a mocked fetch, then called:

```typescript
await deployDiscovery(root, config, auditedFetch);
```

Its only permitted mutation was `POST /v1/projects/{ref}/functions/deploy?slug=discovery`, with metadata `{ name: 'discovery', entrypoint_path: 'discovery/index.ts', verify_jwt: false }` and exactly these six hash-checked uploads:

1. `supabase/functions/discovery/index.ts`
2. `supabase/functions/_shared/contracts.ts`
3. `supabase/functions/_shared/geoapify.ts`
4. `supabase/functions/_shared/handler.ts`
5. `supabase/functions/_shared/mapping-contracts.ts`
6. `supabase/functions/_shared/mapping-provider.ts`

A fresh exclusive local guard limited the runner to one deployment POST. An immediate metadata read checked that v4 had not changed since preflight. The runner rejected other hosts/endpoints/methods, extra files/form fields, wrong metadata/hashes, and duplicate POSTs. It used the existing `.env` in memory and printed only sanitized evidence. No automatic retry was performed. This consumed authorization is not permission to rerun deployment or remove the guard.

The [official deployment API](https://supabase.com/docs/reference/api/v1-deploy-a-function) and [function-body read API](https://supabase.com/docs/reference/api/v1-get-a-function-body) document the respective project Edge Function permissions. [Supabase token guidance](https://supabase.com/docs/guides/platform/personal-access-tokens) distinguishes scoped tokens from Legacy full-account tokens. No new account/key was needed; existing provider signup/environment/dashboard guidance remains in [Phase 6.1 setup](PHASE_6_1_SETUP.md).

## Post-deployment checks

Management API reads confirmed v5 ACTIVE, the same identity and configuration, the same two migration identities, and unchanged function inventory (no other functions). The downloaded v5 ESZIP body has SHA-256 `d0e83ede5c345d45f7ee94ca0ffb92d53cc26d7035aa5d2e39531b55a9433c19`; its six original source-map contents match the reviewed per-file hashes. Mapping files remain unchanged. Metadata/source reads do not prove real Geoapify coverage.

Nine actual hosted checks passed through paths that return **before `store.acquire`**, so they reserve no application credits and cannot invoke Geoapify:

| Check                     | Actual status / expected code                 |
| ------------------------- | --------------------------------------------- |
| Unsupported operation     | 400 / `invalid_request`                       |
| Missing publishable key   | 401 / `invalid_public_key`                    |
| Disallowed origin         | 403 / `origin_denied`, no allow-origin header |
| GET method                | 405 / `method_denied`                         |
| Allowed-origin OPTIONS    | 204, correct CORS                             |
| Non-JSON content          | 415 / `json_required`                         |
| Malformed JSON            | 400 / `invalid_request`                       |
| Incomplete location input | 400 / `invalid_request`                       |
| Incomplete route input    | 400 / `invalid_request`                       |

Allowed-origin CORS and confidential-value scans passed on all nine responses. A valid publishable key was sent only in the `apikey` header where needed; administrative/provider credentials never entered these requests. This preserves the existing publishable-key/origin gates, which are **not user authentication**. No authentication feature was configured. Source inspection confirms the existing quota/security paths are preserved.

See [actual non-provider results](review/phase-6-1/non-provider-checks-2026-11-10.json) and [fresh local verification/preservation](review/phase-6-1/deployment-verification-2026-11-10.json). Earlier 335-test/72-browser/24-screenshot results are retained as dated local mocked evidence, not newly executed live verification.

Fresh checks in this deployment task passed: ESLint with zero warnings, full formatting, strict TypeScript, production build with its 35-asset limited credential scan, **63 unit/integration tests in two files**, and **28 mocked Chrome browser tests** across 360/768/1024/1440 px (zero skips/failures/retries). The latter covered discovery, district trip persistence/backups and existing mapping/location/routing safeguards. Browser shutdown stalled after all test cases passed; stopping the positively identified task-owned local preview process allowed Playwright to exit 0 and write its report (332.61 seconds including teardown). This was a local tooling issue; no production code was changed. The pre-existing MapLibre chunk-size warning remains.

## Preservation, configuration and remaining work

Existing `.env`, all AI models/timeouts/source, durable AI ledger and both consumed Gemini guards are preserved byte-for-byte. Existing discovery/guest data and historical SQL/reports/images are unchanged. No review ZIP/receipt was present at the project root at task start; none was deleted or overwritten. A private pre-deployment snapshot preserves the existing allowlisted 485-file tree. The new requested root Phase 6.1 ZIP/receipt contains the current implementation plus sanitized deployment evidence, excluding that snapshot, caches, populated environments, credentials, dependencies, builds and private records. The limited credential scan and content-hash verification do not prove complete secrecy.

Reuse the existing Supabase Free and Geoapify Free accounts. No new environment variable, key or source edit is required. `GEOAPIFY_API_KEY` and administration tokens remain confidential/server-only; `VITE_SUPABASE_URL` and the publishable key remain public configuration. The existing application budget is still configured as **100**, and this task did not change remote secrets. No secret values/digests were reread; preservation is based on the narrowly audited deployment-only operation and unchanged configuration. No provider allowance was consumed by the fixed rejection probes. Run `npm.cmd run setup:check` and `npm.cmd run dev` for local development; valid worldwide searches would now reach v5 and must **not** be exercised by automation without separate live approval.

Real Chikkamagaluru/state/country/rural search, details, aliases, location/routing responses, and new cache reuse were **not** tested live. The earlier proposed maximum-five-credit Geoapify verification plan remains a proposal, not authorization. All Gemini guards remain consumed and real planner inference remains unverified after its earlier HTTP 504. No additional hosted modification or Phase 7 work is approved.

PHASE 6.1 DISCOVERY FUNCTION DEPLOYED — AWAITING LIVE GEOAPIFY VERIFICATION

PHASE 7 NOT STARTED.

STOP.
