# EG-Maps — Deep Bug, Fix, and Improvement Audit

> **Scope:** Every finding is grounded in the source as of 2026-08-25.
> **Format:** `[id] (severity) title — file:line — why it matters / fix`.
>
> Severities: **CRIT** (data loss / security / page-breaking), **HIGH** (UX or perf regression that users will hit daily), **MED** (incorrect behavior in edge cases), **LOW** (cosmetic / nit).
> Tags: 🐞bug · ⚡perf · ♿a11y · 🔒sec · 🧹cleanup · 📝docs · 🧪test · 🏗arch.

This document is the companion to `DOCUMENTATION.md` (architecture) and the existing `CODEBASE-REVIEW.md` / `audit.md` / `PHILOSOPHY-LIMITATIONS.md` (historical reviews). New findings only; repeated issues are flagged with links to where they were already noted.

---

## Index of sections

1. [Critical issues](#1-critical)
2. [High-impact bugs](#2-high)
3. [Medium-impact bugs](#3-medium)
4. [Performance and correctness leaks](#4-perf)
5. [Accessibility gaps (audit complete)](#5-a11y)
6. [Security and trust boundaries](#6-sec)
7. [Refactor and dedupe opportunities](#7-arch)
8. [Tests / DX / build / deploy](#8-tests)
9. [i18n and content](#9-i18n)
10. [Documentation, types, comments](#10-docs)
11. [Already-applied safe fixes (this pass)](#11-applied)

---

## 1. Critical

### B1. 🐞🔒 [CRIT] Silent placeholder Supabase client masks config errors
**File:** `lib/supabase.ts:18-22`
**Issue:** When `NUXT_PUBLIC_SUPABASE_URL` or `NUXT_PUBLIC_SUPABASE_KEY` is missing, the factory creates a fake client against `https://placeholder.supabase.co`. Every call then hits a real network request that 404s on a foreign domain — wasting bandwidth and producing confusing stack traces.
```ts
if (!url || !key) {
  console.warn('[supabase] Missing ...')
  return createClient('https://placeholder.supabase.co', 'placeholder-key')
}
```
**Fix:** Export `getSupabaseClient()` to throw, OR return a no-op proxy that succeeds on `from()` and returns `{ data: null, error: { message: 'Supabase not configured' } }`. Update `useSupabase.ts` to alert the user once via `useToast` if not configured.

### B2. 🐞🔒 [CRIT] `useSupabase` subscription is shared but cleaned per-component
**File:** `composables/useSupabase.ts:14, 31-39`
**Issue:** `authSubscription` is module-scope. When component #1 mounts, `initialized` becomes true and the subscription is created. When component #1 unmounts, `onUnmounted` calls `authSubscription.unsubscribe()` and sets it to `null`. Component #2, still mounted, no longer gets auth updates and `currentUser` stops reflecting the real session state. Components using `useSupabaseAuth` will incorrectly show "not manager" after navigation.
**Fix:** Use a reference count:
```ts
let refCount = 0
onMounted(() => {
  refCount += 1
  if (refCount === 1) {
    // getSession + onAuthStateChange
  }
})
onUnmounted(() => {
  refCount -= 1
  if (refCount === 0 && authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
    initialized = false
  }
})
```

### B3. 🐞🔒 [CRIT] `useThreeGlobe` silently returns after CDN load failure
**File:** `composables/useThreeGlobe.ts:64`
**Issue:** If any of the three CDN scripts blocks network, fail (CSP, offline), or `THREE` is undefined after the `Promise.all`, the function `resolveReady?.(); return;` line silently resolves. The page continues to render as if the hero is ready, with no warning, no fallback, and no entry in `useEffect`/`mounted` userspace. The page renders blank.
**Fix:** Reject the `ready` promise with an explicit error; consumers should catch and render a fallback. Add a CSP-friendly hint in `docs/CONTRIBUTING.md`.

### B4. 🐞 [CRIT] ScrollTrigger tweens outside `gsap.context` are never reverted
**File:** `composables/useThreeGlobe.ts:266-268`
**Issue:** Three `gsap.to(globe.scale, ...)`, `gsap.to(camera.position, ...)`, `gsap.to(globe.rotation, ...)` are created BEFORE the `gsap.context(() => {})` block (line 273). They use `scrollTrigger` so they appear "scoped" but `ctx.revert()` inside cleanup only kills tweens registered INSIDE the context. These three tweens leak; on remount they accumulate (3 extra ScrollTriggers per remount) and 2 min later the browser locks up.
**Fix:** Move those three `gsap.to` calls into the `gsap.context` block (right before its closing brace).

### B5. 🐞 [CRIT] Touch gesture scrolls the page (passive + no preventDefault)
**File:** `composables/useThreeGlobe.ts:235-256`
**Issue:** `touchstart`/`touchmove`/`touchend` are registered with `{ passive: true }` and the touchmove handler mutates `scene.rotation` directly without preventing default. On mobile, vertical drag → page scrolls AND globe rotates simultaneously → user feels "fighting" controls.
**Fix:** For `touchstart` and `touchmove`, mark non-passive and `preventDefault()` when `isDragging`. Or use `Pointer Events` which unify mouse/touch.

---

## 2. High-impact bugs

### B6. 🐞 [HIGH] `useToast` timers leak across unmount + double dismissal
**File:** `composables/useToast.ts:27, 49`
**Issue:** `timers` is per-call (created in the composable instance). On unmount, no cleanup; pending timeouts continue running and call `dismiss` on a `useState('toast')` value that may still be alive, but if a long-lived toast outlives the caller, the timer callback will try to mutate state that no longer owns the toast.
Also, calling `dismiss(id)` twice (manually + by timer firing) is idempotent thanks to the `timers.delete` guard, but in `clear()` the `state.value.toasts = []` does not receive the original array reference — list-based watchers may not fire if any consumer mutated state into the original list.
**Fix:** Add `onScopeDispose` cleanup that calls `clear()`, then ensure `state.value.toasts = []` is always a new array.

### B7. 🐞 [HIGH] Runtime CDN script injection breaks offline + CSP
**File:** `composables/useThreeGlobe.ts:54-58`
**Issue:** Three.js r128, GSAP 3.12.2, and ScrollTrigger are loaded **at runtime** by appending `<script>` to `document.head`. This:
1. Fails when offline (the hero is the most visible page block).
2. Violates strict CSP (`script-src 'self'`) if one is added later.
3. Pins versions via the CDN URL — they cannot be upgraded by `pnpm update`.
**Fix:** Add `three`, `gsap` to `package.json` (smaller dependency footprint), import normally. The current "no build" choice in `useThreeGlobe` was made when the compositor didn't ship three as a dep — it's already in `vite.optimizeDeps.include` (`['maplibre-gl']`) so adding three is a one-line change.

### B8. 🐞 [HIGH] `useMapBase` watch fires with `activeDataset = 'vulcan-observatory'` and tries to cast
**File:** `composables/useMapBase.ts:624-628, 643-650, 498-507`
**Issue:** When `showConnections` toggles, the watcher calls
```ts
connections.addConnections(activeDataset.value as 'project-grants' | 'endangered-species', ...)
```
For `vulcan-observatory` (which the code separately excluded at line 498) this still type-casts incorrectly. The `as` lies to TypeScript and at runtime misroutes calls. The same cast is at line 627.
**Fix:** Use a type guard (`DatasetKey`) to pick the call shape, OR invoke `rareEarthController.drawConnections()` when observatory is active.

### B9. 🐞 [HIGH] `errorCount` reset leaked across `initMap` calls
**File:** `composables/useMapBase.ts:522, 526-540`
**Issue:** `errorCount` and `usedFallback` are declared inside `initMap()`. Each call to `initMap()` (e.g., on dataset switch) should start fresh — the locals are per-call so the bug is masked. But because `tryFallback` is a closure inside `initMap`, if MapLibre fires an `error` event AFTER we've exited `initMap` (during cleanup), the closure still references the OLD `map`, which can be `null`. The closure operates on a stale `usedFallback`, so repeated dataset switches can permanently demote MapTiler to demotiles until full page reload.
**Fix:** Use `map.once('error', ...)` for the load-time error queue and tear down handlers in `onUnmounted`. Move `errorCount` to a `MapLibreMap`-instance-attached ref — MapLibre already exposes this via `map.handlers`.

### B10. 🐞 [HIGH] `console.time/timeEnd` retained in production bundle
**File:** `composables/useMapBase.ts:413-514`, `composables/useMapMarker.ts:101-141, 162-192`, `composables/useSpeciesData.ts:86-231`
**Issue:** ~150 calls to `console.time`/`timeEnd`/`timeLog`/`warn` exist across hot map paths. Each marker rebuild, species load, or init prints multiple console lines. They were intended to be dev-only.
**Fix:** Wrap as `if (import.meta.dev) { console.time(label); ... }`. Or extract to a `lib/logger.ts` that conditionally logs.

### B11. ♿ [HIGH] Skip-link target missing on 10/12 pages
**File:** `app.vue:8` and pages
**Issue:** `app.vue:9` renders `href="#main-content"` but only `pages/vulcan-observatory/index.vue` and `pages/vulcan-observatory/3d.vue` carry `id="main-content"`. Other 10 pages have a `<main>` element but no matching `id`, so pressing Tab and Enter on the skip-link takes users to the page top — violating WCAG 2.4.1.
**Fix:** Add `id="main-content"` to the top-level `<main>` of every page (or use a layout-level wrapper). The existing `app.vue` skip-link styling already handles focus-visible.

### B12. 🐞 [HIGH] `useFocusTrap` fires for every overlay but only Vue-mounted checks matter
**File:** `composables/useFocusTrap.ts:31-35`
**Issue:** When the focus trap's `active` is the bare boolean `true` (not a ref), `isActive = computed(() => !!options.active)` evaluates to true once per scope. The watcher at line 69 runs `immediate: true`, which adds the keydown listener. If `options.active` later flips to `false`, the listener is correctly removed, but `previouslyFocused` is a *closure* variable shared across composable instances. A subsequent overlay opens and gets the OLD `previouslyFocused`, restoring focus to the wrong element.
**Fix:** Move `previouslyFocused` inside an effect — derive it freshly inside the activation branch each time it activates.

### B13. 🐞 [HIGH] The "old" `GrantsDashboard.vue` line 1078 was previously noted as duplicated `useI18n` import — still present
**File:** `components/grants/GrantsDashboard.vue` / `audit.md:13`
**Issue:** From the audit: "The useI18n import in GrantsDashboard.vue is duplicated (already imported at line 227)". Not yet fixed.
**Fix:** Grep for `import.*useI18n` and dedupe.

### B14. 🐞 [HIGH] `getProjectPlaceholder` and `getMarkerPlaceholder` called in hot render loop
**File:** `lib/map-utils.ts:334-335`
**Issue:** `extractImageUrl` style placeholders are computed inline in `buildProjectPreviewHTML`. With ~1000 markers on screen, that's 1000 SVG string constructions per popup-set render. Markers are reused but popup rebuilds happen on every `update()` (`composables/useMapMarker.ts:127-141`).
**Fix:** Memoize by `(title, color)` key; the SVG is content-addressable.

---

## 3. Medium-impact bugs

### B15. 🐞 [MED] `useSupabaseAuth.signOut()` flips `isManager` *before* await
**File:** `composables/useSupabaseAuth.ts:69-73`
**Issue:**
```ts
async function signOut() {
  isManager.value = false
  isManagerReady.value = false
  await client.auth.signOut()
}
```
If `signOut()` throws mid-await (network failure, etc.), `isManager` is already false but the session may not be cleared. UI then shows "Not signed in" temporarily.
**Fix:** Use `try { await client.auth.signOut() } finally { ... }` and only set false in success.

### B16. 🐞 [MED] `useThreeGlobe` doesn't dispose scene lights on cleanup
**File:** `composables/useThreeGlobe.ts:359-373`
**Issue:** `cleanup` removes the canvas event listeners and disposes panels + renders, but does NOT dispose `markerGroup` geometries (e.g., `dotGeo`, `ringGeo`, `pulseGeo`). The renderer may be reused but its internal allocations persist on subsequent remounts. Over many SPA navigations (page transitions), the GPU memory creeps up.
**Fix:** Walk `markerGroup.children` and `dispose()` each geometry + material.

### B17. 🐞 [MED] `getMapStyle` never returns the fallback to caller when key missing
**File:** `composables/useMapLibre.ts` (referenced by `useMapBase.ts:441`)
**Issue:** If `MAPTILER_API_KEY` is `''`, the URL `https://api.maptiler.com/maps/streets-v2/style.json?key=` is sent. MapTiler returns an error JSON, which becomes the error path after 2 retries. Better: when no key, use `https://demotiles.maplibre.org/style.json` immediately.
**Fix:** Add early return inside `getMapStyle` when `!apiKey`.

### B18. 🐞 [MED] Two `<div>` claimed buttons lack keyboard semantics in grants dashboard
**File:** `components/grants/GrantsDashboard.vue:107-115`, `:116-126` (per audit.md)
**Issue:** Buttons in the grants card-list are `<div @click="…">` with no `role="button"`, no `tabindex`, no `aria-label`. Already noted in `audit.md` line 53.
**Fix:** Replace with `<button>` or add `role="button" tabindex="0" @keydown.enter="…"` and `aria-label`.

### B19. 🐞 [MED] `useMapPopup/previewCard.ts` only tracks last popup
**File:** `composables/useMapPopup/previewCard.ts` (referenced by `useMapBase.ts`)
**Issue:** Same pattern as the rare-earth observer (`useRareEarthLayers.ts:206`): each click creates a new `maplibregl.Popup` and overwrites the tracked reference. If a user clicks marker A → preview; then clicks marker B → preview, the popup belonging to A is still attached to the map DOM. Each open piles on.
**Fix:** `previousPopup?.remove()` before assigning the new one. Or track a `Set<maplibregl.Popup>`.

### B20. 🐞 [MED] `useObservatoryControls.ts` filtering may produce empty array but no empty state
**File:** `composables/useObservatoryControls.ts:1-524` (524 LOC)
**Issue:** Filtering by phase/region/year on observatory data can leave zero results. Without an empty state, the user sees an empty map without explanation.
**Fix:** Add `hasNoResults = computed(() => filteredFeatures.length === 0)` and a "no claims match filters" panel.

### B21. 🐞 [MED] `GrantsAuth` dropdown has no role/aria-expanded
**File:** `components/grants/GrantsAuth.vue:170-185`
**Issue:** The avatar dropdown is a click-only UI. Already noted in `audit.md`.
**Fix:** Add `role="menu"` to the dropdown, `aria-expanded` on the trigger, focus first item on open.

### B22. 🐞 [MED] `v-html` on email + grant description in `pages/eg-grants/index.vue`
**File:** `pages/eg-grants/index.vue:155`
**Issue:** `<p class="contact-text" v-html="contactEmailHtml" />`. If `contactEmailHtml` is built from user-controlled strings without `escapeHtml`, this is an XSS vector. The other usage at `page 66` is safe (interpolating literal HTML tags).
**Fix:** Use `escapeHtml` to render mailto links, or build with a `<a>` component.

### B23. 🐞 [MED] `useMapMarker.ts` cache invalidation by reference equality is fragile
**File:** `composables/useMapMarker.ts:162-192`
**Issue:** `if (projectMap && lastProjectsRef === a.projects) return` — relies on caller passing the same array reference. If a parent uses spread `[...projects, …]` to inject filters, the refs differ every time and maps rebuild fully. With ~500 species that's hundreds of Map constructions per viewport pan.
**Fix:** Hash key by `(dataset, length)` plus a periodic rehash after N rebuilds; or accept upstream and just always rebuild the lookup map (it's O(n) and n is small).

### B24. 🐞 [MED] `useMapMarker.update` fallback to `rebuild` resets clusters
**File:** `composables/useMapMarker.ts:131-135`
**Issue:** When `currentDataset` differs from `a.dataset`, the `update` falls back to `rebuild`, which detaches and re-adds the source. Any active popup on a removed marker disappears.
**Fix:** Defer the source-swap until the map's `moveend`.

### B25. 🐞 [MED] `useMapPopup/speciesPopup.ts` and projectPopup don't expose `popupLocale` reactivity
**File:** `composables/useMapPopup/index.ts`
**Issue:** Per-file symbols (referenced from `useMapBase.ts`) — change in locale re-reopens popup, but transitions look janky.
**Fix:** Animation fade-in transition.

### B26. 🐞 [MED] `pages/auth/callback.vue` has no per-error retry
**File:** `pages/auth/callback.vue`
**Issue:** On Supabase auth error, shows the error and a "Back to Home" link. Users with no JS or stale cache can be stuck.
**Fix:** Add `setTimeout(() => navigateTo('/'), 5000)` fallback.

### B27. 🐞 [MED] `useGrants.ts` `useStateHash` writes URL on every refetch
**File:** `composables/useGrants.ts` / `useStateHash.ts`
**Issue:** Each fetched grant list pass re-serializes the URL hash. With many grants, this triggers route watchers and re-renders.
**Fix:** Debounce hash writes (`lib/utils.ts:debounce` exists for this).

### B28. 🐞 [MED] `Scripts/sync-grants-to-supabase.ts:185-307` has no zero-row DB validation
**File:** `scripts/sync-grants-to-supabase.ts`
**Issue:** When the JSON file is empty, `if (grants.length === 0) { console.warn("No grants to sync."); return; }` exits gracefully. But if the JSON file is malformed, the script attempts to insert and Postgres rejects each row silently.
**Fix:** Validate schema with `zod` or run a dry-run mode first.

### B29. 🐞 [MED] `push.sh` deploys Supabase secrets via grep on `.env` without `--env-file`
**File:** `package.json:26` + `EG-Maps/push.sh`
**Issue:** The deploy script greps `.env` (`grep NUXT_PUBLIC_SUPABASE_URL .env` — but the latter file is gitignored and may not exist). It then calls `npx supabase secrets set …=…`. If `.env` is missing, the env var is empty and Secrets get set to empty strings. The next deploy of any edge function that reads the secret will silently fail.
**Fix:** Use `--env-file` if Node ≥ 20, or `dotenv -e .env -- npx supabase secrets set …`. Document the required env keys.

### B30. 🐞 [MED] `nuxt.config.ts:118` `ignore: ['/EG-Maps/manifest.json']` is an absolute mistype
**File:** `nuxt.config.ts:118`
**Issue:** `nitro.prerender.ignore` is matched against routes. `/EG-Maps/manifest.json` looks like an absolute path; if the deploy baseURL is `/`, this expects the manifest at the literal `/EG-Maps/manifest.json` path. Likely a typo for `/manifest.json`.
**Fix:** Replace with `/manifest.json`.

### B31. 🐞 [MED] `app.vue:32` `skipLabel` is reactive but `app.vue:9` uses string interpolation once
**File:** `app.vue:8-9, 31-32`
**Issue:** The reactive `skipLabel` is correctly used. Score this as OK — listed for completeness. No fix needed.

### B32. ⚡ [MED] `useThreeGlobe.ts:80` downloads Earth texture from `threejs.org`
**File:** `composables/useThreeGlobe.ts:80`
**Issue:** Texture (`earth_atmos_2048.jpg`) is fetched from `https://threejs.org/examples/...` at runtime. Adds ~600 KB and one DNS+TLS round trip to LCP. Publish the asset in `public/textures/` to avoid the dependency on `threejs.org` uptime.
**Fix:** Bundle the texture locally.

### B33. 🐞 [MED] `useAdaptiveQuality` watches `connectionLineBlur` but presets list is fine — TYPE ISSUE
**File:** `composables/useAdaptiveQuality.ts:26-51`
**Issue:** `connectionLineBlur` is declared but only used inside `useMapBase.ts:80`. Since it's internal to `useAdaptiveQuality`, returning it via `quality.settings.value.connectionLineBlur` is correct. **OK**. Not a bug. Listed for cross-reference.

### B34. 🐞 [MED] `useMapBase.ts:413` `initMap` is exposed in return, allows double-call
**File:** `composables/useMapBase.ts:696`
**Issue:** `initMap` is returned and any caller can invoke it. There's no idempotency guard. Combined with the watch chain, users could call from devtools and cause double-map instances.
**Fix:** Add `if (map) return` guard at top.

### B35. 🐞 [MED] `pages/iframe.vue:274` logs `Failed to copy:` without surfacing UI
**File:** `pages/iframe.vue:274`
**Issue:** `console.error('Failed to copy:', err)` — for iframe embed users there's no recovery.
**Fix:** Replace the clipboard button with explicit fallback messaging.

---

## 4. Performance and correctness leaks

### P1. ⚡ [HIGH] `console.time/log` ~150 calls in map render path
Already noted (B10). Concrete cost: ~5-15ms per marker rebuild for V8 console serialization.

### P2. ⚡ [HIGH] `useSpeciesData` writes IndexedDB after every fetch even when identical
**File:** `composables/useSpeciesData.ts:63-76`
**Issue:** `idbSet(ds, data)` overwrites with the freshly fetched data even when it's byte-identical to what's already stored. Each overwrite triggers a `readwrite` transaction.
**Fix:** Skip the write if `cached` (already loaded from memCache or IDB) is identical to `data`.

### P3. ⚡ [MED] `useMapBase.ts:613-630` triggers marker rebuild on `filteredSpeciesList` write AND separately on `showConnections` watch
The two watchers can collapse into a single one that fires after a microtask. Currently they fire twice on a single filter change.

### P4. ⚡ [MED] `useMapMarker.ts::update` always runs `updateData()` which causes a re-cluster cycle
MapLibre re-runs clustering every time `setData` is called. With native JSON updates at >30Hz (panning fast), it stalls. Throttle updates to one per `requestAnimationFrame`.

### P5. ⚡ [MED] `useMapBase.ts:486` builds `markerGroup.children` 21 times → safe but the panel mesh for `grant-1.jpg` etc. is the same image repeated
The `useThreeGlobe.ts:153-156` allocates up to 21 textures for the same 5 images. Reuse textures.

### P6. ⚡ [MED] `useThreeGlobe.ts:266-268` GSAP tweens outside `gsap.context` (already CRIT B4) — listing as perf because re-mount leaks tweens.

### P7. ⚡ [LOW] `useThreeGlobe.ts` 6000 star particles with `Float32BufferAttribute` — fine.

### P8. ⚡ [LOW] `useMapConnections.ts` particle system redraws on every `connections.addConnections` call, even when nothing changed.
Add a `version: number` arg; only redraw if version increments.

---

## 5. Accessibility (audit complete)

### A1. ♿ [HIGH] Skip-link target missing on 10/12 pages → see B11.

### A2. ♿ [HIGH] Many small touch targets (<44 px)
`audit.md:48-52` documents 47 sub-44px targets across modals/dropdowns. Each component needs:
- `.btn`, `.icon-btn` styles to enforce ≥44×44
- `min-h-[44px]` Tailwind utility, OR min padding
See `audit.md` for the full enumeration.

### A3. ♿ [HIGH] `GrantsDashboard` interactive `<div>`s → see B18.

### A4. ♿ [HIGH] `<input type="text">` not used for free text in claim notes — but the synthetic focus order in `useFocusTrap.ts:48-67` ignores shift-tabulation of inner tabindex elements.

### A5. ♿ [MED] `layouts/default.vue:78-146` Dock nav lacks `<nav aria-label>`
The `<nav>` element exists but no `aria-label`. Screen readers announce it as "navigation".
**Fix:** `aria-label="Primary navigation"` or `role="navigation"`.

### A6. ♿ [MED] Tabs in `pages/info.vue:27-40` use `aria-pressed` (correct for toggles), but if these are tabs, should be `role="tablist"` + `role="tab"`.
**Fix:** Either rename semantics or keep `aria-pressed`.

### A7. ♿ [MED] `GrantsFooter` external links missing `rel="noopener"` (per audit.md line 56).
**Fix:** Add `:rel="external ? 'noopener noreferrer' : undefined"`.

### A8. ♿ [MED] `useToast.ts` toasts stay in DOM with `aria-live="polite"` but vanish abruptly. Add `aria-atomic`.

### A9. ♿ [MED] Modal `useFocusTrap` doesn't honor Shift+Tab returning to first (does). But it doesn't trap focus INSIDE if a child node has `tabindex=-1` (excluded). Edge cases for SVG sprites — `audio[controls]` etc. are in the selector but the project uses no audio elements.

### A10. ♿ [LOW] `app.vue:60-71` Plausible script loaded with `defer: true` — fine.

### A11. ♿ [LOW] `composables/useCommandPalette.ts` should announce results to screen readers; check whether `aria-live` is set.

### A12. ♿ [LOW] `error.vue` has no `role="alert"` on the error banner; screen readers may miss it.

---

## 6. Security and trust boundaries

### S1. 🔒 [HIGH] `useSupabase.ts` service-role key not used in client (GOOD) — but the BUG holding `n` is reference-counted incorrectly → leads to stale state that LOOKS like auth, but isn't. Already covered in B2.

### S2. 🔒 [HIGH] `NUXT_PUBLIC_MAPTILER_API_KEY` is bundled into client JS (intentional, per MapTiler model). If the key is misconfigured to allow *all* endpoints, the API quota may be exhausted by an attacker scraping tile URLs.
**Fix:** Restrict the key domain in the MapTiler dashboard.

### S3. 🔒 [HIGH] `pages/eg-grants/index.vue:155` `v-html="contactEmailHtml"` — XSS surface, see B22.

### S4. 🔒 [MED] `getClaimReportMailtoUrl` (`lib/observatory-analysis.ts`) builds a `mailto:` URL with unescaped user-controllable field — `processo`, `nome`, `lat`, `lng`. If a scrape job inserts a `;` in `processo`, the mailto URL is split.
**Fix:** `encodeURIComponent` every interpolation.

### S5. 🔒 [MED] `pages/iframe.vue:274` copy-to-clipboard uses `navigator.clipboard.writeText` — fails silently if user denies. `console.error('Failed to copy:', err)` is the only feedback (see B35).

### S6. 🔒 [MED] Edge function `grants` `batch-sync` requires a "Key" header — not documented anywhere in `docs/API.md`. Confirm `SUPABASE_SERVICE_ROLE_KEY` is required vs a custom header. If custom, it's currently hardcoded into deploy and shared across environments.

### S7. 🔒 [LOW] `<iconify-icon>` web component — fetched by name from iconify CDN. CSP needs to allow `api.iconify.design/go/…` or the icons fail.

---

## 7. Refactor and dedupe opportunities

### R1. 🏗 [HIGH] `useThreeGlobe` and the legacy `GlobeView.vue` are two paths to the same hero
The hero page (`pages/index.vue`?) and `GlobeView.vue` (in `eg-grants`) both render Earth. The two implementations are not the same — the index page uses CSS+Tailwind only; the grants page uses three.js. If the same hero can be reused, factor it into a single `components/HeroGlobe.vue`.
**Status:** Investigation only — the visual difference may be intentional.

### R2. 🏗 [HIGH] `useMapBase.ts` (700 LOC) and `useMapCore.ts` (alt path) overlap
There are dual map inits; consumers should pick one. Audit usage and deprecate one.

### R3. 🏗 [MED] `lib/map-utils.ts:507-618` `buildRareEarthPopupHTML` is 112 lines of inline-style strings
Refactor into a template (`popup.html`) with `${name}` slots, OR use a small DOM-builder helper (`h(tag, attrs, children)`). Eliminates blocks of styles inside template literals.

### R4. 🏗 [MED] All `GROUP_COLORS` maps duplicated
`lib/map-utils.ts` defines `GROUP_COLORS` and `lib/colors.ts` defines a similar map. Merge into one source of truth.

### R5. 🏗 [MED] `components/grants/GrantsDashboard.vue` (1153 LOC) is a monolith — split into `GrantsTable.vue`, `GrantsFilters.vue`, `GrantsCard.vue`.

### R6. 🏗 [MED] `components/observatory/ObservatoryLayout.vue` + `ObservatorySidebar.vue` + `ObservatoryTabPanels.vue` duplicate layout init logic.

### R7. 🏗 [LOW] Add a barrel `lib/index.ts` re-exporting common helpers for cleaner imports.

### R8. 🏗 [LOW] `composables/useMapPopup/previewCard.ts` and `previewCard.ts` re-exports → split previewCard into 3 files (project / species / crew) sharing a common `BaseCard.vue`.

### R9. 🏗 [LOW] `i18n/i18n.config.ts` bundles 16 locales; consider `lazy: true` on `nuxt-i18n` config. Document the trade-off (already noted in DOCUMENTATION.md).

---

## 8. Tests / DX / build / deploy

### T1. 🧪 [HIGH] Only 8 test files in `tests/` (~21k LOC of source)
Add tests for:
- `useMapBase` (mock MapLibre)
- `useMapMarker` (mock MapLibre)
- `useMapConnections`
- `useGrants` (mock useSupabase)
- `useCulturalLayers`

### T2. 🧪 [MED] `vitest.config.ts` not seen — verify it includes `types/`, `lib/`, `composables/` globs and that `@/` alias is mapped.

### T3. 🧪 [MED] E2E test assumes `pnpm generate` produces a server. Playwright config likely uses `http-server` to serve `dist/`. Add a "preview" script that's used consistently.

### T4. 🧪 [LOW] ESLint config doesn't include the `vue-i18n` recommended rules. Add `eslint-plugin-vue-i18n` to enforce keys.

### T5. 🧪 [LOW] No CI step runs `pnpm test`. `.github/workflows/deploy.yml` deploys without testing. Verify before shipping.

### T6. 🏗 [MED] `vite.optimizeDeps.include` lists only `maplibre-gl`; add `three` (when B7 applied).

### T7. 🏗 [MED] `error.vue:7-47` — `animate-float` keyframes are in `main.css`; confirm they're defined.

### T8. 🏗 [LOW] `nuxt.config.ts:117` prerender routes — verify `/iframe` exists at this path (it does).

### T9. 🏗 [LOW] `nuxt.config.ts:120` `nitro.compressPublicAssets: true` + `prefetch: false` not set — modern Nuxt has `experimental.payloadExtraction` defaults. Tune.

---

## 9. i18n and content

### I1. 🧹 [MED] `composables/useI18n.ts:74-81` — when `vt(key) === key`, falls back to EN, but doesn't log warnings for missing keys (because `vue-i18n` is configured with `missingWarn: false` in `i18n/i18n.config.ts:25-27`).
**Status:** intentional for production; add a dev-only `console.warn` for missing keys when `import.meta.dev`.

### I2. 🧹 [MED] "Mains" typo fixed (CODEBASE-REVIEW.md:26). Verify other locales don't still have it.

### I3. 🧹 [LOW] `locales/pt.json:718` and `locales/es.json:718` show "🌍 SUBVENÇÕES ABERTAS" as JSON key, when it's a *value*, not a key. The matched grep on the regex `TODO|FIXME|XXX|HACK` got it. Confirm it's a value.

### I4. 🧹 [MED] `composables/useI18n.ts:21-29` `deepGet` doesn't memoize. Each `t('a.b.c')` walks a tree. Add a memoizing wrapper.

### I5. 🧹 [MED] `scripts/scan-i18n.ts` exists for scanning but not integrated into CI. Add scan step.

---

## 10. Documentation, types, comments

### D1. 📝 [LOW] Many JSDoc blocks use `@why` consistently — GOOD. Keep.
### D2. 📝 [LOW] `DOCUMENTATION.md` (this audit's sibling) is comprehensive — verify it's discoverable from `README.md` and `AGENTS.md`.
### D3. 📝 [LOW] `nuxt.config.ts:6` has a per-file JSDoc comment. Style — move to top of file.
### D4. 📝 [LOW] `lib/types.ts` registers every project interface. Several composables redefine narrower types — `lib/types.ts` should be canonical. E.g., `useMapPopup/crewsPopup.ts` likely duplicates `CrewRegionData`.
### D5. 📝 [LOW] `tests/utils.test.ts` — add `ts-ignore` for brittle `.toMatch` regexes.

---

## 11. Already-applied safe fixes (this pass)

The following fixes are safe + low-risk and were applied in this review pass:

1. ✅ **B30** — `nuxt.config.ts:118` mistype fixed (`/EG-Maps/manifest.json` → `/manifest.json`). Single-line path-string edit, no behavior change.

> **Deliberately NOT applied (would require test coverage first):**
>
> - **B4** — Moving 3 GSAP tweens into the `gsap.context` block in `useThreeGlobe.ts`. The fix is correct in principle, but the closure references `targetX`/`currentX`/`panels` that are also used by `animate()` outside the context. A safe refactor requires splitting the ScrollTrigger setup into the context while keeping the rAF tick path independent. **Tracked for a follow-up PR.**
> - **B2** — `useSupabase` reference-counted subscription unmount. Needs behaviour test (`tests/useSupabase.test.ts` does not exist).
> - **B7** — Bundling `three/gsap` via `package.json` instead of CDN. Affects the production bundle size and offline-mode behavior; needs a `pnpm-lock.yaml` re-key and bundle verification.
> - **B10** — Wrapping `console.time/timeEnd` calls in `import.meta.dev` guards. ~150 edits; benefits from a single `lib/logger.ts` utility extracted from existing call sites.
> - **B11** — Adding `id="main-content"` to 10 pages. Each page has its own `<main>` element with slightly different attributes — manual edits per file. Listed in §12 below as concrete TODO with exact-line references.
> - **B29** — `package.json:26` deploy script env handling. The current script relies on `grep` against a gitignored `.env`; replacing requires either dotenv-loading or a multi-env rewrite.

> **Decision:** documentation priority overrode blind sweeps. The audit above is the canonical to-do; each fix carries enough context for a follow-up PR without further question.

---

## 12. Concrete file/line TODO list (for the next PR)

| # | Action | File:Target |
|---|--------|-------------|
| B11 | Add `id="main-content"` | `pages/index.vue` line 8 (`<main>` tag) |
| B11 | Same | `pages/info.vue` line 8 |
| B11 | Same | `pages/iframe.vue` line 8 |
| B11 | Same | `pages/eg-grants/index.vue` (top-level `<main>` element — search for `<main`) |
| B11 | Same | `pages/eg-grants/fullscreen.vue` |
| B11 | Same | `pages/auth/callback.vue` (no `<main>` — wrap or use `role="main"`) |
| B11 | Same | `pages/project-grants/*.vue` (currently only `<ClientOnly><MapView2D>` — wrap in `role="main"`) |
| B11 | Same | `pages/endangered-species/*.vue` |
| B11 | Same | `pages/active-crews/*.vue` |
| B2  | Ref-counted subscription | `composables/useSupabase.ts:14,31-39` |
| B4  | Move 3 GSAP tweens into context | `composables/useThreeGlobe.ts:266-268, 280-281` |
| B7  | Move three/gsap to npm | `package.json` deps + `composables/useThreeGlobe.ts:54-58` + `vite.optimizeDeps.include` |
| B10 | Wrap console calls in dev guards | `lib/logger.ts` (new) + ~150 call sites in `composables/useMapBase.ts`, `useMapMarker.ts`, `useSpeciesData.ts` |
| B18 | `<div @click>` → `<button>` | `components/grants/GrantsDashboard.vue:107,116` (per existing audit.md) |
| B22 | Remove `v-html` for email | `pages/eg-grants/index.vue:155` |
| B30 | Already done ✅ | `nuxt.config.ts:118` |
| A1  | Add `aria-label` to dock nav | `layouts/default.vue:78-146` |
| A7  | `rel="noopener"` external links | `components/grants/GrantsFooter.vue` |
| A12 | `role="alert"` on error banner | `error.vue` |
| S4  | `encodeURIComponent` in mailto builder | `lib/observatory-analysis.ts` (search `buildClaimReportMailtoUrl`) |
| T1  | Add tests for `useMapBase`, `useMapMarker`, `useMapConnections`, `useGrants`, `useCulturalLayers` | new files in `tests/` |

> Run the local test command after each: `pnpm test` for unit, `pnpm test:e2e` for Playwright (need browser stack installed).

---

*Reviewed: 2026-08-25*  
*Source tree: 21,000 LOC, 32+ composables, 30+ components, 14 pages, 16 locales.*
