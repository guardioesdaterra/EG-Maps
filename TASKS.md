# EG-Maps — Implementation Tasks

> **Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked / partial
> **Priority legend:** P0 = fixes what's broken · P1 = adds community features · P2 = architecture · P3 = data hooks
> **Generated:** 2026-06-02 from full code review of `pages/observatory-of-vulcan/`, `components/RedeCorporativa.vue`, `components/GeoPoliticalTimeline.vue`, `components/DataDownloadPanel.vue`, `composables/useEnterpriseMarkers.ts`, `lib/enterprise-data.ts`, `lib/observatory-timeline.ts`, `lib/map-utils.ts`, `lib/map-effects.ts`, `public/data/rare-earth/*`, `components/UnifiedMap.vue` (REE path), `components/GlobeView.vue`, `pages/observatory-of-vulcan/3d.vue`, `composables/useDataDownload.ts`, all 8 locale files.

---

## Context Recap (for later recall)

**The Observatory of Vulcan** is the third dataset in EG-Maps (`/observatory-of-vulcan` + `/observatory-of-vulcan/3d`). It visualizes **20,700 Brazilian mining processes** (1935–2026, 33.2 M ha total area, 6 REE categories, 12 phases, 27 UFs) sourced from the ANM (Agência Nacional de Mineração). The page is a **read-only intelligence dashboard** with three secondary panels (Geopolitical Timeline modal, Rede Corporativa modal, Data Download modal) and a side panel with 6 tabs (Danger / Military / Illegal / Env / Network / Timeline).

**Key data files:**
- `public/data/rare-earth/points.geojson` (8.5 MB, 20,700 features) — lowercase properties: `processo, numero, ano, area_ha, fase, nome, subs, uso, uf, category, category_label, dsprocesso`. **No** `danger_score`, **no** `network_id`, **no** `flag` fields.
- `public/data/rare-earth/polygons.geojson` (14.6 MB, 20,700 features) — UPPERCASE properties: `PROCESSO, NUMERO, ANO, AREA_HA, FASE, ULT_EVENTO, NOME, SUBS, USO, UF, DSProcesso, category, category_label, lat, lon`. The `lat`/`lon` are stored in **properties**, not in geometry.
- `public/data/rare-earth/deep_analysis.json` (5 KB) — `suspicious_speculators_count: 437`, `top_suspicious: [10 entries]`, `foreign_claims: {AUSTRALIAN, US, UK/EUROPEAN, CANADIAN, CHINESE}`, `year_counts: {2000-2026}`, `key_events`, `sigilo_stats`, `military_critical`. **Top 10** speculators are exposed; the other **427 are not in the UI**.
- `public/data/rare-earth/points_full.geojson` (9.8 MB) and `polygons_full.geojson` (19 MB) — exist but not loaded.
- `public/data/rare-earth/all.geojson` (38 MB) — combined, not loaded.
- `public/data/rare-earth/rare_earth_map_v5.html` (50 KB) — original standalone prototype, MapLibre 4.7.1, light theme, had a year slider, a Sob-Demanda filter, per-region breakdowns, MPF/Operação Rejeito annotations, and "view on ANM" links that **did not survive the port**.

**Key lib files:**
- `lib/map-utils.ts:248-255` — `RARE_EARTH_CATEGORIES` (6 entries, color-coded)
- `lib/map-utils.ts:261-272` — `isMilitaryInterest`, `isHighEnvRisk`, `isSuspicious` (exist but rely on missing data)
- `lib/map-utils.ts:274-332` — `buildRareEarthPopupHTML` (reads `props.ds ?? 5`, always falls back to 5.0)
- `lib/enterprise-data.ts:41-298` — 16 `ENTERPRISES` with HQ coordinates in 5 countries (not in Brazil!)
- `lib/enterprise-data.ts:300-319` — 18 `CORPORATE_CONNECTIONS`
- `lib/observatory-timeline.ts` — 15 events, 5 mining phases
- `lib/types.ts` — only `ProjectData` and `Species`; **no** `MiningClaim` type despite `enterprise-data.ts:25-39` defining the interface

**Key component files:**
- `pages/observatory-of-vulcan/index.vue` (458 lines) — page shell, hard-codes 16-entry `dangerData` (lines 406-422), 5 `buildXxxHTML` functions emitting `v-html` strings, `window.__flyToDanger`/`__flyToCoord` globals, `panelContent` computed
- `pages/observatory-of-vulcan/3d.vue` (85 lines) — 85-line throwaway, reimplements map from scratch
- `components/UnifiedMap.vue` (2813 lines) — owns `setupRareEarthLayers` (lines 1037-1270), `addRareEarthConflictSites` (1327-1390), `addRareEarthGeoBoundaries` (1272-1325), `addRareEarthNetworkLines` (1392-1430), `syncRareEarthLayerVisibility` (1432-1458)
- `components/RedeCorporativa.vue` (337 lines) — canvas-based force-graph of corporate network
- `components/GeoPoliticalTimeline.vue` (679 lines) — modal with hero, executive summary, 4 geo cards, network visual, 15 events, 5 phases, 6 CTA cards
- `components/DataDownloadPanel.vue` (265 lines) — 7 downloadable datasets, **none** are the actual points/polygons
- `composables/useEnterpriseMarkers.ts` (207 lines) — adds enterprise HQ dots and connection lines
- `composables/useDataDownload.ts` (157 lines) — only exports curated JSON (enterprises, timeline, phases)

**Data-flow problems identified:**
1. `network_id` is referenced in `addRareEarthNetworkLines:1397` but **not in the GeoJSON** → the network layer is decorative-only
2. `danger_score` is referenced in `buildRareEarthPopupHTML:276` but **not in the GeoJSON** → every popup shows 5.0
3. Polygons have `lat`/`lon` in **properties**, not geometry → click handler reads wrong fields
4. ENTERPRISES coordinates are HQ locations (London, Sydney), not mine sites
5. 437-speculator list is in deep_analysis.json but only 10 are exposed

---

## P0 — Fix what's broken

### P0.1 — Extract `useRareEarthLayers` composable from `UnifiedMap.vue` `[x]`
**Why:** The 230-line `setupRareEarthLayers`, `addRareEarthConflictSites`, `addRareEarthGeoBoundaries`, `addRareEarthNetworkLines`, and `syncRareEarthLayerVisibility` functions all live inside a 2,813-line `UnifiedMap.vue`. The 3D page reimplements everything from scratch because none of this is shareable.

**Files to create/modify:**
- `composables/useRareEarthLayers.ts` (new) — exports `setupRareEarthLayers(map, props)`, `addRareEarthConflictSites(map)`, `addRareEarthGeoBoundaries(map)`, `addRareEarthNetworkLines(map, points)`, `syncRareEarthLayerVisibility(map, vis)`, `cleanupRareEarthLayers(map)`, all using `const` IDs and a small `safeRemove*` helper. Pure functions, no Vue refs.
- `components/UnifiedMap.vue` — replace inline functions with `import { ... } from '@/composables/useRareEarthLayers'`, keep watchers + props.
- `pages/observatory-of-vulcan/3d.vue` — call `setupRareEarthLayers(map, { points, polys, analysis })` after `map.on('load')`.

**Acceptance criteria:**
- UnifiedMap.vue loses ~400 lines
- 3D page has same overlay layers (clusters, polygons, conflict sites, basins, network) as 2D
- Lint passes
- `pnpm build` still produces same `dist/` hash for the REE routes

---

### P0.2 — Fix polygon popup field-name mismatch `[x]`
**Why:** `polygons.geojson` has UPPERCASE keys (`NOME, FASE, UF, AREA_HA, SUBS, PROCESSO, ULT_EVENTO`) and a `lat`/`lon` centroid in properties. `UnifiedMap.vue:1241-1256` calls `buildRareEarthPopupHTML` reading `p.category, p.danger_score, p.nome, p.substances, p.processo, p.fase, p.uf, p.area_ha, p.network_id` — all undefined. The popup always shows "Unknown" / 0 area / no category color.

**Fix:** In `useRareEarthLayers.ts`, add a `polygonPropsToRareEarthProps(p)` adapter:
```ts
{
  c: p.category,
  ds: p.danger_score,  // computed, see P0.4
  n: p.NOME || p.nome,
  s: p.SUBS || p.substances,
  p: p.PROCESSO || p.processo,
  f: p.FASE || p.fase,
  u: p.UF || p.uf,
  a: p.AREA_HA || p.area_ha,
  net: p.network_id,
  ev: p.ULT_EVENTO,  // last event, for P1.3
}
```
Use it in the polygon click handler before calling `buildRareEarthPopupHTML`.

**Acceptance criteria:** Clicking a polygon shows the correct name, substance, area, phase, UF, and last event.

---

