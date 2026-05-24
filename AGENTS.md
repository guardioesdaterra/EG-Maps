# EG-Maps — Agent Memory & Coding Guidelines

**Project:** Earth Guardians Interactive Data Visualization Platform  
**Repository:** `/workspace/project/EG-Maps`  
**Package Name:** `centralized-maps`

---

## Project Overview

EG-Maps is an interactive data visualization platform built with **Nuxt 3**, **Vue 3**, and **MapLibre GL** that displays:
- **Project Grants** — Earth Guardians' global grant initiatives with beneficiary statistics
- **Endangered Species** — Critically endangered species and their habitats worldwide

The platform renders data on both **2D maps** and **3D globes**, with features like marker clustering, connection lines, particle animations, and hex grids.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Nuxt 3 (SSG with prerendered HTML) |
| Language | TypeScript (strict mode) |
| UI Library | Vue 3 (Composition API) |
| Styling | Tailwind CSS v3 |
| Map Engine | MapLibre GL |
| Tile Provider | MapTiler (satellite imagery) |
| Icons | Iconify (Lucide icon set) |
| Testing | Vitest + Playwright |
| Linting | ESLint (@nuxt/eslint) |
| Package Manager | pnpm |
| Deployment | GitHub Pages (static) |

**Key Dependencies:**
- `maplibre-gl@^5.24.0` — Map rendering
- `nuxt@^3.21.6` — Framework
- `vue@^3.5.34` — UI framework
- `supercluster@^8.0.1` — Marker clustering
- `clsx@^2.1.1` + `tailwind-merge@^3.6.0` — Class utilities

---

## Directory Structure

```
EG-Maps/
├── components/           # Vue components (9 main + 5 UI primitives)
│   ├── ui/              # Reusable UI primitives
│   ├── GlobalStats.vue  # Statistics panel
│   ├── GlobeView.vue    # 3D globe visualization (1523 lines)
│   ├── UnifiedMap.vue  # 2D map visualization (1688 lines)
│   ├── MapControls.vue  # Search, filters, fullscreen controls
│   ├── ProjectFilterPanel.vue
│   ├── SpeciesFilterPanel.vue
│   ├── RedBookDatabases.vue
│   └── Icon.vue, LoadingSpinner.vue
├── composables/          # Vue composables (shared logic)
│   ├── useDarkMode.ts    # Dark mode toggle
│   ├── useI18n.ts        # Internationalization
│   ├── useMediaQuery.ts  # Responsive utilities
│   ├── useMapCluster.ts  # Marker clustering
│   ├── useMapConnections.ts
│   ├── useMapHexGrid.ts
│   ├── useMapLibre.ts
│   ├── useMapMarkers.ts
│   ├── useMapPopup.ts
│   ├── useSpeciesData.ts
│   └── useSpeciesIcons.ts
├── lib/                  # Utility modules
│   ├── types.ts          # TypeScript interfaces
│   ├── constants.ts      # Route paths, dataset keys
│   ├── colors.ts         # Color utilities
│   ├── utils.ts          # Helper functions (cn, formatCompact, etc.)
│   ├── project-data.ts   # Project grants data
│   ├── map-utils.ts      # Map-specific utilities
│   ├── map-effects.ts    # Visual effects
│   └── image-utils.ts    # Image handling
├── pages/                # Route pages
│   ├── index.vue         # Landing/home page
│   ├── globe.vue         # Redirects to /project-grants/3d
│   ├── info.vue          # Info & feedback page
│   ├── project-grants/   # Project grants routes
│   └── endangered-species/ # Species routes
├── locales/              # i18n translation files
│   ├── en.json, es.json, fr.json, pt.json
├── public/data/          # Static species data (JSON)
├── assets/css/           # Global styles (main.css)
├── layouts/              # Nuxt layouts
├── plugins/              # Nuxt plugins (client-only)
├── scripts/              # Utility scripts
├── tests/                # Playwright E2E tests
└── nuxt.config.ts        # Nuxt configuration
```

---

## Key Conventions & Patterns

### Component Structure
- Use **Composition API** (`<script setup>`) with TypeScript
- Components use `useI18n()` for translations via `t('key')` function
- Dark mode managed via `useDarkMode()` composable
- All interactive elements must have proper `aria-label` attributes

### State Management
- Use component-local `ref()`/`reactive()` for component state
- Use `useState()` in composables for shared state (persisted)
- Filter state managed in filter panel components and passed up

### Data Loading
- Project grants: Import from `~/lib/project-data.ts` (static)
- Species data: Fetch from `/data/species/index.json` via `onMounted`
- Species images: Constructed from Wikimedia Commons URLs

### Styling Guidelines
- Use **Tailwind CSS** utilities over custom CSS where possible
- Use CSS custom properties for theme values (in `main.css`)
- Dark mode via `.dark` class on `<html>` element
- Responsive design with `clamp()` for fluid sizing

