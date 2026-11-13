# Phase 6 offline timeout correction — 7 November 2026

This is a local correction only. Real Gemini 3.8 Flash planning remains unverified. No live Gemini request, hosted deployment, secret synchronization, migration, billing change or Phase 7 work is authorized or performed. The consumed targeted-attempt guard and persistent application ledger must remain intact.

## What the evidence establishes

The previous attempt received actual upstream HTTP 504 at `http_headers`, mapped by the previous application to HTTP 502. Its unchanged [live record](review/phase-6/targeted-planner-live.json) contains no elapsed duration or raw provider body. It establishes an upstream response, not a local abort and not the precise cause of the provider deadline.

Google's official [Generate Content errors](https://ai.google.dev/gemini-api/docs/generate-content/api-errors?hl=en) identify HTTP 504 as DEADLINE_EXCEEDED and advise increasing the client timeout. Its [current API errors](https://ai.google.dev/gemini-api/docs/api-errors?hl=en) similarly describe deadline expiration; that second page covers the newer API and is corroboration rather than proof of this Generate Content request's cause. These official pages were consulted on 7 November; the search index supplied the Generate Content table where the browser reader could not follow its AI Studio redirect.

Crucially, the installed, pinned `@google/genai` 3.0.0 converts `httpOptions.timeout` milliseconds to an `X-Server-Timeout` header in seconds, in addition to a local SDK abort timer. This behavior was inspected locally and matches the [official SDK source](https://github.com/googleapis/js-genai/blob/main/src/_api_client.ts). The real SDK with mocked transport now demonstrably sends `X-Server-Timeout: 75`. The previous 30-second setting therefore **could plausibly contribute to an upstream 504**, even though that attempt was not itself classified as a local abort. Causation cannot be established retrospectively, and a larger timeout is not proof that inference will succeed.

## Bounded policy and configuration

| Layer            | Previous                    | Current default | Boundary                                                                                                                              |
| ---------------- | --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Provider and SDK | 30,000 ms                   | 75,000 ms       | Single generation, including SDK/transport/body/decoding; both constructor and per-request SDK options agree                          |
| Shared handler   | 30,000 ms after reservation | 80,000 ms       | Starts before Web Request body parsing and quota reservation; never grants extra provider time beyond the remaining handler allowance |
| Browser          | 32,000 ms                   | 85,000 ms       | Whole generation fetch plus bounded success/error body reading                                                                        |

`AI_PROVIDER_TIMEOUT_MS` is an optional **non-secret**, server configuration integer from 1,000 through 100,000. Default 75,000 needs no `.env` edit. Handler and browser durations derive automatically as +5,000 and +10,000; there are no independent settings that can drift. Only the derived browser duration is added to the explicit public configuration projection. Credentials and the rest of the server configuration never enter that projection. Invalid values fail closed in server configuration and fail safe public build/setup validation without printing values. The blank environment template and local `setup:ai` plan document this setting. Existing populated `.env` is unchanged.

The default handler margin allows response validation/serialization and bounded quota overhead; its deadline starts earlier, so slow quota work can shorten the provider's available time. The browser adds five seconds for local transport. Supabase documents a [150-second Free wall-clock limit and two seconds of active CPU](https://supabase.com/kb/troubleshooting/edge-function-cpu-limits), and a [150-second response idle deadline](https://supabase.com/kb/troubleshooting/edge-function-takes-too-long-to-respond). Default browser/handler limits leave 65/70 seconds respectively below 150; even the maximum derived browser limit is 110 seconds. These margins are deliberate bounds, not measured performance guarantees. AI remains local development only; no Edge runtime behavior or CPU compliance is claimed as live-tested.

To use defaults, run `npm.cmd run setup:ai` and restart `npm.cmd run dev` after installing this correction. Neither command authorizes Codex to generate. An operator wishing to override the timeout changes only the optional environment value and restarts the server; no source/SQL changes, new provider account or key are required. Do not run live verifier flags under this offline authorization.

## Cancellation and errors

The shared deadline helper propagates parent cancellation and clears timers/listeners on completion. Abort-aware waits prevent starting a fetch/provider after cancellation and bound adapters or body streams that otherwise ignore signals. The provider combines application, caller and SDK signals at the transport boundary; cancelled body readers are cancelled explicitly. Browser error bodies now share the same 128-KiB ceiling/deadline as success bodies. Request 24-KiB, upstream 1-MB, generated JSON 64-KiB and structured-output semantic limits remain enforced.

An actual upstream 504 now returns local HTTP 504, `provider_deadline_exceeded`, and safe `http_headers`/numeric upstream diagnostics. Local/SDK cancellation remains HTTP 504 `ai_timeout`, category `timeout`, with the last observed stage/status, without inventing upstream HTTP 504. Other HTTP status mappings remain intact. The UI explains that nothing was saved, started requests count, manual planning remains available, and no automatic retry occurs. Historical JSON retains its original old HTTP 502/category; it is not relabeled to match new code.

The existing Vite middleware was reviewed and retained: browser disconnection aborts the Web Request; the handler passes that cancellation to the provider. A real loopback HTTP-disconnect test uses a synthetic credential, mocked provider transport and isolated temporary quota ledger. It does not read or write the owner's ledger. The one-attempt verifier was reviewed, not executed or modified. Its consumed guard remains authoritative.

Exact models, LOW planner thinking, bounded tokens, zero tools/continuation/fallback, one transport attempt and global five/day/client three/day quotas are unchanged. A reservation already underway can complete after cancellation; it is never refunded or retried. Google documents [AbortSignal as client-side cancellation, which does not cancel the service operation](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html). No claim is made that abort reverses upstream usage.

## Verification and preservation

Fresh results are recorded in [offline verification](review/phase-6/offline-timeout-verification.json), separately from [6 November targeted checks](review/phase-6/targeted-verification.json) and earlier recovery evidence. ESLint, Prettier, strict TypeScript and production build/35-asset limited credential scan passed. All **254 unit/integration tests in 31 files passed** (151.25 seconds), including timeout/cancellation, malformed output, quota/guard, repository and earlier-phase coverage. The first full run found one outdated public-config key allowlist assertion (252 passed/one failed); it was updated to explicitly permit only the derived non-secret browser duration, then the full suite passed. The earlier focused timeout run passed 45 tests; the subsequent focused repair/disconnect run passed 26.

All **36 relevant Chrome browser regressions passed** at 360/768/1024/1440 pixels, followed by **four passing capture runs** of the new timeout state with axe/overflow checks and successful manual planning/reload. Provider HTTP is mocked; the loopback disconnect and browser storage are real. The four new [mocked timeout captures](review/phase-6/offline-timeout-screenshots.json) were visually inspected at all four widths. Normal keyboard/focus, preview/approval/conflict, map/list/route/cache, quota fallback, manual edit/import/backup/offline and reduced-motion regressions remain covered. Existing optional MapLibre renderer/worker size warnings remain; browser tools emitted harmless NO_COLOR/FORCE_COLOR warnings. Timeout tests use fake clocks, synthetic requests and mocked upstream HTTP, and quota SQL tests use embedded PostgreSQL. They do not establish successful Gemini inference or hosted AI behavior.

The preservation audit compares byte hashes for `.env`, the original ledger, consumed guard, unchanged verifier/quota implementation/SQL, all previous Phase 6 evidence/images, and historical Phase 0–5 evidence. It publishes only booleans/counts, not confidential file hashes or ledger records. Previous accepted Phase 6 ZIP/receipt are backed up privately; the new review package excludes that backup, populated environment files, caches, logs, dependencies, build output and personal data. Limited credential scanning cannot prove complete secrecy.

## Remaining risk and proposed future single attempt

Provider latency/capacity, free project RPM/TPM/RPD availability and real structured-plan compatibility remain unverified. A longer deadline may still return HTTP 504, another provider error or incomplete/invalid output. No latency benchmark or guaranteed working planner is claimed. Earlier 64 review screenshots remain unchanged; four new synthetic mocked 504 images have distinct filenames. Other regression captures remain in ignored test output.

**Proposal only, requiring separate explicit approval:** make at most one local synthetic one-day `gemini-3.8-flash` planning request through this same handler/SDK at the default 75/80/85-second policy. Before it, read the unchanged ledger and confirm the existing Free/no-billing project and remaining application allowance; stop if either cannot be established. Preserve the old consumed guard and use a separately approved, exclusively created new one-time guard for that new authorization. Do not reset/refund/delete old state. Reserve at most one additional request, use no assistant call, retry, continuation, tools or fallback, record only elapsed duration/stages/statuses/validation outcome, and keep any preview unsaved/unselected. Stop after that one result. No new verifier or live command was enabled or executed in this offline task.

Existing provider/signup/dashboard/key/public-private/setup instructions remain in [Phase 6 setup](PHASE_6_SETUP.md). Reuse the owner's Gemini Free account/key and existing Supabase/Geoapify Free setup; no account creation, credential rotation or hosted operation is needed for this correction. Phase 7 needs no new key under the current roadmap and is not authorized.

PHASE 6 OFFLINE TIMEOUT CORRECTION COMPLETE

LIVE GEMINI VERIFICATION AWAITING SEPARATE APPROVAL

PHASE 7 NOT AUTHORIZED

STOP.
