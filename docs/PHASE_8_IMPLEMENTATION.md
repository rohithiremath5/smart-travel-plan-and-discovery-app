# Phase 8 implementation — weather, static currency and budgets

11 November 2026. Resumes the owner's authorized implementation after interruption. Existing currency/budget domains, repository, DB4/backup4 changes, weather client/panel and expense editor were retained. Missing UI, integration, tests and review delivery were completed rather than rebuilding earlier phases. [Recovery checkpoint](review/phase-8/recovery.json). Git is not initialized; preservation uses the saved pre-Phase-8 SHA-256 inventory. Phase 9 and 10 are not authorized.

## Budget and actual spending

The trip overview, itinerary and organizer link to `/trips/:tripId/budget`. The warm editorial layout combines a budget summary, editable assumptions, category breakdown, static references, actual expenses and an explicit-action weather panel. Focused feature components separate calculation fields, custom estimates, currency, expenses, summaries and cached route selection. All IndexedDB access stays in repositories.

India-oriented initial values are illustrative and editable: INR 10 per vehicle-km, 250 per person/meal, three meals/person/day, 1,500 per room/night, occupancy two, 300 per person/day activities, one vehicle and zero contingency. Travelers and inclusive days initially follow the trip; nights suggest `max(days - 1, 0)`. Other destinations use the trip currency with zero price assumptions requiring traveler input. No destination price lookup or automatic conversion of original trip metadata. A zero target means no target; remaining spending then compares with the estimate.

| Category       | Formula                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| Transportation | Entered km × explicit distance factor (1 or 2 for return) × vehicle-km price × vehicles |
| Food           | Travelers × meals/person/day × days × price/meal                                        |
| Rooms          | `ceil(travelers / occupantsPerRoom)`                                                    |
| Accommodation  | Rooms × editable nights × room/night price                                              |
| Activities     | Travelers × days × person/day activity budget                                           |
| Other          | Sum of custom estimates, added once                                                     |
| Contingency    | Subtotal × chosen percentage                                                            |
| Total          | Subtotal plus contingency                                                               |

Transport is shared, never multiplied by passengers. The entered distance is not doubled unless the user explicitly selects return. Recent local query-cache routes matching the current itinerary's ordered coordinates can be selected explicitly; this reads existing data only. A single-day route is not treated as a whole trip or return journey. Without a matching recent result, manual distance remains available. Mapping/provider code is unchanged.

Input edits recalculate immediately; invalid field text is retained, explained and prevents saving. Arithmetic uses integer minor units, integer meters/basis points and BigInt rational intermediate calculations, with half-up rounding and bounded results. Category shares, per-traveler spending and daily averages are shown. Estimates above the chosen nonzero target show the difference. Actual totals, category totals and remaining target/estimate are separate. Estimates never become actual expenses automatically.

Actual expenses support stable IDs, category, amount/currency, optional valid trip date and bounded description, edit and confirmed delete. Each conversion freezes its exact reference ratio/date/source and resulting budget-currency amount. Editing an expense retains its rate unless explicitly replaced. Later reference edits do not reprice earlier expenses. Changing budget currency requires confirmation and resets monetary estimates/references explicitly; it is disabled while actual expenses exist. Resetting estimates requires confirmation and preserves actual expenses/manual references. Draft edits require explicit save and may be lost on navigation/reload.

## Currency provenance and exact conversion

Static reference — not a live exchange rate. The bundled snapshot is **10 November 2026**, base **EUR**:

| Currency | Units per EUR | Official dated source                                                                                                                     |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| EUR      | 1             | Base identity                                                                                                                             |
| INR      | 105.3315      | [ECB INR chart](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-inr.en.html) |
| USD      | 1.1214        | [ECB USD chart](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html) |
| GBP      | 0.83545       | [ECB GBP chart](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-gbp.en.html) |
| JPY      | 177.38        | [ECB JPY chart](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-jpy.en.html) |

