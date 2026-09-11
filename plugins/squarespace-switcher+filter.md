
BASE POSTMESSAGE:

# Task: Add postMessage-based filtering to the EG-Maps `active-crews` page

## Context

This map is embedded as an iframe on an external Squarespace site. Filters
currently work by reloading the iframe with new query params (e.g.
`?hideAll=true&region=latam`). That causes a visible reload/flash every time
a filter changes. We want to eliminate the reload: the parent page will send
filter updates via `window.postMessage`, and this app should apply them to
its already-rendered map state, no reload required.

**Before writing any code, explore the repo first** and tell me:
1. Where the `active-crews` page's entry point / router is.
2. How query params are currently read on load (which file parses
   `window.location.search`, and what function actually applies those
   filters to the map — filter markers, toggle layers, etc.).
3. What that filtering function is called and what shape its arguments take.

Then implement the following, reusing that existing filter function rather
than duplicating filter logic:

## Requirements

### 1. Listen for filter updates from the parent window

Add a `message` event listener (in the same file/module that currently
parses `window.location.search` on load, if possible, so both code paths
funnel into the same underlying filter function):

```js
const ALLOWED_ORIGINS = [
  "https://YOUR-SQUARESPACE-DOMAIN.com", // replace with actual production domain(s)
  "http://localhost:3000",               // keep for local dev/testing, remove before prod if desired
];

window.addEventListener("message", (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return; // ignore untrusted senders
  if (!event.data || event.data.type !== "crew-filter-update") return;

  const payload = event.data.payload || {};
  applyFilters(payload); // <-- reuse whatever the existing filter function is called

  // Keep the iframe's own URL in sync so it stays shareable/refreshable,
  // WITHOUT reloading the page:
  const params = new URLSearchParams(payload);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
});
```

Replace `applyFilters` with whatever the real function/module is once you've
explored the codebase. If filtering currently only happens by re-reading
`location.search` at load time, refactor it into a reusable function that
both the initial-load code path and this message listener can call.

### 2. Signal readiness to the parent

The parent page needs to know when it's safe to start sending filter
messages (the iframe might still be loading when the parent tries to send
one). As soon as the map has finished its initial render, send:

```js
window.parent.postMessage({ type: "crew-map-ready" }, "*");
```

(Using `"*"` here is fine since this is an outbound broadcast announcing
readiness, not a message containing sensitive data — but if you'd rather
restrict it, use the same `ALLOWED_ORIGINS` list and send once per matching
origin, or just pick the specific expected parent origin.)

Send this once, after first paint / after the initial URL-param filters (if
any) have already been applied — not before.

### 3. (Optional but recommended) Respond to state requests

If the parent ever wants to know the map's current filter state (e.g. after
a page navigation where it lost track), support:

```js
window.addEventListener("message", (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  if (event.data?.type === "crew-request-state") {
    event.source.postMessage(
      { type: "crew-map-state", payload: getCurrentFilters() }, // implement getCurrentFilters()
      event.origin
    );
  }
});
```

### 4. Don't break existing behavior

- Direct visits to `active-crews?hideAll=true&region=latam` (no parent iframe
  at all) must keep working exactly as they do now — this is additive, not a
  replacement of the URL-param path.
- `hideAll=true` and any other currently-supported params should still work
  identically whether they arrive via URL on load or via postMessage later.

## Testing checklist for the agent to verify before finishing

- [ ] Loading `active-crews?hideAll=true` directly still filters correctly (no regression).
- [ ] Opening the page inside a test HTML file with an iframe + a script that
      sends `{type: 'crew-filter-update', payload: {region: 'latam'}}` via
      `postMessage` correctly updates the map with no reload/flash.
