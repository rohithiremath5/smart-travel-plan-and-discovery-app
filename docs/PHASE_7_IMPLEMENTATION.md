# Phase 7 implementation — local organizer

11 November 2026. Implements only the owner-authorized local trip organizer, packing/checklists/templates, expanded compatible backup and print. Preserves earlier application behavior and provider infrastructure. Phase 6 and 6.1 live blockers are independent and remain unresolved.

## Traveler experience

Each trip card, overview and itinerary links to `/trips/:tripId/organizer`. A warm editorial heading introduces destination/dates/travelers, followed by note/list counts, progress and outstanding tasks. Notes use optional titles and five categories. Checklist and packing lists support add/edit, completion, confirmed removal, custom categories and keyboard-accessible moves within a category. Packing supports integer quantity and concise notes. Reset completion requires confirmation. New trips contain helpful empty states, not sample personal content.

Six locally defined templates cover general essentials, weekend, beach, mountain, business and family travel. A preview starts unchecked; the traveler explicitly selects additions. Normalized labels prevent accidental repeats within the target list, including previously completed/custom items. Applying a template never resets completion or replaces lists. Generic templates make no climate, legal or medical claims. Applied entries are ordinary editable local records.

Editors validate bounded fields, show errors and explicit save success, retain unsaved drafts after failures, guard dirty cancellation and return focus when closed. Conflicts require reviewing the latest saved record followed by explicit application of the draft. Other changes in the newly reviewed aggregate survive. A deleted item can be explicitly restored as a new copy. No auto-merge overwrites a competing edit. Non-editor actions fail safely on stale revisions and offer refresh/review guidance.

## Feature and persistence boundaries

`src/features/organizer/` owns domain schemas, templates, typed repository, focused dialog/list components, organizer page and print page. UI calls repositories and TanStack Query; it never opens IndexedDB. Router/layout additions use existing lazy loading and navigation primitives. `src/styles/organizer.css` reuses approved design tokens, accessible checkbox labels, progress indicators, focus styles and responsive breakpoints. Existing global reduced-motion rules apply; the organizer adds no animation.

All repositories still share `features/trips/services/trips-database.ts`. Database v3 adds **only** `organizers`, keyed by `tripId`. v1/v2 upgrades preserve existing object stores and records; saved destinations use their unchanged separate database. Missing organizer data is a derived empty schema-v1 aggregate with revision 0. The first save writes it; no read-time sample creation or database reset occurs.

Organizer schema: stable UUID note/item IDs, owner trip ID, schemaVersion 1, revision; at most 40 notes, 200 checklist items and 200 packing items. Note title ≤80, text 1–4,000; item label 1–160, category 1–60, notes ≤300, quantity integer 1–99. Unknown fields, invalid owners/versions and duplicate child IDs are rejected. Completion counts items, not summed quantities; moves preserve category grouping and stable IDs.

Organizer saves check both current trip and organizer revision and update both in a single transaction. This also invalidates stale trip/itinerary/AI approvals without changing AI logic. Trip metadata/date editing preserves organizer content; deletion cascades trip, itinerary and organizer atomically. Snapshot export reads all three stores consistently. Full import validates all relationships and writes all additions atomically. Transactions resolve only on commit, propagate failure/abort/quota errors and close handles. Unavailable/blocked/future-version storage never falls back to a falsely persisted in-memory substitute.

## Backup and print

Product exports are v3, carrying complete itinerary and organizer aggregates. Existing valid v1/v2 imports remain accepted and derive empty missing aggregates. Legacy helper signatures remain available to compatibility tests, while all application export actions supply full snapshots. The 10 MB/200-trip policies remain. Strict envelopes reject unknown fields, missing/orphaned owners and repeated IDs. Import previews compare trip, itinerary and organizer content excluding internal IDs/revision; differences create conflict copies, and repeat identical imports skip them. Copies remap trip ownership and conflicting child IDs while preserving content/order/quantity/completion. Existing records are never overwritten. Cancelled previews do not write.

`/trips/:tripId/print` reads one atomic selected-trip snapshot. The preview contains trip facts, day/activity timing and location, and selected lists. Organizer/day/activity/item private notes and activity descriptions are excluded initially; individual organizer notes and explicit private-detail options control inclusion. Native print and A4 CSS hide navigation/buttons/debug UI, wrap long text and reduce clipped content with page-break rules. React renders text safely; no private IDs or unrelated trip records enter the print sheet. No PDF service/dependency was added.

## Verification and preservation

New domain/repository/UI/browser tests use synthetic records. Existing trip/itinerary/database and browser backup expectations were updated only for additive DB v3/product backup v3 compatibility. Gemini implementation/models/timeouts, discovery/server code, SQL, configuration, secrets, quota ledger and consumed guards remain unchanged. Prior Phase 0–6.1 evidence/screenshots and the accepted Phase 6.1 archive/receipt remain unchanged. Packaging now produces a separate Phase 7 archive and permits only the dedicated Phase 7 review screenshot directory in addition to prior allowlisted assets.

Exact fresh test counts, preservation checks, screenshots and limitations are recorded in [review](PHASE_7_REVIEW.md) and [machine-readable evidence](review/phase-7/verification.json). Provider mocks prove local behavior only. No live provider, hosted setup, authentication, attachments, cloud storage, Phase 8 enhancement or public frontend deployment occurred.