### P0.3 — Compute MIL/ENV/SUS flags client-side from data `[x]`
**Why:** `lib/map-utils.ts:261-272` already has `isMilitaryInterest`, `isHighEnvRisk`, `isSuspicious` but they read fields that don't exist (`props.ds`, `props.y`, `props.f`). The `buildRareEarthPopupHTML:280-287` produces empty `<span>` for the flags.

**Fix:** In `lib/map-utils.ts`, rewrite the three functions to derive from the actual fields we have:
- `isMilitaryInterest(uf)`: UF in `{AM, AP, PA, RR, RO, MT}` (Amazonia + Mato Grosso) — **unchanged**
- `isHighEnvRisk(props)`: substance contains `FOSFATO` OR area_ha > 50,000 OR (UF in `{MG}` AND phase = `REQUERIMENTO DE PESQUISA` AND ano > 2022)
- `isSuspicious(props)`: ano >= 2020 AND (n_claims_of_same_enterprise > 50) AND (substance count <= 2) AND phase is a "research" phase

The `n_claims_of_same_enterprise` requires a precomputed map keyed by normalized `nome`. Build this in a helper `computeSpeculatorIndex(points)` that returns `Map<string, { count, area, subs, recentPct }>`. Expose from `lib/observatory-analysis.ts` (new).

**Acceptance criteria:**
- `MIL` flag appears on Amazonia/Mato Grosso claims
- `ENV` flag appears on phosphate > 50K ha claims
- `SUS` flag appears on the 437-deep-analysis speculators

---

