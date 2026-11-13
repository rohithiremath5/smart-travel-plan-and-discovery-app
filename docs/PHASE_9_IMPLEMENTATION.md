# Phase 9 implementation — guest regression and targeted polish

11 November 2026. Local Phase 9 only. The accepted Phase 8 receipt matched all 626 source/evidence entries before editing. Git status/diff were attempted; this directory is not a Git repository. Historical reports/images/archives, private environment, ledger/guards and deployed resources are preserved by hashes. No database version, backup format, dependency, model, key or hosted setting change.

## Confirmed corrections

Discovery and mapping clients now check cancellation before transport and retain the existing 15-second deadline through response-body reading. A shared bounded UTF-8 JSON reader checks declared and actual byte counts, cancels obsolete/oversized streams and releases its reader. Successful bodies are capped at 200,000 bytes; error bodies at 8,192. Abort remains an AbortError, deadline remains a timeout, malformed data remains a safe malformed response. Known public discovery error codes are allowlisted; arbitrary upstream text never becomes the adapter's error message. No retry, endpoint or hosted-function change.

Photo failures are scoped to the failed photograph key. Changing a reusable destination photo or trip cover can display the new valid image; a manual destination receives the honest fallback. Credits and image dimensions remain intact. Document titles now distinguish creating/editing a trip, itinerary, budget/weather, organizer and print views.

A supplemental maximum-length probe reproduced horizontal overflow from a valid 200-character unbroken destination name in details, wizard selection and trip metadata. Discovery cards/detail content and trip workspaces now allow those tokens to wrap and shrink without truncating user data or hiding overflow. A new four-width regression creates a leap-day trip with a maximum-length name/title and near-limit script-like private note, then checks reload and reflow across saved/discovery, wizard, itinerary, budget, print and dashboard views.

Weather availability explicitly rejects non-finite/out-of-range coordinates before transport, in addition to existing repository validation. WMO condition codes must be integer values or null. Existing consent, dates, model/provider choices, cache, cancellation and free non-commercial boundaries remain intact. All tests use mocked responses, never the real forecast endpoint.

A fixed-size lazy currency formatter cache reuses locale/currency formatters when rendering repeated expense rows. It caches only the at-most-eleven supported currency formatters, never amounts, descriptions or personal data. BigInt formulas, rounding, rates and persisted conversions are unchanged. See measured before/after results in [performance evidence](review/phase-9/performance.json).

## Regression coverage and isolation

The new connected guest journey starts at the actual landing page, uses a deterministic Chikkamagaluru district, saves it, completes the seven-step wizard, edits/reorders an itinerary, saves private notes and packing/checklist items, calculates a budget and expense, enters a missing currency reference, explicitly loads mocked weather, reloads, exports a v4 backup, previews/cancels/imports a conflicting copy and checks selected-trip print privacy. Assertions verify persisted content, totals, ordering and original-trip preservation. Supporting journeys cover map/route and AI proposal states, keyboard focus trapping/restoration, validation, reduced motion and offline failure. Existing focused tests retain deeper CRUD/conflict/provider failure coverage.

Ordinary Playwright tests now use a context fixture registered before navigation. Explicit mocks take precedence; otherwise only the controlled preview origin may reach the server. Unexpected external requests are aborted, recorded by origin/method only and fail teardown. Service workers are blocked in test contexts. Legacy hosted/tile probes are unchanged and disabled; historical screenshot flags remain off. New screenshots use only the dedicated Phase 9 folder.

New unit regressions cover streamed/declaration body bounds, early/body cancellation, body deadlines, safe error codes and HTTP 400/401/403/429/500/504, photo source changes, invalid weather coordinates/codes, half-minor rounding, overflow, INR/USD/EUR/GBP/AED/JPY identity conversions and leap-day/traveler boundaries. Existing DB1–3 upgrades to DB4, atomic writes/rollback, revisions, orphan prevention and backup1–4 suites remain authoritative. No owner browser profile or actual trips are opened.

## Evidence and limits

[Test report](PHASE_9_TEST_REPORT.md) records actual baseline, deliberate reproductions, fixes and final complete runs. [Feature matrix](review/phase-9/feature-matrix.json) covers all implemented feature groups A–N. [Defects](review/phase-9/defects.json), [screenshots](review/phase-9/screenshots.json) and [verification](review/phase-9/verification.json) distinguish automated mocks, agent visual inspection, historical evidence and pending live checks.

The initial Windows Playwright-owned preview stalled during teardown after cases completed. Stopping only the verified task-owned preview allowed exit 0; this is recorded as a tooling issue. Later runs reuse a task-owned local preview, which is stopped at handoff. No global process, system configuration or user data is changed.

Real Gemini planner HTTP 504, Phase 6.1 Geoapify preflight HTTP 403 and live Open-Meteo verification remain pending. No live provider-consuming call, deployment, SQL/secrets/billing/auth/cloud/publication or major product feature. Authentication/cloud/collaboration remain deferred to separately authorized Phase 10.
