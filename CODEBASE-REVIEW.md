# EG-Maps / Earth Guardians — Full Codebase Review & Recommendations

**Package:** `centralized-maps`  
**Stack:** Nuxt 3 (SSG), Vue 3 (Composition API), TypeScript, MapLibre GL, Tailwind CSS  
**Deployment:** GitHub Pages (static prerender via `nuxt generate`)  
**Total source files reviewed:** ~40 files across components, pages, composables, lib, assets, plugins, tests, config

---

## Changes Made (2026-05-23)

### Fixed Issues

1. **Color typo fixed** (`lib/colors.ts`, `lib/map-utils.ts`, `composables/useMapMarkers.ts`)
   - Mammal color was `#B64030` in some places and `#B64032` in others
   - Now uses shared `COLOR_MAMMAL` constant from `lib/colors.ts`

2. **Hardcoded year removed** (`locales/*.json`)
   - Stats title had "2024" hardcoded in all locale files
   - Changed to generic "Project Grants Impact" / "Impacto de Subvenções" etc.

3. **Missing translations added** (`locales/es.json`, `locales/pt.json`, `locales/fr.json`)
   - Added missing `home.databasesTitle`, `home.databasesDesc`, `home.iucnTitle`, `home.iucnDesc`, `home.iucnScope`, `home.icmbioTitle`, `home.icmbioDesc`, `home.icmbioScope`, `home.submitData`, `home.submitDataSubject`

4. **Translation typos fixed**
   - "Mains" → "Principales" (Spanish), "Principais" (Portuguese), "Principaux" (French)

5. **i18n composable simplified** (`composables/useI18n.ts`)
   - Removed confusing try-catch pattern with onMounted
   - Simplified locale initialization logic

6. **ProjectFilterPanel improved** (`components/ProjectFilterPanel.vue`)
   - Added close button for mobile users
   - Added `close` emit for parent to handle

---

## Table of Contents