The official November tables were inspected for the dated observation; this is a bundled development snapshot, never refreshed by the app. AED and other unquoted currencies require explicit manual rate/date input. The existing currencies plus AED remain selectable; unsupported codes are rejected. JPY/KRW use zero minor decimals; other supported currencies use two. Conversion multiplies exact integer ratios and currency powers of ten, then rounds once to the target minor unit. Manual rates support up to eight decimals and preserve provenance. Same-currency conversion is always 1:1. No Frankfurter or live FX client exists.

## Weather contract and safety

Open-Meteo runtime requests use only existing curated/provider destination coordinates, six daily variables, Celsius/mm/km/h, `timezone=auto` and up to 16 forecast days. No browser location permission or geocoding. Missing/manual coordinates show verification-required guidance; known past/far-future trips are not queried. Returned provider-local date arrays determine actual coverage, with partial-window/no-date guidance. The pre-request date guard allows a one-day UTC/timezone margin because destination timezone is not known until the response. No historical averages or invented future weather.

Load requires explicit non-commercial/data-sharing acknowledgement. Unrelated budget edits, route reads, page opening and background focus never request weather. Requests omit cookies/referrer and send no trip IDs, titles, notes, expenses, dates or credentials. A ten-second abort deadline, cancellation/unmount propagation, no retry, HTTP/JSON/schema/date/unit/array validation and a 64 KiB response limit apply. Per-coordinate in-flight and 30-second refresh controls prevent repeated clicks. One-hour session cache freshness, 16-coordinate maximum and 48-hour retention support reuse; stale successful data stays visible after failed refresh and is labeled. Cache/preference storage failure does not claim durable trip saving. Temperature display preference remains local.

Data attribution/license and units/timezone/retrieval time are visible. The provider does not supply an issue timestamp in this response; the UI does not mislabel performance metadata as forecast issuance. Forecast data is summarized and Fahrenheit is a local display conversion. [API documentation](https://open-meteo.com/en/docs), [official browser/CORS support](https://github.com/open-meteo/open-meteo), [terms](https://open-meteo.com/en/terms), [pricing](https://open-meteo.com/en/pricing), [license](https://open-meteo.com/en/licence). Free hosted use is non-commercial only; documented limits are below 600/minute, 5,000/hour and 10,000/day, with no uptime guarantee. Commercial use must stop for separate eligibility/approval; no subscription or paid fallback was added.

## Persistence, backups and print

Centralized IndexedDB **v4** adds only `budgets`, keyed by tripId, with schema-v1 bounded aggregates. Valid v1/v2/v3 records and separate saved destinations are preserved. Missing budgets derive empty/illustrative defaults without a write. Saves atomically check budget and trip revisions and touch the trip; stale drafts require explicit review of the latest entire aggregate before replacement, or explicit discard. Existing manual assumptions survive trip metadata/date edits with a review notice. New/changed expense dates are checked against current travel dates; legitimate earlier history survives a later date-range change.

Complete product backup **v4** includes budgets, frozen expense conversions, manual rates, organizers and itineraries. Valid v1/v2/v3 inputs remain accepted and derive missing budgets. Old explicit helper signatures retain their version behavior for compatibility. The 10 MB/200-trip policy is unchanged. Full schema/ownership/duplicate-ID validation precedes atomic four-store import. Budget content participates in fingerprints; conflict copies remap parent/custom/expense IDs without overwriting existing records. Repeat identical imports skip. Trip deletion cascades all four stores. Weather session caches, credentials and verification guards never enter backups.

Print adds separate opt-in estimate and actual-category-total choices, both initially off. Private notes and expense descriptions remain excluded by default; actual totals do not include expense descriptions at all. The selected-trip snapshot is atomic. No new PDF dependency/service.

## Boundaries

No dependencies, live provider-consuming requests, hosted SQL/functions/secrets, billing, auth/cloud, dark mode, AI packing or Phase 9 work. Existing Gemini/discovery/mapping code, ledger/consumed guards, historical evidence and accepted archives remain unchanged. Weather integration is implemented but **live provider verification remains pending**. Phase 6/6.1 live failures remain pending and are not relabeled by mocked success. [Fresh test outcomes and screenshots](PHASE_8_REVIEW.md).
