🌋

**EG-Maps**

Technical Design: Improvements & New Features

**Observatory of Vulcan · EG Maps Community Tools**

Earth Guardians South America · June 2026

**Stack:** Nuxt 3 · Vue 3 · TypeScript · MapLibre GL · Tailwind CSS · GitHub Pages

**Data:** 20,700 ANM mining processes · 33.2 M ha · 6 REE categories · 12 phases · 27 UFs

# Contents

0 Executive Summary

1 Critical Fixes (P0 - what is currently broken)

2 Observatory of Vulcan - Feature Roadmap

3 Data Pipeline & Backend

4 Community Tools (new modules)

5 Architecture & Modularisation

6 Accessibility & UX

7 Performance

8 Testing & CI

9 Implementation Order & Effort Estimates

# 0 Executive Summary

EG-Maps is an open-source socioenvironmental intelligence platform built by Earth Guardians South America. Its Observatory of Vulcan module exposes 20,700 Brazilian rare-earth mining processes sourced from ANM/SIGMINE, visualising capital invasion patterns, military interests, foreign corporate networks, indigenous and quilombola land overlaps, and conflict zones across all 27 Brazilian states.

This document is a deep technical design for improvements and new features. It covers:

- Seven critical data-flow bugs that currently make the Observatory misleading or broken
- A 3-phase feature roadmap for the Vulcan Observatory map itself - year slider, export-to-PDF, claim reporting, community annotations, offline mode
- Three brand-new community tool modules: EG-Reports (community alerts), EG-Monitor (automated change detection), and EG-Routes (safe corridor mapping)
- Architecture refactoring to reduce UnifiedMap.vue from 2,813 lines to < 400 and GlobeView.vue from 1,342 to < 300
- Full accessibility upgrade, motion system, skeleton loading, PWA/offline support
- Effort estimates and recommended implementation order for a team of 1-2 developers

# 1 Critical Fixes (P0 - currently broken)

These seven issues produce wrong or misleading output in the live Observatory. They should be fixed before any new feature work begins.

| **#**  | **Bug**                                                                | **Symptom**                                                                                                                | **Fix**                                                                                                                                            |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | **Polygon popup shows "Unknown" for name, phase, UF, area**            | All polygon fields are UPPERCASE in the GeoJSON but the popup builder reads lowercase. Every click shows blank/5.0 score.  | Add polygonPropsToRareEarthProps() adapter in useRareEarthLayers.ts. Status: fix drafted in TASKS.md P0.2.                                         |
| **B2** | **Every claim popup shows danger_score = 5.0**                         | danger_score field does not exist in points.geojson. buildRareEarthPopupHTML falls back to ds ?? 5.                        | Compute score client-side via computeDangerScore(props, speculatorIndex). Already implemented in lib/observatory-analysis.ts - wire it up.         |
| **B3** | **MIL / ENV / SUS badges never appear in popups**                      | isMilitaryInterest / isHighEnvRisk / isSuspicious all read missing fields and return false.                                | Rewrite to derive from actual data (uf, area_ha, nome, ano, fase). See P0.3 design below.                                                          |
| **B4** | **Network layer is decorative - no real connections drawn**            | addRareEarthNetworkLines reads network_id property which is absent from all 20,700 features.                               | Derive corporate connections from enterprise-data.ts CORPORATE_CONNECTIONS. Draw lines from speculator centroids to their enterprise HQ. See F2.4. |
| **B5** | **Enterprise HQ coordinates are wrong continent (London, Sydney)**     | ENTERPRISES has HQ coordinates, not mine-site coordinates. Flying to VALE shows Rio but ELYSIUM has no Brazilian centroid. | Add centroid computation per enterprise from computeSpeculatorIndex(). Fall back to HQ only if no claims found.                                    |
| **B6** | **dangerData is a hard-coded 16-entry stale list, not reactive**       | The Danger tab never updates when the user applies filters. ELYSIUM, PEDRA CINZA, TALISMAN are not in the list.            | Replace with computed(() => getTopDangerEnterprises(allFeatures, deepAnalysis, 20)). Implemented in lib/observatory-analysis.ts - wire it up.      |
| **B7** | **points_with_overlaps.geojson loaded but overlap data ignored in UI** | overlapsByProcesso is built but overlap badges do not render in the popup HTML and the ENV tab does not filter by overlap. | In buildRareEarthPopupHTML, render overlapping TI/quilombo names. In EnvironmentTab.vue, add overlap filter toggle.                                |

