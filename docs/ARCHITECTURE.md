# Architecture

## Overview

EG-Maps is a static-generated Nuxt 3 application that renders interactive data visualizations on 2D maps (MapLibre GL) and 3D globes (Three.js). The app is fully client-rendered ("spa") with static prerendering for all routes.

```
Browser → MapTiler Tiles (satellite imagery)
        → Supabase (grants, auth, observatory)
        → Static JSON (species data)
        → Wikimedia Commons (species images)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 3 (static generation) |
| Language | TypeScript (strict) |
| UI | Vue 3 (Composition API) |
| Styling | Tailwind CSS v3 |
| Map Engine | MapLibre GL JS |
| 3D Globe | Three.js via custom composable |
| Icons | Iconify (Lucide) |
| Backend | Supabase (Postgres + Edge Functions) |
| Testing | Vitest + Playwright |

## Directory Layout

```
EG-Maps/
├── components/       # Vue components (organized by domain)
│   ├── ui/          # Reusable UI primitives
│   ├── map/         # Map popup components
│   ├── grants/      # Grant management modals
│   ├── observatory/ # Observatory panels & tabs
│   └── ...
├── composables/      # Shared Vue composables
│   ├── useMapPopup/ # Popup registry (sub-composables)
│   └── ...
├── lib/              # Pure utility modules (no Vue dependency)
├── pages/            # Route pages
├── layouts/          # App layout
├── plugins/          # Client-side plugins
├── stores/           # Pinia stores
├── locales/          # i18n translation files
├── supabase/         # Edge functions
├── scripts/          # CLI utilities
└── tests/            # Unit + E2E tests
```

## Component Architecture

All components use `<script setup>` with TypeScript. Shared logic lives in composables. Data flows via props/emits for local state and composable returns for shared state.

- **`UnifiedMap.vue`** — 2D MapLibre map (1688 lines). Markers, clustering, hex grid, popups.
- **`GlobeView.vue`** — 3D Three.js globe (1523 lines). Particle effects, connection arcs, markers.
- **`MapControls.vue`** — Search bar, dataset toggle, filters, fullscreen.

These three components share roughly 40% identical code (marker rendering, popup building, data filtering). A shared `useMapBase` composable handles the common logic.

## Data Sources

| Data | Source | Format | Loading |
|------|--------|--------|---------|
| Project Grants | `lib/project-data.ts` | Static TypeScript | Synchronous import |
| Endangered Species | `/data/species/index.json` | Static JSON | `onMounted` fetch |
| Species Images | Wikimedia Commons | Image URLs | Constructed in composable |
| Supabase Grants | Supabase REST API | JSON | `useGrants` composable |
| Observatory Data | Supabase REST API | JSON | `useVulcanObservatoryPage` |

## Routing

The app uses Nuxt file-based routing. Key routes:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `pages/index.vue` | Landing page |
| `/project-grants` | `pages/project-grants/index.vue` | 2D grants map |
| `/project-grants/3d` | `pages/project-grants/3d.vue` | 3D grants globe |
| `/endangered-species` | `pages/endangered-species/index.vue` | 2D species map |
| `/endangered-species/3d` | `pages/endangered-species/3d.vue` | 3D species globe |
| `/vulcan-observatory` | `pages/vulcan-observatory/index.vue` | Observatory 2D |
| `/active-crews` | `pages/active-crews/index.vue` | Crews 2D |
| `/eg-grants` | `pages/eg-grants/index.vue` | Grants dashboard |
| `/info` | `pages/info.vue` | About & feedback |
| `/globe` | `pages/globe.vue` | Redirects to 3D |

## State Management

- **Component-local** `ref()` / `reactive()` for component state
- **`useState()`** in composables for shared reactive state
- **Pinia stores** (`stores/ui.ts`, `stores/map.ts`) for cross-cutting UI/map state
- **URL hash** (`useUrlState`) for filter/shareable state

## Map Rendering

### 2D Map (MapLibre GL)

- MapLibre GL JS with MapTiler satellite tiles
- DOM markers via `useMapMarkers` (up to ~500 points)
- GeoJSON source with native clustering for 500+ points (`useGeoJSONMarkers`)
- Connection lines as GeoJSON layers (`useMapConnections`)
- Canvas hex grid overlay (`useMapHexGrid`)

### 3D Globe (Three.js)

- Custom Three.js implementation in `useThreeGlobe`
- Spherical projection with texture mapping
- Particle animations and connection arcs
- Marker sprites with billboarding

## Backend (Supabase)

13 database tables, 5 edge functions. See:

- `docs/DATABASE.md` — Full schema documentation
- `docs/API.md` — Edge function API reference