1. [Architecture & Organization](#1-architecture--organization)
2. [Component Architecture](#2-component-architecture)
3. [State Management](#3-state-management)
4. [Data Layer](#4-data-layer)
5. [Internationalization (i18n)](#5-internationalization-i18n)
6. [Performance](#6-performance)
7. [Responsiveness & UX](#7-responsiveness--ux)
8. [Testing](#8-testing)
9. [CI/CD & Build](#9-cicd--build)
10. [Accessibility](#10-accessibility)
11. [Security](#11-security)
12. [Integrations](#12-integrations)
13. [Technical Debt](#13-technical-debt)
14. [Roadmap / Feature Expansion](#14-roadmap--feature-expansion)

---

## 1. Architecture & Organization

### Current State

The project follows a Nuxt 3 convention-based structure with clear separation:

```
components/         — 9 components + 5 UI primitives
composables/        — 4 composables (useDarkMode, useI18n, useMediaQuery, useSpeciesData)
lib/                — 7 utility modules (types, constants, colors, data, map-utils, map-effects, image-utils)
pages/              — 7 routes (6 real + 1 redirect)
layouts/            — 1 layout (default.vue)
plugins/            — 1 client-only plugin
assets/css/         — main.css (955 lines)
public/data/        — species.json (external dataset)
scripts/            — download script + i18n scanner
tests/              — Playwright E2E tests
```

### Strengths
- Good separation of concerns between `lib/`, `composables/`, and `components/`
- Consistent naming convention throughout
- Dataset key / route path constants to avoid magic strings

### Issues & Recommendations

| Issue | Recommendation |
|-------|---------------|
| `UnifiedMap.vue` (1688 lines) and `GlobeView.vue` (1523 lines) are severely bloated | Extract into sub-components: `MapCore.vue` (MapLibre init), `MarkerLayer.vue`, `ConnectionLayer.vue`, `ParticleOverlay.vue`, `HexGrid.vue`, `PopupOverlay.vue`. A shared composable (`useMapLibre`) could handle the MapLibre lifecycle that is duplicated between both. |
| `map-utils.ts` (246 lines) mixes popup HTML builders with coordinate math and HTML escaping | Split into `popup-builders.ts`, `geo-utils.ts`, and `html-utils.ts` |
| `image-utils.ts` (255 lines) is a kitchen sink | Split into `placeholder-svgs.ts` (static SVGs), `image-loader.ts` (cache/queue), and `marker-images.ts` (marker-specific logic) |
| `useI18n.ts` (870 lines) is all translation strings inline | Extract translations to separate JSON files: `locales/en.json`, `locales/es.json`, `locales/pt.json`, `locales/fr.json`. Use `@nuxtjs/i18n` module instead of custom implementation. |
| `main.css` (955 lines) has some duplication with component `<style>` blocks | Audit for unused CSS; prefer Tailwind utilities over custom CSS variables where possible |
| `lib/` has no `index.ts` barrel export | Add barrel exports for clean imports |
| `public/data/species.json` is loaded via import path alias (`~public/data/species.json`) which is fragile | Move to `server/data/` or `assets/data/` and use a composable to load it |

### Suggested Directory Structure

```
locales/
  en.json, es.json, pt.json, fr.json
composables/
  useMapLibre.ts         # Shared MapLibre lifecycle (init, cleanup, markers, connections, particles, hex grid)
  useMapMarkers.ts       # Marker management
  useMapConnections.ts   # Connection lines + particles
  useMapHexGrid.ts       # Canvas hex grid
  useMapPopup.ts         # Popup overlay management
lib/
  map/
    init.ts              # Map initialization
    markers.ts           # Marker creation
    connections.ts       # Connection line building
    particles.ts         # Particle system
    hex-grid.ts          # Hex grid canvas
    popups.ts            # Popup builders
  geo-utils.ts           # Coordinate validation, distance, bezier curves
  image-utils.ts         # Image loading, cache, thumbnails
  placeholder-svgs.ts    # Placeholder SVG strings
  data/                  # Data source abstractions
    project-data.ts
    species-loader.ts
  colors.ts
  constants.ts
  types.ts
  utils.ts               # cn() utility only
components/
  map/
    UnifiedMap.vue       # Slim orchestrator using composables
    GlobeView.vue        # Slim orchestrator using composables
    MapCore.vue          # MapLibre container wrapper
    MarkerLayer.vue      # Marker rendering
    ConnectionLayer.vue  # Connection lines
    ParticleOverlay.vue  # Particle canvas
    HexGrid.vue          # Hex grid canvas
    PopupOverlay.vue     # Fullscreen overlay popups
```

---

## 2. Component Architecture

### Current State

| Component | Lines | Concerns |
|-----------|-------|----------|
| `UnifiedMap.vue` | 1688 | Map init, markers, connections, particles, hex grid, popups, error handling, i18n — all in one `<script setup>` |
| `GlobeView.vue` | 1523 | ~70% identical to UnifiedMap — duplicated marker logic, connection logic, hex grid, popups, error handling |
| `MapControls.vue` | 541 | Search, filters, fullscreen — does too much |
| `SpeciesFilterPanel.vue` | 408 | Reasonable |
| `ProjectFilterPanel.vue` | 240 | Reasonable |
| `GlobalStats.vue` | 144 | Reasonable |

### Duplication Between UnifiedMap and GlobeView

Identical or near-identical code blocks found in both (~40% overlap):

- `getUnifiedMarkerMetrics()` — exact same function
- `createUnifiedMarkerElement()` — nearly identical (only `globe-marker-item` class differs)
- `createProjectMarkerElement()` — identical
- `createSpeciesMarkerElement()` — identical
- `updateMarkerVisibility()` — identical
- `rebuildMarkers()` — near-identical (only mobile slice values differ)
- `addConnections()` — identical
- `cleanupParticles()` / `startParticles()` — identical
- `setupHexGrid()` / `debouncedSetupHexGrid()` — identical (only hex size differs)
- Popup overlay HTML/state — identical
- `buildProjectPopupHTML` / `buildSpeciesPopupHTML` — fully duplicated as inline strings everywhere

### Recommendations

1. **Create a `useMapLibre` composable** that encapsulates the shared MapLibre lifecycle:

```ts
// composables/useMapLibre.ts
export function useMapLibre(containerRef, options) {
  // initMap, cleanup, map events, error handling, tile cache, auto-rotate (for globe)
  // returns { map, isLoading, hasError, init, destroy }
}
```

2. **Create `useMapMarkers` composable**:

```ts
// composables/useMapMarkers.ts
export function useMapMarkers(map, dataset, items, options) {
  // rebuildMarkers, updateMarkerVisibility, marker creation
  // returns { markers, rebuild, updateVisibility }
}
```

3. **Create `useMapConnections` composable**:

```ts
// composables/useMapConnections.ts
export function useMapConnections(map, dataset, items, options) {
  // build connections, sync layers, particles
  // returns { connectionFeatures, addConnections, toggleConnections, startParticles, cleanup }
}
```

4. **Create `useMapHexGrid` composable**:

```ts
// composables/useMapHexGrid.ts
export function useMapHexGrid(canvasRef, options) {
  // setup, debouncedSetup
  // returns { setup, teardown }
}
```

---

## 3. State Management

### Current State

No global state management — relies entirely on:
- Component-local `ref()`/`reactive()` state
- `useState()` in `useDarkMode.ts`
- Module-level `ref()` in `useI18n.ts` for locale
- `localStorage` for dark mode, locale, recent searches, feedback

### Issues

- **Filter state is duplicated**: `SpeciesFilterPanel` manages its own filter state and emits changes; `UnifiedMap` stores the filtered list as a separate ref. If filters need to persist across 2D/3D view switches, they reset.
- **Locale state** at module level in `useI18n.ts` is shared across all components via a single `ref` — works but is fragile if SSR hydration ordering changes.
- No reactive store for map state (zoom, center, active dataset).

### Recommendations

1. **Adopt Pinia** (Nuxt has first-class support via `@pinia/nuxt`):

```ts
stores/map.ts          — map state (active dataset, zoom, center, connections toggle, hex toggle)
stores/filters.ts      — shared filter state (persistent across 2D/3D views)
stores/ui.ts           — search panel, filter panel visibility
stores/preferences.ts  — dark mode, locale, recent searches
```

2. Or, if avoiding external dependencies, use **Nuxt `useState()`** for cross-component state sharing instead of module-level refs. Convert `useI18n` locale to a shared state.

3. **Persist filter state** in URL query params so users can share filtered views:

```
/project-grants?country=Nigeria&beneficiaries=under1000
/endangered-species?group=Mammal&region=Africa&ecosystem=Forest
```

---

## 4. Data Layer

### Current State

- **Projects**: Hardcoded array in `lib/project-data.ts` (75 entries, 596 lines)
- **Species**: Static JSON file at `public/data/species.json` loaded via import
- Both datasets are imported directly in page/components with no abstraction layer

### Issues

| Issue | Impact |
|-------|--------|
| Hardcoded project data = no way to update without redeploy | Every data change requires a full rebuild |
| No data validation at load time | Bad JSON or malformed entries fail silently or inconsistently |
| Species JSON imported via `~public/data/species.json` — works but circumvents Nuxt's `public/` static serving | If the file is large (it is), it increases JS bundle size instead of being fetchable |
| No error recovery if data file is missing | Pages crash |

### Recommendations

1. **Move data fetching to a composable**:

```ts
composables/useProjectData.ts
composables/useSpeciesData.ts   // (current one is just a type re-export)
```

2. **For species JSON**, serve it as a static asset (`public/data/species.json`) and fetch it via `fetch()`:

```ts
// composables/useSpeciesData.ts
export function useSpeciesData() {
  const data = ref<Species[]>([])
  const loading = ref(true)
  const error = ref<Error | null>(null)

  async function load() {
    try {
      const response = await fetch('/data/species.json')
      data.value = await response.json()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
  return { data, loading, error }
}
```

3. **For projects**, consider moving to a JSON file as well, or creating a CMS integration (see Section 12).

4. **Add data validation** using Zod or a simple runtime validator at the composable level.

5. **Consider a headless CMS** integration (Strapi, Contentful, Sanity) so project/species data can be updated without deployments.

---

## 5. Internationalization (i18n)

### Current State

Custom implementation in `composables/useI18n.ts` (870 lines) with translations inline. Supports 4 languages (EN, ES, PT, FR).

### Issues

- **No SSR support**: `useI18n` relies on `typeof window` checks and `onMounted` for locale detection — causes mismatch during hydration
- **No lazy-loading**: All 4 translations loaded on every page regardless of locale
- **No ICU message format**: Simple `{key}` interpolation only, no pluralization, gender, or select rules
- **Translations inlined in JS**: Not easily editable by non-developers
- **No locale-based routing**: No `/es/project-grants` support
- **Duplicate `switchTo2d`/`switchTo3d` keys** in globe section (both with and without `2`→`2` switch in key name)
- **Missing taxonomy labels** for the `toggleTaxonomicGroup` filter in species panel
- **English fallback** on untranslated keys is implemented, but falls back raw key name if EN also missing

### Recommendations

1. **Replace with `@nuxtjs/i18n`** module (official Nuxt i18n solution):

```ts
nuxt.config.ts
{
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: ['en', 'es', 'pt', 'fr'],
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts'
  }
}
```

2. **Extract translations** to JSON files:

```
locales/en.json
locales/es.json
locales/pt.json
locales/fr.json
```

3. **Enable locale-based routing** (optional but recommended for SEO):

```
/project-grants         → /project-grants
/es/project-grants      → /es/project-grants
```

4. **Use ICU message format** for proper pluralization.

5. **Clean up duplicate keys** (`switchTo2d`/`switchTo3d` → single key).

---

## 6. Performance

### Current Bottlenecks

| Area | Issue | Severity |
|------|-------|----------|
| **Bundle size** | Species JSON imported directly — adds ~200KB+ to JS bundle | High |
| **Marker rendering** | 75 project markers + species markers are all rendered as DOM elements | Medium |
| **MapLibre tile cache** | `tileCache` is a `Map<string, Response>` that stores tile responses in memory — this may cause memory leaks on long sessions | Medium |
| **Animation frames** | `requestAnimationFrame` runs particle animation continuously at 36fps even if no particles are visible | Medium |
| **CSS** | 955-line CSS file with many unused classes. Star field CSS (60+ radial gradients) is duplicated in GlobeView's injected `<style>` | Medium |
| **Image loading** | Species images preload eagerly with `preloadSpeciesImages` on rebuild | Low |
| **No code splitting** | `UnifiedMap` imports `maplibre-gl` synchronously | Low |
| **No image optimization** | Species images from Wikimedia are loaded at full size then CSS-limited | Low |

### Recommendations

1. **Lazy-load maptiler/mapLibre**: Use dynamic import for `maplibre-gl`:

```ts
const maplibregl = await import('maplibre-gl')
```

2. **Use MapLibre clustering** for markers at lower zoom levels to reduce DOM nodes:

```ts
map.addSource('points', {
  type: 'geojson',
  data: points,
  cluster: true,
  clusterMaxZoom: 5,
  clusterRadius: 50
})
```

3. **Replace tile cache** with a bounded LRU cache (or remove it — MapLibre has its own tile cache):

```ts
const tileCache = new LRUCache<string, Response>({ max: 500 })
```

4. **Pause particle animation** when map is not visible (use `IntersectionObserver` on container).

5. **Reduce CSS star field duplication**: The `star-field` class is defined in both `main.css` and injected via JavaScript in `GlobeView`. De-duplicate.

6. **Implement virtual scrolling** in search results if the dataset grows.

7. **Add `loading="lazy"`** to species popup images (already present in popup HTML builder).

8. **Precompress species images** — serve WebP/AVIF versions via a build step instead of relying on Wikimedia thumbnails.

9. **Add bundle analyzer** to find other optimization opportunities:

```ts
nuxt.config.ts
{
  build: {
    analyze: true
  }
}
```

---

## 7. Responsiveness & UX

### Current State

- Uses `clamp()` for fluid typography and spacing
- `useMediaQuery('(max-width: 768px)')` for mobile detection
- macOS-style dock with magnification effect
- Different loading fallbacks per page

### Issues

| Issue | Location |
|-------|----------|
| **Header positioning** uses complex `clamp()` expressions that are hard to maintain | `layouts/default.vue` — `top: [clamp(5rem,16vw,6rem)]` |
| **Mobile filter panel** placement varies between `top-[clamp(5.5rem,12vh,7.5rem)]` and `top-[clamp(6.75rem,14vh,8.5rem)]` across components | Multiple locations |
| **Dock navigation** overlaps with map on very small screens (bottom `max(1rem, env(safe-area-inset-bottom))`) | All map pages |
| **No touch gesture handling** for map on mobile | MapLibre handles basic touches but no custom gesture layer |
| **No orientation change handler** — hex grid only resizes on window resize | `UnifiedMap.vue`, `GlobeView.vue` |
| **No offline experience** — all map tiles require network | Could add service worker |
| **No skeleton loading** for non-map pages (home, info) | Pages flash-before-content-render |

### Recommendations

1. **Unify responsive positioning values** into CSS custom properties or a shared constant:

```css
:root {
  --header-top-offset: clamp(5rem, 16vw, 6rem);
  --filter-panel-top-offset: clamp(6.75rem, 14vh, 8.5rem);
  --dock-bottom-offset: max(1rem, env(safe-area-inset-bottom));
}
```

2. **Add orientation change handler** alongside the existing resize handler.

3. **Implement proper touch gestures** — double-tap to zoom, two-finger rotate.

4. **Add `orientationchange` listener** to refresh hex grid and marker visibility.

5. **Consider PWA** with a service worker for offline tile caching (MapLibre tiles can be cached via Cache API).

6. **Add transition/animation** on route changes for smoother navigation.

7. **Ensure dock is scrollable** when many items are added.

---

## 8. Testing

### Current State

- 1 Playwright test file (`tests/routes.spec.ts`): 230 lines, ~17 test cases
- Tests cover: route loading, navigation, dark mode toggle, no console errors, no hydration mismatches

### Gaps

| Area | Missing |
|------|---------|
| Unit tests | Zero. No test for `lib/` utilities, `composables/`, or components |
| Component tests | No Vue Test Utils or Vitest setup |
| Filter logic | No tests for species/project filtering |
| i18n | No tests for translation resolution or interpolation |
| Data validation | No tests for species JSON schema |
| Visual regression | No screenshot tests |
| Performance budget | No performance assertions |

### Recommendations

1. **Add Vitest** (recommended for Nuxt 3):

```bash
pnpm add -D vitest @vue/test-utils @nuxt/test-utils
```

2. **Unit tests for `lib/`** (highest priority):

```ts
// tests/unit/colors.test.ts
// tests/unit/map-utils.test.ts
// tests/unit/map-effects.test.ts
// tests/unit/image-utils.test.ts
// tests/unit/project-data.test.ts
```

3. **Unit tests for composables**:

```ts
// tests/unit/useDarkMode.test.ts
// tests/unit/useI18n.test.ts
// tests/unit/useMediaQuery.test.ts
```

4. **Component tests** for UI primitives:

```ts
// tests/components/UiButton.test.ts
// tests/components/UiTooltip.test.ts
```

5. **Add Playwright screenshot tests** for visual regression:

```ts
await expect(page).toHaveScreenshot('home-page.png')
```

6. **Add data validation test** for `species.json` schema:

```ts
test('species JSON conforms to schema', () => {
  const species = JSON.parse(fs.readFileSync('public/data/species.json', 'utf-8'))
  species.forEach(s => {
    expect(s).toHaveProperty('id')
    expect(s).toHaveProperty('commonName')
    expect(s).toHaveProperty('taxonomicGroup')
    expect(Object.keys(GROUP_COLORS)).toContain(s.taxonomicGroup)
    expect(s.lat).toBeGreaterThanOrEqual(-90)
    expect(s.lat).toBeLessThanOrEqual(90)
  })
})
```

7. **Add `test` script** to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:unit": "vitest run --dir tests/unit"
  }
}
```

---

## 9. CI/CD & Build

### Current State

- GitHub Actions deployment to GitHub Pages on push to `main`
- `pnpm generate` → copies `200.html` as `404.html` → uploads artifact → deploys
- `compressPublicAssets: true` in Nitro config

### Issues

| Issue | Impact |
|-------|--------|
| No lint step | TypeScript `typeCheck: false` in nuxt.config — type errors go unnoticed |
| No test step in CI | PRs with broken tests can merge |
| No preview deployments | Every push to main goes to production immediately |
| No cache invalidation strategy | GitHub Pages may serve stale content |
| `dist/` and `.output/public/` both contain the build | Confusing — two output directories |

### Recommendations

1. **Enable TypeScript type checking** (or run `npx nuxi typecheck` in CI):

```yaml
- run: pnpm nuxi typecheck
```

2. **Add test step** to CI:

```yaml
- run: pnpm test:unit
- run: pnpm test:e2e
```

3. **Add linting** with ESLint:

```bash
pnpm create @nuxt/eslint-config
```

Add to CI:

```yaml
- run: pnpm lint
```

4. **Add a preview deployment** using GitHub Pages from PRs (deploy to a subdirectory per PR or use Vercel/Cloudflare Pages for previews).

5. **Use a single output directory** — configure `generate.dir` explicitly.

6. **Add [`@nuxtjs/sitemap`](https://github.com/nuxt-modules/sitemap)** for SEO.

7. **Consider moving to Cloudflare Pages or Vercel** for better performance and preview deployments.

---

## 10. Accessibility

### Current State

- `role="main"` and `aria-label` on map containers
- `aria-label` on toggle buttons
- `role="listbox"` and `aria-selected` on search results
- Keyboard navigation in search panel (arrow keys, Enter, Escape)
- `prefers-reduced-motion` media query in CSS
- `focus-visible` ring on buttons

### Gaps

| Gap | Priority |
|-----|----------|
| No `aria-live` region for filter count updates | Medium |
| No `aria-expanded` on collapsible sections (filter panel, species legend) | Medium |
| Map markers are `div` elements — screen readers won't announce them | High |
| Zoom controls not keyboard-accessible on mobile (hidden on mobile) | Medium |
| No skip-to-content link | Medium |
| Color contrast: some text may be too low contrast (`text-[var(--text-muted)]` with color `#737373` on dark background) | Medium |
| No focus trap in fullscreen popup overlays | High — keyboard users can tab behind the overlay |
| Dock tooltips use mouseenter/mouseleave only | Low |

### Recommendations

1. **Add `aria-live="polite"`** to filter count display.

2. **Add `aria-expanded`** to all collapse toggles.

3. **Make markers focusable** and add `aria-label`:

```ts
el.setAttribute('role', 'button')
el.setAttribute('tabindex', '0')
el.setAttribute('aria-label', species.commonName)
```

4. **Add a focus trap** in `SpeciesPopupOverlay` and `ProjectPopupOverlay` — prevent Tab from leaving the overlay.

5. **Add skip-to-content link** at the top of `<body>`:

```html
<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>
```

6. **Ensure minimum contrast ratio** of 4.5:1 for all text. The `--text-muted: #737373` on dark backgrounds may fail.

7. **Add `aria-hidden="true"`** to decorative elements (star field, grid overlay, noise, scanlines).

8. **Add `role="alert"`** to error states.

---

## 11. Security

### Current State

- MapTiler API key stored in runtime config (injected at build time via env var)
- No user authentication
- Feedback form saves to localStorage only (no server)
- All external links use `rel="noopener noreferrer"`

### Issues

| Issue | Severity |
|-------|----------|
| API key is public in the built JS bundle (runtime config for public env vars) | Medium — this is expected for client-side map tiles, but worth noting |
| No Content Security Policy headers | Low (GitHub Pages doesn't support custom headers) |
| `dangerouslySetInnerHTML` equivalent via `v-html` for popup content | Medium — XSS risk if species/project data is ever user-supplied |

### Recommendations

1. **Audit `v-html` usage**: Popup HTML is built from hardcoded data, but it uses `escapeHtml()` for user-facing strings. This is safe today, but if data sources ever become user-contributable, switch to DOM-based rendering.

2. **Restrict API key** to specific domains in MapTiler dashboard.

3. **Consider CSP** (if moving to a platform that supports response headers):

```
Content-Security-Policy: default-src 'self'; img-src 'self' https://*.maptiler.com https://upload.wikimedia.org; connect-src 'self' https://api.maptiler.com
```

---

## 12. Integrations

### Current Integrations

| Integration | Status |
|-------------|--------|
| MapTiler (satellite tiles) | Via MapLibre GL |
| Wikimedia Commons (species images) | Via URL construction in `image-utils.ts` |
| Lucide icons | Via iconify-icon |
| Google Fonts | Inter + Montserrat |

### Recommended Integrations

| Integration | Priority | Description |
|-------------|----------|-------------|
| **IUCN Red List API** | High | Fetch real-time endangered species data instead of static JSON |
| **Headless CMS (Strapi / Sanity / Contentful)** | High | Manage project grants and species data without code deployments |
| **Earth Guardians API** | Medium | If EG has an internal API, use it for project grant data |
| **MapLibre GL plugins** | Medium | `maplibre-gl-draw` for annotation, `maplibre-gl-compare` for side-by-side |
| **Analytics (Plausible / Fathom / Umami)** | Medium | Privacy-friendly analytics to understand map usage patterns |
| **Mapbox GL Native** | Low | Future native mobile app integration |
| **GitHub Issues API** | Low | Auto-create issues from feedback form submissions |
| **Discord / Slack webhook** | Low | Notify on feedback submission |
| **Storybook** | Low | Component library documentation |
| **Crowdin / Lokalise** | Low | Manage translations collaboratively |

### API Integration Architecture

```
nuxt.config.ts → runtimeConfig.public.apiBaseUrl
composables/useIUCNRedList.ts → fetches from IUCN API
composables/useEarthGuardiansCMS.ts → fetches from headless CMS
lib/data/project-data.ts → becomes a fetch-based loader
lib/data/species-loader.ts → becomes a fetch-based loader (with static JSON fallback)
```

---

## 13. Technical Debt

### Critical

| Item | File | Effort |
|------|------|--------|
| Full-screen popup overlay close button uses `&times;` HTML entity instead of proper `<Icon>` component | Both map components | 15 min |
| `GlobeView` injects `<style>` elements via JS at module level (`if (typeof document !== 'undefined')`) — pollutes global scope, breaks SSR | `GlobeView.vue:783` | 30 min |
| `_cachedResponse` on the `transformRequest` return type is a non-standard property | Both map components | 15 min |
| `MaplibreglPopup` close button position is set via `top`/`right` in CSS but also via `padding` — conflict | Both map components | 15 min |
| `typeCheck: false` in `nuxt.config.ts` | `nuxt.config.ts:67` | Immediate |

### High

| Item | File | Effort |
|------|------|--------|
| `getMarkerPlaceholder()` sets `backgroundImage` with `data:image/svg+xml` — inline SVGs with user-controlled group name could allow injection | `image-utils.ts:29` | 15 min |
| Species filter panel has two `<style scoped>` blocks (Vue merges them but it's unusual) | `SpeciesFilterPanel.vue` | 5 min |
| `formatCompact()` is duplicated in `index.vue:132` and `info.vue:232` | 2 pages | 5 min |
| `allProjectsData` has inconsistent coordinate precision (some lat/lng have 15+ decimal places) | `project-data.ts` | 30 min |
| Some project entries have `0` for both beneficiary fields but reasonable titles — possible data error | `project-data.ts` | Data audit needed |
| `navigateTo` in `globe.vue` runs in `<script setup>` top level but template shows a loading spinner — the page redirects before rendering | `globe.vue:14` | 5 min |
| `handleKeyboardShortcut` in `MapControls.vue` is added to `window` but never cleaned up if component unmounts while open | `MapControls.vue:497` | Already done ✓ |
| `useI18n` module-level `ref()` for locale means all instances share state — works but unconventional | `useI18n.ts:9` | 15 min |
| `keepPopupFullyVisible` does not actually apply the offset it calculates (line 408-411 computes `topOffset`/`leftOffset` but never uses them) | `UnifiedMap.vue:409` | 10 min |

### Medium

| Item | Effort |
|------|--------|
| No ESLint config — `.eslintrc` file should exist | 30 min |
| No Prettier config | 15 min |
| `dist/` and `.output/public/` both contain built files — confusing duplication | 30 min |
| Hardcoded `baseURL` in many places instead of relying on `useRuntimeConfig().app.baseURL` consistently | 2 hours |
| "Earth Guardians" brand text hardcoded in some aria-labels instead of using translation keys | 30 min |
| Navigation dock `dockItemRefs` uses `Map` with numeric indices — fragile if items reorder | 15 min |
| `compute` → `computed` typo in comment in `GlobeView.vue` | 1 min |
| No `tsconfig.json` paths alias for `@/` — though it works via Nuxt convention | 5 min |
| `pnpm.overrides` pins Vite — should document why this is needed | 15 min |

---

## 14. Roadmap / Feature Expansion

### Phase 1 — Foundation (1-2 weeks)

- [ ] Split bloated components into composables (`useMapLibre`, `useMapMarkers`, `useMapConnections`, `useMapHexGrid`)
- [ ] Extract translations to JSON files
- [ ] Move species data loading to fetch-based composable
- [ ] Enable TypeScript type checking
- [ ] Add Vitest + unit tests for `lib/`
- [ ] Add ESLint + Prettier

### Phase 2 — Data & API (2-3 weeks)

- [ ] Connect IUCN Red List API for species data
- [ ] Add headless CMS for project grants
- [ ] Implement URL-based filter persistence
- [ ] Add data validation (Zod schemas)
- [ ] Create admin panel (Nuxt Content or custom)

### Phase 3 — UX & Performance (2-3 weeks)

- [ ] MapLibre clustering for markers
- [ ] Virtual scrolling in search results
- [ ] PWA with offline tile caching
- [ ] Accessibility improvements (focus traps, aria attributes, keyboard nav)
- [ ] Skeleton loading for all pages
- [ ] Add `@nuxtjs/i18n` for proper i18n

### Phase 4 — Advanced Features (3-4 weeks)

- [ ] Timeline/animation of project grants over years
- [ ] Comparative overlay mode (side-by-side datasets)
- [ ] Data export (CSV/GeoJSON download)
- [ ] Embeddable map widget (iframe)
- [ ] Advanced filtering (date range, multi-select, full-text search)
- [ ] User-contributed data with moderation
- [ ] Interactive species range maps (GeoJSON polygon overlay on map)
- [ ] Automated screenshot regression tests

### Phase 5 — Scale (ongoing)

- [ ] Storybook for component development
- [ ] End-to-end performance budgets
- [ ] CDN for static assets
- [ ] Multi-lingual SEO with locale-based routing
- [ ] Bundle size monitoring
- [ ] Accessibility compliance audit (WCAG 2.1 AA)

---

## Summary of Quick Wins

| Task | Effort | Impact |
|------|--------|--------|
| Enable `typeCheck` in nuxt.config | 5 min | Catches type errors at build time |
| Deduplicate `formatCompact` | 5 min | Cleaner code |
| Fix `keepPopupFullyVisible` no-op bug | 10 min | Popups actually stay on screen |
| Remove duplicate star-field CSS from GlobeView | 15 min | Smaller CSS, less DOM injection |
| Replace `&times;` in close buttons with `<Icon>` | 15 min | Consistent icon usage |
| Fix `SpeciesFilterPanel` double `<style scoped>` | 2 min | Cleaner component |
| Add `role="alert"` to error states | 10 min | Better screen reader support |
| Add `aria-expanded` to collapse toggles | 20 min | Better screen reader support |
| Move species.json to fetch-based loading | 1 hour | Smaller JS bundle, faster initial load |
| Add Vitest + first unit tests | 2 hours | Regression prevention |
| Run `npx nuxi typecheck` in CI | 30 min | Prevent type regressions |