### P0.4 — Compute danger_score from data (no hand-curated scores) `[x]`
**Why:** `dangerData` (in `pages/observatory-of-vulcan/index.vue:406-422`) hand-codes `danger_score: 10` for FOXFIRE, 10 for VALE, etc. The 20-entry list is stale (doesn't include PEDRA CINZA which is in deep_analysis as score 6 with 322 claims). The `buildRareEarthPopupHTML` fallback to 5.0 means every per-claim popup is meaningless.

**Fix:** In `lib/observatory-analysis.ts`, export `computeDangerScore(props, speculatorIndex)`:
- Base 4.0
- +1.0 if `isHighEnvRisk(props)`
- +1.5 if `isSuspicious(props)` (recent + high-volume + few-substance)
- +1.0 if `isMilitaryInterest(uf)`
- +1.0 if `area_ha > 100,000`
- +0.5 if `n_claims_of_enterprise > 200`
- Cap at 10.0

Replace the hard-coded `dangerData` scores with a live `computed` that ranks enterprises by aggregate score from the current filtered dataset.

**Acceptance criteria:**
- Each popup shows a real, defensible danger score
- The "Danger" tab in the side panel shows live rankings, not a stale 20-entry list

---

### P0.5 — Replace `dangerData` with dynamic generation from `deep_analysis.json` + points aggregation `[x]`
**Why:** The `dangerData` array is a 16-entry hard-coded list that doesn't match the 437-entry `deep_analysis.top_suspicious` (which has names like "ELYSIUM MINERACAO MARINHA S/A", "TALISMAN DO BRASIL MINERACAO LTDA" — these are not in the 16-entry list).

**Fix:** In `lib/observatory-analysis.ts`, export:
- `getTopDangerEnterprises(points, deepAnalysis, limit = 20)`: returns the top `N` enterprises ranked by `(suspicion_score × area_ha × 1e-3) + n_claims`
- Use it in a Vue `computed` in the page
- Click on an enterprise flies to the centroid of all its claims (compute from points)

**Acceptance criteria:**
- The Danger tab shows real-time top-N (default 20, configurable)
- Click flies to the right lat/lng
- ELYSIUM, TALISMAN, EINSTEIN VENTURES, M4E LITHIUM, SMART LITHIUM, PALMARES, etc. all appear

---

### P0.6 — Replace `buildXxxHTML` v-html strings with proper Vue components `[x]`
**Why:** The 5 `buildDangerHTML`, `buildMilitaryHTML`, `buildIllegalHTML`, `buildEnvHTML`, `buildNetworkHTML`, `buildTimelineHTML` functions in `pages/observatory-of-vulcan/index.vue:315-404` produce HTML strings fed into `v-html`. This is:
1. Not translatable (8 locale files but English-only panel)
2. Not reactive (one re-render of the giant string on any change)
3. Not accessible (no semantic markup, no focus, no keyboard nav)
4. Uses inline `onclick="window.__flyToDanger(...)"` requiring JS-in-HTML

**Fix:** Replace with a single `<ObservatoryTabPanel :kind="activeTab" :items="..." />` component that has a `<template #danger>`, `<template #military>` slot, with proper `<button>` elements that emit click events. Each sub-panel becomes a sub-component:
- `<ObservatoryDangerList :enterprises="..." @fly-to="flyToEnterprise" />`
- `<ObservatoryMilitaryBrief />`
- `<ObservatoryIllegalBrief />`
- `<ObservatoryEnvRegions :regions="..." @fly-to-coord="flyToCoord" />`
- `<ObservatoryNetworkBrief :enterprises="..." :connections="..." />`
- `<ObservatoryTimelineBrief :timeline="..." />`

**Acceptance criteria:**
- No `v-html` in the right-side panel
- Click handlers are real Vue `@click`, not inline `onclick`
- All panel text is translatable via `t('observatory.tab.danger.title')` etc.

---

### P0.7 — Remove `window.__flyToDanger` / `__flyToCoord` globals `[x]`
**Why:** `pages/observatory-of-vulcan/index.vue:170` declares `interface Window { __flyToDanger?: ...; __flyToCoord?: ... }` and lines 425-432 set them up so inline `onclick="window.__flyToDanger(...)"` strings can dispatch to `flyToTarget.value`. This bypasses Vue's reactivity, leaks to global scope, and is a code smell.

**Fix:** When the v-html strings become real Vue components (P0.6), they emit events that the parent handles. Delete the global window functions.

**Acceptance criteria:**
- No `window.__flyTo*` in the codebase (grep returns nothing)
- No `interface Window { __flyTo... }` in any .vue/.ts file
- Click → fly still works

---

### P0.8 — Move tab content to `lib/observatory-tabs.ts` and render with Vue templates `[x]`
**Why:** The 5 buildXxxHTML functions encode 100+ lines of business rules (military supply chain kg/unit, Operação Rejeito dates, Bambuí Aquifer coordinates) in HTML template strings. These should be in a typed data file so:
- The "Military" tab can be updated without touching .vue
- The "Illegal" tab can be re-ordered from data, not template
- Future content updates don't require re-rendering HTML

**Fix:** Create `lib/observatory-tabs.ts` exporting:
```ts
export const OBSERVATORY_TABS: { key, labelKey, icon }[]
export const MILITARY_ASSETS: { name, country, kgPerUnit, use }
export const US_INVESTMENTS: { from, to, amount, year }
export const ILLEGAL_PATTERNS: { title, desc, color, examples[] }
export const ENV_REGIONS: { region, danger, companies[], risks[], coord }
export const TIMELINE_HIGHLIGHTS: { year, count, event }
```
Render with `<ul>` / `<dl>` / proper semantic markup.

**Acceptance criteria:**
- All 5 tab content blocks live in `lib/observatory-tabs.ts`
- The page imports from it and renders via Vue template
- Update 1 timeline event requires editing 1 file, not a template literal

---

### P0.9 — Add observatory i18n keys to all 8 locale files `[x]`
**Why:** Searched all 8 locale files for `vulcan|observat|ree|rare`. Only `en.json` has 3 keys. The right-side panel of the Vulcan page has zero translations.

**Fix:** Add to `locales/en.json` (and 7 other locale files):
```json
"observatory": {
  "tabs": {
    "danger": "Danger", "military": "Military", "illegal": "Illegal",
    "env": "Env Risk", "network": "Network", "timeline": "Timeline"
  },
  "dangerPanel": {
    "title": "Top dangerous enterprises",
    "processes": "processes", "area": "ha", "subs": "substances"
  },
  "militaryPanel": {
    "title": "The real interest: MILITARY SUPPLY CHAIN",
    "intro": "The 'Energy Transition' narrative is a facade...",
    "dod": "DoD Investments", "stateDept": "State Dept & Export Finance", "chinaBan": "China Export Ban (Oct 2025)"
  },
  "illegalPanel": {
    "landSpec": "Land Speculation", "rejeito": "Regulatory Capture — Operação Rejeito",
    "secrecy": "Mining Information Secrecy", "foreign": "Foreign Control of Strategic Minerals",
    "exclusion": "Community Exclusion", "water": "Water Risk"
  },
  "envPanel": {
    "title": "Environmental risk by region"
  },
  "networkPanel": {
    "foxfire": "Central Hub: Foxfire Metals",
    "australian": "Australian Invasion", "usMilitary": "US Military Interest", "cbmm": "CBMM China"
  },
  "timelinePanel": {
    "title": "Claiming timeline (2000–2026)"
  },
  "actions": {
    "report": "Report new claim", "verify": "Verify on ANM", "myTerritory": "My territory"
  }
}
```

**Acceptance criteria:** Grep for `observatory` in `locales/*.json` returns ≥ 8 matches per key, ≥ 1 per file.

---

### P0.10 — Make 3D page reuse the rare earth layer setup `[x]`
**Why:** `pages/observatory-of-vulcan/3d.vue` is 85 lines and reimplements clusters + conflict sites from scratch with different visual style (carto dark tiles, 45° pitch, no overlays). It's incomplete — no Enterprise HQs, no Rede Corporativa, no Geopolitical Timeline modal, no Download panel.

**Fix:** Refactor the 2D and 3D page into a single page that switches between `<UnifiedMap>` and a `<GlobeView>` via a query param or a button. Or, simpler: 3D page imports `<UnifiedMap :default-dataset="'observatory-of-vulcan'" :map-style="'satellite-dark'" :pitch="45" />`.

**Acceptance criteria:** 3D page has same overlays (modal Timeline, modal Rede Corporativa, modal Download) as 2D page.

---

### P0.11 — Fix data-download to include actual points/polygons/analysis `[x]`
**Why:** `composables/useDataDownload.ts:14-105` lists 7 downloadable datasets but **none** are the actual `points.geojson`, `polygons.geojson`, or `deep_analysis.json`. The "Full Report" excludes them. Journalists and researchers who download the "All Datasets" bundle get curated data but not the source.

**Fix:** Add 3 entries to `DOWNLOADABLE_DATASETS`:
- `points-geojson` — fetches `/data/rare-earth/points.geojson`
- `polygons-geojson` — fetches `/data/rare-earth/polygons.geojson`
- `deep-analysis` — fetches `/data/rare-earth/deep_analysis.json`

Note: 8.5 MB JSON download is acceptable for static GitHub Pages.

**Acceptance criteria:** Data Download panel shows 10 items (was 7). "Download All" bundles everything.

---

## P1 — Community-useful features

### P1.1 — Add Indigenous Lands & Quilombola Territories overlap layer `[x]`
**Why:** The single most actionable thing the platform can do for affected communities is to show whether a mining claim overlaps a TI (Terra Indígena) or a Quilombola territory. This is the #1 FPIC (Free, Prior and Informed Consent) violation indicator. The data is public: FUNAI publishes TI boundaries, ICMBio/CONAQ publishes Quilombola boundaries.

**Files to create:**
- `public/data/rare-earth/protected-areas.geojson` — Polygon FeatureCollection with simplified boundaries for the major TIs/Quilombos near mining claims. For now, a curated set of 15-20 territories near Poços de Caldas, Araxá, Bambuí, Serra Verde, Jequié, etc. (real coordinates, simplified to < 50 vertices each).
- `lib/protected-areas.ts` — type + `TI_CATEGORIES` and `QUILOMBOLA_CATEGORIES` color codes
- `composables/useRareEarthLayers.ts` — add `addProtectedAreasLayer(map)` function
- `pages/observatory-of-vulcan/index.vue` — add 2 layer toggles in the bottom-left Layers panel

**Data shape (GeoJSON Feature):**
```json
{
  "type": "Feature",
  "properties": {
    "name": "Terra Indígena Xingu",
    "kind": "ti",  // ti | quilombola | conservation_unit
    "category": "indigenous_land",
    "color": "#c0392b",
    "overlap_warning": true,
    "source_url": "https://..."
  },
  "geometry": { "type": "Polygon", "coordinates": [...] }
}
```

**Acceptance criteria:**
- Bottom-left Layers panel has 2 new checkboxes: "Indigenous Lands" and "Quilombola Territories"
- When both layers are visible, claims that overlap show a red border
- Each protected area has a popup with its name, kind, and source URL

---

### P1.2 — Add `ULT_EVENTO` history per claim in popup `[x]`
**Why:** `polygons.geojson` has `ULT_EVENTO` (last event) for each process. This is the timeline of regulatory changes. Currently it's not exposed anywhere. Showing the last event + the year helps users understand if a process is active, dormant, or recently changed.

**Fix:** Extend `buildRareEarthPopupHTML` to include a "Last event" line reading `props.ev` (or `p.ULT_EVENTO` for polygons). Color-code: green if the event is recent (< 1 year), yellow if 1-3 years, red if > 3 years.

**Acceptance criteria:** Polygon popups show "Last event: 418 - CONC LAV/RAL ANO BASE APRESENTADO EM 15/03/2026" with appropriate color.

---

### P1.3 — Add "Verify on ANM" link with processo number `[x]`
**Why:** The `processo` field is the unique ANM identifier. The official lookup URL is `https://geo.anm.gov.br/portal/apps/webappviewer/index.html?id=1d3c4c2b3c8b4f5e8e7c0d9e8f1a2b3c` (or a queryable SIGMINE URL). The HTML prototype had this link. The Vue port lost it.

**Fix:** Build the ANM URL from `processo`:
```
https://app.anm.gov.br/SIGMINE/pesquisa_processo_apresentado.aspx?numero={numero}&ano={ano}
```
Add a small "🔗 Open on ANM" link in the popup footer. Open in new tab.

**Acceptance criteria:** Every popup has a clickable "Verify on ANM" link that goes to the correct URL.

---

### P1.4 — Add "Report new claim / Dispute" form with mailto fallback `[x]`
**Why:** Community monitoring requires bidirectional data flow. A user in Poços de Caldas sees a claim, has ground-truth knowledge ("this area was forest, not phosphate"), and needs a way to submit that knowledge.

**Fix:** Add a "Report" button in the popup footer that opens a `mailto:` link with a pre-filled body:
```
mailto:observatory@earthguardians.org?subject=Claim%20report%20-%20{processo}&body=
Process:%20{processo}
Company:%20{nome}
Lat/Lng:%20{lat},{lng}
Issue:%20[select%20one%20of%20new%20claim%20|%20dispute%20|%20correction%20|%20field%20report]
Notes:%20[textarea]
```

For richer submission, a `<dialog>`-based form that constructs the mailto URL on submit.

**Acceptance criteria:** Every popup has a "Report issue" button. Clicking opens the user's mail client with a pre-filled form.

---

### P1.5 — Add full 437-speculator paginated table `[x]`
**Why:** `deep_analysis.json` has `top_suspicious: [10 entries]` but `suspicious_speculators_count: 437`. The other 427 are in the data but not in the UI. The HTML prototype had a paginated table.

**Fix:** The 437-list isn't actually in `deep_analysis.json` — only top 10. So the fix is to:
- Generate the full list client-side by aggregating `points.geojson` (group by normalized `nome`, compute claims/area/recency/substance count, score, sort desc)
- Render as paginated table in the Danger tab when user clicks "Show all 437"
- 20 per page, sort by score, area, or claims

**Acceptance criteria:** Danger tab has a "Show all 437" button that opens a paginated table.

---

### P1.6 — Add "My territory" pin with note attachment `[x]`
**Why:** Communities in affected areas need a way to mark their territory on the map and attach a note ("This is our community land. We were not consulted about this mining claim."). The note becomes a temporary pin with text. Without backend, the pin is stored in `localStorage` and shared via URL hash.

**Fix:** Add a "My territory" button in the toolbar. When clicked, the next map click drops a red pin with a prompt for a note. The pin is stored in `localStorage` and rendered as a custom MapLibre marker. Sharing via URL: `#pin=-46.57,-21.55&note=...`.

**Acceptance criteria:**
- "My territory" button enables pin-drop mode
- Click on map drops a pin with a note
- Pin persists across page reloads (localStorage)
- Share link via URL hash

---

### P1.7 — Add per-claim overlap indicator with protected areas `[x]`
**Why:** When viewing a claim, the user should know if it overlaps a TI, Quilombola territory, conservation unit, or embargoed area. This is the most important community-relevant signal.

**Fix:** Build a precomputed `claims_with_overlaps.geojson` at build time. For each claim point, check if it's within 50km of any protected area centroid. Add a `overlaps` property: `["ti_xingu", "quilombo_kalunga"]`. In the popup, show a warning if overlaps.length > 0.

**Build step:** Add a `scripts/compute-overlaps.mjs` that does a turf.js point-in-polygon and writes `claims_with_overlaps.geojson`.

**Acceptance criteria:** Popups for claims that overlap protected areas show a red "⚠ Overlaps: TI Xingu" badge.

---

## P2 — Architecture

### P2.1 — Extract Rede Corporativa graph to use a proper layout algorithm
`RedeCorporativa.vue:69-84` uses a simple circular layout. With 16 nodes and 18 edges, this is OK. With more nodes it would be a hairball. A simple force-directed simulation (300 lines) would give a much better story. Out of scope for this batch.

### P2.2 — Cache the in-memory computation of `pointsGJ.features.map(...)` in a `useRareEarthData` composable
Currently `pages/observatory-of-vulcan/index.vue:441-448` re-derives `allFeatures` on every mount. Hoist to a composable with `shallowRef` + lazy-load.

### P2.3 — Add a `<RareEarthMap>` dedicated component for the Observatory
Stop using `<UnifiedMap :default-dataset="'observatory-of-vulcan' :rare-earth-points="points">` and instead use a dedicated `<RareEarthMap>` that has the layer setup built in. UnifiedMap loses the `:rare-earth-*` props.

---

## P3 — Data hooks

### P3.1 — Ingest ANM daily via GitHub Action
The SIGMINE system has a public CSV dump. A nightly workflow can pull the diff and open a PR. The platform can show "Last sync: 2 hours ago".

### P3.2 — Ingest the ANM secrecy list
88 claims under secrecy (105,139 ha) is a feature, not a footnote. Should be its own layer.

### P3.3 — Ingest ICMBio quilombola + FUNAI TI
See P1.1.

### P3.4 — Ingest CAR (Cadastro Ambiental Rural) embargoed areas
Overlap = deforestation = immediate disqualification.

---

# Cross-Cutting Code Review (2026-06-02)

> **Scope:** Full static review of every `.vue` / `.ts` / `.css` file. Focus: memory leaks, performance, re-render hot paths, modularization, design & animation, modernization, accessibility, testing, refactor.
> **Out of scope (preserved above):** Observatory of Vulcan feature work (P0.1–P0.11, P1.1–P1.7, P2, P3) and the `CODEBASE-REVIEW.md` backlog.

## ML — Memory Leaks (top priority)

### ML.1 — `useEnterpriseMarkers.ts` uses module-level singletons (P0 · 1h)
**Location:** `composables/useEnterpriseMarkers.ts:16-18`
**Problem:**
```ts
let mapInstance: MapLibreMap | null = null
let hqMarkers: maplibregl.Marker[] = []
let onHQClick: ((enterprise: EnterpriseHQ) => void) | null = null
```
These survive across mounts. On a 2D → 3D → 2D round trip, `hqMarkers` accumulates, `mapInstance` references the old (possibly destroyed) map, and the `click` listener fires on a stale handler. With `prefetchRegion` running in the background, the enterprise click handler can be re-bound to a non-mounted layer.
**Fix:** Move the state into the composable function so each call site gets its own instance:
```ts
export function useEnterpriseMarkers() {
  const map = ref<MapLibreMap | null>(null)
  const hqMarkers = ref<maplibregl.Marker[]>([])
  const onHQClick = ref<((e: EnterpriseHQ) => void) | null>(null)
  return { map, hqMarkers, onHQClick, setup, cleanup }
}
```
Or, since it's a pure setup/cleanup pair, keep module scope but always null on `cleanupEnterpriseLayer` (currently nulls `mapInstance` but **not** `onHQClick` — also fix).
**Acceptance:** Repeated `setupEnterpriseLayer` + `cleanupEnterpriseLayer` cycles show 0 leaked markers (verify with `chrome://inspect` Heap → "Detached HTMLDivElement" count).

### ML.2 — `useOfflineTiles.ts` registers `online`/`offline` listeners outside `onMounted` (P0 · 30m)
**Location:** `composables/useOfflineTiles.ts:64-65`
**Problem:**
```ts
window.addEventListener('online', () => { isOnline.value = true; ... })
window.addEventListener('offline', () => { isOnline.value = false; ... })
```
The function is called per `useOfflineTiles()` invocation (so a few times in app lifetime), but the listeners are **never removed**. Module-level `dbPromise` is also a global singleton. After 5 map mounts you have 10 listeners updating the same `isOnline` ref.
**Fix:** Move listener registration into a returned `mount()` / `unmount()` pair, and store the bound handler so `removeEventListener` can match. Add `onScopeDispose(() => unbind)` for safety inside Vue lifecycle.
**Acceptance:** Toggling offline in DevTools no longer fires N duplicate `isOnline` writes.

### ML.3 — `useSpeciesData.ts` opens an `indexedDB` connection per call (P1 · 30m)
**Location:** `composables/useSpeciesData.ts` (uses `useSpeciesData` wrappers)
**Problem:** Every call to the data loader opens a fresh `IDBDatabase` connection; the connection is **never** closed (`db.close()`). The browser eventually hits the per-origin connection cap (~50) and starts throwing `QuotaExceededError` on subsequent map reloads.
**Fix:** Mirror the singleton pattern from `useOfflineTiles.ts:26-43` (which already has a `dbPromise` cache) and call `db.close()` on scope dispose. Better: extract a shared `lib/idb.ts` with `getDB(name, version, upgrade, scopeDisposer)`.
**Acceptance:** Open map 50×, no `QuotaExceededError`; close connections on `beforeunload` (debugger-detached count stays 0).

### ML.4 — `useMapHexGrid.ts` redraws full canvas on every resize tick (P0 · 1h)
**Location:** `composables/useMapHexGrid.ts` (referenced by `UnifiedMap.vue:1703-1707` and `GlobeView.vue:1230-1234`)
**Problem:** `hexGridDebounceTimer = setTimeout(..., 200)` triggers a full hex-grid re-build, re-laying out thousands of hex tiles. No `requestAnimationFrame` gating, no `isDrawing` flag, and the timer is never cleared on unmount in some code paths. Calling `setupHexGrid` while a previous one is mid-draw creates a stale canvas reference that the next frame still writes to.
**Fix:**
1. Track `isDrawing` flag and short-circuit re-entrant calls.
2. Wrap redraw in `requestAnimationFrame` with cleanup via `cancelAnimationFrame`.
3. Clear `hexGridDebounceTimer` in the teardown function.
**Acceptance:** Profiler shows one `setupHexGrid` per resize burst (not one per timer fire), and unmount removes all pending timers.

### ML.5 — `useMapConnections.ts` particle RAF loop has no stop signal (P0 · 30m)
**Location:** `composables/useMapConnections.ts` (referenced by `UnifiedMap.vue` particle overlay)
**Problem:** The particle animation uses `requestAnimationFrame`; if `cleanupParticles` is called while a frame is in flight, the next frame still runs, writing to a removed canvas. `addConnections` called rapidly may leak intermediate systems before cleanup completes.
**Fix:** Use a per-instance `cancelled` flag (not a module boolean) that the RAF callback checks at the top, and clear it on the next tick after cleanup.
**Acceptance:** Toggling connections 10× in a second produces no orphaned `requestAnimationFrame` callbacks (verify with Performance panel → "Scripting" timeline flatlines).

### ML.6 — Module-level refs in `useDarkMode.ts` and `useI18n.ts` (P1 · 1h)
**Location:** `composables/useDarkMode.ts` (`isDark` ref at module top), `composables/useI18n.ts:9` (`localeState`, `translationCache`, `failedLocales`)
**Problem:** Module-level refs are shared across all components. The `useDarkMode` `watch` is registered at module load (outside any `onMounted`/`onScopeDispose`), so on Nuxt route changes the watcher never detaches. `useI18n`'s `translationCache` Map grows unbounded — every translated key the user encounters stays in memory for the session.
**Fix:**
1. Use Nuxt `useState('darkMode', () => false)` instead of module ref.
2. Wrap `useI18n` cache in an LRU with `max: 200` (use `lru-cache` dep, or hand-roll a 200-entry Map with eviction on insert).
3. Move watchers inside `onMounted` with explicit teardown.
**Acceptance:** `translationCache.size` ≤ 200 after 1 hour of clicking around; navigating away from `/info` removes the dark-mode watcher (DevTools → Components → no orphan watchers).

### ML.7 — `UnifiedMap.vue:1869` adds `resize` listener, `1921` removes it — but only when hex grid is active (P1 · 20m)
**Location:** `components/UnifiedMap.vue:1869-1921`, `components/GlobeView.vue:1304-1338`
**Problem:** The resize listener is registered inside `setupHexGrid`. If the user toggles hex grid off before unmount, the listener stays attached because removal is in the unmount path. Result: a no-op `debouncedSetupHexGrid` runs on every window resize.
**Fix:** Track listener state with a `hasResizeListener` flag; remove the listener when hex grid is disabled.
**Acceptance:** Disabling hex grid in DevTools (state) → resize event no longer triggers `setupHexGrid`.

### ML.8 — `UnifiedMap.vue:546, 552, 698, 702, 732, 735, …` DOM listeners never detached (P1 · 1h)
**Location:** `components/UnifiedMap.vue:546, 552, 698-702, 732-735, 794-798, 830-834, 1466-1486, 1530-1550`, mirror in `GlobeView.vue:544, 742-746, 776-779, 838-842, 874-878, 1030-1115`
**Problem:** Marker elements get `mouseenter` / `mouseleave` / `click` / `keydown` listeners attached imperatively. When the marker is removed (e.g. dataset switch from `project-grants` → `endangered-species`), the listeners are not detached and the elements become detached-but-kept-alive. Same in `composables/useMapMarkers.ts:89, 94, 149, 165` and `useEnterpriseMarkers.ts:121`.
**Fix:** Wrap each marker creation in a factory that returns `{ el, dispose }`; `dispose` calls `removeEventListener` for every `addEventListener`. Store `dispose` callbacks in the marker array and invoke them in the cleanup function.
**Acceptance:** Switching datasets 10× in a row, Heap snapshot shows 0 detached `HTMLDivElement`s.

### ML.9 — `RedeCorporativa.vue` canvas re-attaches listeners on every visibility toggle (P2 · 20m)
**Location:** `components/RedeCorporativa.vue:243-261`
**Problem:** `onMounted` adds `click`, `mousemove`, `mouseleave` on the canvas; `onUnmounted` removes them. But the `watch(() => props.visible)` at line 239 calls `setTimeout(drawGraph, 50)` with no cleanup — if the modal is closed 30ms after opening, the timer fires after unmount and writes to a destroyed canvas.
**Fix:** Store the timer ID, clear it in `onUnmounted`.
**Acceptance:** Toggling the modal rapidly produces no `Cannot read properties of null (reading 'getContext')` warnings.

### ML.10 — `ui/Tooltip.vue` leaks teleport on `keep-alive` parent (P2 · 15m)
**Location:** `components/ui/Tooltip.vue:140-149`
**Problem:** Uses `<Teleport to="body">` but `window.addEventListener('resize', updatePosition)` and `scroll` are attached on mount and removed on unmount — fine for a 1-shot component, but if used inside a `<KeepAlive>` the listeners attach again on activation but the **first** `removeEventListener` is never called.
**Fix:** Add `onActivated` / `onDeactivated` hooks (or use `onScopeDispose` from `vue`).
**Acceptance:** Tab away and back from `/info` (if it uses tooltip) → DevTools listener count stays constant.

---

## PF — Performance Killers

### PF.1 — Two parallel marker systems: `useMapMarkers` (DOM) + `useGeoJSONMarkers` (GPU) `[~]`
**Location:** `composables/useMapMarkers.ts` (DOM markers) + `composables/useGeoJSONMarkers.ts` (native GeoJSON layers)
**Problem:** The 75-project dataset uses DOM markers; the 4,000+ species dataset switches to GeoJSON clusters at `visibleSpecies.length > 500`. Both code paths are wired in `UnifiedMap.vue`, but the threshold logic is duplicated in `GlobeView.vue`. Two `addLayer` strategies means two different click handlers, two different visibility syncs, two different cluster math (Supercluster vs native).
**Fix:** Unify behind a single `useMapMarkers(map, items, options)` composable that internally picks the strategy based on `items.length`. Drop `Supercluster` dep entirely for the species path.
**Acceptance:** Only one marker code path; removing `supercluster` from `package.json` doesn't break tests.

### PF.2 — Hex-grid redraw blocks main thread for 100ms+ on large zooms `[ ]`
**Location:** `composables/useMapHexGrid.ts`, used in `UnifiedMap.vue:1703-1921`
**Problem:** Canvas 2D re-render of 1,000+ hex tiles is single-threaded and synchronous. With DPR 2, this quadruples the per-tile cost. On an iPhone 12 the hex grid is the single biggest jank source.
**Fix:**
1. Skip redraw if the visible bounding box hasn't changed (track via `map.getBounds()`).
2. Move hex tile generation off the main thread with `OffscreenCanvas` + Worker.
3. Cache the last 5 frames as `ImageBitmap` for instant toggle.
**Acceptance:** Hex grid toggle is < 16ms p95 on Macbook M1.

### PF.3 — Particle animation runs even when off-screen (P1 · 30m)
**Location:** `composables/useMapConnections.ts` (RAF loop)
**Problem:** RAF runs even if the map container is scrolled out of view, hidden behind a modal, or the tab is in the background (browsers throttle, but not stop, RAF in background tabs).
**Fix:** Use `IntersectionObserver` on the map container; pause the RAF when `< 1%` visible. Listen to `document.visibilitychange` and pause on hidden.
**Acceptance:** Opening `<DataDownloadPanel>` (which covers the map) drops CPU usage by 80% in Performance panel.

### PF.4 — `UnifiedMap.vue` re-runs the entire 200-line `addLayers` chain on every filter change (P0 · 2h)
**Location:** `components/UnifiedMap.vue` watchers around filter props
**Problem:** `watch(() => props.filteredProjects, …)` removes and re-adds every layer. For 4,000 species, this re-clusters the Supercluster index from scratch (200ms+) every time a single filter toggles.
**Fix:** Update the source data in place via `map.getSource('species').setData(newGeoJson)` instead of removeLayer + addLayer. Combine debounced filter updates (300ms) with `requestAnimationFrame` batching.
**Acceptance:** Toggling a filter is < 30ms on 4,000 points (was 200ms+).

### PF.5 — `flyToHighlightTimer` is module-level and never cleared (P1 · 10m)
**Location:** `components/UnifiedMap.vue:1377, 1399`
**Problem:**
```ts
let flyToHighlightTimer: ReturnType<typeof setTimeout> | null = null
…
flyToHighlightTimer = setTimeout(() => { … }, 2000)
```
If the user clicks 5 markers in 2s, 5 timers fire in sequence. The variable is also never cleared on unmount.
**Fix:** Use a local `ref<number | null>` instead of module `let`; `clearTimeout` on each new fire and on `onScopeDispose`.
**Acceptance:** Rapid marker clicking produces 1 highlight pulse, not 5.

### PF.6 — `RedeCorporativa.vue:171-188` redraws all edges on every click (P2 · 20m)
**Location:** `components/RedeCorporativa.vue:151-224` (`drawGraph`)
**Problem:** `drawGraph` re-lays out all 18 connections + 16 nodes on every render, even when only `focusedEnterprise` changed.
**Fix:** Split into `layoutGraph()` (cached) + `renderNodes()` + `renderEdges(hoveredEdge, focusedEnterprise)`. Re-render only the changed layer.
**Acceptance:** Clicking a node is < 5ms (was 15ms+).

### PF.7 — CSS `pulse-slow`, `glow`, `float` defined once but used 50+ times with `style="animation-delay"` (P2 · 1h)
**Location:** `assets/css/main.css`, used in `pages/index.vue`, `pages/info.vue`, `components/ProjectFilterPanel.vue`, `components/SpeciesFilterPanel.vue`, `components/RedeCorporativa.vue`
**Problem:** Each animated element sets its own `animation-delay` inline, which means a per-element inline style and no CSS cache locality.
**Fix:** Add staggered variants in `main.css`:
```css
.pulse-slow.stagger-1 { animation-delay: 0.2s }
.pulse-slow.stagger-2 { animation-delay: 0.4s }
…
```
or use the new CSS `nth-child` trick.
**Acceptance:** Grep `style="animation-delay"` returns 0 in `.vue` files (only `.stagger-N` classes remain).

### PF.8 — `composables/useMapPopup.ts` is not bundled (only used by the deprecated `MaplibreglPopup` path) `[ ]`
**Location:** `composables/useMapPopup.ts`
**Problem:** Most popups use the fullscreen-overlay path, but the file is still imported. Adds ~3KB to the bundle.
**Fix:** Either delete (if no caller) or rename to `useLegacyPopup.ts` and lazy-load via `defineAsyncComponent` only on routes that use the legacy path.
**Acceptance:** Bundle analyzer shows `useMapPopup` is in a chunk that loads only on `MaplibreglPopup` routes.

---

## RR — Re-render Hotspots

### RR.1 — `dangerData` (lines 406-422) is a `const` outside the component, so changing `allFeatures` doesn't re-rank (P0 · 1h)
**Location:** `pages/observatory-of-vulcan/index.vue:406-422` (already addressed in P0.5)
**Problem:** `categoryStats` is a `computed` over `allFeatures`, but `dangerData` is a static array of 16 objects. Changing the filter doesn't update the Danger tab.
**Fix:** Replace with `computed(() => getTopDangerEnterprises(allFeatures, deepAnalysis, 20))`.
**Acceptance:** Changing the year filter updates the Danger tab rankings live.

### RR.2 — `panelContent` is one giant `computed` re-runs the entire HTML on every tab switch (P1 · 1h)
**Location:** `pages/observatory-of-vulcan/index.vue:225-235`
**Problem:** `panelContent` returns the full HTML string for the active tab; when `activeTab` changes, all 6 branches re-evaluate (because they're inside the `switch` but the whole computed re-runs). Combined with `v-html`, every change re-parses and re-injects a large HTML blob.
**Fix:** Make 6 separate `computed`s (one per tab) and use a `<component :is>` selector in template. Or convert to sub-components (P0.6).
**Acceptance:** Switching tabs is O(1) for the new tab, not O(6).

### RR.3 — `useMapCluster.ts` recreates the Supercluster index on every add (P0 · 1h)
**Location:** `composables/useMapCluster.ts`
**Problem:** `cluster.load(points)` runs O(N log N) on each rebuild. For 4,000 species, this is 100ms+ on first load and again on every filter change.
**Fix:** Use `index.add()` to incrementally add points, or use a debounced `setData` that loads only diff. For 500+ items, fall back to MapLibre native clustering (see PF.1).
**Acceptance:** Initial cluster load < 50ms for 4,000 points.

### RR.4 — `layouts/default.vue:362-401` dock magnification re-walks 4 items on every hover (P2 · 10m)
**Location:** `layouts/default.vue:374-393`
**Problem:** `onDockHover(index)` creates a new array and updates `itemSizes.value` on every mouse enter/leave, triggering 4 child re-renders even though only 1–2 sizes change.
**Fix:** Use `shallowRef` + a Map keyed by index. Or, simpler, set the `style` directly on the DOM in a `ref` callback and skip Vue reactivity entirely (this is a hover effect, not state).
**Acceptance:** DevTools Performance → no Vue update cycle for the dock on hover.

### RR.5 — `layouts/default.vue:363` `dockItemRefs = new Map<number, Element>()` is recreated on every render (P2 · 10m)
**Location:** `layouts/default.vue:363`
**Problem:** A new `Map` is created on every component instance, never `markRaw`'d. Vue tries to make it reactive (it isn't a ref, so this is fine, but the `:ref` callback in the template can fire dozens of times during transitions and grow the Map).
**Fix:** `const dockItemRefs = shallowRef(new Map())` and replace the Map in `onBeforeUnmount`.
**Acceptance:** Hover-storm test (move mouse over dock 100×) shows Map size stabilizes at 4.

### RR.6 — `components/Icon.vue` re-imports `iconify-icon` on every parent render (P2 · 10m)
**Location:** `components/Icon.vue`
**Problem:** Renders `<iconify-icon>` via a web component. The web component re-registers the custom element on every parent re-render that includes the icon.
**Fix:** Cache the `customElements.define` call with a `WeakSet` keyed on the tag name, or pre-register all icons used in the layout (see `plugins/iconify-icon.client.ts` — only `svg-spinners` is pre-registered; add `lucide` and `game-icons`).
**Acceptance:** Lighthouse "Avoid an excessive DOM size" stays under 1,500 nodes after 10 re-renders.

### RR.7 — `RedeCorporativa.vue:240-241` `setTimeout(drawGraph, 50)` is inside a `watch`, fires on every `visible` change (P2 · 5m)
**Location:** `components/RedeCorporativa.vue:239-241`
**Problem:** If the modal opens and closes 10× in 500ms, 10 timers fire after unmount. Already noted in ML.9.
**Fix:** `clearTimeout` on every fire and on unmount.

---

## MO — Modularization / Composable Extraction

### MO.1 — Split `UnifiedMap.vue` (2,813 lines) and `GlobeView.vue` (1,342 lines) into sub-components (P0 · 1 day)
**Why:** Both are monolithic. After P0.1 (`useRareEarthLayers`), the remaining bulk is:
- Map lifecycle (`initMap`, `setupLayers`, `cleanupMap`)
- Markers (`rebuildMarkers`, `updateMarkerVisibility`)
- Connections & particles (`addConnections`, `startParticles`, `cleanupParticles`)
- Hex grid (`setupHexGrid`, `debouncedSetupHexGrid`)
- Popups (`showFullscreenPopup` + state)
- Effects (background, gradient, scanlines)
- Filter / search / layer state

**Target structure:**
```
components/map/
  MapCore.vue          # container, init, cleanup
  MarkerLayer.vue      # markers + clustering
  ConnectionLayer.vue  # connection lines + particles
  HexGridOverlay.vue   # canvas
  PopupOverlay.vue     # fullscreen popup
  BackgroundEffects.vue
composables/
  useMapCore.ts        # init/teardown
  useMarkerLayer.ts    # re-export of useMapMarkers + useGeoJSONMarkers under one API
  useConnectionLayer.ts
  useHexGridOverlay.ts
  usePopupOverlay.ts
  useBackgroundEffects.ts
```

**Acceptance:** `UnifiedMap.vue` < 400 lines, `GlobeView.vue` < 300 lines, both delegate to the new composables; `pnpm build` produces equivalent `dist/`.

### MO.2 — Extract `lib/map-utils.ts` (currently 332 lines) into focused modules (P1 · 2h)
- `lib/geo-utils.ts` — `latLngToScreen`, `getCentroid`, `bezierPoint`, `isInBrazil`
- `lib/html-utils.ts` — `escapeHtml`, `formatCompact`
- `lib/popup-builders.ts` — `buildProjectPopupHTML`, `buildSpeciesPopupHTML`, `buildRareEarthPopupHTML`
- `lib/category-styles.ts` — `RARE_EARTH_CATEGORIES`, `TAXONOMIC_GROUP_COLORS`, `getCategoryColor`

**Acceptance:** Grep `from '@/lib/map-utils'` returns 0 in components; each sub-module has < 150 lines.

### MO.3 — Extract `lib/image-utils.ts` (255 lines) into 3 modules (P1 · 2h)
- `lib/placeholder-svgs.ts` — static SVG strings
- `lib/image-cache.ts` — LRU cache + fetch + decoding
- `lib/marker-images.ts` — marker-specific assembly

### MO.4 — Create `useEnterpriseData` composable (P1 · 1h)
Currently `composables/useEnterpriseMarkers.ts:103-129` creates DOM markers imperatively inside `setupEnterpriseLayer`. Pull this into a `useEnterpriseData()` composable that returns `enterprises`, `connections`, and a `flyTo(enterprise)` action. Pages consume the composable; `useEnterpriseMarkers` is purely the map-layer adapter.

### MO.5 — Create `useRareEarthData` composable (P1 · 1h)
`pages/observatory-of-vulcan/index.vue:441-448` does feature normalization in `onMounted`. Hoist to `composables/useRareEarthData.ts` with `shallowRef` for `allFeatures`, lazy `load()`, and `getTopDangerEnterprises()` (P0.5).

### MO.6 — Replace the singleton in `useMapLibre.ts` with `useState` (P1 · 30m)
**Location:** `composables/useMapLibre.ts:1-30` (the `tileCache` Map at module scope)
**Problem:** `tileCache` is a `Map<string, Response>` capped at 500 via `trimTileCache`. It grows per route and is never cleared on navigation.
**Fix:** Wrap in `useState('map-tile-cache', () => new LRU(500))`; clear in `onScopeDispose`.

### MO.7 — Unify `useMapCluster.ts` and `useGeoJSONMarkers.ts` API surface (P1 · 2h)
The two clustering strategies expose different methods (`cluster(points, bbox, zoom)` vs `addClusterSource(id, data, options)`). Consumers shouldn't care.
**Fix:** Single `useMapClusters(map, options)` that picks one based on `data.length`.

---

## DA — Design & Animation Modernization

### DA.1 — Define a unified motion-token system (P1 · 2h)
**Problem:** Animation durations and easings are scattered:
- `assets/css/main.css` defines `pulse-slow`, `glow`, `float`
- Inline `transition: all 0.2s` in 50+ component-scoped styles
- `tailwind.config.ts` has `transitionDuration`, `transitionTimingFunction` extensions but they're not used
- Vue `<Transition>` uses 0.3s, 0.2s, 0.15s, 0.25s inconsistently

**Fix:** Add to `tailwind.config.ts`:
```ts
theme: {
  transitionDuration: { DEFAULT: '150ms', fast: '100ms', slow: '300ms' },
  transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)' }
}
```
And CSS variables in `main.css`:
```css
:root {
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
```
Replace all `transition: all Xs` with `transition: [transform, opacity, background-color] var(--duration-base) var(--ease-out-soft)`.
**Acceptance:** Grep `transition: all` returns 0 in `.vue` files.

### DA.2 — Centralize the `cyber-*` color tokens (P1 · 1h)
**Problem:** `tailwind.config.ts` defines `cyber-*` colors but pages use raw `cyan-400`, `red-600`, `bg-zinc-950`. `tailwind.config.ts` extends the palette to ~20 colors that nothing uses.
**Fix:**
1. Audit which colors are actually used (run a counter on `class="…"`).
2. Either: a) keep `cyber-*` and add a codemod to swap, or b) remove `cyber-*` and document the deprecation.
3. Standardize on Tailwind's palette but with custom shades in `tailwind.config.ts` for the brand colors (`cyan: { 400: '#22d3ee' }` is the only override needed).
**Acceptance:** `tailwind.config.ts` `theme.extend.colors` ≤ 12 entries.

