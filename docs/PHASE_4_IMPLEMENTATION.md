# Phase 4 implementation

5 November 2026. The owner explicitly approved Phase 3 and authorized the complete manual itinerary planner only. Phase 5 remains unauthorized. No hosted infrastructure, authentication, personal cloud tables, discovery SQL/function/settings, API key, billing or frontend deployment change was made.

## Delivered behavior

The trip overview now opens `/trips/:tripId/itinerary`. Its warm editorial workspace includes the trip/destination/date header, local-save strip, desktop day rail and horizontally scrolling mobile rail, selected-day timeline, honest empty days, activity forms, day notes and complete per-trip export. No fabricated activities or unavailable map controls appear.

Activities support title/description/day, optional destination-local HH:mm start, duration, ten categories, location, optional paired coordinates, optional minor-unit estimated cost/currency and notes. New/retimed entries sort stably by time; manual up/down order persists, remains keyboard/touch accessible and does not rewrite times. Explicit Sort by time restores chronology. Overlap, past-midnight and manual-order reminders are advisory; venue hours, timezones and travel times are not verified. Edit/delete/day moves preserve stable IDs. Delete requires confirmation. Save failures retain the form and expose recovery guidance. Day notes save explicitly; day switches and internal links guard unsaved notes. Refresh/close uses the browser warning where supported. Unsaved drafts are not recovery storage.

## Local architecture and preservation

`trips-database.ts` is the sole opener/version owner for smart-travel-trips. Version 2 additively creates itineraries; all old trip records remain schema version 1 and are not rewritten by migration. Saved destinations retain their separate smart-travel-discovery v1 database. No database reset/delete operation exists. Blocked/unsupported storage fails safely and provides retry guidance; an abandoned blocked upgrade aborts.

The itinerary feature owns strict domain validation, a typed repository, page and focused activity/day-note components. One aggregate per trip enforces exact day dates, unique UUID activity IDs, parent/day relationships and bounds. Every mutation validates against the current trip and compares the expected itinerary revision, then writes itinerary plus updated trip revision/timestamp in one transaction. Metadata/date edits check the trip revision; stale dialogs cannot overwrite concurrent planning. Confirm success only on transaction completion. Simulated failure of the second metadata write verifies rollback of the first itinerary write.

Date edits preview keep-calendar-dates versus shift-by-day-number, retained/removed activities and removed note days. Any content loss requires explicit consent, and commit rechecks the revision before atomic reconciliation. Trip deletion atomically deletes its aggregate after confirmation. This prevents orphaned activities/notes and preserves unrelated trips.

## Complete backups and compatibility

All product exports use a consistent read snapshot and strict version-2 envelope containing trip metadata plus every itinerary date, activity field, ID, order and day note. Legacy valid v1 metadata-only files remain accepted and normalize to empty itineraries. The legacy metadata export helper is retained for compatibility testing; UI always supplies complete plans.

Import previews version/counts/names/activity totals; confirmation rechecks current stores. Complete content fingerprints exclude IDs/revisions/timestamps, preserve order and notes, skip identical aggregates and copy divergent IDs without overwriting originals. Conflict copies remap trip and activity IDs; activity collisions on otherwise new trips are also remapped. Repeat copies deduplicate. Whole-file validation and one transaction prevent partial imports.

Limits: 10 MB UTF-8 file (raised from 1 MB for complete itineraries), 200 trips/workspace and file, 366 inclusive days/trip, 200 activities/trip, 100/day, 2000 characters/day note; activity title 120, description 1000, location 160, notes 1000 characters; duration 1–1440 minutes. Large workspaces may exceed the file byte limit; use complete per-trip exports. Files are unencrypted personal data; never add actual backups to review artifacts.

## Verification and boundaries

Final command results, screenshot integrity and preservation checks are recorded in [Phase 4 review](PHASE_4_REVIEW.md) and [safe evidence](review/phase-4/README.md). Tests exercise migration, legacy records, CRUD/order/timing, notes, cross-trip/day validation, concurrency, transactional rollback, date changes/cascade, old/new backups and duplicate/conflict copies. RTL covers validation and retained drafts. Browser tests use actual isolated IndexedDB, legacy-v1 seeds and loaded-session offline edits; provider responses in regression tests are mocked. No new live provider test is claimed.

Existing secrets remain local and private; no source configuration edits are required from the owner. No dependency was added. Setup/check/build/test/ZIP tooling remains environment driven. Windows sandbox file permissions required separating the synthetic E2E build from the browser runner for final verification; this changes no application behavior. Historical phase reports/screenshots/archives are preserved rather than regenerated. Original trip browser tests now write routine screenshots into ignored test outputs so the accepted Phase 3 evidence remains unchanged.

Phase 4 requires no new provider/account/key. Existing Supabase Free and Geoapify Free discovery accounts/configuration are reused, not modified. [Setup](SETUP.md) contains official signup URLs for fresh installations, creation steps, exact variables/dashboard locations/public-private distinctions and commands. Phase 5 expects keyless MapLibre/OpenFreeMap plus the existing server-side Geoapify key and public discovery configuration; recheck free terms and quota before that separately approved integration.