# 2 Observatory of Vulcan - Feature Roadmap

Features are organised in three release phases. Phase 1 items are self-contained and can be shipped without backend changes. Phase 2 adds thin server logic (Cloudflare Workers / Supabase Edge). Phase 3 is the full community-reporting stack.

## 2.1 Phase 1 - Map Intelligence Upgrades (no backend required)

### F1.1 - Year Slider (claim filing timeline)

The original rare_earth_map_v5.html prototype had a year slider that animated the 1935-2026 claim-filing timeline. It did not survive the port to Nuxt.

**Design:**

- Add a horizontal range input below the layer legend: input\[type=range\] min=1935 max=2026 step=1 defaultValue=2026
- Bind to a yearFilter ref (or two refs for range mode: yearMin, yearMax)
- In updateFilter(), additionally require f.y >= yearMin && f.y <= yearMax
- Animate mode: a "Play" button auto-increments yearMax at 200 ms/step, revealing claims chronologically
- The cluster count badge in the top-centre updates live (already aria-live, just needs the value to change)

**Files:**

pages/observatory-of-vulcan/index.vue - add yearMin/yearMax refs + play toggle

composables/useRareEarthData.ts - expose filteredFeatures(yearMin, yearMax) helper

components/observatory/YearSlider.vue - new component

### F1.2 - Phase Filter Chips

Currently the layer toggles show category (direct_ree, carbonatite_associated…) but not mining phase (REQUERIMENTO, CONCESSÃO, LICENCIAMENTO…). Phase is a critical legal indicator - REQUERIMENTO claims have no rights yet; CONCESSÃO grants full extraction.

**Design:**

- Add 6 phase chips below the year slider: REQ · AUTH · AVAIL · LICEN · CONC · LAVRA
- Phase chips are multi-select (default: all selected)
- Filter applied in updateFilter() after category + year checks
- Chip colour matches the phase severity (grey → orange → red → dark red)

**Files:**

components/observatory/PhaseFilter.vue - new component

lib/map-utils.ts - add RARE_EARTH_PHASES constant with label + color

### F1.3 - Claim Detail Popup: Full ANM Data + Verification Link

The existing popup is a minimal grey card. It does not show all available fields and the "View on ANM" link from the v5 prototype was dropped.

**Design:**

- Expand popup to two columns: left = claim metadata, right = flags + danger gauge
- Claim metadata: Processo number, Company, Substances, Phase, UF, Area (ha), Filing year, Last event, Category badge
- Danger gauge: arc SVG rendered via inline style, coloured red/amber/green by score
- Flags section: MIL / ENV / SUS / OVL badges (fix B2, B3 from Section 1)
- Overlap list: if claim overlaps TI or quilombo territory, list each by name + distance
- "View on ANM" link: buildAnmVerifyUrl(processo, ano) - already implemented in lib/observatory-analysis.ts
- "Report this claim" link: opens claim report mailto flow (F1.5)

**Files:**

lib/map-utils.ts - rewrite buildRareEarthPopupHTML() → component

components/observatory/ClaimPopup.vue - new Vue component (replaces v-html)

### F1.4 - Sob-Demanda Indicator

The v5 prototype highlighted claims filed "Sob Demanda" (on demand of a third party, often foreign). This field exists in the ANM data as DSProcesso. The current port ignores it.

**Design:**