### DA.3 — Use `Icon` component consistently (P1 · 1h)
**Problem:** Some places use `<Icon name="lucide:x" />`, others use raw SVGs inline (e.g. `components/DataDownloadPanel.vue:38`, `components/RedeCorporativa.vue:34` uses `📍` emoji).
**Fix:** Convert all inline SVGs to `<Icon name="…">`; convert emoji icons that have Lucide equivalents (`📍` → `lucide:map-pin`, `🔗` → `lucide:link`, `🌊` → `lucide:waves`, `🔬` → `lucide:microscope`).
**Acceptance:** Grep `<svg ` returns 0 in `.vue` files.

### DA.4 — Replace the `red-400`/`red-600` ad-hoc color combo with semantic tokens (P2 · 1h)
The Observatory page uses `#e74c3c`, `#c0392b`, `#f39c12`, `#27ae60` (and many variations). Add semantic tokens:
```css
--color-danger: #e74c3c;
--color-warning: #f39c12;
--color-info: #3498db;
--color-safe: #27ae60;
--color-foreign: #9b59b6;
```
**Acceptance:** Grep `#e74c3c` returns 0 in `.vue` (only `lib/colors.ts` has the constant).

### DA.5 — Skeleton loading for all data pages (P1 · 1h)
**Problem:** `pages/index.vue` flashes before content; `<LoadingSpinner>` is the only fallback and shows a spinner, not a skeleton.
**Fix:** Add `<SkeletonMap />` and `<SkeletonPanel />` primitives in `components/ui/`. Use them in the route fallback for `/observatory-of-vulcan`, `/project-grants`, `/endangered-species`.
**Acceptance:** Lighthouse "Cumulative Layout Shift" < 0.05 on all routes.

