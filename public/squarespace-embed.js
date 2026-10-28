/*!
 * squarespace-embed.js — Earth Guardians Squarespace map launcher.
 *
 * Default destination: /active-crews?embed=true&hideAll=true
 * Override the route with data-path and the app subpath with data-base-url.
 * The map emits crew-map-ready and, in 3D mode, crew-resize messages.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var DEFAULT_SELECTOR = '[data-eg-embed], #eg-active-crews';

  function attr(element, name, fallback) {
    var value = element.getAttribute(name);
    return value == null ? fallback : value;
  }

  function supportsCss(property, value) {
    return typeof value === 'string' && window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports(property, value);
  }

  function mount(container, config) {
    if (container.__egMounted) return;
    container.__egMounted = true;
    container.style.position = container.style.position || 'relative';

    var iframe = document.createElement('iframe');
    iframe.title = 'Earth Guardians — ' + (config.label || 'Active Crews map');
    iframe.loading = 'lazy';
    iframe.allow = 'geolocation';
    iframe.frameBorder = '0';
    iframe.scrolling = 'no';
    iframe.style.cssText = [
      'display:block',
      'width:100%',
      'height:' + config.minHeight + 'px',
      'min-height:' + config.minHeight + 'px',
      'border:0',
      'background:transparent'
    ].join(';');

    var path = config.path || '/active-crews';
    var originBase = config.origin.endsWith('/') ? config.origin : config.origin + '/';
    var routePath = path.replace(/^\/+/, '');
    var baseUrl = (attr(container, 'data-base-url', config.baseUrl) || '').replace(/\/+$/, '');
    if (baseUrl) routePath = baseUrl + '/' + routePath;

    var url = new URL(routePath, originBase);
    url.searchParams.set('embed', 'true');
    url.searchParams.set('hideAll', 'true');
    iframe.src = url.toString();
    container.appendChild(iframe);

    window.addEventListener('message', function (event) {
      if (event.origin !== url.origin || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'crew-map-ready') container.setAttribute('data-eg-ready', 'true');
      if (data.type === 'crew-resize' && data.payload && typeof data.payload === 'object') {
        var width = data.payload.width;
        var height = data.payload.height;
        if (supportsCss('width', width)) iframe.style.width = width;
        if (supportsCss('height', height)) iframe.style.height = height;
      }
    });
  }

  function readConfig(script) {
    var scriptUrl = script.src ? new URL(script.src, window.location.href) : new URL(window.location.href);
    var scriptBaseUrl = script.src ? scriptUrl.pathname.replace(/[^/]*$/, '') : '';
    return {
      origin: attr(script, 'data-origin', scriptUrl.origin),
      baseUrl: attr(script, 'data-base-url', scriptBaseUrl),
      minHeight: parseInt(attr(script, 'data-min-height', '480'), 10) || 480,
      target: attr(script, 'data-target', ''),
      path: attr(script, 'data-path', '/active-crews'),
      label: attr(script, 'data-label', '')
    };
  }

  function init() {
    var script = document.currentScript || document.querySelector('script[data-eg-embed-launch]');
    if (!script) return;
    var config = readConfig(script);
    var containers = config.target
      ? Array.prototype.slice.call(document.querySelectorAll(config.target))
      : Array.prototype.slice.call(document.querySelectorAll(DEFAULT_SELECTOR));
    if (!containers.length) return;

    containers.forEach(function (container) {
      mount(container, {
        origin: attr(container, 'data-origin', config.origin),
        baseUrl: attr(container, 'data-base-url', config.baseUrl),
        minHeight: parseInt(attr(container, 'data-min-height', String(config.minHeight)), 10) || config.minHeight,
        path: attr(container, 'data-path', config.path),
        label: attr(container, 'data-label', config.label)
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
