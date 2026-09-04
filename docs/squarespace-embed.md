# Earth Guardians — Squarespace Embed

This guide shows how to drop the **active-crews** map into any Squarespace 7.x site
(or any third-party host that strips injected scripts — Webflow, Wix, Ghost, etc.) as a
**dynamic**, *transparent* component, not a flat, scrollable iframe.

> TL;DR — drop one container + one `<script>` tag. The map floats over your Squarespace
> background; click a crew to see a modern glass-popup with stats and history.

---
## What the embed actually renders

Two modes, picked automatically based on whether a MapTiler API key is configured.

### Mode 1 — Satellite on land, transparent water (Recommended)

When `NUXT_PUBLIC_MAPTILER_API_KEY` (or `MAPTILER_API_KEY`) is set, the embed
loads MapTiler's **vector** `hybrid-v4` style. After `style.load`, every layer
whose id or `source-layer` contains `water` / `ocean` is force-painted to
`fill-color: rgba(0,0,0,0)` and `fill-opacity: 0`. The satellite imagery stays
on land; the host page's brand/gradient bleeds through every ocean pixel.

| Layer | Visual | Source |
|-------|--------|--------|
| Water (ocean / lakes / rivers) | **transparent** — Squarespace background shows through | MapTiler water vector layer, override-painted to alpha 0 |
| Country land borders | thin white strokes over the satellite imagery | Natural Earth 110m countries GeoJSON |
| Crew regions | cyan pulsing dot + accent halo | `composables/useCrewEmbedMarkers.ts` |
| Crew locations | small cyan/amber dots, halo | same |
| Popup | glass card with stats, growth %, history sparkline | `components/map/CrewPopup.vue` |
| Pill | bottom-left "131 active crews" counter with pulse | inline `<style>` in the page |

### Mode 2 — Borders only (fallback)

If no MapTiler key is configured, the embed falls back to a transparent
background with **only** country borders drawn. Markers + popups behave the
same. A console info line (`[eg-embed] No MAPTILER_API_KEY — falling back to
borders-only basemap.`) is emitted for diagnostics.

The bundle is rendered by a single Nuxt route: **`/squarespace/active-crews`** which
prerenders into `dist/` and is mounted inside the host via a transparent iframe.

That's it. The iframe auto-resizes to fit the data, supports pan/zoom/touch, and
inherits your page's background.

### Multiple instances per page

```html
<div data-eg-embed="active-crews" style="min-height:480px"></div>
<div data-eg-embed="active-crews" style="min-height:320px"></div>
<script src="…/squarespace-embed.js" data-origin="…" defer></script>
```

---

## 2. Configuration knobs (data-*)

| Attribute | Default | Purpose |
|-----------|---------|---------|
| `data-origin` | script origin | Absolute URL of the Nuxt `dist/` host. |
| `data-path` | `/squarespace/active-crews` | Page route to iframe. |
| `data-theme` | `auto` | `auto`/`light`/`dark`. |
| `data-min-height` | `480` | Clamp (px). Embed never reports below this. |
| `data-accent` | `#22d3ee` | Marker & halo color (any CSS color). |
| `data-target` | `[data-eg-embed="active-crews"], #eg-active-crews` | CSS selector for the container(s). |

---

## 3. Cross-origin protocol (postMessage)

Both directions use the same envelope:

```ts
{
  source: 'squarespace-embed',
  version: 1,
  type: 'host:resize' | 'host:theme' | 'host:focus' | 'host:open' | 'host:data'
       | 'embed:ready' | 'embed:height' | 'embed:click' | 'embed:error',
  payload?: unknown
}
```

### Host → Embed

| Message | Effect |
|---------|--------|
| `host:ready` { theme } | embed paints with given theme |
| `host:resize` { height } | embed respects the new min-height |
| `host:theme` { theme: 'light'\|'dark'\|'auto' } | toggle dark/light styles |
| `host:focus` { lng, lat, zoom } | fly map to coordinates |
| `host:open` { kind: 'region'\|'location', id } | open popup |
| `host:data` { regions?, locations? } | hot-swap datasets |

### Embed → Host