### DA.6 — Refine the dock magnification physics (P2 · 2h)
**Problem:** `layouts/default.vue:374-393` uses discrete `baseSize → neighborSize → maxSize` jumps. Feels mechanical.
**Fix:** Use a smooth ease curve: `size = base + (max - base) * exp(-distance^2 / 2σ^2)` with `σ = 1.2`. Render via `style.width` directly (no Vue update cycle) using a `ref` callback.
**Acceptance:** Visual review only.

### DA.7 — Add focus-trap and `prefers-reduced-motion` to all modals (P1 · 1h)
**Problem:** `RedeCorporativa.vue`, `GeoPoliticalTimeline.vue`, `DataDownloadPanel.vue` have no focus trap and ignore `prefers-reduced-motion` for the entrance transition.
**Fix:** Extract `<ModalBase>` with `useFocusTrap()` and a `useReducedMotion()` short-circuit on the `<Transition>`.
**Acceptance:** Tab key inside any modal cycles only within the modal; `prefers-reduced-motion: reduce` skips the entrance animation.

### DA.8 — Add page-transition animation on route change (P2 · 1h)
**Problem:** Route changes are abrupt.
**Fix:** Wrap `<NuxtPage>` in `<Transition name="page">` with a fade + slight Y shift, gated by `prefers-reduced-motion`.

