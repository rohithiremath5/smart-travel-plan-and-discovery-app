# Current Phase 6 offline timeout correction — 7 November 2026

Local-only correction: provider/SDK 75 seconds, shared handler 80 seconds, browser 85 seconds by default. A bounded optional `AI_PROVIDER_TIMEOUT_MS` setting derives all three. Actual upstream HTTP 504 is now distinct from a local/SDK abort. The installed SDK also sends this deadline upstream, so the old 30-second setting is a plausible contributor, not a proven root cause. Real Gemini planner inference remains unverified. No new live request or hosted change occurred; the consumed guard, ledger, `.env` and historical evidence remain intact. Phase 7 is not authorized.

See [offline correction report](PHASE_6_TIMEOUT_CORRECTION.md) and [fresh offline verification](review/phase-6/offline-timeout-verification.json) for changes, exact results, preservation and a proposal for at most one future request requiring separate explicit approval. Older results below remain historical and are not current live-success claims.

## Prior targeted and recovery records — preserved history

# Phase 6 targeted planner correction — 6 November 2026

The owner provisionally accepted the local Phase 6 implementation and authorized offline diagnosis plus at most **one** additional short synthetic `gemini-3.8-flash` planning generation. No model change, retry, paid feature or hosted operation is authorized. Phase 7 remains unapproved.

## Diagnosis established before live access

The original catch block classified any unrecognized exception or provider status as `provider_unavailable` / local HTTP 502. The first verification script retained only that public code/status. Its evidence has no upstream status or request stage; therefore the original provider/network failure and whether upstream headers arrived **cannot be reconstructed**. We do not infer that it was a model, billing, schema, timeout or provider-capacity problem.

Two implementation weaknesses are corrected without changing the model, schema, UI or itinerary behavior:

- HTTP errors are classified at the transport boundary **before** the SDK parses their bodies. The installed SDK parses an application/json error body before constructing its status-bearing ApiError; a malformed error body could otherwise erase the HTTP status. This is demonstrated offline, not claimed as the cause of the earlier failure.
- The bounded transport previously replaced the SDK's abort signal with the outer signal. It now combines both, preserving the SDK deadline and caller cancellation independently. An offline fake-clock test proves the SDK timeout works even when the outer signal has not aborted. The original failure's cause is still unknown.

Only enum categories, stage identifiers and numeric HTTP statuses are exposed by the diagnostic path. Categories distinguish HTTP 400, 401/403, 404, 429, 5xx/other, network-or-TLS transport failure, SDK preparation/serialization, timeout, invalid JSON/envelope/incomplete output, and Zod/semantic validation. Stages distinguish preparation, send, received headers, body read, SDK decoding, output parse, output validation and completion. No raw provider message, header, key, token, prompt, generated content or private trip data is logged. Credential scanning remains enabled.

## Official compatibility check

