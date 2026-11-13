# Phase 1 implementation record

Date: 4 November 2026 (Asia/Calcutta). Scope: project foundation and design system only. Phase 0 was explicitly approved; Phase 2 has not started. The approved architecture/research remains the baseline, and its ZIP is preserved.

## Implemented boundaries

- `src/app`: Router shell, layouts, independent QueryClient provider, and safe public configuration consumption.
- `src/features/foundation`: original overview, design-system preview, preview settings, route placeholders, and missing-page recovery. No discovery dataset, search, trip domain, accounts, repositories, maps, provider adapters, or backend scaffolding.
- `src/components/ui`: reusable source-owned Button, Badge, Card, Input, Dialog, Tabs, and Skeleton. Radix handles modal focus/escape and keyboard tab behavior; styles use approved semantic tokens. `components.json` supports shadcn aliases and Tailwind v4. Source adaptation and license notice are in `THIRD_PARTY_NOTICES.md`.
- `src/components/common` and `feedback`: brand, preview explanation, notices, empty states, and lazy-route loading feedback.
- `src/styles`: separate token, base, primitive, shell, foundation, and responsive styles. No dark-mode toggle until Phase 8.
- `config/public-env.ts`: shared typed Zod validation, explicit public config projection, safe errors, and honest demo/live-unavailable state.
- `scripts`: non-overwriting environment creation, phase-aware validation, build secret/output checks, and allowlisted/hash-verified ZIP generation. Tooling errors suppress raw environment values.
- `tests`: meaningful UI/config/tooling tests and production-browser journeys at the requested widths.

## Design implementation

Warm `#F7F5F0` canvas, `#0B6764` accent, deep ink, system-serif editorial headings, sans-serif controls, restrained borders, and consistent 44+ px actions. The original compass/grid illustration is code-native decorative SVG, not an invented destination or live map. Discovery imagery and data remain Phase 2.

Header navigation becomes a keyboard-accessible modal menu below 1024 px. Route changes update page titles and focus the main region; a skip link is available first. Footer links work. Future routes explain their planned phase and provide working return/design-system links. The local form updates only its visible sample and explicitly saves nothing.

## Dependency verification

Verified runtime: Node 22.17.1, npm 10.9.2, Windows PowerShell using `npm.cmd`. Engine contract allows Node 22.13+ (22.x) or Node 24 LTS. Exact direct/transitive releases and integrity data are in `package-lock.json`.

Installed main versions: React/React DOM 19.3.1; React Router 7.18.5; Vite 8.3.5 with React plugin 6.2.1; TypeScript 6.0.3; Tailwind/@tailwindcss/vite 4.3.4; TanStack Query 5.105.3; Zod 4.6.7; React Hook Form 7.91.0; Vitest 5.1.0; Playwright 1.64.1; ESLint 10.14.0; Prettier 3.9.10; jsdom 29.1.1. jsdom was pinned to the newest verified compatible 29.x release because the latest 30.x requires a newer Node patch.

Primary integration references checked: [Vite](https://vite.dev/guide/), [Tailwind Vite plugin](https://tailwindcss.com/docs/installation/using-vite), [shadcn Vite](https://ui.shadcn.com/docs/installation/vite), [React Router](https://reactrouter.com/start/declarative/installation), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/installation), [typescript-eslint](https://typescript-eslint.io/getting-started/), [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro). Actual installed package engine/peer/license metadata was also checked; registry versions changed between metadata requests, so the installed lockfile is authoritative.

The initial npm audit finding traced to minimatch in the development lint tree. A narrow `minimatch: 11.0.4` override selects a patched release for [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). After installation npm reported zero vulnerabilities. Lint exercises the compatible glob configuration; no forced broad downgrade was applied. Recheck the override when upstream lint dependencies adopt patched constraints.

No provider service, paid registry, external font/photo host, telemetry, or hosting SDK is used. Tests check that page loading/navigation makes no external requests. Actual provider accounts/free tiers are not exercised by Phase 1.

## Configuration and packaging limits

Automatic Vite prefix export is disabled. Only the current app name/mode/origin and derived phase/demo state enter the build. Provider/admin environment values stay outside this projection. Reserved future public values are not sent to a provider. Invalid modes/origins/public-secret names are rejected without echoing values. Setting `live` never activates missing services.

The bundle/archive checks scan known private values and common token formats and reject populated credential templates. This is a practical guard, not a complete secret-detection guarantee. Review archives intentionally exclude generated screenshots/traces/builds/dependencies/private files. The reproduction path is `npm ci` plus documented commands; no manual source edits are required.

Final results and review boundaries are recorded in [Phase 1 review](PHASE_1_REVIEW.md). The browser suite passes at all four requested widths. Code-native artwork is sized by content to avoid caption overflow on tablets; a bounding-box regression check covers this alongside page-level horizontal overflow checks.