---

## MN — Modernization

### MN.1 — Adopt Pinia for cross-component state (P1 · 3h)
**Files:** new `stores/{map,filters,ui,preferences}.ts`
**Why:** Filter state resets on 2D→3D switch; locale and dark-mode currently use module-level refs (ML.6); map state (zoom, center, active dataset) is component-local and lost on navigation.
**Migration:**
1. Move `useDarkMode`'s `isDark` to `usePreferencesStore().isDark`.
2. Move locale to `usePreferencesStore().locale`.
3. Move map state to `useMapStore()`: `{ activeDataset, zoom, center, showConnections, showHexGrid }`.
4. Move filter state to `useFiltersStore()`: `{ species: { group, ecosystem, region, search }, projects: { country, beneficiaries } }`.
**Acceptance:** Toggling 2D/3D preserves filter state; dark-mode preference persists via `localStorage` in the store.

### MN.2 — Replace custom i18n with `@nuxtjs/i18n` (P2 · 1 day)
**Why:** `composables/useI18n.ts` is 870 lines, supports only `{key}` interpolation (no ICU), no lazy loading, no SSR-safe locale routing.
**Fix:**
1. Install `@nuxtjs/i18n`.
2. Move `locales/*.json` to a single source of truth (already there).
3. Use `useI18n()` from `vue-i18n` in components.
4. Enable `lazy: true` and `langDir: 'locales/'` for code splitting.
**Acceptance:** Bundle size of non-default-locale routes is reduced by ~50KB; new locales can be added without re-deploy.