Current official [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash) lists the exact stable model, structured output, 65,536 maximum output tokens and LOW/MEDIUM/HIGH thinking; MINIMAL is unsupported and is not used. The [Generate Content example](https://ai.google.dev/gemini-api/docs/generate-content/text-generation?hl=en) documents the same HTTPS Developer API `v1beta/models/gemini-3.8-flash:generateContent` endpoint. The SDK is pinned at the existing `@google/genai` 3.0.0; no dependency upgrade occurred.

The [structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) supports this model and the schema's objects/arrays, integer/string enums, required/additionalProperties and nullable type arrays. No schema change is justified by the offline inspection. Actual API acceptance must be established by the single live result, not documentation alone.

SDK serialization is tested with the real installed SDK and mocked transport: exact Developer API endpoint (`vertexai:false`), JSON MIME/schema, LOW thinking, bounded output (1,536 tokens for one day, up to 8,192 for fourteen), no unsupported temperature/candidateCount, tools=[], no continuation and one HTTP attempt. The API version is pinned explicitly to the already-used `v1beta`. The [SDK HTTP options](https://googleapis.github.io/js-genai/release_docs/interfaces/types.HttpOptions.html) support custom fetch, timeout, API version and retry settings. No grounding, paid tool, Vertex endpoint or fallback is enabled.

## Free-tier and one-attempt preflight

Existing evidence records the owner's manual confirmation that the same AI Studio project is Free with no billing attached. Current [official pricing](https://ai.google.dev/gemini-api/docs/pricing?hl=en) lists free Standard input/output for this exact model. Existing metadata checks for the configured project/model returned HTTP 200. The local persistent ledger was read without reset: **2/5 application reservations used** on 6 November UTC before this correction. Available authenticated AI Studio project RPM/TPM/RPD information cannot be accessed with this session's tools; it is not fabricated or inferred from metadata. Provider quota rejection will stop the one attempt.

Reuse the existing confidential `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_CHAT_MODEL=gemini-3.5-flash-lite`, `AI_DAILY_REQUEST_BUDGET=5`, `AI_REQUESTS_PER_USER_PER_DAY=3`. No new account/key or source configuration edit is required. Signup, dashboard/key locations, visibility and fresh-install steps remain in [Phase 6 setup](PHASE_6_SETUP.md). Keys remain server-only; no hosted secret synchronization is performed.

`npm run verify:planner` defaults to a zero-request plan. Only the separately authorized `--approved --free-project-confirmed` invocation may attempt one generation. It checks existing allowance, then creates an exclusive persistent `.cache/phase6-targeted-planner.once` guard before invoking the same handler/SDK/quota path. A repeat invocation refuses before provider access. Never delete the guard or quota ledger to retry. The existing `verify:ai` two-model command is deliberately not used for this approval.

The synthetic request contains one future calendar date, one traveler, a small JPY budget and a short culture-day brief. No real saved trip is read. After success, strict date/Zod/model checks and the real `suggestionsFromPlan` helper verify an **unsaved, unselected** preview in memory; nothing is applied, persisted or included as generated prose in evidence. Started failures/cancellations remain reserved. The live result and precise accounting are recorded separately from preserved earlier evidence.

## Scope and preserved evidence

Changed implementation files are the shared Gemini adapter and handler; added tooling is `scripts/verify-planner.ts`, its package command and focused diagnostic/verifier tests. The UI, manual planner, IndexedDB schemas/data, maps, Geoapify function, AI quota migration and all existing screenshots remain unchanged. The earlier recovery evidence (209 tests / full browser 60 passed + eight skips), model preflight and two-request live record remain historical, byte-for-byte. The prior Phase 6 ZIP/receipt are preserved privately as a comparison baseline before rebuilding the requested artifact names.

No Supabase AI deployment, migration, secrets change, billing change, public endpoint, frontend publication or Phase 7 implementation occurs. Phase 7 would require no new provider/account/key and remains outside this task.

## Actual result and completed checks

The one authorized request received **upstream HTTP 504**. The local handler returned HTTP502 with category provider_http_5xx, stage http_headers. Stages sdk_prepare → request_send → http_headers prove that an HTTP response arrived; output parsing/validation never began. This is not a local deadline or SDK serialization failure. No raw error body was retained. The original request’s unknown cause cannot be retroactively identified from this new failure. API acceptance of the structured output and live preview remain unverified.

Exactly one new application reservation was consumed: **2 → 3 / 5** on 6 November UTC. No assistant call, retry, paid fallback, tool, new account/key, migration, function deploy, hosted secret or billing change occurred. Further live generation requires a new explicit authorization; do not clear the guard or quota ledger.

Fresh checks passed: lint, formatting, TypeScript, 230 unit/integration tests in29files (88.34s), production build/35-asset limited credential scan, and 32 relevant Chrome tests at all four widths. Mocked providers/embedded PostgreSQL are separate from the failed actual live request. Existing MapLibre size warnings remain. The unchanged UI’s64review screenshots were not recaptured; earlier recovery evidence remains unchanged. See [fresh verification](review/phase-6/targeted-verification.json) and [live metadata](review/phase-6/targeted-planner-live.json).

PHASE 6 LIVE PLANNER STILL BLOCKED — DIAGNOSTICS RECORDED

WAITING FOR USER REVIEW.
