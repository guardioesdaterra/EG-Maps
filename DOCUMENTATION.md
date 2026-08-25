# EG-Maps — Full Codebase Documentation

> **Package:** `centralized-maps`
> **Stack:** Nuxt 3 (SSG), Vue 3 (Composition API), TypeScript, MapLibre GL, Tailwind CSS, Pinia, Vue-i18n, Supabase
> **Deployment:** GitHub Pages (static prerender via `nuxt generate`)
> **Source:** ~21,000 LOC across `pages/`, `components/`, `composables/`, `lib/`, `plugins/`, `scripts/`, `tests/`
> **Locales:** 16 (en, es, fr, pt, ar, hi, ja, zh, nl, de, it, ko, pl, ru, sv, tr)

This document consolidates architecture, module-by-module reference, data flow, conventions, deployed semantics, and known seams. It complements the existing review docs (`CODEBASE-REVIEW.md`, `audit.md`, `PHILOSOPHY-LIMITATIONS.md`, `SUPABASE-ARCHITECTURE.md`) — see those for phase-by-phase history and roadmap.

---

## 1. High-level architecture

```
Browser → MapTiler Tiles (satellite imagery, JWT in URL)
        → Supabase (grants, crew sync, auth, observatory pins)
        → Static JSON in /public/data (species, regions, rare-earth, cultural agents)
        → Wikimedia Commons (species images, URL-constructed not embedded)
```

EG-Maps is a **static-generated Nuxt 3 SPA**. `nuxt.config.ts` enables `ssr: true` plus full prerender (`/**` routeRule + `nitro.prerender.routes`). The 5 dynamic pages (`/endangered-species{,/3d}`, `/project-grants{,/3d}`, `/active-crews{,/3d}`, `/vulcan-observatory{,/3d}`, plus iframe/index/info/callback/eg-grants) bypass prerender because they need live map + state.

### Process map

