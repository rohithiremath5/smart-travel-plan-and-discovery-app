# Phase 7 setup — local trip organizer

11 November 2026. The owner's 10 November attachment authorizes local implementation only. No API provider, new account, key, environment variable, source edit or hosted configuration is required. Existing `.env` is preserved. Phase 8 is not authorized; authentication and cloud storage remain Phase 10.

## Start and use

Use the existing Node 22.13+ (22.x) or Node 24 installation. On Windows:

```powershell
npm.cmd run setup:check
npm.cmd run dev
```

Open the local URL, choose My trips, then an existing trip → Organizer. A new trip starts with empty notes and lists. Add a note, checklist or packing item, or choose Browse templates → select a list/template → select items → Add selected items. All additions remain editable. Completion, quantity and ordering are saved on this browser and origin. Explicit Save confirms success; errors retain the editor draft.

To work without provider requests, choose curated/manual destinations and avoid live discovery, maps/routes and AI actions. Organizer, backup and print require none of them. The application is not a service worker installation; an initial page load still needs the local server and assets.

## Storage and recovery

The centralized opener upgrades `smart-travel-trips` from v1/v2 to **v3**, adding only the `organizers` store. Existing trip/itinerary IDs and fields are retained; the separate saved-destination database is unchanged. Empty organizers are derived on read until the first save. Close older tabs if an upgrade is blocked. Do not clear site data to resolve it.

If storage is unavailable, full, corrupt or newer than this app, the UI shows an error rather than pretending a save succeeded. Preserve existing data, close other tabs, free unrelated disk space and retry. No automatic in-memory fallback or destructive recovery is provided. Drafts are not guaranteed to survive closing a tab or refreshing; saved records do survive when the browser retains storage.

Concurrent edits use both trip and organizer revisions. On conflict, keep the draft, choose Review latest saved item, compare it and explicitly save after review. If that item was deleted, saving after review creates a new copy. Other saved content is preserved. A second intervening edit causes another conflict. Checklist toggles, moves, resets and template additions also reject stale revisions; refresh/review before repeating the action.

## Backup compatibility

| Input                                                  | Behavior                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| Valid v1 JSON                                          | Preserve trip data; derive empty itinerary and organizer        |
| Valid v2 JSON                                          | Preserve trip and itinerary/day notes; derive empty organizer   |
| New v3 JSON                                            | Include trip, itinerary and organizer notes/checklist/packing   |
| Conflicting trip ID or organizer content               | Preview a separate copy, remapping related IDs; never overwrite |
| Identical content already imported                     | Skip it, including after a prior conflict-copy import           |
| Invalid, orphaned, duplicate-ID, future or >10 MB file | Reject before commit; keep existing records                     |

Use Export backup in My trips for all trips or Export this trip from an itinerary/organizer. Import on My trips shows version, contents and conflicts before explicit confirmation; Cancel writes nothing. All related imports commit in one transaction. The existing 200-trip and 10,000,000-byte bounds remain. Browser data is not a permanent or cloud backup. Save exports somewhere private; JSON is **unencrypted personal data**. No real export belongs in a review archive.

## Printing

Organizer → Print summary opens a selected-trip preview. Activities and lists start selected. Organizer notes, day notes, activity descriptions/private notes and item notes start **excluded**. Choose individual organizer notes or the explicit private-detail checkboxes before invoking the native print dialog. Navigation and editing controls are hidden in A4 print CSS. Review your printer's page settings and output; browsers/printers may paginate differently. PDFs and printouts are personal documents, not encrypted backups.

## Provider and credential handoff

**Required for Phase 7: none. Free-plan eligibility and signup do not apply to the local organizer. No new provider terms or account capabilities were exercised.** The following existing integrations are optional and unchanged; these are prior setup references, not fresh live verification or instructions to recreate accounts.

| Existing provider    | Prior Free/account setup                                                                                                                                                                                                                                                                             | Exact existing variables and key location                                                                                                                                                                                                                                                  | Public/private and current commands                                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase             | Existing owner-confirmed Free project/spend cap; signup [Supabase](https://supabase.com/dashboard/sign-up). For a separate future authorized installation: sign in, choose/create a Free organization/project without paid add-ons, then Project Settings → API Keys and Project Settings → General. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`; Dashboard → API Keys for the publishable key, Project URL/API settings for URL, General/project URL for reference. `SUPABASE_ACCESS_TOKEN` is from Account → Access Tokens, narrowly scoped and short-lived. | URL/reference/publishable key are public configuration; access token and all administrative secrets are confidential. Reuse existing values; only `setup:check`/`dev` needed here. No backend, secrets, SQL or deployment command is authorized. |
| Geoapify             | Existing Free account; signup [Geoapify MyProjects](https://myprojects.geoapify.com/). For future separately authorized setup: sign in, create/select a Free project, open API Keys.                                                                                                                 | `GEOAPIFY_API_KEY` from that project's API Keys. Existing `FUNCTION_ALLOWED_ORIGINS` and `GEOAPIFY_DAILY_CREDIT_BUDGET=100` are local/server settings, not new keys.                                                                                                                       | Key is confidential and server-only. Do not add a VITE variant or synchronize secrets. Phase 6.1 live verification remains blocked by `edge_functions_secrets_read`; no requests are authorized here.                                            |
| Gemini Developer API | Existing owner-confirmed unbilled Free project; signup [Google AI Studio](https://aistudio.google.com/). For a future authorized setup: sign in, confirm eligibility, select an unbilled project and create a key on Get API key.                                                                    | Existing `GEMINI_API_KEY` from AI Studio → API keys. `AI_PROVIDER_TIMEOUT_MS` is optional server configuration, not a credential; existing models/timeouts remain unchanged.                                                                                                               | Key is confidential/server-only. No metadata/generation request, verifier, AI setup or quota/guard reset is needed or authorized in Phase 7. Real planner inference remains unverified.                                                          |
| OpenFreeMap / Pexels | Existing optional keyless map and bundled licensed photographs; no Phase 7 signup or account needed.                                                                                                                                                                                                 | No new value. Existing photo provenance remains in `public/images/manifest.json`.                                                                                                                                                                                                          | No map/tile or Pexels API request was needed for organizer verification.                                                                                                                                                                         |

Do not repopulate `.env`, regenerate keys or modify application source for this phase. A fresh dependency installation can use `npm.cmd ci`; the non-overwriting `setup:env` is only for a missing file. Existing secrets must stay private. Phase 8 requires separate approval before provider eligibility, accounts or keys are evaluated; **no following-phase key is requested now**. Authentication/provider OAuth setup remains Phase 10.

## Local checks and packaging

```powershell
npm.cmd run lint
npm.cmd run format:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run review:zip
```

Provider-consuming browser suites remain opt-in and must stay disabled. Review screenshots use synthetic fixtures, never a personal browser profile. `review:zip` now creates `smart-travel-phase-7-review.zip` and its matching integrity receipt; prior archives remain unchanged. It allowlists source/docs/tests/licensed assets/review screenshots, scans known credentials without printing them, excludes populated env files, dependencies, builds, caches/guards, previous ZIPs, private exports and logs, and verifies archive entries and hashes. A scan is not proof of complete secrecy. See [review](PHASE_7_REVIEW.md) for actual results and limitations.
