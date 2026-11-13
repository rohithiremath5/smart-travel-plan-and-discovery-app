# Proposed design system

Approved Phase 0 specification, preserved as the design baseline. Phase 1 implements the light tokens, responsive shell, source-owned UI primitives, and component preview. Phase 2 extends these with editorial photography, cards, a keyboard combobox, responsive filters, device-save states, and provider feedback. Original workspace wireframes below are research context; the current manual planner and Phase 5 map addenda describe implemented behavior. The full application name remains the working name.

## Color tokens

| Semantic token | Light value | Use                                         |
| -------------- | ----------- | ------------------------------------------- |
| canvas         | `#F7F5F0`   | Warm page surface                           |
| surface        | `#FFFFFF`   | Cards, forms, dialogs                       |
| surface-muted  | `#EEEEE7`   | Inactive areas and subtle grouping          |
| text           | `#182F32`   | Headings and body                           |
| text-muted     | `#526568`   | Secondary information                       |
| accent         | `#0B6764`   | Primary actions and selected states         |
| accent-hover   | `#084F4D`   | Hover/pressed action                        |
| on-accent      | `#FFFFFF`   | Text/icons on accent                        |
| accent-subtle  | `#DDEEE9`   | Selected backgrounds; pair with accent/text |
| border-subtle  | `#D5DED9`   | Decorative separators only                  |
| border-control | `#728581`   | Interactive boundaries where needed         |
| focus          | `#1259B5`   | 3 px outline with 2 px surface offset       |
| success        | `#21613C`   | Saved/confirmed text with icon              |
| warning        | `#855000`   | Quota, stale data, unsaved state            |
| danger         | `#AD2834`   | Validation and destructive actions          |
| info           | `#2458A0`   | Informational state                         |

Use text, icon, and shape as well as color. Never put white body text on a pale accent. Photos need a solid text surface or measured overlay. Selected token pairs passed Phase 0 contrast calculations. Phase 1 additionally checks actual components in production-browser tests; future states still need review.

Reserve future dark mappings: canvas `#122226`, surface `#1B3034`, text `#EFF5F1`, muted text `#B2C4C0`, accent `#84D3C4`, on-accent `#112927`, control border `#8AA39C`, focus `#9FC4FF`. Dark mode interaction and full semantic palettes belong to Phase 8.

## Type, spacing, and surfaces

| Area              | Proposed token/rule                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| UI type           | System sans stack: `ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`; no external font requests     |
| Editorial heading | System serif stack: `ui-serif, Georgia, Cambria, serif`; display and destination headings only                    |
| Size scale        | 12 caption, 14 secondary/control, 16 body, 20 subtitle, 24 section, 32 page, 40–56 display (px, expressed in rem) |
| Line height       | Body 1.5–1.65; headings 1.1–1.25; never truncate essential errors                                                 |
| Weights           | 400 body, 500 labels, 600 actions/headings; actual available font weight must render cleanly                      |
| Reading length    | Body paragraphs <=68 characters where practical                                                                   |
| Spacing           | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px; layout uses rem                                                      |
| Radius            | 6 px small controls; 10 px standard controls; 16 px cards; 20 px dialogs; pill for small tags only                |
| Borders           | 1 px regular; 2 px selected/error when needed                                                                     |
| Shadow            | Low: `0 2px 8px #182F320A`; raised: `0 12px 32px #182F321A`; avoid shadow-only boundaries                         |
| Icon              | Lucide, normally 18–20 px; decorative icons hidden from assistive tech; icon actions have labels                  |
| Touch action      | Target at least 44 x 44 px for principal controls; enough separation between adjacent actions                     |
| Motion            | 120 ms hover, 180 ms disclosure, 220 ms panel; ease-out; no essential parallax/auto-rotation                      |

Honor `prefers-reduced-motion`: remove animated map flights, skeleton shimmer, and large transforms. Motion must never carry the only explanation of a state change.

## Layout tokens and responsive behavior

Breakpoints: base 0, sm 640, md 768, lg 1024, xl 1280, 2xl 1536 px. Verify intermediate widths rather than assuming breakpoint values prove responsiveness. Standard page max width 1280 px; page gutters 16 px on phones, 24 px on tablets, 32–40 px on wide screens.

