# Phase 5 hosted verification review

5 November 2026. Local implementation accepted; limited hosted approval executed. All required local checks and bounded hosted verification are complete. Phase 6 remains unauthorized.

## Authorized hosted verification — 5 November 2026

The owner replaced the short-lived project-scoped setup token to add database_read, and the resumed read-only preflight passed. Project/health/publishable key, reviewed Phase 2 migration identity, discovery identity and exact accepted source hashes matched. The owner’s 5 November Dashboard confirmation of Free with spend cap enabled is manual evidence; no organization metadata endpoint was retried. Current .env is preserved byte-for-byte from the owner-provided replacement-token snapshot; the owner’s token change is not attributed to automation.

Only the approved weighted migration phase_5_mapping_fd8782a1115ed565 was applied (HTTP 200), and only discovery was deployed from the six reviewed files (HTTP 201). Read-back confirmed ACTIVE version 4, verify_jwt=false and matching migration history. No other migration, secret/settings sync, authentication, trip table, billing, subscription, frontend deployment or provider change occurred.

Live Geoapify through the deployed function returned six place candidates (HTTP 200), a walking route of 244 m / 218.647 seconds (14 positions), and a driving route of 257 m / 26.654 seconds (10 positions). Geometry is actual MultiLineString in longitude/latitude order, requested waypoints retain latitude/longitude order, and time is interpreted as seconds. The UI rounds these estimates to 4 min and a minimum 1 min respectively. No traffic claim. Cached walking repeat and legacy Kyoto destination search returned HTTP 200 with cached=true and no extra reservation. Invalid route mode and short discovery query returned HTTP 400 invalid_request with no reservation.

Application usage was confirmed in read-only SQL: 0 → 1 → 21 → 41 credits on 5 November UTC, within 100/day and the approved 41 additional ceiling. Provider invoice accounting was not independently verified. Live browser checks use only those three existing cache entries, checking existence/expiry before forwarding. Expired/missing/changed requests abort instead of spending more credits.

The real production-configured local app was reviewed at 360/768/1024/1440px with OpenFreeMap tiles and actual deployed-function cached responses. Search → explicit selection → activity Save → reload persistence, walking/driving, keyboard marker/card synchronization, day changes and mobile list switching passed. The initial run passed three widths and failed 768px because of asynchronous Playwright response-body instrumentation; awaiting response completion and attaching rejected scan promises fixed the capture, and the focused 768px rerun passed. No application or Edge source correction/redeployment was needed.

Daily exhaustion/upstream unreachable/partial routes are covered by deterministic mocked/embedded-PostgreSQL tests, not deliberately induced live. Browser network aborts and synthetic 429 daily_budget responses prove manual-planning fallback without modifying hosted quota or exceeding the allowance. Live source responses and production assets passed limited confidential-value scans. Full fresh test results and screenshots are below/in the review evidence. Earlier blocked preflight is retained separately.

## Actual verification results

| Check                                    | Current outcome                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ESLint / strict TypeScript               | Passed; final test-harness changes also checked before packaging                                                            |
| Unit / component / integration / tooling | **163 passed in 21 files**, fresh run 72.43s                                                                                |
| Production build / private-value scan    | Passed; **35 assets** scanned; optional large MapLibre chunks retained                                                      |
| Full deterministic Playwright            | **48 passed; eight opt-in network cases deliberately skipped**, 4.7min                                                      |
| Actual hosted browser workflow           | Passed at all four widths: initial 3 pass / 1 capture failure; corrected focused 768px check **1 passed, 41.6s**            |
| New screenshots                          | **24**, six states × four widths; 16 actual hosted/cached Geoapify + real tiles, 8 explicit simulated failures + real tiles |
| Earlier Phase 5 screenshots              | **24 retained**, labelled original live tiles only or mocked providers/basemap                                              |
| Quota                                    | 0 → 41 additional application-reserved credits; final browser ledger read recorded separately                               |
| Environment                              | Preserved from owner-provided replacement-token snapshot; no automated .env writes                                          |
| Historical evidence                      | 56 Phase 2–4 screenshots / eight photo renditions checked; Phase 0–4 reports retained                                       |

Earlier accepted local results remain in [local-and-blocked-verification-history.json](review/phase-5/local-and-blocked-verification-history.json), and the old permission blocker remains in [hosted-preflight-permission-blocked.json](review/phase-5/hosted-preflight-permission-blocked.json). They are not relabelled as fresh successful hosted checks. The initial full hosted browser run’s response-body capture failure is disclosed above; no failed case is waived.

## Review evidence

[Current preflight](review/phase-5/hosted-preflight.json), [deployment HTTP/status evidence](review/phase-5/hosted-deployment.json), [actual API requests and credit ledger](review/phase-5/live-verification.json), [screenshots](review/phase-5/README.md), [verification results](review/phase-5/verification.json), [integrity](review/phase-5/integrity.json), [setup/providers/permissions](PHASE_5_SETUP.md).

The first result for Nijo Castle Kyoto was **夢屋 Nijo Yumeya**, and Nijō Castle was another candidate. The test explicitly selected the displayed first venue; it does not mislabel that venue as the castle. This demonstrates real geocoder ranking/ambiguity rather than an invented perfect match. No extra search was made to improve the result. Existing discovery was verified using its real cached Kyoto search; no additional uncached legacy discovery call was spent.

## Practical limits

- **Application reservations are confirmed; provider invoice usage is not.** The existing 100/day ceiling and conservative 20/route reservation remain; no budget change, paid fallback or refund. Cache hits consume zero.
- Live quota exhaustion, upstream outage and an unreachable route were not induced. Their normalization/quota/UI behavior is covered by mocked and embedded-PostgreSQL tests. No hosted budget was lowered, table reset or extra route requested.
- Browser review uses installed Chrome at four widths, keyboard/focus, axe and overflow checks. It is not a full cross-browser, real-device, assistive-technology or security audit.
- Renderer 1081.74kB and worker 518.98kB are optional lazy assets and still produce Vite’s size warning. No offline map download or cold-reload guarantee.
- IndexedDB remains database v2, trip/itinerary schema v1 and backup v2 with valid v1 metadata imports. Browser storage can be cleared; backups are private unencrypted files, not cloud backup.
- Earlier Phase 0–4 ZIPs/receipts are unavailable for baseline comparison; none was deleted or regenerated by this phase. Historical report/screenshot evidence remains.

## Handoff

No additional setup, account/key, source/SQL edit or secret sync is needed for current Phase 5 live use. Reuse existing Supabase Free/Geoapify Free; MapLibre/OpenFreeMap need no account/key. [Provider/signup/environment/dashboard/commands](PHASE_5_SETUP.md). Phase 6 would need an eligible unbilled Gemini project and server-only GEMINI_API_KEY after its own approval; no key is requested or used now. Authentication remains Phase 10.

Final review archive: smart-travel-phase-5-review.zip and matching receipt, allowlisted inventory/content hashes verified and limited credential scan applied. Includes only synthetic review trips/public provider data and labelled screenshots, excluding actual personal exports/environment/dependencies/builds. A scan is not proof of complete secrecy.

PHASE 5 LIVE VERIFICATION COMPLETE — READY FOR FINAL REVIEW

WAITING FOR USER APPROVAL TO START PHASE 6.

STOP.