### MN.3 — Enable `typeCheck: true` in `nuxt.config.ts` (P0 · 5m)
**Location:** `nuxt.config.ts:67` (per `CODEBASE-REVIEW.md`)
**Problem:** `typeCheck: false` means TS errors don't block the build.
**Fix:** `typeCheck: true` and `nuxi typecheck` in CI.

### MN.4 — Add ESLint + Prettier (P1 · 1h)
Already a partial setup (`@nuxt/eslint`, `eslint` in devDeps, `lint` script in `package.json:12`, `patch-eslint-flat-config.mjs`). Need to:
- Run `pnpm lint` and fix all violations
- Add `lint:fix` script
- Add `prettier` + `.prettierrc` with `singleQuote: true, trailingComma: 'all'`
- Add `format` script + pre-commit hook
**Acceptance:** `pnpm lint && pnpm format` exits 0 on the entire repo.

### MN.5 — Replace `getMarkerPlaceholder` SVG with composable (P2 · 1h)
**Location:** `lib/image-utils.ts:29`
**Problem:** `getMarkerPlaceholder(group)` builds a `data:image/svg+xml` URL with template-string injection. If a `group.name` ever comes from user input, this is XSS.
**Fix:** Encode via `encodeURIComponent` (already done) and add a test for hostile inputs.

### MN.6 — Use the modern `useId()` from Vue 3.5 for ARIA ids (P2 · 30m)
**Problem:** Static `id="…"` strings in modals break when 2 modals mount.
**Fix:** `const id = useId()` in each modal component; pass to `aria-labelledby` / `aria-describedby`.

### MN.7 — Use `shallowRef` for big GeoJSON collections (P0 · 30m)
**Problem:** `pages/observatory-of-vulcan/index.vue:181-182` uses `ref<GeoJSON.FeatureCollection>` for 8.5MB+14.6MB of data. Vue's deep reactivity walks every feature on assignment.
**Fix:** `const pointsData = shallowRef<GeoJSON.FeatureCollection | undefined>(undefined)`.

### MN.8 — Add service-worker / PWA for offline tile caching (P3 · 1 day)
**Why:** MapTiler requires network. Service-worker with a stale-while-revalidate strategy for tile URLs would let the platform work offline in low-connectivity areas (key for field researchers and communities).
**Fix:** Add `@vite-pwa/nuxt` module; cache `/tiles/`, `/data/`, `*.geojson` with `workbox.strategies.StaleWhileRevalidate`.

---

## AC — Accessibility

### AC.1 — Map markers are not announced to screen readers (P0 · 1h)
**Location:** `composables/useMapMarkers.ts:79-167`, `composables/useEnterpriseMarkers.ts:103-129`
**Problem:** Markers are `<div>` elements; screen readers see them as decorative.
**Fix:**
```ts
el.setAttribute('role', 'button')
el.setAttribute('tabindex', '0')
el.setAttribute('aria-label', `${species.commonName} (${species.taxonomicGroup})`)
el.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
})
```
**Acceptance:** VoiceOver / NVDA reads marker name + group on focus; Enter opens popup.

### AC.2 — Fullscreen popups have no focus trap (P0 · 1h)
**Location:** `UnifiedMap.vue` (fullscreen popup), `RedeCorporativa.vue`, `GeoPoliticalTimeline.vue`, `DataDownloadPanel.vue`
**Problem:** Tab key can leave the modal and focus the map behind it.
**Fix:** Extract `<FocusTrap>` primitive in `components/ui/` using the `focus-trap` package or hand-rolled (next focusable + shift+tab on first).
**Acceptance:** Tab cycles within the modal; Esc closes the modal.

### AC.3 — No `aria-live` for filter count updates (P1 · 30m)
**Location:** `pages/observatory-of-vulcan/index.vue:43` (`{{ totalCount }} total`)
**Fix:** Wrap the count in `<span aria-live="polite" aria-atomic="true">`.
**Acceptance:** VoiceOver announces "4213 total" after filter change.

### AC.4 — No skip-to-content link (P1 · 15m)
**Fix:** Add `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to map</a>` in `app.vue`.

