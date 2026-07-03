 ---

   Critical Bugs (Will crash or produce wrong results)
   ┌───┬───────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────┐
   │   │ Location                                      │ Issue                                                                                           │
   ├───┼───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────┤
   │ 1 │ composables/useObservatoryControls.ts:249-298 │ setupObservatory reassigns let bindings but watchers/computed captured the old refs — stats and │
   │   │                                               │ filters will never update                                                                       │
   │ 2 │ composables/useUserPin.ts:76                  │ watch not imported — runtime ReferenceError                                                     │
   │ 3 │ composables/useUrlState.ts:76,80              │ watch and onScopeDispose not imported — runtime ReferenceError                                  │
   │ 4 │ composables/useObservatoryPopup.ts:294        │ useI18n not imported in label() — runtime ReferenceError                                        │
   │ 5 │ lib/supabase.ts:15                            │ Broken client cached forever when env vars are empty                                            │
   │ 6 │ components/GlobeView.vue:472-478              │ wheel handler doesn't call pauseAutoRotate() — globe keeps rotating while zooming               │
   └───┴───────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────┘
   ---

   High Severity (Memory leaks, security, data corruption)
   ┌────┬─────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────┐
   │    │ Location                                    │ Issue                                                                              │
   ├────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ 7  │ composables/useThreeGlobe.ts:109-114        │ WebGL resources (textures, geometries, materials) never disposed — GPU memory leak │
   │ 8  │ composables/useThreeGlobe.ts:81-91          │ GSAP ScrollTrigger instances never killed — continues manipulating disposed scene  │
   │ 9  │ composables/useWaterLayers.ts:132           │ XSS: popup name injected into HTML without escaping                                │
   │ 10 │ composables/useVulcanCircles.ts:126-128     │ Marker created but never removed in cleanup                                        │
   │ 11 │ composables/useOfflineTiles.ts:46,67        │ navigator/window accessed without SSR guard — crashes during server render         │
   │ 12 │ composables/useEnterpriseMarkers.ts:114-118 │ speculatorIndex data lost on style reload retry                                    │
   │ 13 │ components/UnifiedMap.vue:592               │ loadingTimeout not cleared on retry — dangling timer                               │
   │ 14 │ components/GlobeView.vue:532                │ Same loadingTimeout leak on retry                                                  │
   │ 15 │ components/MapControls.vue:573-585          │ fullscreen state desyncs — no fullscreenchange listener                            │
   │ 16 │ lib/map-effects.ts:7 vs lib/constants.ts:9  │ Conflicting DatasetKey types (3 vs 4 members)                                      │
   │ 17 │ lib/colors.ts:14-19                         │ NaN passes typeof === 'number' check, projects get wrong color                     │
   │ 18 │ lib/map-export.ts:65                        │ Canvas height=0 produces Infinity width in PDF export                              │
   │ 19 │ package.json:40                             │ playwright (200MB) in dependencies instead of devDependencies                      │
   │ 20 │ components/MapControls.vue:501              │ Unsafe cast as unknown as CrewRegionData[] — silent failures                       │
   └────┴─────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────┘
   ---

   Medium Severity (Stale state, partial cleanup, logic errors)
   ┌────┬─────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
   │    │ Location                                    │ Issue                                                                  │
   ├────┼─────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
   │ 21 │ composables/useMapConnections.ts:153        │ onUnmounted doesn't clean up particle system or map layers             │
   │ 22 │ composables/useMapMarkerOrchestrator.ts:517 │ No automatic cleanup on unmount                                        │
   │ 23 │ composables/useGeoJSONMarkers.ts:136-143    │ removeLayer without existence check — throws if layer missing          │
   │ 24 │ composables/useMapCluster.ts                │ No onScopeDispose for debounce timer                                   │
   │ 25 │ composables/useToast.ts                     │ Timers not cleared on scope dispose                                    │
   │ 26 │ composables/useSpeciesData.ts:118           │ Type-unsafe cache: SpeciesIndexItem[] stored as Species[]              │
   │ 27 │ components/UnifiedMap.vue:390,690           │ filterDebounceTimer not cleared on unmount                             │
   │ 28 │ components/UnifiedMap.vue:545-558           │ pendingRebuildRAF not cancelled on unmount                             │
   │ 29 │ components/GlobeView.vue:479                │ No touchend handler — auto-rotation never resumes on mobile            │
   │ 30 │ components/GlobeView.vue:135,151,157        │ All overlays missing useFocusTrap                                      │
   │ 31 │ lib/utils.ts:11-15                          │ formatCompact fails on negative numbers                                │
   │ 32 │ lib/enterprise-data.ts:334                  │ startsWith matching produces false positives                           │
   │ 33 │ lib/observatory-analysis.ts:96-97           │ Year fields initialized to 0 instead of null — looks like "year 0 AD"  │
   │ 34 │ lib/species-utils.ts:33                     │ getLocalizedSpecies can return incomplete object typed as Species      │
   │ 35 │ lib/crew-data.ts:155                        │ totalMembers (1241) doesn't match sum of regions (1233)                │
   │ 36 │ composables/useCulturalLayers.ts:198        │ Injected <style> element never removed                                 │
   │ 37 │ composables/useOfflineTiles.ts:219          │ getStats() loads ALL tile ArrayBuffers into memory just for byte count │
   └────┴─────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
   ---

   Low Severity (Code quality, i18n, accessibility)
   ┌────┬───────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────┐
   │    │ Location                                      │ Issue                                                                │
   ├────┼───────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────┤
   │ 38 │ Multiple locale files                         │ Missing translation keys across es.json, pt.json, ar.json, ja.json   │
   │ 39 │ en.json                                       │ Duplicate info key                                                   │
   │ 40 │ components/GlobalStats.vue:25                 │ Missing aria-expanded on toggle button                               │
   │ 41 │ components/MapControls.vue:94                 │ Search dialog has no focus trap                                      │
   │ 42 │ lib/map-utils.ts:434 / enterprise-data.ts:329 │ Duplicate getPhaseColor with different lookup tables                 │
   │ 43 │ lib/game-icons-map.ts:286                     │ Icon scoring scales differ across algorithms — comparison unreliable │
   │ 44 │ lib/project-data.ts                           │ Multiple entries have org names in country_province field            │
   │ 45 │ nuxt.config.ts:71                             │ Inline innerHTML script bypasses CSP nonce support                   │
   │ 46 │ composables/useGeoLocate.ts:146               │ searchCity doesn't reset previous error                              │
   │ 47 │ composables/useOfflineTiles.ts:145            │ cachedTiles++ doesn't account for overwrites                         │
   └────┴───────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────┘
   ---

   Recommended Priority Order

   1. Fix criticals 1-6 — These cause runtime crashes or completely broken features
   2. Fix high-severity security issues (items 9, 45) — XSS and CSP bypass
   3. Fix memory leaks (items 7-8, 10-14, 21-22, 27-28) — Especially the Three.js/WebGL leaks which accumulate GPU memory
   4. Fix the playwright dependency placement (item 19) — Easy fix, saves 200MB in production

   Would you like me to start fixing any of these? I'd suggest starting with the critical bugs since they're actual runtime crashes.


 ● Agent "Review Vue components for bugs" completed

 Thinking
 │ The background agent for reviewing Vue components has completed. I already have all the review data I need. Let me check if there are any additional
 │ findings from this agent that weren't covered in my earlier consolidated report. Let me review the new findings and see if there's anything significant
 │ … +13 rows (Ctrl+O)
 │ 12. `GrantEditModal.vue` - Amount fields incorrectly convert 0 to empty string with `||` operator
 │ 13. `RegistryModal.vue` - Invalid dates aren't being handled
 │ 14. `DotField.vue` - RequestAnimationFrame loop continues running even when the element is off-screen
 ▪ The final component review agent has completed. Here are additional findings beyond my earlier report:

   ---

   Additional Component Issues (from final review)
   ┌──────────┬─────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────┐
   │ Severity │ Location                            │ Issue                                                                                             │
   ├──────────┼─────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────┤
   │ HIGH     │ UnifiedMap.vue:648-652              │ Watcher () => [props.rareEarthPoints, props.rareEarthPolygons] creates a new array every render — │
   │          │                                     │ fires on every re-render regardless of data changes                                               │
   │ HIGH     │ grants/GrantDetailModal.vue:88      │ `userVote                                                                                         │
   │ HIGH     │ grants/GrantEditModal.vue:103-114   │ `form.amount_max = g.amount_max                                                                   │
   │ MEDIUM   │ GooeyNav.vue:126-152                │ setTimeout-based particle DOM mutations never cancelled on unmount                                │
   │ MEDIUM   │ observatory/GeoLocateModal.vue:~130 │ nextTick(() => cityInput.focus()) runs on mount, not when modal opens — focus fires at wrong time │
   │ MEDIUM   │ observatory/YearSlider.vue          │ Rapid play/pause can lose interval reference before cleanup                                       │
   │ MEDIUM   │ UnifiedMap.vue:1294-1356            │ CSS @media block not properly closed — .species-popup-lang-bar styles accidentally scoped to      │
   │          │                                     │ mobile only                                                                                       │
   │ MEDIUM   │ CommandPalette.vue                  │ Ctrl+K listener doesn't check if user is typing in an input — hijacks keystroke                   │
   │ MEDIUM   │ grants/RegistryModal.vue:20         │ new Date(grant.created_at).toLocaleDateString() — shows "Invalid Date" when created_at is null    │
   │ MEDIUM   │ DotField.vue                        │ requestAnimationFrame loop runs continuously even when off-screen — no IntersectionObserver pause │
   │ LOW      │ RedeCorporativa.vue:200,208         │ Non-null assertions on parentElement and getContext('2d') — can crash if detached                 │
   │ LOW      │ Multiple observatory components     │ Geolocation accessed without feature-detection guard                                              │
   └──────────┴─────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────┘
   ---

   Grand Total: ~60 issues across the entire codebase

   Breakdown:
   - 6 Critical (runtime crashes)
   - 20 High (memory leaks, security, data corruption)
   - 25 Medium (stale state, logic errors, partial cleanup)
   - 12 Low (accessibility, code quality, i18n)

   Would you like me to start fixing these? I'd recommend tackling them in this order:
   1. Critical crashes (missing imports, broken reactivity) — quick wins
   2. Security (XSS in useWaterLayers.ts) — small but important
   3. Memory leaks (Three.js cleanup, timer cleanup) — prevents degradation over time
   4. Logic bugs (vote display, amount fields, watcher array) — affects user-facing correctness
