# Phase 2 implementation

Scope: landing and destination discovery only. Phase 1 accepted; Phase 2 local implementation accepted and the five limited hosted setup operations separately authorized. Hosted verification is now complete and awaits final review. Phase 3 is not started or authorized.

## Controlled hosted verification status

The existing .env and reviewed migration are unchanged. Project identity, ACTIVE_HEALTHY status, publishable-key metadata, migration history and function inventory were verified using the existing scoped token. The exact content-hash migration was already recorded and was not reapplied. Only discovery was deployed; ACTIVE and verify_jwt=false were confirmed. Exactly four approved settings were synchronized. Final application budget is 100 credits/day.

The user's explicit Dashboard confirmation supplies **manual Free-plan verification**. The prior organization API HTTP 403 is historical, not a successful organization response. No broader token, organization retry or billing action was used. Project-scoped metadata/secret/deployment operations succeeded; migration-write permission was unnecessary and not exercised.

Real Kyoto search/details/nearby sights, Japan country search and repeat-cache checks passed through the deployed function. Invalid requests, public-key/origin rejection, safe upstream provider rejection and temporary one-credit quota rejection were tested live; the cap was restored to 100. Production frontend workflows passed at all four widths, with 12 screenshots. Provider outages and malformed/timeout upstream responses remain mocked failure-path coverage, not live-outage claims. [Actual results and limitations](PHASE_2_REVIEW.md), [sanitized evidence](review/phase-2/README.md).

## Actual boundaries

`src/features/discovery/` owns pages, small card/photo/search/save/source/error components, curated guides and image metadata, hooks, the normalized proxy adapter, and version-1 IndexedDB saves. UI imports only pure shared domain contracts; server implementations and secrets stay out of its module graph. Root `config/public-env.ts` projects approved public values; automatic Vite prefix export remains disabled.

Routes: `/` editorial landing; `/discover` shareable query/source/type/interest filters; `/destinations/:destinationId` details/attraction categories; `/saved` device collection. `/trips` remains a Phase 3 placeholder. Design-system examples, settings, header/mobile navigation, route focus, footer and 404 remain working.

Four curated example guides cover Kyoto, Lisbon, the Dolomites and Bali. City/country/keyword matching intersects with a selected interest, with clear/reset/no-result behavior. Real names and editorial ideas are labeled **curated demo**, not fresh provider recommendations. Linked tourism guides provide follow-up context; no invented hours, ratings, costs or inventory.

Worldwide mode searches cities/countries through Geoapify. Suggestions debounce 350 ms, require 3 characters, cap at 10, and support arrows/Enter/Escape. Query supplies cancellation, bounded cache lifetime, deduplication, and no automatic retry. Main results cap at 20. Response schemas reject malformed fields. Details use a validated place ID; nearby categories explicitly request up to 20 POIs within 5 km. Country searches cover their reference point, not all national attractions. Unknown photos never borrow another destination’s image. Attribution and fetch/cache dates remain visible. Failures never switch sources silently.

Save buttons are separate from detail links and expose pressed state. Transactions confirm success before status changes; IDs upsert; blocked/full/unavailable storage and invalid records surface errors. Saves persist after reload in the same browser, independently of provider connectivity. No trip/account/identity is stored. Browser-data deletion removes saves; no cross-device claim.

`public/images/` contains 640/1280 JPEGs and provenance/hash manifest. Fixed aspects reserve space; cards load lazily and hero/details eagerly. Image errors show stable text/icon fallbacks while retaining attribution. Pexels API is optional and omitted while new keys are paused.

## Backend and setup

`supabase/functions/discovery/index.ts` reads runtime settings and starts the handler. `_shared/` owns strict parsing, normalization, fixed provider URL construction, bounded streaming, safe errors, CORS/key checks and storage contracts. No provider SDK. POST operation allowlist; body max 2048 bytes; query 3–100 characters; hexadecimal IDs; fixed hosts; redirects denied; bounded categories/coordinates; 8-second upstream deadline; 1 MB upstream body bound; no automatic retries. Storage REST RPCs have 5-second deadlines; browser requests 15 seconds. Raw provider errors, URLs and keys are suppressed.

Legacy JWT verification is intentionally disabled. The handler checks the current publishable key on `apikey` and exact origins, and exposes `Retry-After` for browser cooldown. This is public discovery, not authentication; a public key and CORS cannot stop determined outsiders.

Migration creates only `discovery_cache`, `discovery_usage`, and `discovery_gate`, with RLS and no public grants/policies. Service-only `discovery_acquire`/`discovery_complete` use a fixed empty search path. A locked gate row coordinates instances. Hits consume no additional credit; identical pending requests return busy. New attempts reserve one credit before fetching, count failures, enforce 275 ms spacing and a configured 1–2000 UTC daily ceiling. Cache bounds: 256 rows, 200 KB payload each, 24-hour TTL, 20-second pending lease. Usage older than seven days and expired entries are cleaned on the next uncached reservation. No scheduled keepalive; expired records are never served.

Unrecorded object-name collisions stop before any existing object is altered. Setup records SQL content hashes in migration names, skips matching history, refuses changed existing hashes, and never resets or deletes unrelated resources. If deployment fails after migration success, partial state is reported and the named deployment can be retried safely.

`setup:backend`/`setup:secrets` are local plans by default. Apply requires explicit approval acknowledgement, exact project confirmation, and a fresh read-only identity/healthy/public-key metadata check. Token only in HTTPS headers; secret values only in allowlisted HTTPS bodies, never temporary files or command arguments. The official multipart Management API deploys only discovery/index.ts and its three shared imports, with explicit discovery slug and JWT setting. A CLI transport failure was resolved by this documented deployment transport using the same scoped token and project, without new infrastructure. Empty successful secret-write acknowledgments are accepted only for that write; read verification still requires valid JSON. Deployment failures redact known credentials and project identifiers. Never synchronize full `.env`. [Setup instructions and permissions](PHASE_2_SETUP.md).

## Verification boundaries

Tests cover domain/input/output validation, error redaction, fail-closed quota/cache behavior, IndexedDB, keyboard suggestions, source labels, and setup/ZIP safeguards. Embedded PostgreSQL executes real SQL to check quotas, leases, cache bounds, roles/RLS/grants; it is not distributed hosted load testing. Playwright renders production-mode code with synthetic public config and mocked APIs. Real env files are disabled for Vitest; test fixtures never depend on hosted credentials.

Normal build uses existing public configuration and scans for configured confidential values. Validated publishable key is intentionally public and handled separately in that limited scan; review archives still reject every actual key. No source maps or `.env` are bundled. [Actual results](PHASE_2_REVIEW.md).
