# EG-Maps Modernization Tasks

## Phase 0: Architecture Restructuring

### 0.1 Create shared map composable
- [ ] `composables/useMapShared.ts` — extract shared init/teardown, watchers, popup wrappers, focus trap, loading state

### 0.2 Rename & restructure components
- [ ] `components/UnifiedMap.vue` → `components/map/MapView2D.vue` — strip shared logic, keep 2D-specific
- [ ] `components/GlobeView.vue` → `components/map/MapView3D.vue` — strip shared logic, keep 3D-specific (globe projection, auto-rotation, star field)

### 0.3 Update page references
- [ ] `pages/project-grants/index.vue` — update import/component name
- [ ] `pages/project-grants/3d.vue` — update import/component name
- [ ] `pages/endangered-species/index.vue` — update import/component name
- [ ] `pages/endangered-species/3d.vue` — update import/component name

## Phase 1: Critical Performance Fixes

### 1.1 Marker diffing (stop full teardown)
- [ ] `composables/useMapMarkerOrchestrator.ts` — add marker pooling with diff-based add/remove

### 1.2 Fix watcher cascade (double rebuild)
- [ ] `components/map/MapView2D.vue` — coalesce watchers with nextTick, remove syncAfterFilter duplicate
- [ ] `components/map/MapView3D.vue` — same coalescing

### 1.3 Throttle map.project() during drag
- [ ] `composables/useMapCore.ts` — replace per-marker project() with bounds-based culling

### 1.4 Fix particle memory leak
- [ ] `composables/useMapConnections.ts` — cleanupParticles() must call teardownVisibilityTracking()
- [ ] `lib/map-effects.ts` — resize logic off RAF hot path, manual array compaction

### 1.5 Remove all console.log from production paths
- [ ] `components/map/MapView2D.vue` — line 239, 442, 640
- [ ] `components/map/MapView3D.vue` — line 435
- [ ] `composables/useMapMarkerOrchestrator.ts` — lines 124, 128, 130, 146, 237
- [ ] `composables/useSpeciesData.ts` — lines 180, 182, 185
- [ ] `pages/endangered-species/index.vue` — line 28

## Phase 2: High-Impact Optimizations

### 2.1 Single-pass filter in SpeciesFilterPanel
- [ ] `components/SpeciesFilterPanel.vue` — merge 4 computed properties into 1 pass
- [ ] Merge 5 chained .filter() calls into single pass

### 2.2 Fix GeoJSON cache with WeakMap
- [ ] `composables/useGeoJSONMarkers.ts` — replace module-level ref cache with WeakMap

### 2.3 Remove render-blocking Google Fonts
- [ ] `assets/css/main.css` — remove @import
- [ ] `nuxt.config.ts` — add preload link tags

### 2.4 Move MapLibre CSS to map components
- [ ] `nuxt.config.ts` — remove from global css
- [ ] `components/map/MapView2D.vue` — add <style> import
- [ ] `components/map/MapView3D.vue` — add <style> import

### 2.5 Fix Playwright in devDependencies
- [ ] `package.json` — move playwright to devDependencies

### 2.6 Disable typeCheck during builds
- [ ] `nuxt.config.ts` — typeCheck: false

### 2.7 Reduce CSS duplication
- [ ] `assets/css/main.css` — merge duplicate :root, @media, .filter-* blocks

### 2.8 Fix formatRelativeTime allocation
- [ ] `lib/utils.ts` — module-level Intl.RelativeTimeFormat singleton

### 2.9 Single-pass escapeHtml
- [ ] `lib/utils.ts` — replace 4 sequential regex with char map

### 2.10 Fix debounce return type
- [ ] `lib/utils.ts` — change never[] to any[]

## Phase 3: Architectural Modernization

### 3.1 Add code splitting
- [ ] `nuxt.config.ts` — add manualChunks for maplibre, pdf-export, vendor

### 3.2 Add AbortController to fetches
- [ ] `pages/index.vue` — abort on unmount
- [ ] `pages/info.vue` — abort on unmount
- [ ] `components/RedBookDatabases.vue` — abort on unmount

### 3.3 Remove deep watchers
- [ ] `components/map/MapView2D.vue` — flyToTarget watcher
- [ ] `components/map/MapView3D.vue` — flyToTarget watcher
- [ ] `composables/useRareEarthController.ts` — layerVisibility watcher

### 3.4 Globe auto-rotation optimization
- [ ] `components/map/MapView3D.vue` — stop RAF when tab hidden, use easeTo not setCenter

### 3.5 Star field CSS → canvas
- [ ] `assets/css/main.css` — remove star field CSS
- [ ] `components/map/MapView3D.vue` — add canvas-based star rendering

### 3.6 Fix 20s loading timeout not cleared
- [ ] `components/map/MapView2D.vue` — clearTimeout on load success
- [ ] `components/map/MapView3D.vue` — clearTimeout on load success

### 3.7 Disable devtools in production
- [ ] `nuxt.config.ts` — devtools conditional on NODE_ENV

### 3.8 Add @nuxt/image for image optimization
- [ ] `nuxt.config.ts` — add module
- [ ] `package.json` — add dependency

## Phase 4: Testing & Cleanup

### 4.1 Run builds
- [ ] `pnpm lint` — fix any lint errors
- [ ] `pnpm build` — verify build succeeds

### 4.2 Delete tasks.md
- [ ] Remove the tasks.md file
