## Active Crews audit (read-only; no repository files changed)

### Root cause: connection feature cap is global, and input order is region-blocked

- `/home/ubuntu/EG-Maps/lib/map-effects.ts:186-236`, `buildCrewConnectionFeatures()` filters to active, valid locations, groups them by `region`, then sets **one global budget**: `const maxConnections = isMobile ? 4 : 8` (`:199`).
- The outer loop iterates `byRegion` insertion order (`:201`), and exits the entire function when the global budget is reached (`:206`: `if (features.length >= maxConnections) return features`).
- `/home/ubuntu/EG-Maps/public/data/crews-locations.json` has 145 locations (128 active), ordered in contiguous region blocks: North America first (26 total/18 active), then South America (9/7), Europe (9/8), Africa (82/78), East Asia (4/4), South Asia (15/13). Consequently, desktop builds the first 8 North America edges and mobile the first 4 North America edges; no later region is reached. The existing dev log in `/home/ubuntu/EG-Maps/composables/useMapConnections.ts:139` should show `crewLocations=145, features=8` (desktop) or `features=4` (mobile).
- `createMapParticleSystem()` in `/home/ubuntu/EG-Maps/lib/map-effects.ts:435-488` randomly selects from the already-built feature array. Its `particleMaxCount` (`:438`) limits simultaneous particles, not geography; therefore every particle is North American because the upstream array contains only North American arcs.
- Connections are additionally same-region only (`:190-215`); this is intentional grouping behavior, but it means “all connected crews” requires generating connections within every region, not just removing the status filter.

### Rendering path and why markers are not the cause

- Both pages load the same data and shared MapLibre pipeline:
  - 2D: `/home/ubuntu/EG-Maps/pages/active-crews/index.vue:9,57-71` → `MapView2D`.
  - 3D: `/home/ubuntu/EG-Maps/pages/active-crews/3d.vue:9,57-71` → `MapView3D`.
  - `/home/ubuntu/EG-Maps/components/MapView2D.vue:184-193` calls `useMapBase({ isGlobe:false })`; `/home/ubuntu/EG-Maps/components/MapView3D.vue:213-249` calls the same composable with `isGlobe:true`. The 3D route is MapLibre globe projection, not the separate Three.js `GlobeView`/`useThreeGlobe` hero path.
- `/home/ubuntu/EG-Maps/composables/useMapBase.ts:613-630` creates crew connections at map load; `:733-738` reacts to the asynchronously fetched crew locations and rebuilds both markers and connections; `:772-780` repeats this when the connection toggle changes. Thus the async fetch is not the geographic bias.
- Main marker rendering is in `/home/ubuntu/EG-Maps/composables/useMapMarker.ts`: `GEOJSON_CONVERTERS`/`toCrewGeoJSON` (`:647-725`), region mosaics (`:729-759`), and location points (`:761-800`). It includes all valid crew locations and does not restrict them to North America. Active Crews is explicitly non-clustered in `:206-217` (`ds !== 'active-crews'`). The separate `/home/ubuntu/EG-Maps/composables/useCrewEmbedMarkers.ts` also maps all supplied regions/locations and is embed-only; its `MAX_BUBBLES` is a visual marker cap, not the particle cap.
- The connection path deliberately excludes inactive locations at `map-effects.ts:187`. If “all crews” includes inactive records, that filter must be changed; for the Active Crews label, retaining active-only is normally correct.

### Recommended implementation direction (do not apply during this audit)

Change only `buildCrewConnectionFeatures()` in `/home/ubuntu/EG-Maps/lib/map-effects.ts`:

1. Replace the single global `maxConnections`/early return with a per-region strategy, or build a deterministic spanning chain/ring per region. For example, iterate every `byRegion` entry, connect each active location to the next location in that region (a ring gives every location an endpoint), and apply only an explicitly documented per-region/per-device budget if performance requires one.
2. If retaining the current stable-random target selection, remove the global `return` and track a per-region budget; otherwise large Africa regions can dominate the particle sample. A chain/ring is preferable because it guarantees every active location participates rather than merely adding more arbitrary edges.
3. Keep `group: region` and `CREW_REGION_COLORS` (`:177-184`) so lines remain region-identifiable. Do not increase `particleMaxCount` as the primary fix; it cannot reveal locations absent from `connectionFeatures`.
4. If cross-region connections are required by product semantics, add an explicit cross-region edge policy after each region has coverage; current code intentionally targets only `processLocs` within the same region (`:210-215`).

### Validation steps

1. Static data check: confirm 145 features, 128 active, valid coordinates, and all six non-empty regions from `public/data/crews-locations.json`.
2. Unit-level check (without UI): call exported `buildMapConnectionFeatures({ dataset:'active-crews', crewLocations, isMobile:false/true, projects:[], species:[] })`; assert nonzero features for North America, South America, Europe, Africa, East Asia, and South Asia, and assert every returned feature has `properties.dataset === 'active-crews'` and a valid three-point LineString.
3. Browser check both `/active-crews` and `/active-crews/3d`: wait for `crews-locations.json`, enable connections/particles, and inspect the existing `[useMapConnections] addConnections` log. Before the fix it reports 8/4 features and only `group: 'North America'`; after the fix it must report features from every region. Verify animated particles appear over multiple regions on both projections.
4. Marker regression check: zoom from the initial world view through zoom 7+ and verify region mosaics, then location dots for Africa, South America, Europe, East Asia, and South Asia. This exercises `useMapMarker` independently of the particle overlay.
5. Run existing checks (`pnpm test`, `pnpm lint`) and add/execute a focused Active Crews 2D/3D Playwright check. Existing `/home/ubuntu/EG-Maps/tests/map-rendering.spec.ts` and `tests/routes.spec.ts` do not currently include `/active-crews` or `/active-crews/3d`, so route coverage is presently a gap.
