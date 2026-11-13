# Limited live-verification addendum — blocked on 10 November 2026

The separately approved maximum-five-credit task stopped in mandatory preflight: read-only function-secret metadata returned **HTTP 403, `edge_functions_secrets_read` required**. Project/key/health, reviewed ACTIVE v5 source and read-only quota (used 0, remaining 100, no active leases) passed. Current hosted budget/key could not be established. No Geoapify request, retry, new deployment, SQL/secret write or privilege broadening occurred. Every planned search/detail/cache/live UI case is unattempted; no provider success is claimed. [Focused findings](PHASE_6_1_LIVE_VERIFICATION.md) · [New preflight](review/phase-6-1/live-preflight-2026-11-10.json) · [New verification evidence](review/phase-6-1/live-verification-2026-11-10.json). Phase 7 is not started.

## Prior deployment and local review — retained verbatim

# Current deployment addendum — 10 November 2026

The owner accepted the local correction and separately authorized deployment only. Existing `discovery` is now **ACTIVE v5 (previously v4)**, with unchanged identity/name, entrypoint and JWT configuration. All six downloaded original source-map hashes match the reviewed plan. Both migration identities and function inventory remain unchanged. Nine actual non-provider rejection/CORS checks passed before quota acquisition; no live Geoapify/Gemini request or SQL/secret/billing/auth/frontend change occurred. Real provider functionality remains unverified.

See [controlled deployment report](PHASE_6_1_DEPLOYMENT.md), [preflight](review/phase-6-1/deployment-preflight-2026-11-10.json), [deployment hashes/status](review/phase-6-1/deployment-2026-11-10.json), [actual safe checks](review/phase-6-1/non-provider-checks-2026-11-10.json), and [fresh local verification](review/phase-6-1/deployment-verification-2026-11-10.json). The deployment-only approval is consumed; the earlier proposed live tests still require separate explicit approval. Phase 7 is not started.

## Original local review — 7 November 2026, retained verbatim

# Phase 6.1 destination-search compatibility correction

7 November 2026. **Local source and offline verification only.** No real Geoapify/Gemini request, hosted function deployment, migration, secret upload, subscription change or frontend publication is performed. Phase 7 is not started. The unchanged Phase 6 Gemini planner remains live-unverified after its separately recorded HTTP 504; this correction does not retry or alter it.

## Root cause and resulting behavior

The original shared request contract accepted only city/country. The explorer defaulted to city and exposed only those two filters; the trip picker hardcoded city for every worldwide query. The normalizer chose `properties.city` before the actual feature name and marked every non-country result as a city. Consequently a district/state could be excluded by the provider request, mislabeled using an unrelated city field, or rejected by the browser's narrow destination schema. Old shared `v1` caches could retain those incorrect normalized records for 24 hours.

The explorer and guest wizard now default to **All destinations** using documented Geoapify `type=locality`, with explicit Cities/towns/villages (`city`), States/provinces (`state`) and Countries (`country`) filters. District/county are **result** types, not fabricated request parameters; the All destinations option covers them. Each cache miss still makes one provider request. No parallel city/state/country fan-out, arbitrary fuzzy rewrite, country restriction, paid fallback or automatic retry is introduced. Curated discovery and manual entry remain available.

