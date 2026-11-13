# Phase 9 test report

11 November 2026. **Final local verification complete — READY_FOR_REVIEW.** The machine-readable [verification record](review/phase-9/verification.json) supplies command start/end timestamps, exit codes, totals/skips/retries and limitations. Phase 8's 425/92 report remains historical and unchanged.

## Fresh baseline

The accepted receipt matched 626 files. ESLint, Prettier, strict TypeScript, all 425 unit/integration tests in 39 files and production build passed. The production scan examined 44 assets. Full Chrome passed 92 cases, with 12 intentional skips, zero failures/flaky cases/retries at 360/768/1024/1440px. The command began 15:58:05 UTC and returned exit 0 at 16:18:14 UTC after the task-owned Windows preview teardown stall was resolved. Duration includes teardown, not just test execution. Raw private logs stay excluded from archives.

## Reproductions and corrections

Six selected new tests failed against the old transport/photo implementations: early cancellation, arbitrary error-code reflection and photo changes. Twelve other tests were filtered from that focused reproduction, not disabled in source. Five additional weather-input tests failed against old validation (four invalid coordinates and fractional WMO code); 29 other cases were filtered. Corrections then passed the targeted transport/weather runs. A supplemental typecheck found a test fixture's literal `2 | 61` array could not be assigned 1.5; constructing an explicit malformed unknown input fixed the test typing, without weakening runtime validation.

Initial/final runs are reported separately. No failing assertion is removed or converted into a skip. The 12 existing full-browser skips remain four before-correction historical captures, four opt-in hosted mapping cases and four opt-in live tile cases. No optional live case runs.

A first expanded full run passed 461 unit tests and 104 applicable browser cases before a separate maximum-length UI probe exposed horizontal overflow. That complete run is retained as pre-wrap evidence, not represented as the final source result. A new regression reproduced the detail overflow, then exposed wizard/trip-header variants as the flow advanced. Targeted CSS fixes wrap full valid data without clipping or truncation. A four-width intermediate check encountered a test locator matching both legitimate print-page and article headings; selecting the primary page heading corrected that test defect. The final complete suites are rerun after these changes.

## Coverage and interpretation

The [feature matrix](review/phase-9/feature-matrix.json) traces discovery/search/saves, guest CRUD/wizard, manual planning, maps/routes, AI preview/chat, organizer/templates, budgets/expenses/currency/weather, persistence/backups/print and cross-cutting navigation/accessibility/privacy/performance. Tests exercise actual UI outcomes, reload, conflict copies, isolated DB upgrades, atomic failure, stale revisions, currency boundaries and private-note defaults.

Automated axe A/AA checks, overflow assertions, keyboard interactions and reduced motion are browser tests. Screenshots are actually captured from local synthetic states and inspected by the agent. This is not a human assistive-technology audit or WCAG certification. Installed Chrome is tested; Safari/Firefox and physical printer pagination remain unverified. All external provider data is mocked or blocked. No live-service claim follows from these results.

Laboratory load/resource/LCP/CLS and scripted-input timings use repeatable local profiles documented in [performance.json](review/phase-9/performance.json). They are not field Core Web Vitals, real-network mobile measurements or INP. MapLibre remains lazy/optional; its chunk-size warning is retained.

## Final complete run after the long-name fix

| Check                                      | Actual final result                                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESLint / Prettier / strict TypeScript      | Passed, exit 0                                                                                                                                               |
| Full Vitest                                | 461 passed, 0 failed/skipped, 40 files                                                                                                                       |
| Full Playwright Chrome                     | 108 passed, 0 failed/flaky, 12 intentional skips, 0 retries                                                                                                  |
| Viewports                                  | 360 / 768 / 1024 / 1440px, height 960px                                                                                                                      |
| Production build / limited credential scan | Passed; 44 assets, existing MapLibre warnings retained                                                                                                       |
| DB / backup                                | DB1–3 → DB4; complete v4 and valid backup1–4; atomic/conflict/privacy regressions passed                                                                     |
| Fresh review captures                      | 96 synthetic PNGs; axe and overflow checks passed                                                                                                            |
| Preservation                               | 371 historical files, including 280 screenshots; 29 protected source files; private environment/ledger/guards and three accepted ZIP/receipt pairs unchanged |

Exact UTC command start/end times and exit codes are in verification.json. Earlier baseline, deliberate red tests, intermediate locator/overflow failures and the pre-wrap full run remain separately recorded. The final complete suite was rerun; readiness is not based on selected-case reruns.
