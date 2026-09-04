/*!
 * squarespace-embed.js — Earth Guardians active crews Squarespace launcher.
 *
 * What this does
 * --------------
 * 1. Creates a transparent iframe that loads the prerendered Nuxt page at
 *    `${ORIGIN}/squarespace/active-crews`.
 * 2. Listens for `embed:height` postMessage events from inside the iframe and
 *    resizes the iframe to match (so the page never has scrollbars).
 * 3. Forwards the host Squarespace page's theme (light/dark/auto) into the
 *    embed so the land outlines match the host's brand.
 * 4. Re-emits `embed:click` and `embed:error` as DOM CustomEvents so the
 *    host page can hook analytics into crew interactions.
 *
 * How to use it in Squarespace
 * ----------------------------
 * Add a Code Block (or footer Code Injection) and paste:
 *
 *   <div id="eg-active-crews" style="min-height:480px"></div>
 *   <script src="https://<YOUR-DOMAIN>/squarespace-embed.js"
 *           data-origin="https://<YOUR-DOMAIN>"
 *           data-theme="auto"
 *           data-min-height="480"
 *           data-accent="#22d3ee"
 *           defer></script>
 *
 * The script auto-mounts when the DOM is ready. Multiple containers are
 * supported — pass `data-target="<css-selector>"` or rely on the default
 * (`[data-eg-embed="active-crews"]` then `#eg-active-crews` fallback).
 *
 * Build note
 * ----------
 * `data-origin` MUST be the absolute URL where the static `dist/` is hosted
 * (GitHub Pages, Cloudflare Pages, Netlify, etc.). The iframe is the most
 * reliable cross-origin surface for embedding MapLibre into Squarespace,
 * which strips <script> tags injected via the text editor.
 *
 * License: MIT
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  /** @typedef {{ container: HTMLElement; iframe: HTMLIFrameElement; channel: string }} Mount */

  var PROTOCOL = 'squarespace-embed';
  var PROTOCOL_VERSION = 1;
  var DEFAULT_SELECTOR = '[data-eg-embed="active-crews"], #eg-active-crews';

  /** Read a data-* attribute with a typed default. */
  function attr(el, name, fallback) {
    var v = el.getAttribute(name);
    return v == null ? fallback : v;
  }

  /** Inject a single <script> tag and resolve when it (and its CSS) are loaded. */
  function injectStylesheet(href) {
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = function () { resolve(); };
      link.onerror = function () { resolve(); };
      document.head.appendChild(link);
    });
  }

  /** Mount a single embed inside the given container element. */
  function mount(container, cfg) {
    if (container.__egMounted) return;
    container.__egMounted = true;
    container.style.position = container.style.position || 'relative';

    var iframe = document.createElement('iframe');
    iframe.title = 'Earth Guardians — Active crews';
    iframe.loading = 'lazy';
    iframe.allow = 'geolocation';
    iframe.allowTransparency = 'true';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.cssText = [
      'display:block',
      'width:100%',
      'border:0',
      'background:transparent',
      'min-height:' + cfg.minHeight + 'px',
      'color-scheme:light dark'
    ].join(';');
    var path = cfg.path || '/squarespace/active-crews';
    var url = new URL(path, cfg.origin);
    url.searchParams.set('embed', '1');
    if (cfg.theme) url.searchParams.set('theme', cfg.theme);
    if (cfg.accent) url.searchParams.set('accent', cfg.accent.replace('#', ''));
    iframe.src = url.toString();
    container.appendChild(iframe);

    var channel = 'eg-embed-' + Math.random().toString(36).slice(2, 10);
    /** @type {Mount} */ var m2 = { container: container, iframe: iframe, channel: channel };

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () {
      post(m2, 'host:resize', { height: container.clientHeight });
    }) : null;
    if (ro) ro.observe(container);

    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.source !== PROTOCOL || data.version !== PROTOCOL_VERSION) return;
      switch (data.type) {
        case 'embed:ready':
          post(m2, 'host:ready', { theme: cfg.theme || 'auto', channel: channel });
          // Match height to current container.
          post(m2, 'host:resize', { height: container.clientHeight });
          break;
        case 'embed:height':
          if (typeof data.payload === 'number') {
            var h = Math.max(cfg.minHeight, data.payload);
            iframe.style.height = h + 'px';
          }
          break;
        case 'embed:click':
          container.dispatchEvent(new CustomEvent('eg-embed:click', {
            bubbles: true, detail: data.payload,
          }));
          break;
        case 'embed:error':
          container.dispatchEvent(new CustomEvent('eg-embed:error', {
            bubbles: true, detail: data.payload,
          }));
          // eslint-disable-next-line no-console
          console.error('[eg-embed] map error', data.payload);
          break;
      }
    });

    // React to host theme changes — emit a fresh host:theme every time Squarespace
    // toggles a class on <html> (Squarespace adds `dark` or `light`).
    var themeProbe = new MutationObserver(function () {
      var t = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      post(m2, 'host:theme', { theme: t });
    });
    themeProbe.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return m2;
  }

  function post(mount, type, payload) {
    if (!mount.iframe || !mount.iframe.contentWindow) return;
    mount.iframe.contentWindow.postMessage({
      source: PROTOCOL,
      version: PROTOCOL_VERSION,
      type: type,
      payload: payload,
    }, '*');
  }

  /** Read cfg from a <script data-* ...> element. */
  function readConfig(script) {
    return {
      origin: attr(script, 'data-origin', script.src ? new URL(script.src).origin : window.location.origin),
      theme: attr(script, 'data-theme', 'auto'),
      minHeight: parseInt(attr(script, 'data-min-height', '480'), 10) || 480,
      target: attr(script, 'data-target', ''),
      path: attr(script, 'data-path', '/squarespace/active-crews'),
      accent: attr(script, 'data-accent', ''),
    };
  }

  function init() {
    var script = document.currentScript || document.querySelector('script[data-eg-embed-launch]');
    if (!script) return;
    var cfg = readConfig(script);

    var containers = cfg.target
      ? Array.prototype.slice.call(document.querySelectorAll(cfg.target))
      : Array.prototype.slice.call(document.querySelectorAll(DEFAULT_SELECTOR));
    if (!containers.length) return;

    // Make Squarespace respect transparency: strip any iframe background.
    var style = document.createElement('style');
    style.textContent = 'iframe[allowtransparency]{background:transparent !important}';
    document.head.appendChild(style);

    containers.forEach(function (c) { mount(c, cfg); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();