The [official geocoding documentation](https://apidocs.geoapify.com/docs/geocoding/) describes locality as broad administrative search, including districts/counties/states; [Geoapify's autocomplete reference](https://geoapify.github.io/geocoder-autocomplete/api-reference/geocoder-autocomplete-options/) explains that city includes towns/villages. The dedicated Countries filter remains available rather than assuming every country is returned by a broad locality search. Street/building/amenity/postcode results are filtered out of destination discovery. Existing activity-location and nearby-attraction searches retain their separate purposes.

## Normalization and location context

| Provider evidence               | Normalized destination / name                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `result_type=country`           | Country, using country/name                                                                                                          |
| `state`                         | State/province, using state/name                                                                                                     |
| `county`                        | District/county, using county/name                                                                                                   |
| `district`                      | District, using district/name/suburb/address line                                                                                    |
| `city`                          | City/settlement, using city/name; explicit source town/village/hamlet evidence permits the finer grouping and actual settlement name |
| `suburb` / locality             | Locality, using the feature name/suburb/district                                                                                     |
| Missing/unknown type in details | Documented source place classification, or a unique name-to-geographic-field match; otherwise a named, unclassified region           |

Town/village grouping uses source metadata only when supplied; absence of that information does not prove a finer settlement type. Details never infer type solely from a requested filter or a parent city. Ambiguous legacy detail metadata stays unclassified rather than fabricating precision. Geoapify ID and finite in-range provider coordinates are preserved; oversized/invalid IDs are rejected rather than silently truncated. Only allowlisted bounded text/context fields leave the provider adapter, with controls/bidirectional overrides stripped. Reflected provider credentials are refused before caching/return. Missing optional geographic context is tolerated; malformed required data produces a safe error. Duplicate names remain separate by provider ID, with state/county/country context to distinguish them.

Cards, autocomplete, picker choices, details and trip summaries identify geography/type. Region/country/state/district coordinates are explicitly **reference points, not area boundaries**. Nearby lookup remains a 5-km circle around that point, not the entire administrative area; no boundary API or additional request is introduced. The itinerary map continues to use the saved point and existing activity locations/routing limits.

## Alternative names and misspellings

The small maintainable registry contains **names and official references only**, never destination IDs, coordinates or fabricated provider results. It offers explicit query buttons for documented Chikmagalur/Chikkamagaluru, Coorg/Kodagu, Mysore/Mysuru, Belgaum/Belagavi, Ooty/Udhagamandalam and München/Munich. Suggestions include their country/state context and suppress conflicting region qualifiers. The ordinary provider search remains global and independent of this deliberately limited registry.

`Chikmangalur` is separately labeled **possible spelling, not a documented alternative name**. Arbitrary other typos are not guessed. Correct canonical names do not display redundant suggestion banners. Queries remain visible and unchanged until a suggestion is explicitly chosen; only that choice initiates its search, and no result is automatically selected or saved. Unresolved searches offer context/type/spelling guidance and the existing manual-entry path.

Official references: [Chikkamagaluru district](https://chikkamagaluru.nic.in/en/about-district/), [Kodagu district](https://kodagu.nic.in/en/about-district/), [Government of India naming both Mysuru/Mysore and Belagavi/Belgaum](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1489165&lang=1&reg=3), [Nilgiris/Ooty](https://nilgiris.nic.in/tourist-place/raj-bhavan-ooty/), and [Munich tourism](https://www.munich.travel/en/). These support names, not guaranteed provider coverage or independently verified geographic coordinates. Browser fixtures use synthetic IDs and explicitly test-only reference coordinates.

## Existing-data and cache compatibility

Discovery destination kinds expand additively; optional `state`, `county`, `district` context is accepted alongside old city/country/region records. Guest destination references add optional kind/context and align provider-name/country bounds to 200 characters. Automatically proposed trip titles remain bounded to 100. No IndexedDB opening/migration, store, trip schema version or backup envelope version changes. Saved discovery remains database v1, guest database v2, trip/itinerary records v1, complete backups v2; valid v1 backups still import.

New district trips persist ID/name/type/context/coordinates through reload and complete export/import. Existing records lacking these optional fields remain valid and are not silently rewritten. Old saved snapshots retain their original metadata; fresh details take priority when available, with the existing explicit saved-snapshot fallback on failure. No saved destinations or personal trip data are uploaded.

Backend search/autocomplete/detail cache keys use **`destinations-v2`**; corresponding frontend query keys include the same version. Old wrongly normalized city/country payloads cannot obscure fresh results. Existing rows are left to expire; no cache purge or SQL change is needed. Nearby-place `v1`, mapping `mapping-v1`, route reservations and the durable 100-credit daily application ceiling remain unchanged.

## Files and verification

The [verification inventory](review/phase-6-1/verification.json) lists changed files, actual checks, earlier failed test assertions and preservation results. The changes are focused in shared discovery contracts/normalization/handler; discovery UI/client plus name/context helpers; the trip picker/reference schema/title bound/summary; a map reference-point notice; discovery styles; deterministic fixtures/tests; and phase-aware safe packaging. Existing mapping request/provider/geometry logic, repositories/transactions, SQL, AI features/configuration/ledger/guards, and all historical Phase 0–6 evidence remain intact.

Tests cover all supported request types/parameters, realistic county/state/country/town/village/duplicate-name shapes, listed Indian queries and global examples, missing fields, invalid coordinates/IDs, text sanitization, empty results, name suggestions, error/cancellation paths, quota/security, cache version/reuse, district trip creation/save/reload/backup and old records. Browser tests use the **real local handler/normalizer with mocked provider transport**, isolated browser storage and synthetic trips. They are not live Geoapify verification.

Fresh complete unit/integration run: **335 tests passed in 34 files** (84.04 seconds). That run preceded the final helper visibility/alignment and citation polish; the final focused discovery/picker/fixture run passed **66 tests in two files**, including provider-shaped fixtures for every listed Indian query. Full Chrome regressions passed **72 tests**, with **12 deliberate skips** (four original-build capture-only tests and eight opt-in live mapping/tile tests), across all four widths in 410.64 seconds. Separate original-build capture run passed four tests. ESLint, strict TypeScript and production build passed; the build scanned 35 assets for configured credential values/common patterns. Final formatting status and precise counts are in the verification JSON.

An intermediate React nested-form warning was repaired by keeping search inside the wizard's existing form and intercepting Enter. One new unit test's asynchronous-store mock and three ambiguous browser assertions were corrected; final reruns pass. No genuine live-provider result is inferred from these mocked checks. The existing MapLibre chunk-size warning remains.

Before captures ran against the original accepted compiled application; final captures run against the corrected application. All images are **mocked provider states**, never live provider screenshots. Review widths are 360/768/1024/1440 pixels, with keyboard, focus, axe/overflow, loading/error/manual fallback and regression checks. Images and sanitized evidence are in [Phase 6.1 review](review/phase-6-1/README.md).

| Width | Original explorer                                               | Corrected explorer                                            | Original trip picker                                          | Corrected trip picker                                       |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| 360   | [Before](review/phase-6-1/screenshots/before-explorer-360.png)  | [After](review/phase-6-1/screenshots/after-explorer-360.png)  | [Before](review/phase-6-1/screenshots/before-wizard-360.png)  | [After](review/phase-6-1/screenshots/after-wizard-360.png)  |
| 768   | [Before](review/phase-6-1/screenshots/before-explorer-768.png)  | [After](review/phase-6-1/screenshots/after-explorer-768.png)  | [Before](review/phase-6-1/screenshots/before-wizard-768.png)  | [After](review/phase-6-1/screenshots/after-wizard-768.png)  |
| 1024  | [Before](review/phase-6-1/screenshots/before-explorer-1024.png) | [After](review/phase-6-1/screenshots/after-explorer-1024.png) | [Before](review/phase-6-1/screenshots/before-wizard-1024.png) | [After](review/phase-6-1/screenshots/after-wizard-1024.png) |
| 1440  | [Before](review/phase-6-1/screenshots/before-explorer-1440.png) | [After](review/phase-6-1/screenshots/after-explorer-1440.png) | [Before](review/phase-6-1/screenshots/before-wizard-1440.png) | [After](review/phase-6-1/screenshots/after-wizard-1440.png) |

## API impact and pending hosted work

**Zero live provider requests in this correction.** Existing server-only key and `GEOAPIFY_DAILY_CREDIT_BUDGET=100` are preserved; no provider quota increase. Broader types replace the existing one-query strategy. An explicit alternate-name choice is a new user search, not an automatic retry. Existing autocomplete debouncing/cancellation and durable reservation/cache behavior remain. First use of a new cache namespace is naturally a miss; ordinary repeated matching requests then reuse it.

The currently deployed discovery function has **not** been updated. The local frontend can receive its older invalid-request response for locality/state until a separately approved function deployment occurs; it provides curated/manual fallback without secretly retrying city. [Setup and six-file hosted plan](PHASE_6_1_SETUP.md) describe the exact bundle and proposed bounded live checks. No migration or secret change is required. Existing provider signup/account/env/dashboard/public/private/command reporting is retained there; no new account/key is needed. Phase 7 needs no new credential under the roadmap and is not authorized.

Live coverage, exact real-provider district/detail shapes, transliteration behavior and country coverage under locality remain unverified. A documented name is not a promise that Geoapify indexes it. Missing provider geometry/type data cannot be invented. Accessibility checks are a meaningful subset, not a full conformance audit; existing MapLibre size warnings remain. Review packaging scans configured private values and verifies inventory/content hashes but is not proof of complete secrecy.

PHASE 6.1 DESTINATION SEARCH CORRECTION COMPLETE — READY FOR REVIEW

HOSTED GEOAPIFY VERIFICATION PENDING SEPARATE APPROVAL

PHASE 7 NOT STARTED

STOP.