| Message | Effect |
|---------|--------|
| `embed:ready` | signals readiness; host should reply with `host:ready` |
| `embed:height` { height } | iframe auto-resizes to this pixel height |
| `embed:click` { kind, id } | a marker was clicked — re-emitted as `eg-embed:click` DOM event |
| `embed:error` { … } | a MapLibre/asset error — re-emitted as `eg-embed:error` DOM event |

### Listening from Squarespace (custom code)

```js
document.getElementById('eg-active-crews').addEventListener('eg-embed:click', (e) => {
  console.log('crew opened', e.detail);
  // Plausible, GA, etc.
});
```

---

## 4. Same-origin deployment (advanced, non-Squarespace)

If your host allows inline `<script>` tags (a static site you own, Ghost Pro with
Code Injection, etc.), skip the iframe entirely:

```html
<link rel="stylesheet" href="https://earth-guardians.example.com/_nuxt/maplibre-gl.css" />
<div id="eg-active-crews" style="min-height:520px"></div>
<script type="module" src="https://earth-guardians.example.com/_nuxt/entry.js"></script>
```

The composables (`useSquarespaceEmbed`, `useEmbedBasemap`, `useCrewEmbedMarkers`)
all run client-only — same `onMounted` guards, no SSR hydration issues.

---

## 5. Theming your embed to your Squarespace brand

1. Edit the host's CSS so the section **behind** the embed uses your brand gradient.
2. Override `--embed-land-stroke` and `--embed-land-stroke-dark` in the iframe by
   appending `<style>` after the script:

```html
<script>
  // Wait for embed:ready, then push overrides into the iframe.
  window.addEventListener('message', (e) => {
    if (e.data?.source !== 'squarespace-embed' || e.data.type !== 'embed:ready') return;
    const iframe = document.getElementById('eg-active-crews').querySelector('iframe');
    iframe.contentDocument.documentElement.style.setProperty('--embed-land-stroke', '#0f172a');
    iframe.contentDocument.documentElement.style.setProperty('--embed-accent', '#a855f7');
  });
</script>
```

3. Pass `data-accent="#a855f7"` to the launcher to recolor markers + halos.

---

## 6. Building & deploying

```bash
pnpm build           # → .output/
pnpm generate        # → dist/   (GitHub Pages / Cloudflare Pages)
# Then upload dist/ to your host. The embed is at:
#   https://<host>/squarespace/active-crews
#   https://<host>/squarespace-embed.js
#   https://<host>/data/embed/land-110m.geojson
#   https://<host>/data/crews-locations.json
```

The launcher (`squarespace-embed.js`) is loaded as a static asset from `public/`.
No build step required for it.

---

## 7. Where the implementation lives

| File | Purpose |
|------|---------|
| `composables/useSquarespaceEmbed.ts` | Cross-origin bridge, theme probe, auto-resize, postMessage protocol. |
| `composables/useEmbedBasemap.ts` | MapLibre style loader — MapTiler hybrid-v4 vector style with water layers force-painted to alpha 0; falls back to borders-only when no MapTiler key. |
| `pages/squarespace/active-crews.vue` | Transparent viewport, mounts the three composables, renders popups + stats pill. |
| `public/squarespace-embed.js` | Vanilla JS launcher Squarespace users paste once. |
| `public/data/embed/land-110m.geojson` | Natural Earth low-res countries (public domain). |
| `public/data/crews-locations.json` | Crew locations source-of-truth (already shipped). |

---

## 8. Extending to other datasets

The same pattern works for endangered species, project grants, vulcan-observatory.
To add another embed page:

1. Copy `pages/squarespace/active-crews.vue` → `pages/squarespace/<dataset>.vue`.
2. Swap `allCrewRegionsData` for the matching dataset import.
3. Re-use `useEmbedBasemap` (already dataset-agnostic).
4. Add a new markers composable (or generalize `useCrewEmbedMarkers` into `useEmbedMarkers({ regions, locations })` if more datasets adopt the same point shape).
5. Add the route to `nitro.prerender.routes` in `nuxt.config.ts`.

The launcher JS does not need changes; pass `data-path="/squarespace/species"` etc.

---

*Last updated 2026-09-04.*