| Width | Discovery                                                       | Planner                                                                                                       |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 360   | One card column, full-width search, filters in accessible sheet | List first; sticky day selector; explicit List/Map toggle; add activity remains reachable                     |
| 768   | Two columns; wrapped filters                                    | List remains primary; map mode available; no cramped mandatory split                                          |
| 1024  | Three columns                                                   | Split if usable: minimum 400 px list and remaining map; otherwise mode toggle                                 |
| 1440  | Three/four columns with generous spacing                        | 176–208 px trip/day rail, 440–520 px activity pane, remaining map; assistant replaces/overlays secondary pane |

The planner can use the full viewport; the 1280 px content cap is for discovery/settings, not a restriction on a useful wide map. Avoid three nested page scroll regions. Wide planner list and map may scroll independently; header/day controls remain reachable, and focus must not be hidden under sticky elements.

## Workspace sketches

These are documentation wireframes, not screenshots or implemented UI. Account/cloud/member controls in these original long-term sketches belong only to final Phase 10; guest navigation before then never shows a login gate.

```text
Desktop, 1440 px
+--------------------------------------------------------------------------+
| Discover   My trips   Saved          Local demo / Cloud       Account      |
+--------------------------------------------------------------------------+
| Trip title · dates · travelers             Saved state    Members  Ask AI |
+------------+-------------------------------+-----------------------------+
| Itinerary  | Tue 10 · Day 2                 | Map · walking/driving       |
| Organizer  | [Add activity]                 |                             |
| Members    | 1  09:00  Activity             |      numbered markers       |
| Budget*    |    duration / notes / actions  |      selected marker        |
|            | 2  11:30  Activity             |                             |
| Day 1      |                               | route status / attribution  |
| Day 2      | Route estimate when available  |                             |
+------------+-------------------------------+-----------------------------+
* Budget appears only after its phase is implemented.

Phone, 360 px
+--------------------------------+
| Back       Trip title   More   |
| Local demo · saved on device   |
| [Day 1] [Day 2] [Day 3]        |
| [List] [Map]                   |
| Day 2 · date                   |
| 1  Activity / details / edit   |
| 2  Activity / details / edit   |
|                                |
| [Add activity]                 |
+--------------------------------+
Map mode replaces the list; it preserves day, selection, and return scroll.
```

AI should open as a drawer on wide screens and a full-height sheet on phones. Draft changes remain separate until the user applies them. An AI conversation must not push essential save/error controls off-screen.

## Component behavior contract

| Component        | Required behavior and states                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Button           | One primary action per region; loading text, keyboard activation, visible focus; destructive confirmation for irreversible loss       |
| Search combobox  | Visible label, debounced query, keyboard options, escape dismissal, no-result/error state; abort obsolete requests                    |
| Destination card | A real detail link and separately labeled save button; no nested interactive link regions; photo source credit                        |
| Activity card    | Number/time/title, optional duration, selected state, edit menu; Move up/down alternatives to drag; retain focus after moves          |
| Form field       | Label, hint, inline error connected by ID; errors summarized after submit; keep valid entries                                         |
| Dialog/sheet     | Labeled title, contained focus, escape/close action, focus return; confirm unsaved loss only when relevant                            |
| Tabs/day rail    | Date plus day number, explicit current state, sensible arrow navigation, phone rail scrolls without page overflow                     |
| Map              | Attribution unobscured; labeled controls/markers, no compulsory map gesture; equivalent list of activities                            |
| Alert/banner     | Persistent for offline/permission/quota failures; actionable retry where useful; no secret/internal stack text                        |
| Toast/status     | Noncritical confirmation only; save failure also appears near the edited trip; screen-reader announcement without interrupting typing |
| Skeleton         | Stable dimensions and loading announcement; no endless loading after a failed request                                                 |
| Empty state      | Describe what is empty and provide one working next step                                                                              |

## Copy and trust

Use direct labels: “Saved on this device,” “Stored online,” “AI draft — review places and estimates,” “Forecast unavailable for these dates,” and “Route unavailable; activity order shown.” Keep storage and data-source badges distinct. Avoid calling sample destinations live results or calling estimates bookings. Dates display in the chosen locale; trip dates preserve destination calendar meaning.

Accessibility target is [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/): normal text contrast at least 4.5:1, large text 3:1, meaningful non-text boundaries 3:1 where required; visible unobscured focus; reflow; accessible names; and non-drag alternatives. Product design uses 44 px touch targets. In Phase 1 test tokens in components, 200% zoom, keyboard traversal, dialog focus, reduced motion, and all loading/error/disabled states. A token audit alone is not a conformance claim.

