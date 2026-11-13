# Phase 9 review — guest application testing and polish

11 November 2026. **READY_FOR_REVIEW — complete applicable local regression passed.** No Phase 10 approval is implied. [Implementation](PHASE_9_IMPLEMENTATION.md) · [actual test report](PHASE_9_TEST_REPORT.md) · [setup](PHASE_9_SETUP.md) · [evidence](review/phase-9/README.md).

The existing guest application is preserved. Targeted fixes improve bounded/cancellable discovery responses, safe provider errors, changed-source photo recovery, workspace titles and weather-input validation. A bounded formatter cache reduces repeated expense-row formatting work. Connected journeys verify persistence and data relationships across feature transitions; no major feature, database/backup version, dependency or provider model is added.

Final checks passed lint, formatting, strict TypeScript, 461 unit/integration tests in 40 files, production build/44-asset credential scan, and a **complete 108-pass Chrome suite with 12 intentional skips and no failures/flaky cases/retries**. There are **96 fresh synthetic screenshots** across all four widths. 371 historical files (280 earlier screenshots), protected provider/backend/data architecture, populated environment, ledger/guards and accepted prior archives are unchanged. No unresolved local P0/P1 defect remains. See [verification](review/phase-9/verification.json), [defect inventory](review/phase-9/defects.json), [feature matrix](review/phase-9/feature-matrix.json) and [measurements](review/phase-9/performance.json).

The separate Phase 9 ZIP/receipt use the final tested source and sanitized evidence. Archive bytes, phase, inventory, unique safe paths and every file hash are independently checked with a PowerShell/.NET ZIP reader against the receipt and current source. Populated env/private data/dependencies/builds/caches/logs/Git/old archives are excluded. A credential-pattern scan is limited, not proof of complete secrecy.

## Owner review checklist

1. Use synthetic data: open landing → Discover → curated destination (or mocked Chikkamagaluru fixture) → save, then My trips → create one trip with dates, travelers/interests/pace. Guest creation requires no account.
2. Add two manual activities, edit time/duration, reorder by keyboard buttons and save a day note. Check the optional location list/map using mocks; manual planning must work when maps/AI fail.
3. Open Organizer, add a private note, apply selected packing-template items and check quantities/progress. Reload to verify saving. Cancel a deletion before confirming it on synthetic data.
4. Open Budget & weather. Enter 100 km with ₹10/vehicle-km, verify transport is ₹1,000 for one vehicle independent of passengers. Adjust travelers/meals/rooms/nights and compare totals. Add an actual expense separately; review dated static rates and missing AED-rate guidance.
5. Save, reload and verify activities, organizer and expenses. Edit another tab's stale draft and review the conflict before explicitly replacing anything.
6. Export an unencrypted private v4 JSON backup. Preview/cancel a conflict import; if confirming, check that it creates a separate remapped copy and leaves the original unchanged. Do not place the backup in the review archive.
7. Print the selected trip: private notes and budget/actual totals start excluded. Select only intended totals/details and check native print preview.
8. Review 360/768/1024/1440px screenshots. Use Tab/Shift+Tab/Enter/Escape to inspect focus, menus, dialogs, error messages and reordering. The agent's automated/visual review does not replace an assistive-technology audit.

Weather/provider verification is optional and **not authorized by this review**. Use the documented intercepted fixtures. Do not run live verifiers, backend setup, deployment, SQL or secret commands. No new account/key/env is needed. Authentication/cloud/collaboration remain Phase 10 and require separate approval.

## Remaining limitations

Real Gemini planner generation remains unverified after historical HTTP 504. Phase 6.1 real discovery verification remains blocked by the preserved `edge_functions_secrets_read` HTTP 403. Real Open-Meteo/CORS behavior remains unverified. Static currency is a dated reference, not a current quote. Local storage can be evicted; drafts can be lost before save and exports are unencrypted. No cloud backup or service-worker cold-start guarantee. Existing optional MapLibre warnings remain; no warning suppression. Chromium laboratory timings and print rendering do not establish field/mobile-network/Safari/Firefox/physical-printer behavior.
