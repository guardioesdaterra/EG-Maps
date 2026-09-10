/*!
 * eg-widget.js — Earth Guardians embeddable widget system.
 *
 * What this does
 * --------------
 * A single, zero-dependency script that supports four embedding modes:
 *
 *   1. iframe   — Transparent iframe to a Nuxt static route (cross-origin safe).
 *   2. inline   — Same-origin: loads MapLibre CSS + JS, renders map directly in the page DOM.
 *   3. widget   — Lightweight data widgets (stats, counters, cards) — no map, no MapLibre.
 *   4. component — Custom Element <eg-map> for encapsulated embedding.
 *
 * How to use it in Squarespace
 * ----------------------------
 * Add a Code Block (or footer Code Injection) and paste:
 *
 *   <!-- Mode 1: iframe (works everywhere) -->
 *   <div data-eg-map="active-crews" style="min-height:480px"></div>
 *   <script src="https://<YOUR-DOMAIN>/eg-widget.js" defer><\/script>
 *
 *   <!-- Mode 2: inline (same-origin only) -->
 *   <div data-eg-map="active-crews" data-mode="inline" style="min-height:480px"></div>
 *
 *   <!-- Mode 3: widget (lightweight, no map) -->
 *   <div data-eg-widget="stats" data-dataset="active-crews"></div>
 *
 *   <!-- Mode 4: Web Component -->
 *   <eg-map dataset="active-crews" mode="iframe" height="480"></eg-map>
 *
 * The script auto-discovers all [data-eg-map], [data-eg-widget], and <eg-map> elements.
 *
 * License: MIT
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var PROTOCOL = 'squarespace-embed';
  var PROTOCOL_VERSION = 1;
  var ORIGIN = window.location.origin;

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function attr(el, name, fallback) {
    var v = el.getAttribute(name);
    return v == null ? fallback : v;
  }

  function resolveBase(script) {
    if (!script || !script.src) return ORIGIN;
    try { return new URL(script.src).origin; } catch (e) { return ORIGIN; }
  }

  /* ── postMessage bridge ──────────────────────────────────────────── */

  function postToFrame(iframe, type, payload) {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ source: PROTOCOL, version: PROTOCOL_VERSION, type: type, payload: payload }, '*');
  }

  /* ── Mode 1: iframe ─────────────────────────────────────────────── */

  function mountIframe(container, cfg) {
    if (container.__egMounted) return;
    container.__egMounted = true;
    container.style.position = container.style.position || 'relative';

    var iframe = document.createElement('iframe');
    iframe.title = 'Earth Guardians — ' + (cfg.label || 'Map');
    iframe.loading = 'lazy';
    iframe.allow = 'geolocation';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.scrolling = 'no';
    iframe.style.cssText = 'display:block;width:100%;border:0;background:transparent;min-height:' + cfg.minHeight + 'px;color-scheme:light dark';

    var base = cfg.origin.endsWith('/') ? cfg.origin : cfg.origin + '/';
    var url = new URL(cfg.path.replace(/^\/+/, ''), base);
    url.searchParams.set('embed', '1');
    if (cfg.theme) url.searchParams.set('theme', cfg.theme);
    if (cfg.accent) url.searchParams.set('accent', cfg.accent.replace('#', ''));
    iframe.src = url.toString();
    container.appendChild(iframe);

    var channel = 'eg-' + Math.random().toString(36).slice(2, 8);
    var mount = { container: container, iframe: iframe, channel: channel };

    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || d.source !== PROTOCOL || d.version !== PROTOCOL_VERSION) return;
      if (e.source !== iframe.contentWindow) return;
      switch (d.type) {
        case 'embed:ready':
          postToFrame(iframe, 'host:ready', { theme: cfg.theme || 'auto', channel: channel });
          postToFrame(iframe, 'host:resize', { height: container.clientHeight });
          break;
        case 'embed:height':
          if (typeof d.payload === 'number') iframe.style.height = Math.max(cfg.minHeight, d.payload) + 'px';
          break;
        case 'embed:click':
          container.dispatchEvent(new CustomEvent('eg:click', { bubbles: true, detail: d.payload }));
          break;
        case 'embed:error':
          container.dispatchEvent(new CustomEvent('eg:error', { bubbles: true, detail: d.payload }));
          break;
      }
    });

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () {
      postToFrame(iframe, 'host:resize', { height: container.clientHeight });
    }) : null;
    if (ro) ro.observe(container);

    var probe = new MutationObserver(function () {
      var t = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      postToFrame(iframe, 'host:theme', { theme: t });
    });
    probe.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return mount;
  }

  /* ── Mode 2: inline (same-origin) ───────────────────────────────── */

  var inlineLoaded = { css: false, js: false };

  function loadCSS(href) {
    if (inlineLoaded.css) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = function () { inlineLoaded.css = true; resolve(); };
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    if (inlineLoaded.js) return Promise.resolve();
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { inlineLoaded.js = true; resolve(); };
      s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  async function mountInline(container, cfg) {
    if (container.__egMounted) return;
    container.__egMounted = true;

    container.style.position = 'relative';
    container.style.minHeight = cfg.minHeight + 'px';

    var base = cfg.origin.endsWith('/') ? cfg.origin : cfg.origin + '/';
    var cssUrl = base + '_nuxt/maplibre-gl.css';
    var jsUrl = base + '_nuxt/entry.js';

    await loadCSS(cssUrl);
    await loadScript(jsUrl);

    // For inline mode, we create a transparent iframe pointing to the specific
    // dataset route. True inline (no iframe) requires the Nuxt app to be loaded
    // in the host page context, which is complex. This is a "light inline" mode
    // that loads the assets from the same origin but still uses a same-origin iframe.
    var iframe = document.createElement('iframe');
    iframe.title = 'Earth Guardians — ' + (cfg.label || 'Map');
    iframe.loading = 'lazy';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.scrolling = 'no';
    iframe.style.cssText = 'display:block;width:100%;border:0;background:transparent;min-height:' + cfg.minHeight + 'px;color-scheme:light dark';

    var url = new URL(cfg.path.replace(/^\/+/, ''), base);
    url.searchParams.set('embed', '1');
    url.searchParams.set('hideAll', '1');
    if (cfg.theme) url.searchParams.set('theme', cfg.theme);
    iframe.src = url.toString();
    container.appendChild(iframe);

    var channel = 'eg-' + Math.random().toString(36).slice(2, 8);
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!d || d.source !== PROTOCOL || d.version !== PROTOCOL_VERSION) return;
      if (e.source !== iframe.contentWindow) return;
      if (d.type === 'embed:height' && typeof d.payload === 'number') {
        iframe.style.height = Math.max(cfg.minHeight, d.payload) + 'px';
      }
      if (d.type === 'embed:click') {
        container.dispatchEvent(new CustomEvent('eg:click', { bubbles: true, detail: d.payload }));
      }
    });
  }

  /* ── Mode 3: data widgets ───────────────────────────────────────── */

  var DATASET_ROUTES = {
    'active-crews': { path: '/active-crews', label: 'Active Crews' },
    'active-crews-3d': { path: '/active-crews/3d', label: 'Active Crews Globe' },
    'project-grants': { path: '/project-grants', label: 'Project Grants' },
    'project-grants-3d': { path: '/project-grants/3d', label: 'Project Grants Globe' },
    'endangered-species': { path: '/endangered-species', label: 'Endangered Species' },
    'endangered-species-3d': { path: '/endangered-species/3d', label: 'Endangered Species Globe' },
  };

  var WIDGET_STYLES = '\
.eg-widget{font-family:Inter,ui-sans-serif,system-ui,sans-serif;box-sizing:border-box;width:100%}\
.eg-widget*,.eg-widget*::before,.eg-widget*::after{box-sizing:inherit}\
.eg-widget-card{padding:1.25rem;border-radius:1rem;border:1px solid rgba(15,23,42,.1);background:rgba(255,255,255,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:transform .18s ease,border-color .18s ease}\
.eg-widget-card:hover{transform:translateY(-2px);border-color:rgba(34,211,238,.4)}\
.eg-widget-eyebrow{margin:0 0 .5rem;color:#0f766e;font:600 .65rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.15em;text-transform:uppercase}\
.eg-widget-stat{margin:0;font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-.04em;color:#0f172a;line-height:1}\
.eg-widget-label{margin:.4rem 0 0;color:rgba(15,23,42,.6);font-size:.85rem;line-height:1.4}\
.eg-widget-link{display:inline-block;margin-top:.75rem;color:#0f766e;font-weight:600;font-size:.82rem;text-decoration:none;transition:color .15s}\
.eg-widget-link:hover{color:#14b8a6}\
.eg-widget-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:.75rem}\
.eg-widget-mini{text-align:center;padding:1rem .75rem;border-radius:.75rem;border:1px solid rgba(15,23,42,.08);background:rgba(255,255,255,.7)}\
.eg-widget-mini-num{font-size:1.8rem;font-weight:800;color:#0f172a;letter-spacing:-.03em}\
.eg-widget-mini-label{font-size:.72rem;color:rgba(15,23,42,.5);text-transform:uppercase;letter-spacing:.06em;margin-top:.25rem}\
@media(prefers-color-scheme:dark){\
.eg-widget-card{border-color:rgba(148,163,184,.15);background:rgba(15,23,42,.5)}\
.eg-widget-eyebrow{color:#5eead4}\
.eg-widget-stat,.eg-widget-mini-num{color:#f8fafc}\
.eg-widget-label,.eg-widget-mini-label{color:rgba(226,232,240,.6)}\
.eg-widget-link{color:#5eead4}\
.eg-widget-mini{border-color:rgba(148,163,184,.1);background:rgba(15,23,42,.3)}\
}';

  function injectStyles() {
    if (document.getElementById('eg-widget-styles')) return;
    var s = document.createElement('style');
    s.id = 'eg-widget-styles';
    s.textContent = WIDGET_STYLES;
    document.head.appendChild(s);
  }

  function mountStatsWidget(container, cfg) {
    injectStyles();
    var ds = cfg.dataset || 'active-crews';
    var route = DATASET_ROUTES[ds] || DATASET_ROUTES['active-crews'];

    container.innerHTML = '<div class="eg-widget eg-widget-card">' +
      '<p class="eg-widget-eyebrow">Earth Guardians</p>' +
      '<p class="eg-widget-stat" data-eg-count>Loading…</p>' +
      '<p class="eg-widget-label">' + route.label + '</p>' +
      '<a class="eg-widget-link" href="' + cfg.origin + route.path + '" target="_blank" rel="noopener">Explore on map →</a>' +
      '</div>';

    // Fetch the data endpoint to get real counts
    var dataUrl = cfg.origin + '/data/crews-locations.json';
    if (ds.indexOf('species') !== -1) dataUrl = cfg.origin + '/data/species/index.json';
    if (ds.indexOf('grants') !== -1) dataUrl = cfg.origin + '/data/species/index.json';

    fetch(dataUrl).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      var countEl = container.querySelector('[data-eg-count]');
      if (!countEl) return;
      var count = 0;
      if (data && data.features) count = data.features.length;
      else if (data && Array.isArray(data)) count = data.length;
      countEl.textContent = new Intl.NumberFormat('en-US').format(count);
    }).catch(function () {
      var countEl = container.querySelector('[data-eg-count]');
      if (countEl) countEl.textContent = '—';
    });
  }

  function mountMiniStatsWidget(container, cfg) {
    injectStyles();
    var datasets = (cfg.datasets || 'active-crews,project-grants,endangered-species').split(',');
    var grid = document.createElement('div');
    grid.className = 'eg-widget eg-widget-grid';

    datasets.forEach(function (ds) {
      var route = DATASET_ROUTES[ds.trim()] || DATASET_ROUTES['active-crews'];
      var card = document.createElement('div');
      card.className = 'eg-widget-mini';
      card.innerHTML = '<div class="eg-widget-mini-num" data-eg-mini="' + ds.trim() + '">—</div>' +
        '<div class="eg-widget-mini-label">' + route.label + '</div>';
      grid.appendChild(card);
    });

    container.appendChild(grid);

    // Fetch counts
    fetch(cfg.origin + '/data/crews-locations.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.features) return;
      var el = container.querySelector('[data-eg-mini="active-crews"]');
      if (el) el.textContent = new Intl.NumberFormat('en-US').format(data.features.length);
    }).catch(function () {});

    fetch(cfg.origin + '/data/species/index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data) return;
      var arr = data.features || data;
      var el1 = container.querySelector('[data-eg-mini="project-grants"]');
      var el2 = container.querySelector('[data-eg-mini="endangered-species"]');
      if (el1) el1.textContent = new Intl.NumberFormat('en-US').format(arr.length);
      if (el2) el2.textContent = new Intl.NumberFormat('en-US').format(arr.length);
    }).catch(function () {});
  }

  var WIDGET_TYPES = {
    'stats': mountStatsWidget,
    'mini-stats': mountMiniStatsWidget,
  };

  function mountWidget(container, cfg) {
    var widgetFn = WIDGET_TYPES[cfg.widgetType || 'stats'];
    if (widgetFn) widgetFn(container, cfg);
  }

  /* ── Mode 4: Web Component <eg-map> ─────────────────────────────── */

  function defineEgMap() {
    if (typeof customElements === 'undefined') return;
    if (customElements.get('eg-map')) return;

    customElements.define('eg-map', class extends HTMLElement {
      constructor() {
        super();
        this._shadow = null;
        this._mount = null;
      }

      connectedCallback() {
        var dataset = this.getAttribute('dataset') || 'active-crews';
        var mode = this.getAttribute('mode') || 'iframe';
        var height = parseInt(this.getAttribute('height') || '480', 10);
        var theme = this.getAttribute('theme') || 'auto';
        var accent = this.getAttribute('accent') || '';
        var origin = this.getAttribute('origin') || resolveBase(document.currentScript);

        var route = DATASET_ROUTES[dataset] || DATASET_ROUTES['active-crews'];

        // Create shadow DOM for style encapsulation
        this._shadow = this.attachShadow({ mode: 'open' });
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'width:100%;min-height:' + height + 'px;position:relative';
        this._shadow.appendChild(wrapper);

        var container = document.createElement('div');
        container.style.cssText = 'width:100%;min-height:' + height + 'px';
        wrapper.appendChild(container);

        if (mode === 'widget') {
          mountWidget(container, {
            origin: origin,
            dataset: dataset,
            widgetType: 'stats',
          });
        } else {
          this._mount = mountIframe(container, {
            origin: origin,
            path: route.path,
            minHeight: height,
            theme: theme,
            accent: accent,
            label: route.label,
          });
        }
      }

      disconnectedCallback() {
        if (this._shadow) {
          this._shadow.innerHTML = '';
          this._shadow = null;
        }
        this._mount = null;
      }

      static get observedAttributes() {
        return ['dataset', 'mode', 'height', 'theme', 'accent'];
      }

      attributeChangedCallback() {
        if (this.isConnected) {
          this.disconnectedCallback();
          this.connectedCallback();
        }
      }
    });
  }

  /* ── Auto-init ──────────────────────────────────────────────────── */

  function init() {
    var script = document.currentScript || document.querySelector('script[data-eg-widget-launch]');

    // Inject global CSS
    injectStyles();

    // Make Squarespace respect transparency
    var style = document.createElement('style');
    style.textContent = 'iframe[allowtransparency]{background:transparent !important}';
    document.head.appendChild(style);

    var origin = resolveBase(script);
    var defaultTheme = attr(script, 'data-theme', 'auto');
    var defaultMinHeight = parseInt(attr(script, 'data-min-height', '480'), 10) || 480;

    // 1. Mount iframe embeds: [data-eg-map]
    var mapContainers = document.querySelectorAll('[data-eg-map]');
    for (var i = 0; i < mapContainers.length; i++) {
      var c = mapContainers[i];
      var ds = attr(c, 'data-eg-map', 'active-crews');
      var route = DATASET_ROUTES[ds] || DATASET_ROUTES['active-crews'];
      var mode = attr(c, 'data-mode', 'iframe');

      if (mode === 'inline') {
        mountInline(c, {
          origin: attr(c, 'data-origin', origin),
          path: route.path,
          minHeight: parseInt(attr(c, 'data-min-height', String(defaultMinHeight)), 10) || defaultMinHeight,
          theme: attr(c, 'data-theme', defaultTheme),
          accent: attr(c, 'data-accent', ''),
          label: route.label,
        });
      } else {
        mountIframe(c, {
          origin: attr(c, 'data-origin', origin),
          path: route.path,
          minHeight: parseInt(attr(c, 'data-min-height', String(defaultMinHeight)), 10) || defaultMinHeight,
          theme: attr(c, 'data-theme', defaultTheme),
          accent: attr(c, 'data-accent', ''),
          label: route.label,
        });
      }
    }

    // 2. Mount data widgets: [data-eg-widget]
    var widgetContainers = document.querySelectorAll('[data-eg-widget]');
    for (var j = 0; j < widgetContainers.length; j++) {
      var wc = widgetContainers[j];
      mountWidget(wc, {
        origin: attr(wc, 'data-origin', origin),
        widgetType: attr(wc, 'data-eg-widget', 'stats'),
        dataset: attr(wc, 'data-dataset', 'active-crews'),
        datasets: attr(wc, 'data-datasets', ''),
      });
    }

    // 3. Define Web Component
    defineEgMap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