- **Build:** `pnpm build` → `nuxt build` (full build)
- **Generate (deploy):** `pnpm generate` → `nuxt generate` writes `./dist/` for GitHub Pages push.
- **Dev:** `pnpm dev` → `nuxt dev` (HMR via ws://localhost).
- **Test:** `pnpm test` → `vitest run`; `pnpm test:e2e` (Playwright `playwright.config.ts`).
- **Lint:** `pnpm lint` → `eslint .`. Format is Prettier (`.prettierrc`), no enforced Prettier run.
- **Supabase deploy:** `npm run supabase:deploy` (defined in `package.json`) iterates `crew-sync`, `is-manager`, `grants`, `crews-create`, `register-pin`.
- **Auto-deploy (CI):** `.github/workflows/deploy.yml` (Node 22, pnpm 10.12.0) deploys on push to `main` and `develop`, every 2 hours, and `workflow_dispatch`.

### Manual chunking (`nuxt.config.ts:131-150`)

`manualChunks` in Vite splits the production bundle into predictable chunks:

| Chunk | Contents |
|-------|----------|
| `maplibre` | `maplibre-gl` (heavy, ~250 KB gz) |
| `vendor` | `vue`, `vue-router` |
| `species` | `useSpeciesData`, `useSpeciesPanel`, `useSpeciesIcons` |
| `mapCore` | `useMapBase`, `useMapCore` |
| `mapUi` | `MapControls`, `SpeciesFilterPanel`, `ProjectFilterPanel`, `DataBubble`, `SpeciesPanel` |

`chunkSizeWarningLimit: 600` (KB) — MapLibre chunk will warn but is intentionally allowed.

---

## 2. Directory layout

```
EG-Maps/
├── app.vue                       # Root: skip-link, layout, page transition, Plausible
├── error.vue                     # 404/global error UI
├── pages/                        # File-based routing
│   ├── index.vue                 # /
│   ├── info.vue                  # /info
│   ├── globe.vue                 # /globe → 301 redirect to /project-grants/3d
│   ├── iframe.vue                # /iframe (embed)
│   ├── auth/callback.vue         # /auth/callback (OAuth landing)
│   ├── eg-grants/                # /eg-grants/index, /eg-grants/fullscreen
│   ├── project-grants/{index,3d}.vue
│   ├── endangered-species/{index,3d}.vue
│   ├── active-crews/{index,3d}.vue
│   └── vulcan-observatory/{index,3d}.vue
├── layouts/default.vue           # Header, dock nav, lang/import buttons, theme toggle
├── components/                   # 30+ components grouped by domain
│   ├── ui/                       # 8 reusable primitives (Button, Input, Sheet, Tooltip, Skeleton…)
│   ├── map/                      # CrewPopup, ProjectPopup, SpeciesPopup (used inside MapLibre)
│   ├── grants/                   # Grants dashboard + 10 modals
│   └── observatory/              # 13 panels / modals / tabs / shortcuts
├── composables/                  # 32+ composables (see §3)
├── lib/                          # Pure modules, no Vue deps
│   ├── supabase.ts               # Client factory
│   ├── types.ts                  # All interfaces (ProjectData, Species, RareEarthClaim, etc.)
│   ├── constants.ts              # Routes, dataset keys, quality presets, hex-grid tuning, marker limits
│   ├── colors.ts                 # Color helpers per taxonomic group
│   ├── map-utils.ts              # Popup HTML builders, GEO helpers, escape, groupColors
│   ├── map-export.ts             # Image / data export helpers
│   ├── map-effects.ts            # Particle/connection tuning
│   ├── image-utils.ts            # Cache/queue for marker images + placeholder SVGs
│   ├── utils.ts                  # formatCompact, debounce, throttle, escapeHtml, cn
│   ├── species-utils.ts          # findSpeciesAtCoord, image-url builders
│   ├── parsers/                  # csv, geojson, kml, kmz importers
│   ├── observatory-tabs.ts       # Static tab config
│   ├── observatory-timeline.ts   # Year slider ticks
│   ├── observatory-analysis.ts   # Overlap + danger-score math
│   ├── crew-data.ts              # Static crew registry (~131 crews, source of truth for /active-crews)
│   ├── enterprise-data.ts        # Static mining company/corporate group data
│   ├── rare-earth-geo-data.ts    # Static Brazilian rare-earth mining traces
│   ├── brazilian-cities.ts       # Geocoding hints
│   └── game-icons-map.ts         # Taxonomic icon -> game-icons.org id map
├── plugins/                      # client-only
│   ├── iconify-icon.client.ts    # Registers <iconify-icon>
│   ├── command-palette.client.ts # Cmd-K palette
│   └── ui-init.client.ts         # Theme restore + global init
├── stores/                       # Pinia: ui.ts (locale), map.ts
├── locales/                      # 16 JSON files (vue-i18n)
├── tests/                        # Vitest unit + Playwright E2E
├── scripts/                      # Node CLI helpers, dataset builders, tile downloader
├── types/database.types.ts        # Supabase generated types
└── docs/                         # ARCHITECTURE.md, API.md, DATABASE.md, CONTRIBUTING.md
```

---

## 3. Composables — single-source index

| File | Purpose | Side effects |
|------|---------|--------------|
| `useSupabase.ts` | Singleton Supabase client, auth state, sessionReady | Global `currentUser` ref; subscription cleaned in `onUnmounted` |
| `useSupabaseAuth.ts` | Sign-in/out, Google OAuth callback URL, manager check via edge function | `isManager` derived from `is-manager` edge function |
| `useI18n.ts` | Wraps Vue-i18n's `$t` with EN fallback + interpolation | Reads Pinia `ui.locale`; mirrors changes back |
| `useDarkMode.ts` | `<html class="dark">` toggle + localStorage `darkMode` | Boot script in `nuxt.config.ts head.script` sets it pre-hydration |
| `useMediaQuery.ts` | Reactive media query | `matchMedia` listener |
| `useAdaptiveQuality.ts` | Auto-selects quality preset (low/med/high/ultra) | Tiles, dprCap, particle count |
| `useMapBase.ts` | Shared MapLibre init, cleanup, marker rebuild, overlay wiring | The single largest composable (~700 LOC) |
| `useMapCore.ts` (alt) | Alternate map init path (smaller) | Less used |
| `useMapMarker.ts` | Single source/layer CRUD + DOM/GeoJSON markers | Cluster/color palettes per dataset |
| `useMapConnections.ts` | Bezier connection lines + particle system | Canvas overlay |
| `useMapHexGrid.ts` | Hex grid canvas overlay | Debounced resize |
| `useMapLibre.ts` | MapTiler style URL + WebGL detection |
| `useMapPopup/{index,speciesPopup,projectPopup,crewPopup,previewCard,utils}.ts` | Popup registry + per-type overlay logic |
| `useSpeciesData.ts` | IndexedDB-backed species loader (memCache → IDB → `/public/data/…/json`); region chunking | DB versioning, requestIdleCallback writes |
| `useSpeciesIcons.ts` | Markers + taxonomic icon mapping |
| `useSpeciesPanel.ts` | Side panel state |
| `useGrants.ts` | Grants CRUD via `grants` edge function, scrape grants API |
| `useCulturalLayers.ts` | Cultural-agents layer + popup templating |
| `useCulturalAgentsData.ts` | Cultural-agents data fetch (region-split) |
| `useRareEarthController.ts` | Orchestrates rare-earth GeoJSON layers |
| `useRareEarthLayers.ts` | Layer registrations |
| `useRareEarthData.ts` | Data loader |
| `useVulcanCircles.ts` | Phase circles overlay |
| `useWaterLayers.ts` | Hydro overlay |
| `useCommandPalette.ts` | Cmd-K controls |
| `useDataDownload.ts` | Export current view to file |
| `useGeoJSONMarkers.ts` | Native clustering for >500 points |
| `useUserPin.ts` | Save/view user-submitted community pins |
| `useStateHash.ts` | URL hash state sync |
| `useUrlState.ts` | URL query encoding for filter state |
| `useObservatoryControls.ts` | Tab + slider + filter orchestration |
| `useObservatoryPopup.ts` | Click-and-detail popup |
| `useObservatoryUpdates.ts` | Live updates from Supabase channel |
| `useObservatorySelection.ts` | Selected claim/sidebar state |
| `useVulcanObservatoryPage.ts` | Page wiring |
| `usePerformance.ts` | FPS counter dev tool |
| `useOfflineTiles.ts` | MBTiles fallback |
| `useDeviceCapabilities.ts` | Device-aware tuning |
| `useToast.ts` | App-wide toast queue |
| `useFocusTrap.ts` | Modal focus trap (Tab/Shift+Tab cycle) |
| `useThreeGlobe.ts` | Hero page Three.js Earth + grid overlay + ScrollTrigger |
| `useEnterpriseMarkers.ts` | Custom corporate-network markers |
| `useForceLayout.ts` | Network-graph layout helpers |
| `useGeoLocate.ts` | Geolocation API |
| `useCustomData.ts` | User-imported GeoJSON/CSV/KML |
| `useCommandPalette.ts` | Already listed |
| `useAdaptiveQuality.ts` | Already listed |

---

## 4. Routing

`nuxt.config.ts:47-58` sets explicit per-route rules:

| Route | prerender | notes |
|-------|-----------|-------|
| `/` | ✅ | Landing |
| `/info` | ✅ | About |
| `/project-grants{,/3d}` | ❌ | live + map |
| `/endangered-species{,/3d}` | ❌ | live + map |
| `/active-crews{,/3d}` | ❌ | live + map |
| `/vulcan-observatory{,/3d}` | ✅ (in routeRules) but NOT in `nitro.prerender.routes` | live data; maps render server-side only after `onMounted` |
| `/eg-grants{,/fullscreen}` | ❌ | live Supabase |
| `/iframe` | ✅ | embed demo |
| `/auth/callback` | n/a | Supabase OAuth landing |
| `/globe` | redirect 301 → `/project-grants/3d` | legacy URL |

> **Gotcha:** `/vulcan-observatory` is marked `prerender: true` in `routeRules` but it's NOT in `nitro.prerender.routes`, and its `id="main-content"` exists (only `vulcan-observatory/index.vue` and `3d.vue` have it — see Bugs §B11). The other prerender rule `/vulcan-observatory/3d` blocks prerender for the data-dependent map render.

---

## 5. Render pipeline (a typical map page)

```
pages/endangered-species/index.vue
   → <ClientOnly><MapView2D default-dataset="endangered-species" /></ClientOnly>
       → MapView2D.vue (`role="main"`)
           → useMapBase() (700 LOC)
               ├─ useI18n() / useUiStore()
               ├─ useSpeciesPanel()
               ├─ useMapHexGrid()
               ├─ useMapConnections()
               ├─ useMapPopup (species/project/crew/previewCard)
               ├─ useMapMarker()
               ├─ useRareEarthController()
               └─ initMap()
                   ├─ detectWebGLSupport()
                   ├─ new maplibregl.Map({ style: getMapStyle(key, tileRes) })
                   ├─ on('style.load') → onStyleLoad
                   ├─ on('load')      → rebuildMarkers()
                   └─ on('error')     → tryFallback (demotiles) after 2 errors
           → onMounted() → initMap()
```

`pages/iframe.vue`, `pages/auth/callback.vue`, and the `*Grants` mods are the non-map exceptions.

---

## 6. Data flow

### Static data
- **Projects** (`lib/project-data.ts` → `allProjectsData`): bundled into the JS payload.
- **Species** (`/public/data/species/{region}.json` + `/{region}-index.json`): lazy-loaded per-region, cached in `memCache` and IndexedDB (`useSpeciesData.ts:14-77`). The full `icmbio-brazil.json` is the master, with region chunks split for client-side region filtering.
- **Crew data** (`lib/crew-data.ts`): static, used by `/active-crews`. Two shapes: regions (grouped) and individual locations.
- **Rare-earth public sample** (`/public/data/rare-earth/*.json`): static, hydrates the observatory mining-cliffs layer.

### Live data
- **Supabase (anon key + service-role in edge functions):**
  - `crew-sync` — Crew registration
  - `crews-create` — Standalone registration
  - `grants` — List/create/approve/vote/comment/decisions/stats
  - `register-pin` — Cultural-agent batch sync + community pin submission
  - `is-manager` — Manager role check
- **Set into Supabase:** scraped grant opportunities (60+ sources, ~1,464 rows hits `scraped_grants`), vulcan cultural agents (~1,973 in `vulcan_observatory`), user-submitted pins (`community_pins`).

### UI state
- **Pinia stores:**
  - `stores/ui.ts` — active locale, theme, command palette open/close, search modal
  - `stores/map.ts` — selected dataset, filter state, flyTo targets
- **Per-component refs:** popup overlay state (creator in `useMapPopup/*`), sort/group filters.
- **URL hash + query params:** `hideAll=true`, `no-control=true`, `embed=true`, `controls=true`, plus `#no-dock` hides the dock nav. State is exchanged with URL for shareable deep links.

---

## 7. Visual pipeline (MapLibre + interactions)

```
MapLibre style
├── MapTiler `streets-v2` (light) / `satellite` (default), keyed by `NUXT_PUBLIC_MAPTILER_API_KEY`
│     ├─ auth baked into URL: `?key=…`
│     └─ fallback: `https://demotiles.maplibre.org/style.json` after 2 errors
├── Tile cache config from `useAdaptiveQuality` (`maxTileCacheSize`, `maxTileCacheZoomLevels`)
├── Vector overlay layers:
│     ├─ `markers` source (clustered) — `useMapMarker.rebuild()` per dataset
│     ├─ `connections` canvas overlay — `useMapConnections`
│     ├─ `hexGrid` canvas overlay — `useMapHexGrid`
│     ├─ rare-earth points/polygons/water/cultural/protected — `useRareEarthController`
│     └─ cultural-agents GeoJSON — `useCulturalLayers`
└── popups (built as innerHTML strings — see Bugs §B1)
      ├─ species popup  → /components/map/SpeciesPopup.vue mount into DOM
      ├─ project popup  → /components/map/ProjectPopup.vue
      └─ crew popup     → /components/map/CrewPopup.vue
```

Quality auto-tuning (`useAdaptiveQuality` + `lib/constants.ts:65-135`):

- **`low`** — no particles, no hex grid, dprCap 1, 200 markers
- **`medium`** — 20 particles @ 20 fps, hex visible, dprCap 1.5, 500 markers
- **`high`** — 60 particles @ 30 fps, hex visible, dprCap 2, 2000 markers
- **`ultra`** — 90 particles @ 36 fps, 5000 markers

---

## 8. Conventions and code style

### TypeScript
- `strict: true` (but `typeCheck: false` in nuxt.config — see Bugs §B2)
- `lib/types.ts` is the global interface registry. New types land here unless well-encapsulated.
- Composables expose explicit return shapes; never return `any`.
- Discriminated unions for dataset switching (e.g., rare-earth claim phases).

### Vue
- `<script setup lang="ts">` everywhere with JSDoc header (`@why`, `@component`, `@emits`, `@deps`).
- Auto-imports from `composables/` and `lib/` via Nuxt. `~/` aliases to root.
- `defineProps<{...}>()`, `defineEmits<{…: [arg]}>()` explicit over `defineProps({...})`.
- `useFocusTrap` applied at every overlay/modal via `useMapBase.ts:203-205`.

### CSS
- Tailwind v3 + custom fluid utilities (`text-fluid-2xl`, `clamp()`-based).
- CSS variables in `assets/css/main.css` for theme tokens. Dark mode via `.dark` class.
- `cn()` (`lib/utils.ts:134`) wraps `clsx` + `tailwind-merge` to dedupe Tailwind.

### i18n
- vue-i18n with static bundle (`i18n/i18n.config.ts`) — 16 locale JSON files imported synchronously.
- English fallback path is also implemented at `composables/useI18n.ts:74-80` (`vt(key) === key` triggers `englishFallback`).
- `t('a11y.skipToContent')` (EN: "Skip to main content") referenced in `app.vue:32`.
- Community Portuguese uses "SUBVENÇÕES" rather than the more common "SUBVENÇÕES" — already corrected in `locales/pt.json`.

### Naming
- Dataset keys: kebab-case (`'project-grants'`).
- Component names: PascalCase, file matches component (`MapView2D.vue`).
- Composables: camelCase, `use` prefix (`useMapMarker`).
- File-scoped interfaces (e.g., `useMapMarker.ts:25` `MarkerDataset`) live at top of file.
- Constants in `lib/constants.ts` are SCREAMING_SNAKE for primitives (`MAX_CLUSTER_SIZE`), PascalCase for groups (`DatasetKey`, `RoutePath`).

### Tests
- Vitest unit tests for `useThreeGlobe`, `useCommandPalette`, `useToast`, utils.
- Playwright (`tests/routes.spec.ts`, `tests/globe-panels.spec.ts`, `tests/map-rendering.spec.ts`, `tests/observatory.test.ts`) covers route loads, panels, and the observatory.
- Three Playwright configs: `playwright.config.ts` (full), `playwright.static.config.ts` (static-only), `playwright.deployed.config.ts` (deployed CI).

### Git
- Conventional-commit style implied. No `.git/hooks` provided.
- `push.sh` (root) auto-commits ANY staged change with message `'update'` AND runs `npm run supabase:deploy` before push. Don't run blindly (see `/home/hautly/AGENTS.md`).
- `.gitignore` excludes `supabase/`, `*.sql.tmp`, `.nuxt/`, `.output/`, `dist/`, `node_modules/`.

---

## 9. Boot sequence (browser)

```html
<!-- injected by inline script in <head>, before Nuxt hydration -->
(function() {
  try {
    var saved = localStorage.getItem('darkMode');
    if (saved === 'true' || saved === null) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
```

This pre-paint block sets `.dark` to avoid a flash, before `useDarkMode()` boots.

```ts
// app.vue
<NuxtLayout><NuxtPage /></NuxtLayout>
<ClientOnly><ToastHost /><CommandPalette /><KeyboardShortcuts /></ClientOnly>
```

Plausible analytics: only loaded when `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` is set in `runtimeConfig`.

---

## 10. External integrations & contracts

| Service | Where | Auth |
|---------|-------|------|
| **MapTiler Cloud** | `useMapLibre.getMapStyle()` | API key in URL (`?key=…`); two failure modes: 403 (invalid) or generic timeout (30 s, fallback to demotiles) |
| **Supabase REST + Edge Functions** | `lib/supabase.ts`, `useGrants.ts`, `useUserPin.ts` | Anon key in client; service role inside edge functions only |
| **Supabase Storage** | `useDataDownload.ts` | Service role (server-side) |
| **Wikimedia Commons** | `lib/species-utils.ts` (URL build) | None — public, no key |
| **Plausible** | `app.vue` (defer-cdn script) | Domain by env var |
| **Google OAuth** | `useSupabaseAuth.signIn()` | PKCE flow, `redirectTo = window.location.origin + /auth/callback` |
| **three.js r128 + gsap 3.12.2** | `useThreeGlobe.ts` | Loaded via CDN **at runtime** in `document.head` — see Bugs §B7 |
| **iconify** | `<iconify-icon>` web component + JSON-per-icon | CDN-by-name |

---

## 11. Edge-function surface (`docs/API.md`-canonical)

| Function | Action | Auth | Notes |
|----------|--------|------|-------|
| `crew-sync` | `check` / `register` | JWT | In-app crew signup; 200 reactivated / 201 new / 409 already active |
| `crews-create` | register | none | Standalone registration |
| `grants` | `list` / `create` / `approve` / `close` / `hide` / `show` / `delete` / `comment` / `vote` / `decisions` / `batch-sync` / `stats` | depends on action | Manager-only for write actions |
| `register-pin` | `agents:[…]` OR single-pin payload | header key OR JWT | 10 pins/user/day rate limit |
| `is-manager` | GET | JWT | Returns `{ isManager: boolean }` based on email domain |

Service-role key is **only** available inside edge functions (env-secret), never sent to the client. The anon key is bundled into the JS payload — expected for Supabase but precludes user-scoped RLS unless JWT is sent (which it is, for authenticated actions).

---

## 12. Configuration matrix

### `nuxt.config.ts:96-103`

```ts
runtimeConfig: {
  public: {
    maptilerApiKey: env.NUXT_PUBLIC_MAPTILER_API_KEY || env.MAPTILER_API_KEY || '',
    plausibleDomain: env.NUXT_PUBLIC_PLAUSIBLE_DOMAIN || '',
    supabaseUrl: env.NUXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: env.NUXT_PUBLIC_SUPABASE_KEY || '',  // NB: renamed from .env.example's NUXT_PUBLIC_SUPABASE_ANON_KEY
  },
}
```

> **Gotcha:** `.env.example` documents `NUXT_PUBLIC_SUPABASE_KEY` but in earlier code paths the variable was `NUXT_PUBLIC_SUPABASE_ANON_KEY`. The current `nuxt.config.ts` reads `SUPABASE_KEY`. If you copy `.env.example` as-is, you also need the matching import in the deploy script (which uses `NUXT_PUBLIC_SUPABASE_ANON_KEY`).

### `.github/workflows/deploy.yml`

Triggers: push to `main`/`develop`, every 2 hours, `workflow_dispatch`. Permissions: `contents: read`, `pages: write`, `id-token: write`. Uses `pnpm/action-setup@v6` with version `10.12.0` (matches `packageManager`).

Two jobs: `sync` (Supabase data sync) → `build` (Nuxt build → upload artifact → deploy to Pages). Only builds to GitHub Pages — staging server is local.

---

## 13. Operations runbook (cheat sheet)

```bash
# Build static site
pnpm generate

# Local dev (HMR)
pnpm dev

# Lint all
pnpm lint

# Format
pnpm format

# Unit tests
pnpm test

# E2E (against local server)
pnpm test:e2e

# Deploy edge functions
npm run supabase:deploy

# Re-download map tiles for offline preview
pnpm tiles:download --region lat/lng bbox --zoom 0-8

# Rebuild species index
pnpm species:index

# Tiles stats
pnpm tiles:stats

# Sync grants from local JSON into Supabase
node --env-file=.env scripts/sync-grants-to-supabase.ts grants scripts/output/grants_radar.json
```

---

## 14. Things agents should know

1. **Type-check off in prod build.** `nuxt.config.ts:107-111` sets `typeCheck: false`. Type errors only surface in `pnpm lint` and IDE. Run `vue-tsc --noEmit` before any large refactor.
2. **Reads from CDN at runtime.** `useThreeGlobe.ts:54-58` appends `<script>` tags on mount. There's no offline fallback. Pages that include the hero rely on network access at first paint.
3. **Skip-link targets only 2 of 12 pages.** Most pages use `<main>` but lack `id="main-content"`. See Bugs §B11.
4. **No retry on edge-function call failures.** Errors land in `useToast` as a one-shot. Pages don't poll/retry.
5. **The two largest files are `pages/eg-grants/index.vue` (1,339 LOC) and `composables/useMapBase.ts` (700 LOC).** Both are de-facto monoliths — touch them only with intent.
6. **`useToast.useToast()` re-creates `state = useState('toast', …)` correct;** the `timers` map is per-call and leaks if a component that pushes the toast is unmounted before the timeout fires. (See Bugs §B6.)
7. **Service role only in edge functions.** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. The repo doesn't reference it anywhere client-side; ensure you don't add new client code paths that do.
8. **`getSupabaseClient`** silently creates a placeholder client when env vars are empty — most downstream operations will throw, but the placeholder itself can mask config errors. See Bugs §B1.
9. **Geographic coordinate convention** is WGS84 lng-lat tuple (`[lng, lat]`). Latitude-first variants are rejected by `lib/map-utils.isValidCoordinate`. Watch for ForEach that swaps these.
10. **MapTiler key is in URL** (not header). It's safe to expose per MapTiler's domain-restriction model but consider URL-rewriting if you switch to a domain-restricted setup.
11. **i18n bundles all 16 locales synchronously.** This is intentional (`i18n/i18n.config.ts:18-21`) — DO NOT lazy-load without first measuring the LCP impact on `/info`.
12. **The home `app.vue` skip-link** uses `t('a11y.skipToContent')`. The `t` comes from the wrapper in `composables/useI18n.ts`. If you rewrite to vue-i18n directly, preserve the EN fallback behavior.

---

## 15. Where to start when extending

| Task | First file to read |
|------|---------------------|
| Add a new dataset | `composables/useMapBase.ts:96`, `lib/constants.ts`, `scripts/sync-…-to-supabase.ts` |
| Add a popup type | `composables/useMapPopup/index.ts`, `lib/map-utils.ts:buildSpeciesPopupHTML` |
| Add a marker style | `composables/useMapMarker.ts` + `lib/colors.ts` |
| Add an edge function | (No `supabase/` directory is in this repo — edge functions are deployed from a sibling Git repository. Confirm with `SUPABASE-ARCHITECTURE.md` and the deploy script in `package.json`.) |
| Add a route | `pages/<name>.vue`, `nuxt.config.ts routeRules`, `lib/constants.RoutePath` |
| Add a translation key | `locales/en.json` (then mirror to others — `scripts/update-locales.mjs`). |
| Add a modal | `useFocusTrap` on container ref; `role="dialog"` + `aria-modal="true"`. See `components/observatory/ClaimDetailModal.vue` as a model. |
| Tune visual quality | `lib/constants.ts:QUALITY_PRESETS`, `composables/useAdaptiveQuality.ts` |

---

*Last reviewed: 2026-08-25*  
*Prior docs consulted: AGENTS.md, CODEBASE-REVIEW.md, PHILOSOPHY-LIMITATIONS.md, SUPABASE-ARCHITECTURE.md, audit.md, docs/{ARCHITECTURE,API,DATABASE,CONTRIBUTING}.md*
