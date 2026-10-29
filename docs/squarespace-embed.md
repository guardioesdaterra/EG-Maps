# Earth Guardians — Squarespace Embed

This guide shows how to add the **Active Crews** map to a Squarespace 7.x site or another host.
The launcher creates an iframe for the app's real `/active-crews` route, with `embed=true`
and `hideAll=true`. `/iframe/squarespace` is the integration guide page, not the map; the old
`/squarespace/active-crews` path is not a route in this repository.

> Add a container and one script tag. The map remains inside a regular iframe so browser
> same-origin protections stay in force.

---
## What the embed renders

The iframe loads the existing Active Crews 2D map page. The launcher sets a 480 px minimum
height by default, hides the map controls, and accepts the map's readiness and 3D resize
messages. This launcher does not promise a transparent basemap or host-driven theme/accent
changes; those are not implemented by the active map route.

### Multiple instances per page

```html
<div data-eg-embed="active-crews" style="min-height:480px"></div>
<div data-eg-embed="active-crews" data-min-height="320" style="min-height:320px"></div>
<script src="https://YOUR-DOMAIN/squarespace-embed.js" data-origin="https://YOUR-DOMAIN" defer></script>
```

For a GitHub Pages deployment with a repository subpath, include that subpath in the script URL (for example `https://YOUR-DOMAIN/EG-Maps/squarespace-embed.js`); the launcher infers `/EG-Maps/` for the map route.

---

## 2. Configuration knobs (data-*)

| Attribute | Default | Purpose |
|-----------|---------|---------|
| `data-origin` | script origin | Absolute URL of the static Nuxt host (include the origin only). |
| `data-path` | `/active-crews` | Existing map route to iframe. |
| `data-base-url` | script directory | App subpath inferred from the launcher URL; override with `/EG-Maps/test` if needed. |
| `data-min-height` | `480` | Initial/minimum iframe height in pixels. |
| `data-label` | `Active Crews map` | Accessible iframe title suffix. |
| `data-target` | `[data-eg-embed="active-crews"], #eg-active-crews` | CSS selector for the container(s). |
| `data-loading` | `lazy` for maps; `eager` for `/` | Use `eager` for the first visible map when a nested WebView delays native lazy loading. |
| `data-scrolling` | `no` for maps; `auto` for `/` | Keep map canvases fixed; allow the long home page to scroll inside its iframe. |

For example, a home embed can use `<div data-eg-embed="active-crews" data-path="/" data-label="EG-Maps home"></div>`. The launcher starts the home eagerly and enables iframe scrolling; map routes keep the existing lazy default to avoid starting every map on a long Squarespace page. Set `data-loading="eager"` on a map container only when it is meant to appear immediately and the host WebView is delaying it.

The launcher now mounts matching containers that Squarespace inserts after the script runs, and cleans up its iframe/listeners if the host removes a container. While the iframe document loads, the host shows a small accessible loading state. The container exposes `data-eg-loading`, `data-eg-loaded`, `data-eg-ready`, or `data-eg-error`/`data-eg-timeout` for inspection; `data-eg-ready` remains specific to the existing Active Crews readiness message.

---

## 3. Cross-origin protocol (postMessage)

The launcher accepts messages only when both `event.origin` matches the configured map host
and `event.source` is that exact iframe window. The app also accepts host messages only from
its parent window and configured origins.

### Host → Map

| Message | Effect |
|---------|--------|
| `crew-filter-update` `{ payload: { region?: string, hideAll?: 'true', zoom?: string } }` | Update the displayed crew filter; `region` is a supported slug such as `south-america`, and `zoom` is a string from `0` to `1`. |
| `crew-view-switch` `{ payload: { view: '2d'\|'3d' } }` | Switch between the 2D and 3D routes. |
| `crew-request-state` | Ask the map to reply with its current filter state. |

### Map → Host

| Message | Effect |
|---------|--------|
| `crew-map-ready` | Signals that the map can receive host messages. |
| `crew-map-state` `{ payload: { region?, hideAll?, zoom? } }` | Reply to `crew-request-state`. |
| `crew-resize` `{ payload: { width, height } }` | Suggests dimensions; currently emitted by the 3D map. |

### Sending a host message (custom code)

```js
const iframe = document.querySelector('#eg-active-crews iframe');
const mapOrigin = 'https://YOUR-DOMAIN';
iframe?.contentWindow?.postMessage(
  { type: 'crew-filter-update', payload: { region: 'south-america', hideAll: 'true' } },
  mapOrigin
);
```

---

## 4. Direct mounting without an iframe

The launcher supports iframe embeds only. Do not include internal Nuxt bundle files such as
`_nuxt/entry.js` directly in the host page; they are not a standalone map widget.

---

## 5. Appearance and cross-origin limits

The iframe is cross-origin in a normal Squarespace deployment, so the host cannot access
`iframe.contentDocument` or set CSS variables inside the map. The current Active Crews embed
does not implement theme or accent messages; do not rely on `data-theme` or `data-accent`.

---

## 6. Building & deploying

