# Phase 8 setup — no new accounts or keys

11 November 2026. Resume the existing installation and populated `.env`; no source edit, key regeneration, new account, payment method, subscription or hosted setup is required. Budget, expenses and static currency work locally after the application assets load. This is not an offline service-worker installation: the local server still serves the app.

```powershell
npm.cmd run setup:check
npm.cmd run dev
```

Open My trips → trip → Budget & weather. Review illustrative rates, enter distance and explicit total/return interpretation, adjust travelers/days/meals/rooms/nights and add custom estimates. Zero target means no target. Edits recalculate immediately; choose **Save budget and expenses** to persist. Actual expenses are entered separately and capture a fixed reference conversion. Save again after changes. Export a private complete backup from My trips or an organizer/itinerary.

Reset estimates and currency changes require confirmation. Changing currency resets monetary estimates explicitly and is unavailable while actual expenses exist. On a stale save, keep your draft, review the latest complete budget, then explicitly replace it or discard the draft. Unlike organizer item review, budget review replaces the whole budget aggregate; compare all assumptions/expenses before applying. Saved assumptions are not silently recalculated after trip date/traveler edits.

## Providers, accounts and configuration

| Feature/provider                  | Eligibility/account                                                   | Signup and key/env requirements                                                                                                                                            | Action                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Local budget and expenses         | No provider or account                                                | Signup: not applicable. No key or environment variable.                                                                                                                    | Existing setup/check/dev commands only.                                                                                                      |
| Static ECB currency reference     | Public dated reference pages; no account                              | [ECB reference pages](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html); signup: not applicable. No API key/env. | Bundled 2026-11-10 snapshot; AED/unquoted pairs require a user-entered reference and date in the UI. No FX API command.                      |
| Open-Meteo forecast               | Free hosted endpoint for eligible non-commercial use only; no account | [Official docs](https://open-meteo.com/en/docs). Signup: not required. No API key/env/public-private key distinction.                                                      | User explicitly acknowledges personal/non-commercial use and coordinate sharing, then Load weather. No live call was made for this delivery. |
| Existing Supabase/Geoapify/Gemini | Existing optional accounts reused; unchanged                          | Existing exact signup/key/dashboard/public-private matrix remains in [Phase 7 setup](PHASE_7_SETUP.md). No new value required.                                             | No backend, migration, deployment, secrets or live verifier command is authorized.                                                           |

No `.env` changes or additional scripts follow population, because nothing new must be populated. No Phase 9 account/key is needed for the planned local review/polish; Phase 9 still needs separate approval. Authentication, OAuth and cloud storage remain Phase 10.

## Weather eligibility and controls

Before any future manual live use, confirm the app's usage fits [Open-Meteo's non-commercial terms](https://open-meteo.com/en/terms); commercial products, advertising/subscription deployments are outside this free endpoint's authorization. Do not add billing or a paid fallback. [Browser/CORS support](https://github.com/open-meteo/open-meteo) permits the direct keyless HTTPS client; no Supabase function is needed. Documented limits: below 600/minute, 5,000/hour and 10,000/day, plus the published monthly allowance in [pricing](https://open-meteo.com/en/pricing). Respect shared IP limits; the app's local cooldown is not a global provider quota guarantee.

Only verified existing destination coordinates are sent. No current location, private trip contents or extra geocoding. Forecasts cover up to 16 provider-local calendar days, not arbitrary future dates or historical observations. Refresh is explicit; cached/stale data and retrieval time are labeled. With no network, budget/expense/currency and cached weather remain usable; weather failures leave personal data unchanged. Source credit and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) attribution accompany displayed weather. Live CORS/provider response behavior remains unverified in this phase.

## Storage, backup and privacy

DB v4 additively creates budgets; v1/v2/v3 data and saved destinations remain. Close older tabs on a blocked upgrade; do not clear or recreate databases. Unavailable, quota or unsupported storage shows errors, never false saving. Budget limits: 50 custom estimates, 30 manual references, 300 actual expenses per trip; bounded text/amounts/assumptions. Backups stay ≤10 MB and 200 trips. New exports are complete v4; valid v1/v2/v3 imports remain supported. Preview conflicts, cancel freely, and confirm separate copies without overwrite. All related additions/deletions are atomic.

Browser storage may be evicted; local data is not cloud-backed. JSON exports, printed summaries and PDFs are unencrypted personal data. Keep them private and outside review archives. Print budget and actual totals are separate opt-in choices; private notes remain off and expense descriptions are not printed with totals. No weather cache is exported.

## Verification and review packaging

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run review:zip
```

Keep opt-in live mapping/tile tests disabled. Phase 8 tests intercept/block external traffic and use synthetic weather fixtures, never personal browser data. Review captures use `SMART_TRAVEL_PHASE8_CAPTURE=1`; older phase capture flags remain off to preserve evidence. `review:zip` creates the separate Phase 8 ZIP/receipt with allowlist, credential scan, inventory and per-file SHA-256 verification. Populated env files, private records/exports, caches/guards/logs, dependencies/builds, Git and previous archives are excluded. A scan is not proof of complete secrecy. See [actual verification](PHASE_8_REVIEW.md).