### AC.5 — Color contrast check (P1 · 1h)
**Problem:** `--text-muted: #737373` on `bg-zinc-950` (#09090b) gives contrast ratio 4.6:1 (borderline AA for normal text, fail for small text).
**Fix:** Bump to `#a3a3a3` (6.0:1) for AA, `#d4d4d4` (10.8:1) for AAA. Use `color-mix()` or a `tokens.json` to enforce.

### AC.6 — Decorative elements should be `aria-hidden` (P2 · 30m)
**Location:** `<canvas>` (hex grid), `<canvas>` (particles), star-field backgrounds, scanlines
**Fix:** `aria-hidden="true"` on all decorative canvas + div elements.

---

## TE — Testing

### TE.1 — No unit tests (P0 · 2h setup + 1h per file)
**Problem:** Zero `tests/unit/` files; `pnpm test` runs `vitest run` but there are no tests.
**Setup:**
1. `vitest.config.ts` with `@nuxt/test-utils` env
2. `tests/unit/lib/` for `lib/` modules (`colors.test.ts`, `map-utils.test.ts`, `image-utils.test.ts`)
3. `tests/unit/composables/` for `useDarkMode`, `useI18n`, `useMediaQuery`
4. `tests/unit/components/` for `ui/Button`, `ui/Input`, `ui/Tooltip`

**Critical test cases:**
- `lib/image-utils.ts:29` — `getMarkerPlaceholder` with hostile input does not inject script
- `lib/map-utils.ts:107` — `escapeHtml` round-trips `<script>alert(1)</script>` to inert text
- `composables/useI18n.ts` — `t('nonexistent.key')` falls back to key (not `undefined`)
- `composables/useMapCluster.ts` — cluster at zoom 0 has 1 cluster for 100 points, expands correctly

**Acceptance:** `pnpm test` exits 0; coverage report on `lib/` ≥ 80%.

### TE.2 — No E2E test for the Observatory (P1 · 2h)
**Problem:** `tests/routes.spec.ts` only tests the 2D project-grants route.
**Fix:** Add `tests/observatory.spec.ts`:
- `/observatory-of-vulcan` loads without console errors
- Clicking a point opens a popup with the correct name
- Toggling hex grid works
- 2D/3D toggle works
- All 6 tabs render
- Modals (Timeline, Rede Corporativa, Download) open and close

### TE.3 — Add visual regression for the home page (P2 · 2h)
Playwright `await expect(page).toHaveScreenshot('home.png', { maxDiffPixels: 50 })` in dark + light mode.

### TE.4 — Add a perf-budget assertion (P2 · 1h)
`expect(metrics.largestContentfulPaint).toBeLessThan(2500)` on each route.

---

## RF — Refactor & Code Quality

### RF.1 — `formatCompact()` duplicated in 3 files (P2 · 10m)
**Location:** `pages/index.vue:132`, `pages/info.vue:232`, `lib/utils.ts` (existing export)
**Fix:** Import from `lib/utils.ts` everywhere; delete the local copies.

### RF.2 — Inline `style="animation-delay:..."` in 50+ places (P2 · see DA.1)
See DA.1.

### RF.3 — `&times;` used in 5 modal close buttons instead of `<Icon name="lucide:x" />` (P2 · 15m)
**Location:** `RedeCorporativa.vue:11`, `DataDownloadPanel.vue:11`, `GeoPoliticalTimeline.vue:5`, `UnifiedMap.vue` (fullscreen popup), `GlobeView.vue`
**Fix:** Replace with `<Icon name="lucide:x" />` for consistency.

### RF.4 — Hardcoded `baseURL` instead of `useRuntimeConfig().app.baseURL` (P2 · 30m)
**Problem:** `pages/observatory-of-vulcan/index.vue:173` uses `useRuntimeConfig().app.baseURL` correctly, but `pages/index.vue` and `pages/info.vue` may not. Audit and fix.
**Acceptance:** `grep "data/"` returns paths prefixed with `useRuntimeConfig` everywhere.

### RF.5 — `globe.vue` is a 14-line redirect that renders a loading spinner it then abandons (P2 · 5m)
**Location:** `pages/globe.vue:14` — `navigateTo('/project-grants/3d')` runs in `<script setup>` top level.
**Fix:** Set `redirect: '/project-grants/3d'` in `<script setup>` and remove the template entirely (or remove the page and configure in `nuxt.config.ts` `routeRules`).

### RF.6 — `keepPopupFullyVisible` computes an offset but never applies it (P0 · 10m)
**Location:** `components/UnifiedMap.vue:408-411`
**Fix:** Apply the calculated `topOffset` / `leftOffset` to the popup element.

### RF.7 — Module-level `let hexGridDebounceTimer` in `UnifiedMap.vue` (P1 · 10m)
**Location:** `components/UnifiedMap.vue:1703, 1707`
**Problem:** Same singleton-leak pattern as ML.6.
**Fix:** Move into `setupHexGrid` closure or a `ref<number | null>` on the component.

### RF.8 — `MaplibreglPopup` close button has `top`/`right` in CSS + `padding` from JS (P2 · 15m)
**Location:** `lib/map-effects.ts` (per `CODEBASE-REVIEW.md`)
**Fix:** Use one source of truth (CSS only); remove JS-applied padding.

### RF.9 — Hardcoded emoji in modal CTAs (P3 · 30m)
**Location:** `components/GeoPoliticalTimeline.vue:147, 151, 155, 161, 165, 169, 173` (🌍, 🇧🇷, 👥, ♻️, 🔬, ✊)
**Problem:** Emojis render inconsistently across OSes; not translatable.
**Fix:** Use `<Icon name="lucide:globe">` etc. (see DA.3).

### RF.10 — Two `<style scoped>` blocks in `SpeciesFilterPanel.vue` (P2 · 5m)
Merge them.

### RF.11 — `SpeciesFilterPanel.vue:186-216` filter count rendered as a static `{{ items.length }}` (P2 · 10m)
**Problem:** Doesn't update when filters change.
**Fix:** `computed` over the active filtered list.

### RF.12 — `components/Icon.vue` has 3 internal refs that all share the same name (P2 · 5m)
Audit and rename.

### RF.13 — `<style scoped>` in `pages/observatory-of-vulcan/index.vue` is large and inlined (P2 · 30m)
Extract to `assets/css/observatory.css` or per-component sub-styles.

### RF.14 — Inconsistent `import maplibregl from 'maplibre-gl'` vs `import type maplibregl from 'maplibre-gl'` (P2 · 15m)
**Location:** `composables/useEnterpriseMarkers.ts:1-2`, `composables/useMapLibre.ts`
**Problem:** `useEnterpriseMarkers.ts` imports both the value and the type from the same module.
**Fix:** Two separate `import` statements: one `import type` (erased at runtime) and one `import` for the value (kept in the bundle).

### RF.15 — `pages/index.vue` and `pages/info.vue` duplicate the "stats" hero structure (P2 · 1h)
Extract `<HeroSection :title :subtitle :stats />` and consume from both pages.

### RF.16 — `dataBubble.vue:375` long line, hard to read (P3 · 5m)
Reflow.

---

## Implementation order (proposed for next session)

1. **P0 (cross-cutting):** ML.1 → ML.5 → ML.8 → MN.3 (typeCheck) → MN.7 (shallowRef) → PF.4 → PF.5 → RR.1 → RR.3 → AC.1 → AC.2 → RF.6 → RF.7
2. **P1:** MN.1 (Pinia) → DA.1 (motion tokens) → DA.3 (Icon component) → DA.5 (skeletons) → DA.7 (focus trap) → MO.1 (split map components) → MO.2 (split map-utils) → TE.1 (Vitest setup) → AC.3-6
3. **P2:** DA.2 (color tokens) → DA.4 (semantic colors) → DA.6 (dock physics) → DA.8 (page transitions) → MN.2 (@nuxtjs/i18n) → MN.4 (ESLint+Prettier) → MN.5-6 → MO.3-7 → PF.1-3, PF.6-8 → RR.2, RR.4-7 → TE.2-4 → RF.1-16
4. **P3:** MN.8 (PWA / service worker)

---

## Quick Wins (< 30 minutes each)

| Task | File | Effort | Impact |
|------|------|--------|--------|
| RF.1 dedupe `formatCompact` | `pages/index.vue:132`, `pages/info.vue:232` | 5m | DRY |
| RF.6 apply popup offset | `UnifiedMap.vue:408` | 10m | UX |
| RF.10 merge style blocks | `SpeciesFilterPanel.vue` | 5m | DRY |
| RF.5 fix `globe.vue` redirect | `pages/globe.vue:14` | 5m | UX |
| MN.3 enable `typeCheck` | `nuxt.config.ts:67` | 5m | Build |
| AC.4 skip-to-content link | `app.vue` | 15m | A11y |
| MN.7 `shallowRef` GeoJSON | `pages/observatory-of-vulcan/index.vue:181-182` | 30m | Perf |
| ML.2 move online/offline listeners | `useOfflineTiles.ts:64-65` | 30m | Memory |
| ML.5 add `cancelled` flag to particles | `useMapConnections.ts` | 30m | Memory |
| RF.14 split type/value imports | `useEnterpriseMarkers.ts:1-2` | 15m | Bundle |

---

*Last updated: 2026-06-02*