```bash
pnpm build           # → .output/
pnpm generate        # → .output/public (static site)
# Publish .output/public to your host. The map and launcher are at:
#   https://<host>/active-crews?embed=true&hideAll=true
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
| `pages/active-crews/index.vue` | Active Crews 2D route used by the launcher. |
| `composables/useCrewPostMessage.ts` | Parent-window filter/view protocol and readiness signal. |
| `public/squarespace-embed.js` | Vanilla JS launcher Squarespace users paste once. |
| `public/data/embed/land-110m.geojson` | Natural Earth low-res countries (public domain). |
| `public/data/crews-locations.json` | Crew locations source-of-truth (already shipped). |

---

## 8. Other datasets

Only Active Crews has the documented Squarespace launcher protocol. `data-path` can point
to another existing route, but the launcher does not add dataset-specific data, filters, or
postMessage handling; verify or implement those separately before embedding another map.

---

## 9. Embedding sign-in pages (`/eg-grants`, `/eg-grants/fullscreen`)

Auth pages have one hard constraint map embeds don't: **Google refuses to render
its login page inside any iframe** (`X-Frame-Options: DENY` + `frame-ancestors
'none'`). A sign-in click that navigates *inside* the iframe dies before the
account chooser paints — DevTools reports a frame refusal that is easily
misread as CORS. (It is not CORS: the iframe origin is still github.io, so the
`Origin` header — and therefore Supabase CORS behavior — is identical framed or
direct. And `signInWithOAuth` performs no fetch at all.)

The flow in `composables/useSupabaseAuth.ts` therefore keeps OAuth top-level
while the user stays on the host page, via an auth tab + session relay:

1. Framed sign-in / switch-account click → the iframe does NOT touch Supabase.
   It opens an **auth tab**: `…/eg-grants/?eg-signin=login&eg-postback=1`
   via `window.open` (deliberately without `noopener` — the tab needs
   `window.opener`). If a popup blocker kills it, it falls back to full top
   navigation (previous behavior).
2. The tab consumes the flags on mount (`autoSignInIfRequested`, wired into
   `pages/eg-grants/index.vue` + `fullscreen.vue`), runs the PKCE flow
   top-level (Google renders, verifier shares a storage partition with the
   `/auth/callback/` exchange), preserving the flags through `next`.
3. Once signed in, the tab posts its fresh session to
   `window.opener` (`{source:'eg-auth', type:'auth:session'}`) with
   `targetOrigin` pinned to its own origin — deliverable only because the
   opener is the same-origin iframe, so **no host-side relay script is
   needed**. It then tries `window.close()` and otherwise shows a
   "you can close this tab" screen (`isPostbackTab`/`postbackDone`).
4. The iframe's `useSupabase` listener accepts the message only when the origin
   matches and `event.source` is the exact auth popup opened by that iframe; it
   then persists the session via `setSession()`. Refresh token persists in the
   iframe partition, so the embed stays logged in across reloads on the same host.

### Host requirements (Squarespace code block)

```html
<iframe
  src="https://guardioesdaterra.github.io/EG-Maps/eg-grants/?embed-offset=0"
  style="width: 100%; height: 900px; border: none;"
  loading="lazy"
  allow="clipboard-write"
  title="Earth Guardians Grants"
></iframe>
```

- `?embed-offset=0` for chromeless fullscreen wrappers (otherwise `useHostEmbed`
  reserves a 64px host-header offset). Omit it when the host does render a
  header over the iframe, or pass its pixel height.
- `allow="clipboard-write"` for the dashboard copy buttons.
- Do NOT add a `sandbox` attribute. If the host insists on one, it MUST contain
  `allow-scripts allow-same-origin allow-popups` — without `allow-popups` the
  auth tab cannot open (falls back to top navigation, leaving the host);
  without `allow-same-origin` Supabase session storage breaks.
- Optional: append `?embed=1&embed-offset=<px>` so `useHostEmbed` shifts fixed
  gates/modals below the host header, and/or drive it live via postMessage
  `{ source: 'eg-host', type: 'host:header-offset', payload: { offset } }`
  from the framing parent (same-origin or `earthguardians.org` only).

### Supabase dashboard checklist

- Auth → URL Configuration → **Redirect URLs** must contain the exact canonical
  callback (trailing slash matters on static hosts):
  `https://guardioesdaterra.github.io/EG-Maps/auth/callback/`
- Do NOT add `earthguardians.org` there: `redirectTo` is built from the iframe's
  own origin (github.io), never the host.
- Google Cloud → OAuth client → Authorized redirect URIs must include
  `https://<supabase-ref>.supabase.co/auth/v1/callback` (unchanged by this fix).

### Verifying the fix

1. Open the host page with the embed, DevTools Console + Network open.
2. Click Sign In → an **auth tab** opens (host page untouched) → Google
   chooser appears → complete login → tab shows "You're signed in" and closes.
3. The iframe unlocks in place: manager gate passes, grants load, URL of the
   host page unchanged, no `?eg-signin=` anywhere.
4. Failure signatures: Google frame-refusal console error = pre-fix code or a
   sandboxed iframe; `code verifier could not be found` on callback = flow
   started framed (verifier in the wrong partition); iframe still gated after
   the tab closes = relay rejected (check both `event.origin` and
   `event.source` against the popup opened by the iframe) or a
   non-`@earthguardians.org` account (domain rule).

---

*Last updated 2026-10-27.*