## Guest-first journey clarification — 4 November 2026

Research findings and visual tokens above are preserved. Revised Phase 3 extends editorial discovery into a calm guest dashboard and seven-step wizard (destination, dates, travelers, budget, interests, pace, review). My trips opens local data directly; no login/onboarding gate, invented identity or cloud-sync badge. Local storage and unencrypted JSON backup limits are explicit. Cards show real dates/status/last edit and licensed known-destination imagery or an honest placeholder. Editing returns to the same wizard with retained data; deletion and import have accessible confirmation/preview. Itinerary activities, maps and AI are explanatory future text until their phases. Members, private cloud documents, OAuth and collaboration sketches apply only to final Phase 10. Browser layouts must be reviewed at 360/768/1024/1440 px.

## Manual itinerary workspace — Phase 4, 5 November 2026

The approved palette, system sans/Georgia typography, focus ring and reduced-motion rules remain unchanged. A quiet editorial title/date header and local-save strip lead into a narrow numbered day rail and spacious timeline. Desktop uses two columns; phones use a horizontally scrollable day rail and stacked time/activity cards, with no page overflow. Every action has a 44px touch target. There is no map placeholder panel competing with the active plan.

Empty days use a restrained leaf motif, direct copy and a working add action. Activity cards show category, optional time, duration, location, estimate and notes; explicit move-up/down buttons work with touch and keyboard. Native labelled controls and Radix dialogs provide contained focus, Escape/close, validation summaries and retained drafts on save errors. Activity dialogs stack fields on phones and use a sticky save footer. Day notes have explicit save/unsaved feedback and a day-switch discard guard. Date changes show both retention strategies and content-loss counts before confirmation; destructive removal requires consent. No generated activity, map, AI, booking, venue-hours or cloud-save claim is introduced.

## Map/list workspace — Phase 5

Research on 5 November 2026 reviewed the official [Wanderlog product overview](https://wanderlog.com/home), [help taxonomy](https://help.wanderlog.com/hc/en-us) and [Google My Maps help](https://support.google.com/mymaps/). Public materials show recognizable patterns: itinerary beside geographic context, day/layer-specific places, explicit add/place selection and directions distinct from stored stops. These were public documentation observations, not a logged-in feature audit or copied proprietary layout. Adapted patterns retain our existing warm editorial tokens, numbered days, Georgia headings and teal selection. No account/reservation/collaboration/optimization feature was imported.

Desktop uses a narrow day rail, readable timeline and optional map card. At 1024px the day rail spans the workspace above the two columns; below 1024px a labelled Itinerary / Map & routes toggle replaces the split. Both views retain state. The map opens on request for privacy/performance, with clear loading/WebGL/tile/lazy-module failure states and an always-available location list.

Numbered marker buttons use stable activity IDs and shape/number as well as color; the destination is D. Selection adds a strong teal/dark ring, card border and pressed state. Marker activation focuses/scrolls the matching card; the list offers the same interactions without WebGL gestures. Dense/co-located stops remain individually accessible in the numbered location list; selected markers rise above overlaps. At most 100 activity markers/day are possible. Fit controls and zoom are labelled; reduced motion disables animated panning. Attribution is visible both in the map area and a persistent source line.

Location search is an activity-editor section with honest curated-centre versus provider-result labels, explicit replacement preview/use, and retained manual entries on cancellation/failure. Coordinates are described as user selected/entered, not permanently provider verified. Route controls separate walking/driving, request explicit coordinate confirmation and show metric distance/estimated time with source/cache labeling. Missing points, excessive/far waypoints, unreachable/partial responses and quota errors have useful copy; no straight-line or fake traffic estimate appears. The map complements the manual planner and never disables editing.

## Phase 6 AI studio — 6 November 2026

Reuse warm surfaces, serif editorial headings, system body typography, restrained teal and visible focus. The1120px maximum dialog pairs a250px contextual sidebar with a readable proposal/conversation column; ≤800px stacks them. Existing map/list workspace stays intact. Suggestions use neutral cards, checkbox+border selection and explicit counts/application; conversation uses editorial text panels and useful follow-up prompts. Labels,44px controls, focusable scroll history, modal focus restoration, consent/errors/quota and reduced-motion loading are required. No provider key or internal deployment instruction appears in the travel workflow.
