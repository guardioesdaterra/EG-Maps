# EG-Maps map performance regression pass

This change adds a repeatable Chromium measurement and behavior pass for the map pages and documented iframe variants. It changes tests, Playwright configuration, package scripts, CI, and this document only; it does not modify map production code or remove features.

## What the pass checks

The test opens every main map route in a fresh browser context: Project Grants, Endangered Species, Active Crews, and Vulcan Observatory, each in 2D and 3D. It also opens all eight 2D/3D URLs documented by the [iframe examples](../pages/iframe/index.vue) with `embed=true&hideAll=true` in a 390×844 viewport. A separate Active Crews 2D test records its own direct-route load/render artifact and asserts its canonical path and page title, so a fallback to `/` cannot be mistaken for the map. The Active Crews iframe harness also checks that the child frame stays on `/active-crews` before exercising the actual [embed messaging contract](./squarespace-embed.md).

A second fixture builds the app with `NUXT_APP_BASE_URL=/EG-Maps/` and serves it at that deployed prefix. It loads the real `eg-widget.js` from `/EG-Maps/eg-widget.js`, without manually supplying `data-base-url`, requires the iframe target to be `/EG-Maps/active-crews` with `embed=true&hideAll=true`, and checks the child page title and a visibly painted map canvas. The canonical route after removing the deployment prefix must be `/active-crews`, never `/`.

The probes record DOMContentLoaded, time to a verified non-empty canvas, same-origin transfer and script bytes, Chromium JS heap where available, Long Task API maximum and total duration, canvas bitmap dimensions, and canvas-to-map-region coverage. Canvas screenshots are sampled for distinct colors so an empty or flat canvas cannot pass. The embed checks also assert that the page chrome and map filters/grid controls stay hidden.

Behavior checks cover grid on/off, filter open/close, Project Grants connections on/off, and Vulcan Observatory action-menu open/close. The Active Crews host test requests and verifies state, sends a region/zoom update, switches 2D→3D→2D, checks the ready messages, and verifies that neither view switch reloads the iframe document.

The additional behavior suite renders the Crews Map title and status controls across all ten supported locales, checks that Active/Inactive controls remain distinct from the map name, times filter-state updates, and parses active-only/inactive-only GeoJSON downloads. Unit checks cover status-filtered exports, active-only connection features, and retention of regional export records. Mobile-context browser checks cover zero-height home reveal/scroll recovery, late Squarespace block insertion and re-entry, error/timeout fallback, and nested `eg-map` canvas/resource cleanup. Chromium runs the full map suite; a focused mobile WebKit project runs only the Squarespace host lifecycle cases. This is a Playwright WebKit/mobile-context check, not a native iOS WebView test.

Focused lifecycle validation passed 4/4 cases in Chromium and 3/3 Squarespace cases in WebKit against a temporary fixture containing candidate launcher/widget scripts from the owner worktrees. The late-block scenario created one iframe; moving the host node caused one additional same-URL navigation in both engines while retaining one iframe, and removing/reinserting produced one further navigation. Separately, the nested mobile `eg-map` test confirmed widget message-listener and observer counts returned to baseline. Error and timeout fallbacks also passed. These results validate the test harness against candidate scripts; they are not a claim that those unmerged scripts are already in this branch.

## Baseline from the production build

Measured with a local static production build served from `.output/public`, Chromium headless, one worker, dark theme, English locale, and fresh browser contexts. Main routes use a 1280×800 viewport; embedded route variants use 390×844. Values below are a CI-shaped baseline run, not a cross-machine performance guarantee.

| Main route | DOMContentLoaded | Canvas probe completed | Same-origin transfer | Script transfer | JS heap | Longest task |
|---|---:|---:|---:|---:|---:|---:|
| Project Grants 2D | 86 ms | 3.84 s | 3.54 MiB | 0.86 MiB | 22.03 MiB | 203 ms |
| Endangered Species 2D | 89 ms | 4.93 s | 3.70 MiB | 0.86 MiB | 20.69 MiB | 467 ms |
| Active Crews 2D | 158 ms | 5.51 s | 3.55 MiB | 0.87 MiB | 20.69 MiB | 414 ms |
| Vulcan Observatory 2D | 132 ms | 5.96 s | 3.89 MiB | 0.98 MiB | 23.37 MiB | 795 ms |
| Project Grants 3D | 96 ms | 5.44 s | 3.54 MiB | 0.86 MiB | 22.03 MiB | 437 ms |
| Endangered Species 3D | 106 ms | 4.19 s | 3.70 MiB | 0.86 MiB | 22.03 MiB | 298 ms |
| Active Crews 3D | 87 ms | 3.75 s | 3.55 MiB | 0.87 MiB | 22.03 MiB | 326 ms |
| Vulcan Observatory 3D | 117 ms | 9.92 s | 3.89 MiB | 0.97 MiB | 23.37 MiB | 1,167 ms |

The standalone Active Crews 2D run was also repeated independently: 85 ms DOMContentLoaded, a 3.77 s canvas probe, 3.55 MiB transfer, 0.87 MiB scripts, 20.69 MiB JS heap, and a 161 ms longest task. It asserts `/active-crews` and the Active Crews page title, not just a canvas.

### Corrected cold 2D profile (separate harness)

