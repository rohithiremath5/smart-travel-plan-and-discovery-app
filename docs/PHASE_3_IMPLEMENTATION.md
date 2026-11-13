# Revised Phase 3 implementation

Authorization: owner's architecture-change instruction, 4 November 2026. Implementation began after active documentation reconciliation; verification/handoff continued on 5 November 2026 (Asia/Calcutta). Scope is guest dashboard, complete trip wizard, trip overview/CRUD, local persistence and JSON backup. Authentication/cloud synchronization/collaboration are final Phase 10 only. Phase 4 activities are not implemented.

## Product behavior

`/trips` opens the guest workspace directly, with no identity, sign-in gate or cloud indicator. It shows My trips, in-progress/upcoming/past groups, licensed known-destination covers or an honest fallback, dates/duration/travelers/pace/status/last edit, a working create CTA and loading/empty/retry/error states. Upcoming/in-progress sort by start date, past trips newest first, with deterministic edit/ID ties. Storage wording explains that data belongs to this browser/origin and may be cleared.

`/trips/new` has seven steps: destination, travel dates, travelers/group, budget/currency/preference, interests, pace and review/create. Destination selection shares the existing curated data and normalized discovery client; worldwide requests are explicit city searches using the existing proxy, with manual entry available on missing configuration, quota or provider errors. No new endpoint or secret is introduced. Fields retain values when navigating backward; completed steps can be revisited for corrections. Validation keeps users on the current step, focuses the error summary, associates field errors and validates the entire record before final save. Native date controls preserve calendar semantics; budget 0 means undecided, not a provider price. Only final confirmation writes a trip.

`/trips/:tripId` shows summary/preferences, source, storage notice, derived empty day dates, edit and confirmed delete. Displaying the dates is the foundation for the next phase, not an activity planner. Phase 4/5/6 tools are explanatory text rather than working-looking fake actions. `/trips/:tripId/edit` uses the same wizard and saves against the revision captured when editing began. Background refetch cannot silently advance that base revision. Missing records and storage failures have distinct recovery states. Delete confirmation preserves other trips and saved destinations; cancellation returns focus.

## Domain and persistence

`src/features/trips/domain/` owns strict Zod schemas, actual Gregorian date validation, UTC calendar-day arithmetic, inclusive duration, local-calendar grouping, formatting, supported currency precision, integer minor-unit parsing and import planning. Records use UUIDs, schema version 1, revision, created/updated timestamps, destination identity/name/source/optional coordinates, trip name, dates, travelers/group, budget/currency/preference, interests, pace and planning/confirmed status. No fake owner ID. Travel dates are plain YYYY-MM-DD, not local-midnight timestamps. Bounds include 1900–2199 calendar dates, at most 366 inclusive days, 1–50 travelers and 200 local trips.

`TripRepository` defines list/get/create/update/delete/import. The IndexedDB adapter alone handles transactions. It opens `smart-travel-trips` version 1 and additively creates the `trips` store if absent; it does not open, upgrade, clear or replace the existing `smart-travel-discovery` database. Connections close on completion/versionchange. Unsupported future databases/record versions fail visibly without a destructive downgrade/reset. Successful writes are acknowledged only after transaction completion; unavailable/blocked/full/aborted operations fail rather than pretending to save.

Updates and deletes compare the expected revision inside a readwrite transaction. A stale tab receives a reload/review error; independently created trips remain isolated. Storage uses the established Phase 2 request/transaction patterns without coupling JSX to IndexedDB. Hooks supply Query loading/error/invalidation; local repository operations make no network calls. Future itinerary/checklist/expense stores and cloud adapters were not scaffolded.

## Backup and recovery

The dashboard exports an explicit validated `smart-travel-trips`, version-1 JSON envelope, not an IndexedDB dump. It contains trip metadata only, excluding credentials, configuration and documents. Exports are unencrypted personal files. The local workspace and backup both cap at 200 records, with a 1 MB file ceiling, so all supported saved trips fit within the record limit. Browser errors or file size failure report failure rather than claiming a download was saved safely.

Import validates the whole file, version, fields, dates, amounts, duplicate IDs and bounds before preview. The user explicitly confirms counts/names. Identical content is skipped; same-ID divergent trips become new-ID copies. Existing records are never overwritten. Duplicate checks run again within the atomic commit to handle concurrent imports. Reimporting an identical conflict copy is skipped. Invalid records, transaction errors or exceeding workspace capacity do not partially alter existing data. Import failures remain visible inside the confirmation dialog. Review packaging rejects backup JSON envelopes and excludes export directories.

The future Phase 10 migration design is documented in [Architecture](ARCHITECTURE.md): explicit consent and selected-trip preview, duplicate/conflict handling, local/cloud ID mapping, idempotent import operation receipts, progress/retry, originals retained and recovery/limited rollback. No synchronization exists now and signing in is not possible in this phase.

## Preserved integrations and architecture changes

Existing discovery function source, migration SQL, cache/quota behavior, images/provenance, environment and historical evidence are preserved. Phase 3 makes no Management API calls, hosted mutations, secret synchronization, OAuth registration or live provider verification. The secure discovery client is reused for user-triggered searches. Normal build still projects only public configuration and scans confidential values.

Documentation changes preceded feature code: root instructions/README/status, revised Phase 3–10 roadmap, local-first architecture diagram and migration strategy, requirements, dated D039, current setup/provider timing and affected UX/design journeys. Historical reports/evidence retain actual results; their superseded future timing is identified. [Consistency report](DOCUMENTATION_CONSISTENCY.md).

## Verification and limits

See [review and actual results](PHASE_3_REVIEW.md). Tests cover new domain/repository/UI journeys and the existing discovery regression. E2E uses real browser IndexedDB with synthetic test trips and mocked provider responses; it is not a live Geoapify test. Chrome is the available browser engine; other engines and a full assistive-technology/security audit are not claimed.

Local data is browser/profile/origin-specific and may be evicted. JSON files are unencrypted. Wizard entries are transient until final save; refresh/close warnings depend on browser support, and browser-history navigation is not draft recovery. There is no background cross-tab synchronization; reload/focus refetch plus revision checks prevent silent stale writes. Service-worker offline app installation, automatic cloud backup, private documents, activities, maps and AI are outside this phase. Phase 4 requires no new credentials and remains unauthorized until explicit approval.