- In the feature summary, include dsprocesso: string field
- In ClaimPopup.vue, show "SOB DEMANDA" badge if dsprocesso contains "DEMANDA"
- Add "Sob Demanda only" checkbox in the layer legend - filters to only show these claims
- Colour: deep purple (#7B2FBE) to distinguish from the four category colours

**Files:**

composables/useRareEarthData.ts - include ds field in RareEarthFeatureSummary

pages/observatory-of-vulcan/index.vue - add sobDemandaOnly ref + filter logic

### F1.5 - Claim Report + Community Alert Flow

Communities need to report on-the-ground realities: active drilling where only REQUERIMENTO exists, pollution events, intimidation of local leaders. The platform should provide a structured, low-friction reporting path.

**Design (Phase 1 - email-based, no backend):**

- In ClaimPopup.vue, add "Report This Claim" button
- Opens a modal with a structured form: report type dropdown (New activity / Pollution / Conflict / Correction), description textarea, optional geolocation capture (navigator.geolocation), optional image attach (base64 thumbnail)
- On submit: generates mailto: link using buildClaimReportMailtoUrl() - already implemented in lib/observatory-analysis.ts
- Report is emailed to <observatory@earthguardians.org> with all claim metadata pre-filled

**Files:**

components/observatory/ClaimReportModal.vue - new component

lib/observatory-analysis.ts - buildClaimReportMailtoUrl() already implemented

### F1.6 - Export to PDF / PNG

Researchers and journalists need to export the current map view with the active filters and visible claims as a static document for reports.

**Design:**

- Add "Export" button in the action row next to "Download Data"
- Opens ExportModal.vue with options: format (PNG 1x/2x, PDF A4/Letter), include legend (y/n), include title/date stamp
- PNG: use html-to-canvas on the map container + legend overlay + stats bar
- PDF: use jsPDF to wrap the canvas image with a title block, EG logo, date, filter summary, and disclaimer
- Filename pattern: EG-Vulcan*YYYYMMDD*\[filter-summary\].pdf

**Files:**

components/observatory/ExportModal.vue - new component

lib/map-export.ts - new module, html2canvas + jsPDF

### F1.7 - 3D Globe: Parity with 2D Map

pages/observatory-of-vulcan/3d.vue is currently 85 lines and re-implements the map from scratch without layers, filters, or sidepanel. After P0.1 (useRareEarthLayers extraction), it should receive all features automatically.

**Design:**

- Remove 85-line implementation; replace with setupRareEarthLayers(map, opts) call after map load
- Add GlobeView-style auto-rotation (already in GlobeView.vue - extract to useMapAutoRotate composable)
- Expose the same layer toggles and sidebar as the 2D page (shared component)
- Add atmospheric glow shader via MapLibre custom layer or CSS box-shadow on the canvas

## 2.2 Phase 2 - Backend-Lite Intelligence (Cloudflare Workers / Supabase Edge)

### F2.1 - Automated Data Sync from ANM SIGMINE

Currently sync_frequency is "manual" in deep_analysis.json. The 20,700-point dataset was last synced 2026-06-01. Mining processes change daily (new filings, phase transitions, area expansions).

**Design:**

- Cloudflare Worker scheduled trigger (cron: 0 3 \* \* 1 - every Monday 03:00 UTC)
- Worker downloads ANM SIGMINE CSV dump from <https://app.anm.gov.br/SIGMINE>
- Runs the existing scripts/convert-csv-to-species.py pipeline (ported to JS or called via Worker binding)
- Compares new vs existing points.geojson - outputs diff: added\[\], removed\[\], changed\[\]
- Pushes updated geojson to the GitHub repo via GitHub API (write token stored as CF secret)
- Writes sync metadata to deep_analysis.json (last_sync, diff stats, new_speculators count)
- Triggers GitHub Actions deploy (already configured) → static site rebuilt
- Posts summary to EG Telegram/Signal channel via webhook

**Files:**

workers/anm-sync.ts - new Cloudflare Worker

.github/workflows/sync-anm.yml - cron-triggered workflow

scripts/convert-csv-to-geojson.mjs - refactor existing Python script to Node

### F2.2 - Change Detection + Alert Subscriptions

Affected communities and researchers need to know when a new mining claim appears near their territory, or when a claim transitions to a more aggressive phase.

**Design:**

- Supabase table: alert_subscriptions(id, email, lat, lng, radius_km, phase_filter\[\], created_at)
- After each ANM sync (F2.1), Worker queries subscriptions and compares new claims against each subscriber's area
- Sends email digest (Resend/Postmark) for matching new or changed claims: claim process, company, phase, area, distance
- In the Observatory UI: "Subscribe to alerts for this area" button (uses the user-pin lat/lng as centre, configurable radius)
- Unsubscribe link in every email (JWT-signed, no account required)

**Files:**

workers/alert-dispatch.ts - new Cloudflare Worker

components/observatory/AlertSubscribeModal.vue - new component

supabase/migrations/001_alert_subscriptions.sql

### F2.3 - Speculator Fingerprinting: Full 437-Entry Exposure

deep_analysis.json exposes only 10 of 437 suspicious speculators. The rest - ELYSIUM, PEDRA CINZA, NAZCA GOLD, PALMARES, SMART LITHIUM, M4E LITHIUM, EINSTEIN VENTURES - are in the raw data but hidden from the UI.

**Design:**

- Expose all 437 entries in deep_analysis.json by running computeSpeculatorIndex() server-side on the full points dataset
- Add full_suspicious array to deep_analysis.json (sorted by suspicion_score DESC)
- In the Danger tab: show the first 20 by default, "Show all 437" expands with pagination
- Add speculator search box in the Danger tab header
- Each entry: flags chip row (RECENT_RUSH, CARPET_BOMBING, HIGH_VOLUME, LARGE_AREA_FEW_SUBS, MULTI_UF), claim count, total area, year range, UFs, substances
- Click → fly to centroid of all claims; shift-click → filter entire map to show only that enterprise

### F2.4 - Real Corporate Network Visualisation

The current Rede Corporativa modal shows 16 static ENTERPRISES and 18 CORPORATE_CONNECTIONS from enterprise-data.ts. The network layer on the map is decorative - network_id does not exist in the GeoJSON.

**Design:**

- Build a corporate-to-claim bipartite graph: enterprises (from enterprise-data.ts) → claims (from points.geojson) via name matching using normalizeName()
- Draw edges from each enterprise HQ pin to the centroid of its claim cluster (lines, not from individual claim points - too dense)
- Edge weight = total area_ha of matching claims; edge colour by connection type (shareholding / subsidiary / board_overlap)
- In RedeCorporativa.vue canvas: add a minimap toggle that shows the force graph overlaid on Brazil SVG
- Add a "foreign capital flow" view: group enterprises by country, show investment amounts from US_INVESTMENTS

**Files:**

composables/useRareEarthLayers.ts - addRareEarthNetworkLines() rewrite

components/RedeCorporativa.vue - add bipartite mode + minimap

## 2.3 Phase 3 - Community Intelligence Layer (full backend)

### F3.1 - Community Annotations on the Map

Affected communities should be able to place persistent, public annotations directly on the map: "Active drilling here despite only REQUERIMENTO phase", "Water source polluted since 2024", "Community meeting point", "Safe corridor".

**Design:**

- Annotation types: Field Report (red), Water Alert (blue), Community Resource (green), Safe Route (teal), Correction (amber)
- Each annotation: type, description (max 500 chars), lat/lng, optional photo URL, author handle (pseudonymous), created_at, verification_count
- Public read; write requires simple token (email-verified, no name required) to prevent spam
- Moderation: EG team can hide or verify annotations; verified = green checkmark
- Map layer: custom markers distinct from mining claims; cluster at low zoom
- Supabase table: annotations(id, type, lat, lng, description, photo_url, author_token_hash, created_at, verified, hidden)

### F3.2 - Geofenced Offline Mode for Field Researchers

Communities near sacrifice zones often lack internet. The platform needs to work offline for a pre-selected region.

**Design:**

- @vite-pwa/nuxt module + Workbox for service worker
- Cache strategy: CacheFirst for /data/rare-earth/points.geojson, /data/rare-earth/polygons.geojson; NetworkFirst for /data/rare-earth/deep_analysis.json
- Map tile cache: the useOfflineTiles.ts composable is already in the codebase but not wired up - connect it to the PWA service worker
- "Download this region" button in the layer legend: downloads all tiles for the current viewport at z6-z14, saves to IndexedDB via the tile cache
- Offline indicator in the top-left status bar; toast on reconnect
- Annotations created offline are queued in IndexedDB and synced when connection returns

# 3 Data Pipeline & Backend

## 3.1 Points GeoJSON Enrichment Pipeline

The 8.5 MB points.geojson is produced by scripts/convert-csv-to-species.py from the ANM CSV. Several high-value fields are missing from the output.

| **Field**              | **Status**                                                           | **Action**                                                                                          |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| danger_score           | Missing from all features                                            | Compute client-side via computeDangerScore(); add to data pipeline for server-side                  |
| network_id             | Missing from all features                                            | Derive from enterprise-name matching; add field in convert-csv script                               |
| overlaps (TI/quilombo) | Partially computed in points_with_overlaps.geojson but ignored in UI | Load points_with_overlaps.geojson instead of points.geojson; render overlap names in popup          |
| dsprocesso             | Present in CSV but dropped in conversion                             | Add to output GeoJSON in convert-csv-to-species.py line 87                                          |
| ult_evento             | Present as ULT_EVENTO in polygons, absent in points                  | Include from ANM CSV column "ULT_EVENTO" in point features                                          |
| lat / lng              | Computed from geometry in points; stored in properties for polygons  | Normalise: always read from geometry.coordinates\[1/0\] for points, properties.lat/lon for polygons |

## 3.2 Download Panel: Add Real GeoJSON Exports

The current DataDownloadPanel.vue exports 7 datasets - none of which are the actual 20,700-point mining claims. Users expecting to download the core data get only enterprise JSON, timeline JSON, and a CSV template.

**Fix: Add to composables/useDataDownload.ts:**

- points.geojson (8.5 MB) - all 20,700 mining claims
- polygons.geojson (14.6 MB) - exact claim boundaries
- points_with_overlaps.geojson (enriched, includes TI/quilombo overlap data)
- deep_analysis.json - full 437-speculator list (after F2.3)
- CSV export of filtered claims (whatever the user currently sees on the map)

The last item requires implementing a filteredToCSV(features) helper in lib/utils.ts and wiring it to the current map state.

# 4 New Community Tool Modules

## 4.1 EG-Reports: Structured Community Alert System

A lightweight, pseudonymous field-reporting pipeline separate from the Observatory map.

- Route: /reports - report submission form + moderation feed
- Report types: Mining Activity · Water/Soil Contamination · Violence/Intimidation · Land Invasion · Infrastructure Damage · Positive Observation
- Each report: type, description, lat/lng (from GPS or map click), photo (optional, compressed to 800px), severity (1-5), community name (optional), contact (optional, encrypted)
- Reports appear on Observatory map as community annotation layer (F3.1)
- Aggregation: if 3+ reports of same type within 10 km in 30 days → auto-generates "hotspot" alert
- Export: EG team can export all reports for a region as CSV for NGO/press use

## 4.2 EG-Monitor: Automated Speculator Watch

A subscriber-facing dashboard showing the top 50 speculators with their claim trajectories over time.

- Route: /monitor - speculator leaderboard, sortable by score / total area / claim count / recent activity
- Each speculator card: claim count over time chart (sparkline), UF heatmap, substance breakdown donut, flag history
- Compare mode: select up to 4 speculators and compare trajectories side by side
- Watchlist: subscribers can pin speculators to their watchlist (stored in localStorage, synced to alert subscriptions from F2.2)
- Data feeds from the same deep_analysis.json + live speculator index computed in the browser

## 4.3 EG-Routes: Safe Corridor Mapping

Communities traversing mining claim territories need to know which areas are actively drilled vs merely claimed vs legally protected. Safe corridors should be plannable on the map.

- Route: /routes - route planner overlay on top of the Observatory map
- User draws a path: start + end point, waypoints. Route is computed via OSRM or Mapbox Directions API
- Path is analysed against: mining claim polygons (overlap detection), indigenous/quilombo territories, annotated community resources (F3.1)
- Output: safety report for the route - "this route crosses 3 CONCESSÃO claims and 1 TI boundary"
- Safe waypoints: show verified community resources (wells, health posts, gathering points) from the annotation layer
- Export route as GPX for offline GPS devices

# 5 Architecture & Modularisation

UnifiedMap.vue is 2,813 lines. GlobeView.vue is 1,342 lines. Both are unsplittable without the composable extraction already planned in TASKS.md. This section specifies the target architecture.

## 5.1 Target Component Tree

pages/observatory-of-vulcan/index.vue (< 200 lines)

├── components/observatory/ObservatorySidebar.vue

│ └── tabs/ \[DangerTab, MilitaryTab, IllegalTab, EnvironmentTab, NetworkTab, TimelineTab\]

├── components/observatory/ClaimPopup.vue

├── components/observatory/ClaimReportModal.vue

├── components/observatory/YearSlider.vue

├── components/observatory/PhaseFilter.vue

├── components/observatory/ExportModal.vue

├── components/observatory/AlertSubscribeModal.vue

├── components/map/UnifiedMap.vue (< 400 lines - orchestrator only)

│ ├── components/map/MapCore.vue

│ ├── components/map/MarkerLayer.vue

│ ├── components/map/ConnectionLayer.vue

│ ├── components/map/HexGridOverlay.vue

│ └── components/map/PopupOverlay.vue

├── components/RedeCorporativa.vue

├── components/GeoPoliticalTimeline.vue

└── components/DataDownloadPanel.vue

## 5.2 Target Composable Layer

composables/

├── useRareEarthData.ts ← already exists

├── useRareEarthLayers.ts ← P0.1 done

├── useRareEarthController.ts ← already exists

├── useMapLibre.ts ← shared lifecycle

├── useMapMarkers.ts ← extract from UnifiedMap

├── useMapConnections.ts ← extract from UnifiedMap

├── useMapHexGrid.ts ← already exists

├── useMapAutoRotate.ts ← extract from GlobeView

├── useEnterpriseMarkers.ts ← already exists

├── useEnterpriseData.ts ← new: pure data layer

├── useOfflineTiles.ts ← already exists, needs wiring

├── useAlertSubscriptions.ts ← new (Phase 2)

└── useAnnotations.ts ← new (Phase 3)

## 5.3 State Management: Pinia Migration

Filter state currently resets on 2D→3D navigation. Dark-mode and locale live in module-level refs (not SSR-safe). Map view state is lost on route change.

- stores/map.ts - activeDataset, zoom, center, showConnections, showHexGrid
- stores/filters.ts - yearMin, yearMax, phases\[\], categories\[\], sobDemandaOnly, searchTerm
- stores/ui.ts - isDark, locale, sidebarCollapsed, activeTab, toasts
- stores/observatory.ts - speculatorWatchlist\[\], alertSubscriptions\[\], userPin

Migration approach: wrap each existing composable ref in a Pinia action - no breaking changes to components.

# 6 Accessibility & UX

## 6.1 Accessibility Fixes

| **#** | **Issue**                                                                                | **Fix**                                                                                             |
| ----- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A1    | Map markers are invisible to screen readers - &lt;div&gt; elements with no role/tabindex | Add role="button", tabindex="0", aria-label with claim name + category. Keyboard Enter opens popup. |
| A2    | Full-screen popups have no focus trap - Tab escapes to map behind                        | useFocusTrap() already in codebase - apply to all popups and modals                                 |
| A3    | Filter count badge not announced - no aria-live                                          | Wrap total count in &lt;span aria-live="polite" aria-atomic="true"&gt;                              |
| A4    | No skip-to-content link                                                                  | Add &lt;a href="#main-content" class="sr-only focus:not-sr-only"&gt; in app.vue                     |
| A5    | \--text-muted (#71717A on zinc-950) is 4.4:1 contrast - fails WCAG AA for small text     | Bump to #A1A1AA (6.0:1) throughout                                                                  |
| A6    | Canvas elements (hex grid, particles, star field) not aria-hidden                        | Add aria-hidden="true" to all decorative canvas + background div elements                           |
| A7    | No prefers-reduced-motion gating on modal transitions, particle effects, globe rotation  | Add const prefersReduced = useReducedMotion() in all animated components; skip animations when true |

## 6.2 UX Improvements

### Skeleton Loading

All three data pages (/observatory-of-vulcan, /project-grants, /endangered-species) flash a blank map before the GeoJSON loads. This contributes to high CLS.

- Create &lt;SkeletonMap /&gt; and &lt;SkeletonPanel /&gt; in components/ui/
- Use as &lt;template #fallback&gt; in all ClientOnly wrappers
- SkeletonMap: a dark rectangle with animated shimmer, matching the map container dimensions
- SkeletonPanel: three shimmer card placeholders for the sidebar

### Motion Token System

Animation durations are scattered: 0.2s, 0.3s, 0.15s, 0.25s used inconsistently across 50+ components. Tailwind transitions are unused.

- Add CSS variables in main.css: --ease-out-soft, --duration-fast (150ms), --duration-base (250ms), --duration-slow (400ms)
- Add to tailwind.config.ts: transitionDuration, transitionTimingFunction
- Global search-replace: "transition: all Xs" → "transition: \[transform,opacity,background-color\] var(--duration-base) var(--ease-out-soft)"

### Dock Magnification Physics

The current dock in layouts/default.vue uses discrete size jumps (base → neighbor → max). Implement a smooth Gaussian falloff:

size = base + (max - base) \* Math.exp(-distance² / (2 × σ²)) where σ = 1.2

Apply via style binding directly on DOM refs (no Vue reactivity cycle for hover effects).

# 7 Performance

## 7.1 Bundle & Load

- Enable @nuxtjs/i18n lazy loading - non-default locale JSON (~20 KB) is currently bundled into the main chunk
- shallowRef for all GeoJSON collections - Vue currently deep-walks 8.5 MB of features on assignment (already noted as MN.7)
- Treeshake iconify: only import used icon collections (lucide, game-icons) - current bundle includes all iconify-icon polyfills
- Lazy-load RedeCorporativa canvas force layout only when modal opens, not at page load

## 7.2 Map Rendering

- Replace useMapCluster.ts Supercluster rebuild (O(N log N) on every filter) with MapLibre native clustering for > 500 points
- MapLibre native clustering for the Observatory (20,700 points) already configured in useRareEarthLayers.ts - verify cluster properties are correct
- Add generateId: true to all GeoJSON sources for efficient feature state updates (highlight on hover without rebuilding the source)
- Debounce all filter inputs to 250 ms (already done for search; extend to year slider and phase chips)
- Web Worker for computeSpeculatorIndex(): currently runs on the main thread for 20,700 features on each full reload

## 7.3 Offline & PWA

- @vite-pwa/nuxt with Workbox - StaleWhileRevalidate for tiles, CacheFirst for geojson data
- useOfflineTiles.ts already implemented - connect to service worker via WorkboxPlugin
- "Download region" pre-cache: tiles for the current bbox at z6-z14 (roughly 2,000 tiles, ~15 MB per state)
- Lighthouse PWA audit target: ≥ 90 on all metrics

# 8 Testing & CI

## 8.1 Unit Tests

Zero unit tests currently exist in tests/unit/. Vitest is installed and configured but has no files to run.

- tests/unit/lib/observatory-analysis.test.ts - computeSpeculatorIndex(), computeDangerScore(), normalizeName(), buildAnmVerifyUrl(), buildClaimReportMailtoUrl()
- tests/unit/lib/map-utils.test.ts - escapeHtml() with hostile input, buildRareEarthPopupHTML() fallbacks
- tests/unit/composables/useRareEarthData.test.ts - load(), features shape, speculatorIndex computed
- tests/unit/lib/observatory-analysis.test.ts - isMilitaryInterest() for all 27 UFs, isHighEnvRisk() for FOSFATO / large area / MG edge case
- Coverage target: ≥ 80% on lib/ and composables/

## 8.2 E2E Tests

tests/observatory.test.ts exists but is empty scaffolding. Playwright is configured.

- /observatory-of-vulcan loads in < 5 s with no console errors
- Clicking a point marker opens the popup with non-"Unknown" name
- Danger score in popup is a number between 0 and 10 (not 5.0 for every point)
- Year slider filters the cluster count in the top badge
- All 6 sidebar tabs render without errors
- Timeline modal opens and closes (ESC)
- Rede Corporativa modal opens and closes
- Download panel lists at least 7 datasets
- 2D → 3D toggle navigates without white flash

## 8.3 CI Pipeline

- GitHub Actions: pnpm lint + pnpm test + pnpm build on every PR
- Enable typeCheck: true in nuxt.config.ts (currently false)
- Add Lighthouse CI step - fail if LCP > 4 s, CLS > 0.1, or PWA score < 90 (after Phase 3)
- Add size-limit step - fail if JS bundle grows > 10% above baseline

# 9 Implementation Order & Effort Estimates

Recommended sequence for a 1-2 developer team. P0 bugs first, then Phase 1 features, then infrastructure.

| **Sprint** | **Ref**    | **Task**                                                              | **Effort** | **Output**                                |
| ---------- | ---------- | --------------------------------------------------------------------- | ---------- | ----------------------------------------- |
| **S1**     | **B1-B3**  | Fix polygon popup adapter, danger_score wiring, MIL/ENV/SUS flags     | 1 day      | Accurate popup data on every click        |
| **S1**     | **B4-B5**  | Real network lines from enterprise centroids + fix ENTERPRISES coords | 1 day      | Working network layer on map              |
| **S1**     | **B6-B7**  | Wire dangerData to computed, show overlap names in popup              | 0.5 day    | Danger tab shows real top-437 speculators |
| **S2**     | **F1.1**   | Year slider component + animation mode                                | 1 day      | Timeline animation on map                 |
| **S2**     | **F1.2**   | Phase filter chips                                                    | 0.5 day    | Phase-filtered view                       |
| **S2**     | **F1.3**   | ClaimPopup.vue with full data, ANM link, danger gauge                 | 1.5 days   | Rich popup replaces v-html                |
| **S3**     | **F1.4**   | Sob Demanda indicator + filter                                        | 0.5 day    | Speculative-foreign-demand filter         |
| **S3**     | **F1.5**   | ClaimReportModal.vue (email-based)                                    | 1 day      | Community reporting live                  |
| **S3**     | **F1.6**   | ExportModal.vue + lib/map-export.ts                                   | 1.5 days   | PDF/PNG export                            |
| **S4**     | **F1.7**   | 3D globe parity via useRareEarthLayers                                | 1 day      | 3D page has same layers                   |
| **S4**     | **A1-A7**  | Full accessibility pass                                               | 1.5 days   | WCAG AA compliance                        |
| **S4**     | **DA.1,5** | Motion tokens + skeleton loading                                      | 1 day      | Smooth transitions                        |
| **S5**     | **MO.1-7** | Composable extraction, UnifiedMap refactor                            | 3 days     | UnifiedMap < 400 lines                    |
| **S5**     | **MN.1**   | Pinia state migration                                                 | 1 day      | Filter state persists on nav              |
| **S6**     | **F2.1**   | ANM sync Cloudflare Worker                                            | 2 days     | Automated weekly data refresh             |
| **S6**     | **F2.2**   | Change detection + email alerts                                       | 2 days     | Alert subscriptions live                  |
| **S7**     | **F2.3**   | Full 437-speculator exposure                                          | 0.5 day    | Complete speculator database              |
| **S7**     | **F2.4**   | Real corporate network visualisation                                  | 2 days     | Bipartite graph + foreign flow view       |
| **S8**     | **MN.8**   | PWA + offline tile caching                                            | 2 days     | Works offline in field                    |
| **S8**     | **4.1**    | EG-Reports: field reporting route                                     | 3 days     | /reports live                             |
| **S9**     | **4.2**    | EG-Monitor: speculator dashboard                                      | 2 days     | /monitor live                             |
| **S9**     | **4.3**    | EG-Routes: safe corridor planner                                      | 3 days     | /routes live                              |
| **S10**    | **TE.1-2** | Unit + E2E test suite                                                 | 3 days     | ≥ 80% coverage                            |
| **S10**    | **F3.1-2** | Community annotations + offline sync                                  | 3 days     | Full community layer                      |

Total estimated effort: ~10 sprints of 4 days each = approximately 40 developer-days across both the Observatory improvements and the three new community tool modules. Phase 3 (community annotations, offline mode) can run in parallel if a second developer joins in Sprint 8+.

**Framing note: this design prioritises the Vulcan Observatory as a community-first intelligence platform - not a surveillance product. Every feature (claim reporting, alert subscriptions, safe routes, annotations) is designed to serve affected communities, not to generate data about them. Pseudonymous participation, local-first data storage, and community moderation are non-negotiable architectural constraints.**
