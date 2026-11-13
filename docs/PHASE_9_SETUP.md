# Phase 9 setup — no new provider setup

11 November 2026. Reuse the installed project and populated `.env` byte-for-byte. **No provider is required for Phase 9's local tests, no account/signup/key/env value is needed, and no hosted setup script is authorized.** The existing Supabase/Geoapify/Gemini accounts remain optional runtime integrations; exact official signup/dashboard/public-versus-private key instructions remain in [Phase 7 setup](PHASE_7_SETUP.md), with keyless weather/static currency in [Phase 8 setup](PHASE_8_SETUP.md). Do not recreate accounts or rotate credentials.

Local budget/organizer/planner/currency have no provider. Open-Meteo's existing free runtime path is keyless and eligible non-commercial use only; requests remain explicit. Phase 9 tests mock it. No live currency API is installed. Phase 10 identity/cloud provider choices, account steps and keys are undecided until separate approval; request nothing now.

## Commands

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

Use installed Chrome and explicitly disable live/historical capture paths before browser tests:

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'
$env:SMART_TRAVEL_LIVE_MAPPING='0'
$env:SMART_TRAVEL_LIVE_TILES='0'
$env:SMART_TRAVEL_SEARCH_BEFORE='0'
$env:SMART_TRAVEL_SEARCH_CAPTURE='0'
$env:SMART_TRAVEL_REVIEW_CAPTURE='0'
$env:SMART_TRAVEL_PHASE7_CAPTURE='0'
$env:SMART_TRAVEL_PHASE8_CAPTURE='0'
npm.cmd run test:e2e
npm.cmd run review:zip
```

The ordinary test fixture permits only the controlled localhost preview origin, after explicit deterministic mocks. Unexpected external traffic is aborted and fails the test; isolated contexts block service workers. Legacy live opt-ins remain unchanged and skipped. `build:e2e` injects only synthetic public configuration and has no AI development backend. Tests never open the owner's normal browser profile.

For new Phase 9 screenshots only, set `SMART_TRAVEL_PHASE9_CAPTURE=1` and run `npx.cmd playwright test guest-journey.spec.ts`. Ordinary runs put images in ignored per-run output; prior review folders are not capture targets. Chrome-only WebGL/print behavior is not cross-browser proof.

On this Windows environment the baseline Playwright-owned preview stalled during teardown after all cases finished. A task-owned preview can be started with `node node_modules/vite/bin/vite.js preview --outDir .cache/e2e-dist --host 127.0.0.1 --port 4173` after `build:e2e`; the default non-CI configuration reuses it. Stop only that task's process after the run. Do not kill unrelated browsers/services. This workaround does not change application code or infrastructure.

`review:zip` now targets `smart-travel-phase-9-review.zip` and its matching receipt, preserving old archives. It allowlists source/tests/docs/review images and checks configured private values/common patterns without printing them. Populated env, actual records/backups, local DBs, ledger/guards, logs/caches, dependencies/builds, Git and previous archives are excluded. Independently verify ZIP bytes, inventory/path uniqueness and every file hash against the receipt and final source. A limited scan is not proof of complete secrecy.

Do not execute `setup:backend`, hosted `setup:mapping`/`setup:ai`, `setup:secrets`, any live verifier or deployment command. No migration, secret, quota, model, billing, authentication or cloud setup follows this phase.