### i18n Pattern
```typescript
const { t } = useI18n()
const label = t('nav.home') // Returns translated string
```

---

## Important Technical Notes

### Map Components (Critical)
- `UnifiedMap.vue` (1688 lines) and `GlobeView.vue` (1523 lines) are **heavily duplicated**
- ~40% of code is identical between them (markers, connections, hex grid, popups)
- A `useMapLibre` composable should eventually extract shared MapLibre lifecycle

### High-Performance Marker Rendering for Large Datasets
For datasets with 500+ points (e.g., 4000+ endangered species), the app uses MapLibre's native GeoJSON clustering:

1. **New composable**: `composables/useGeoJSONMarkers.ts`
   - GPU-accelerated vector rendering instead of DOM markers
   - Handles 10,000+ points smoothly
   - Native MapLibre clustering (no Supercluster overhead)

2. **How it works**:
   - Data is converted to GeoJSON FeatureCollection
   - Added as a `geojson` source with `cluster: true`
   - Circle and symbol layers render clusters and points
   - Click handlers find original data by coordinate matching

3. **Automatic fallback**:
   - If `visibleSpecies.value.length <= 500`, uses DOM markers (existing Supercluster approach)
   - Can be disabled by setting `useNativeGeoJSON = false`

### MapLibre Initialization
```typescript
import maplibregl from 'maplibre-gl'
// Create map instance, add layers, manage markers
// Use transformRequest for MapTiler tile authentication
```

### Popup Handling
- Popups built as HTML strings with `escapeHtml()` for user-facing content
- Full-screen overlay popups managed via `showFullscreenPopup` state
- Keep popup visible via `keepPopupFullyVisible()` function (has known bug — offset not applied)

### Hex Grid
- Canvas-based hex grid overlay
- Toggle via `showHexGrid` state
- Debounced resize handling for performance

### Connection Lines
- GeoJSON line features between project/species locations
- Optional toggle via `showConnections` state
- Curved lines using bezier interpolation

---

## Build & Deployment

### Build Commands
```bash
pnpm build       # Production build (nuxt build)
pnpm generate    # Static site generation (nuxt generate)
pnpm dev         # Development server
pnpm preview     # Preview production build
pnpm lint        # Run ESLint
pnpm test        # Run Vitest tests
```

### Static Generation
- `nuxt generate` creates static HTML for all routes
- Prerendered routes: `/`, `/globe`, `/info`, `/project-grants`, `/project-grants/3d`, `/endangered-species`, `/endangered-species/3d`
- Output in `dist/` directory for GitHub Pages deployment

### Environment Variables
- `NUXT_PUBLIC_MAPTILER_API_KEY` or `MAPTILER_API_KEY` — MapTiler tile authentication
- `NUXT_APP_BASE_URL` — Base URL for deployment (default: `/`)

---

## Testing

### Unit Tests (Vitest)
```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
```
- Tests in `tests/utils.test.ts`

### E2E Tests (Playwright)
- Config: `playwright.config.ts` and `playwright.static.config.ts`
- Tests in `tests/routes.spec.ts`

---

## Known Issues & Technical Debt

| Priority | Issue | Location |
|----------|-------|----------|
| Critical | `UnifiedMap.vue` and `GlobeView.vue` duplication | Both map components |
| High | `keepPopupFullyVisible()` calculates offset but never applies it | UnifiedMap.vue:408-411 |
| High | MapTiler API key exposed in client-side code | nuxt.config.ts |
| Medium | No ESLint/Prettier config | Project root |
| Medium | `formatCompact()` duplicated | index.vue, info.vue |
| Medium | Inline `<style>` injection in GlobeView | GlobeView.vue:783 |

---

## Code Style Guidelines

### TypeScript
- Strict TypeScript mode enabled (`strict: true`, `typeCheck: true`)
- Define interfaces for all data structures in `lib/types.ts`
- Use explicit return types for composables

### Vue Components
- Prefer `<script setup>` syntax
- Use `defineProps<{...}>()` for prop types
- Use `computed()` for derived state
- Use `onMounted()` for client-side initialization

### CSS
- Use Tailwind utilities first
- Custom CSS only for complex animations/effects
- Use CSS variables for theme colors in `main.css`

### Git
- Use conventional commit messages
- Add Co-authored-by for collaborative work
- Don't commit `dist/`, `node_modules/`, or `.output/`

---

## Quick Reference

### Adding a New Translation
1. Edit `locales/en.json` (and other locale files)
2. Access via `t('path.to.key')` in components

### Adding a New Map Layer
1. Create layer in MapLibre using `map.addLayer()`
2. Handle visibility via source/layer visibility options

### Modifying Marker Styles
- Edit `createUnifiedMarkerElement()` or `createSpeciesMarkerElement()`
- Marker images from Wikimedia Commons, fallback to placeholder SVGs

### Adding New Filter Options
1. Add filter state in filter panel component
2. Emit changes to parent component
3. Filter data in parent before rendering

---

*Last updated: 2026-05-23*