- [ ] The map sends `crew-map-ready` after initial load (verify by logging
      received messages in the parent test page's console).
- [ ] Messages from an untrusted origin (e.g. serve the test page from a
      different port with a mismatched entry in `ALLOWED_ORIGINS`) are
      silently ignored.
- [ ] `history.replaceState` updates the visible URL bar (when not in an
      iframe) without triggering a navigation/reload.

## Deliverable

- The modified source file(s), plus a one-paragraph summary of exactly what
  function names/paths you touched, so the Squarespace-side integration can
  reference the right message types (these are already fixed above:
  `crew-filter-update`, `crew-map-ready`, `crew-request-state`,
  `crew-map-state` — please don't rename them, since the parent-side code is
  already written against these exact strings).

--------------




# Addendum: 2D/3D view switching via postMessage

Builds on `eg-maps-postmessage-agent-prompt.md` (message plumbing must
already be in place). This concerns a new message type:

```
parent -> iframe : { type: "crew-view-switch", payload: { view: "2d" | "3d" } }
```

## Step 1 — figure out the actual architecture first

Before implementing anything, check: are `active-crews` (2D) and
`active-crews/3d` (3D) two views rendered by the **same** app bundle/router,
or are they **separate builds** (e.g. one uses Leaflet, the other uses a
completely different 3D library like Three.js/CesiumJS/deck.gl, built and
deployed independently)?

Report back which is the case — the two scenarios need different
implementations:

### Scenario A: same app, client-side route

If both routes are handled by the same JS bundle (e.g. a React Router /
Vue Router setup where `/3d` just renders a different component), this is
straightforward:

```js
window.addEventListener("message", (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  if (event.data?.type !== "crew-view-switch") return;

  const { view } = event.data.payload; // "2d" | "3d"
  switchToView(view); // your router's programmatic navigation, e.g. router.push(...)
  history.replaceState(null, "", view === "3d" ? "/active-crews/3d" : "/active-crews");
});
```

Preserve state across the switch where reasonably possible — the current
region filter and camera focus shouldn't reset just because the view
changed. If the 2D and 3D renderers share the same underlying crew dataset
and filter state store, re-apply the current filter to the new view after
switching (call the same `applyFilters()` from the region-filter addendum
with the last-known region).

### Scenario B: separate builds/pages

If `/3d` is a genuinely separate deployed app (different bundle, possibly
even a different framework), there is no way to switch between them without
a real navigation/reload of the iframe's `src` — you cannot swap out an
entire running application in place. In this case:

- Don't try to fake it — implement the listener in **both** builds so each
  one can request that it be swapped in, but the actual mechanism has to be:
  the 2D build, on receiving `crew-view-switch` with `view: "3d"`, tells its
  **parent window** (not itself) to reload it: send
  `window.parent.postMessage({ type: "crew-request-navigate", payload: { view: "3d" } }, "*")`
  back up, and let the *Squarespace-side* script do the actual `iframe.src =`
  swap (I'll update the Squarespace script to listen for this if this is the
  scenario — let me know).
- Alternatively, and probably better UX-wise: keep both 2D and 3D mounted
  in the DOM simultaneously (e.g. two absolutely-positioned containers, one
  hidden) if they're loaded together at the same origin, and just toggle
  visibility — no reload needed. Only worth doing if the combined bundle
  size / initial load cost of loading both up front is acceptable.

Tell me which scenario applies before you implement Scenario B's fallback —
it changes what I need to change on the Squarespace side too.

## Requirements regardless of scenario

- Ignore `crew-view-switch` messages from origins not in `ALLOWED_ORIGINS`.
- If `payload.view` is neither `"2d"` nor `"3d"`, ignore the message (don't
  throw).
- Sending the same view that's already active should be a no-op (don't
  restart the current view/re-render unnecessarily).
- `history.replaceState` should reflect the current view, so a manual page
  refresh loads directly into the currently active view rather than
  resetting to whatever the default is.

## Testing checklist

- [ ] Sending `{ type: 'crew-view-switch', payload: { view: '3d' } }` from a
      test parent page switches the rendered map to 3D without a full
      iframe reload (Scenario A) — verify via browser devtools that the
      iframe's `contentDocument` readyState / network tab shows no new
      top-level navigation, only whatever internal renders occur.
- [ ] Switching back to `'2d'` restores the previous 2D view correctly.
- [ ] The current region filter (if one was active) still applies after
      switching views.
- [ ] Direct navigation to `/active-crews/3d` in a new tab (no parent
      window at all) still works exactly as it does today.

----


# Addendum: flyTo + highlight behavior on region filtering

Builds on `eg-maps-postmessage-agent-prompt.md` — implement that first if you
haven't. This addendum only concerns what `applyFilters()` should *do* when
it receives a region filter, not the message-passing plumbing itself (that's
already covered).

## Context

Filtering is now single-select, region-only. The seven values that will
ever arrive in `payload.region` are:

```
africa | antarctica | asia | australia-oceania | europe | north-america | south-america
```

(confirm these slugs match whatever field your crew data already uses for
region/continent — if the existing data uses different slugs or full names,
tell me and I'll have the Squarespace side send matching values instead of
renaming your data.)

An empty string / missing `region` key means "show all, reset view."

## Required behavior when a region filter is applied

**1. flyTo — animate the camera to the region's extent**

When `applyFilters({ region: 'africa' })` runs, the map should smoothly pan
+ zoom (not jump instantly) to frame all crew markers within that region.

- If you're on Leaflet: compute a `L.latLngBounds()` from the filtered
  markers' coordinates and call `map.flyToBounds(bounds, { padding: [40,40],
  duration: 1.2 })`.
- If Mapbox GL / MapLibre: compute the bounds the same way and call
  `map.fitBounds(bounds, { padding: 60, duration: 1200, essential: true })`
  (fitBounds animates by default; `essential: true` keeps the animation even
  if the user has reduced-motion... actually respect reduced motion, see
  below).
- If there's already a hardcoded bounding box per continent somewhere in the
  codebase (common for maps with a "zoom to continent" feature), prefer
  using that over recomputing from marker positions — it'll be more visually
  consistent (e.g. Antarctica with very few crews shouldn't zoom in
  awkwardly tight).
- On reset (`region: ''`), flyTo the original default world view/zoom.

**Respect `prefers-reduced-motion`:** if
`window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true,
jump directly (`setView`/`jumpTo`) instead of animating.

**2. highlight — visually emphasize matching markers, de-emphasize the rest**

Rather than hiding non-matching markers outright (that's what `hideAll` /
the existing filter logic may already do), implement a *highlight* mode:

- Matching markers: full opacity, and optionally a subtle visual bump —
  e.g. a slightly larger icon, a soft glow/box-shadow equivalent for
  SVG/canvas markers, or a brief pulse animation on the transition in.
- Non-matching markers: reduced opacity (suggest ~0.15–0.25), not removed
  from the DOM/map — so the "reset to all" transition can fade them back in
  smoothly rather than having them pop back in from nothing.
- Transition both opacity changes with a CSS transition or the mapping
  library's built-in style transition (avoid a hard instant cut) — target
  roughly 300–400ms, similar pacing to the flyTo.

If markers are rendered as DOM elements (e.g. divIcons/HTML markers), this
is straightforward via a CSS class toggle, e.g.:

```css
.crew-marker { transition: opacity 0.35s ease, transform 0.35s ease; opacity: 1; }
.crew-marker--dimmed { opacity: 0.2; }
.crew-marker--highlighted { transform: scale(1.15); }
```

```js
function applyFilters({ region }) {
  const bounds = [];
  allMarkers.forEach((marker) => {
    const matches = !region || marker.data.region === region;
    marker.el.classList.toggle('crew-marker--dimmed', !matches);
    marker.el.classList.toggle('crew-marker--highlighted', matches && !!region);
    if (matches) bounds.push(marker.latlng);
  });

  if (region && bounds.length) {
    flyToBoundsOrDefault(bounds);
  } else if (!region) {
    flyToDefaultView();
  }
}
```

(Adapt to whatever the actual marker rendering approach is once you've
looked at the code — this is illustrative, not literal.)

If markers are rendered on canvas/WebGL (e.g. a Mapbox GL symbol layer)
instead of DOM elements, use a `feature-state` or a filtered
`paint`/`filter` expression to drive opacity instead of CSS classes — same
visual result, different mechanism. Use whichever matches how markers are
currently rendered.

## Testing checklist (in addition to the previous prompt's checklist)

- [ ] Selecting a region flies the camera to frame that region's crews,
      not a hard jump (unless reduced-motion is on, in which case it's a
      hard jump).
- [ ] Selected region's markers are full-opacity/highlighted; all others
      dim smoothly rather than disappearing instantly.
- [ ] Clearing the filter (empty region) fades all markers back to full
      opacity and flies back to the default world view.
- [ ] Rapidly switching between regions (e.g. clicking three pills in quick
      succession) doesn't break — the last selection should always win,
      with no stuck dimmed/highlighted state from an interrupted animation.
- [ ] `prefers-reduced-motion: reduce` disables the flyTo animation.