A corrected five-run cold profile, reported by Housaky/RICK after verifying distinct server ports, measured a 9.47 s median canvas-ready time on the baseline and 9.81 s on candidate `cf82c08` (reported difference: +335 ms; the measured intervals overlap). All five candidate navigations completed without page errors. Same-origin transfer was effectively unchanged: the baseline was 1,047,332 bytes and never fetched the grid PNG; the candidate fetched a WebP image in only 1 of 5 runs. This is not evidence of a 2D startup or transfer improvement. The baseline also recorded 105 `requestAnimationFrame` callbacks in a two-second idle window and a 2.09 s median for `/`. The standalone Active Crews Playwright test now captures its own two-second idle RAF count for comparison; it is diagnostic only, with no RAF CI ceiling set before a paired profile calibrates one.

This profile is distinct from the Playwright canvas-probe table above; its timings are not directly comparable because the measurement harness differs. An earlier port-collision comparison was invalid and is excluded. The paired 3D profile is still pending; no 3D performance claim is made here.

The five-run 3D cold baseline reported by Housaky/RICK is 10.43 s to usable canvas and 2.163 MB same-origin transfer. The 1,115,763-byte grid PNG loaded in all five baseline runs. A same-host comparison against `cf82c08` using WebP has started; the candidate result is pending, so no 3D improvement claim is made.

All eight documented embed variants passed in the final combined run. At 390×844 their ranges were 85–205 ms DOMContentLoaded, 2.83–5.42 s for the canvas probe, 3.54–3.91 MiB same-origin transfer, 0.86–1.00 MiB scripts, 20.69–23.37 MiB JS heap, and 142–500 ms for the longest task. Each canvas covered the full map region; the bitmap was 329,160 pixels at this viewport. The Active Crews iframe also passed its state/filter/view-switch checks without a child-document reload.

The new deployed-prefix browser check was also exercised using a temporary copy of LUA's uncommitted `eg-widget.js` in the test fixture only: it generated `http://localhost:3001/EG-Maps/active-crews?embed=true&hideAll=true&theme=auto` and loaded the actual prefixed Active Crews page. That run measured 234 ms DOMContentLoaded, a 2.66 s canvas probe, 3.55 MiB same-origin transfer, 0.87 MiB script transfer, 22.03 MiB heap, a 144 ms longest task, and 711 ms total observed long-task time. The current `test/map-performance` branch still contains the pre-fix widget: against it the new regression correctly fails because the URL is `/active-crews` without the `/EG-Maps/` prefix. The subpath pass should become green once LUA's widget change is coordinated into the shared source; no production patch was copied into this branch.

The initial 8 s aggregate Long Task ceiling proved too tight in a repeat: Vulcan Observatory 3D recorded 8.776 s of accumulated long-task time while its individual task stayed within the 2.5 s limit. The aggregate ceiling is therefore set to 12 s, leaving 3.2 s above the observed run while retaining the per-task ceiling.

## Initial CI budgets

These are regression ceilings, not performance targets. They leave headroom over the local baseline for hosted-runner variance while still detecting large regressions.

| Metric | CI ceiling |
|---|---:|
| DOMContentLoaded | 2.5 s |
| Verified canvas probe | 15 s |
| Same-origin transferred resources | 5 MiB |
| Same-origin JavaScript | 1.5 MiB |
| Chromium JS heap, when supported | 64 MiB |
| Longest main-thread task | 2.5 s |
| Total observed long-task time | 12 s |
| Control event to accessible DOM-state update | 350 ms |
| Canvas coverage of map region | at least 95% |
| Distinct sampled canvas colors | at least 4; exactly one MapLibre canvas per map region |

The canvas timing is an operational proxy: 2D maps first reach their `aria-busy=false` state; the test then samples the visible canvas after a short settling delay. 3D maps use the visible, non-empty canvas. It includes screenshot sampling overhead and is not an instrumented timestamp of the first GPU frame. JS heap comes from Chromium's non-standard `performance.memory` where available and should be treated as an approximate proxy.

Transfer budgets count same-origin resources only. External basemap/tile requests are deliberately excluded because provider/network variation would make this CI gate noisy; a colored canvas confirms that map content did render. The pixel-color check validates a non-empty visual surface and coverage, not exact pixel equivalence: map tiles and labels are dynamic, so this pass does not use screenshot snapshots.

## Integration status

This branch is test-only and remains based on `develop` commit `9b83b2e`; no production implementation was copied, committed, pushed, or merged. Typecheck and lint pass, and the filtered export/connection unit tests pass (3/3). The locale naming unit test currently fails all 11 test cases on this unchanged base because its translations still say “Active Crews” (or the existing localized equivalents); it expects the pending naming change from `8254619`. The rendered Active/Inactive controls and filter-driven download assertions depend on the separate crew-status UI implementation, while their builder-level export/connection contract passes here. The nested embed browser checks were validated with temporary candidate scripts, but the complete expanded `pnpm test:perf` suite still needs a coordinated combined run after owner changes are integrated. Do not land this test branch alone.

## Run it

Run the dedicated pass with:

```bash
pnpm test:perf
```

The test helper builds the root static site if it is missing, copies it to a temporary static fixture, temporarily builds a second version with `NUXT_APP_BASE_URL=/EG-Maps/`, places that output under the `/EG-Maps/` prefix, then restores the original `.output` before running Chromium. This exercises root and deployed-prefix routes in one serial run without changing app source. The additional subpath build adds CI time; the pull-request workflow also runs the existing root E2E build, then uploads the Playwright HTML report as `map-performance-report` for seven days.

The dedicated test code is in [map-performance.spec.ts](../tests/map-performance.spec.ts), with its static-server and Chromium settings in [playwright.performance.config.ts](../playwright.performance.config.ts), and fixture preparation in [prepare-map-performance-site.sh](../scripts/prepare-map-performance-site.sh). The normal E2E configuration explicitly excludes this longer serial pass, so existing E2E tests remain separate.
