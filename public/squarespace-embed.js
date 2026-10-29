/*!
 * squarespace-embed.js — Earth Guardians Squarespace map launcher.
 *
 * Default destination: /active-crews?embed=true&hideAll=true
 * Override the route with data-path and the app subpath with data-base-url.
 * The app emits crew-map-ready and, in 3D mode, crew-resize messages.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var DEFAULT_SELECTOR = '[data-eg-embed], #eg-active-crews';
  var EMBED_ATTRIBUTE = '__egEmbedInstance';
  var LOADING_TIMEOUT_MS = 20000;

  function attr(element, name, fallback) {
    var value = element.getAttribute(name);
    return value == null ? fallback : value;
  }

  function supportsCss(property, value) {
    return typeof value === 'string' && window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports(property, value);
  }

  function isHomePath(path) {
    var cleanPath = String(path || '').split('?')[0].replace(/\/+$/, '');
    return cleanPath === '' || cleanPath === '/index.html';
  }

  function getStatus(container, label) {
    var status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('data-eg-status', 'loading');
    status.style.cssText = [
      'position:absolute',
      'inset:0',
      'z-index:2',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-sizing:border-box',
      'padding:1rem',
      'color:inherit',
      'font:600 14px/1.4 system-ui,sans-serif',
      'text-align:center',
      'background:rgba(127,127,127,.08)',
      'pointer-events:none'
    ].join(';');
    status.textContent = 'Loading ' + label + '…';
    container.appendChild(status);
    return status;
  }

  function showProblem(container, status, iframe, url, message, reason) {
    container.removeAttribute('data-eg-error');
    container.removeAttribute('data-eg-timeout');
    container.removeAttribute('data-eg-loading');
    container.setAttribute(reason === 'timeout' ? 'data-eg-timeout' : 'data-eg-error', 'true');
    iframe.style.opacity = '1';
    status.setAttribute('data-eg-status', 'problem');
    status.style.cssText += ';inset:0 0 auto 0;min-height:3rem;padding:.65rem 1rem;background:rgba(250,250,250,.94);color:#171717;pointer-events:auto;text-align:left';
    status.textContent = message + ' ';

    var link = document.createElement('a');
    link.href = url.toString();
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open directly';
    link.style.cssText = 'color:#0e7490;font-weight:700;text-decoration:underline';
    status.appendChild(link);
  }

  function mount(container, config) {
    if (container[EMBED_ATTRIBUTE]) return;
    container.style.position = container.style.position || 'relative';

    var iframe = document.createElement('iframe');
    var path = attr(container, 'data-path', config.path) || '/active-crews';
    var label = attr(container, 'data-label', config.label) || (isHomePath(path) ? 'EG-Maps home' : 'Active Crews map');
    var originBase = config.origin.endsWith('/') ? config.origin : config.origin + '/';
    var routePath = path.replace(/^\/+/, '');
    var baseUrl = (attr(container, 'data-base-url', config.baseUrl) || '').replace(/\/+$/, '');
    if (baseUrl) routePath = baseUrl + '/' + routePath;

    var url = new URL(routePath, originBase);
    url.searchParams.set('embed', 'true');
    url.searchParams.set('hideAll', 'true');

    var minHeight = parseInt(attr(container, 'data-min-height', String(config.minHeight)), 10) || config.minHeight;
    var loading = attr(container, 'data-loading', config.loading);
    if (loading !== 'eager' && loading !== 'lazy') loading = isHomePath(path) ? 'eager' : 'lazy';
    var scrolling = attr(container, 'data-scrolling', config.scrolling);
    if (scrolling !== 'auto' && scrolling !== 'yes' && scrolling !== 'no') scrolling = isHomePath(path) ? 'auto' : 'no';

    iframe.title = 'Earth Guardians — ' + label;
    iframe.loading = loading;
    iframe.allow = 'geolocation';
    iframe.frameBorder = '0';
    iframe.scrolling = scrolling;
    iframe.style.cssText = [
      'position:relative',
      'z-index:1',
      'display:block',
      'width:100%',
      'height:' + minHeight + 'px',
      'min-height:' + minHeight + 'px',
      'border:0',
      'background:transparent',
      'opacity:0',
      'transition:opacity 150ms ease'
    ].join(';');

    var status = getStatus(container, label);
    var loaded = false;
    var timeout = loading === 'eager' ? window.setTimeout(function () {
      if (!loaded) showProblem(container, status, iframe, url, 'This embed is taking longer than expected.', 'timeout');
    }, LOADING_TIMEOUT_MS) : null;

    function finishLoading() {
      if (loaded) return;
      loaded = true;
      if (timeout !== null) window.clearTimeout(timeout);
      container.removeAttribute('data-eg-loading');
      container.removeAttribute('data-eg-error');
      container.removeAttribute('data-eg-timeout');
      container.setAttribute('data-eg-loaded', 'true');
      iframe.style.opacity = '1';
      if (status.parentNode) status.parentNode.removeChild(status);
    }

    function onFrameLoad() {
      finishLoading();
    }

    function onFrameError() {
      if (timeout !== null) window.clearTimeout(timeout);
      showProblem(container, status, iframe, url, 'This embed could not be loaded.', 'error');
    }

    function onMessage(event) {
      if (event.origin !== url.origin || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'crew-map-ready') {
        container.setAttribute('data-eg-ready', 'true');
        finishLoading();
      }
      if (data.type === 'crew-resize' && data.payload && typeof data.payload === 'object') {
        var width = data.payload.width;
        var height = data.payload.height;
        if (supportsCss('width', width)) iframe.style.width = width;
        if (supportsCss('height', height)) iframe.style.height = height;
      }
    }

    var instance = {
      iframe: iframe,
      status: status,
      onMessage: onMessage,
      onFrameLoad: onFrameLoad,
      onFrameError: onFrameError,
      timeout: timeout
    };
    container[EMBED_ATTRIBUTE] = instance;
    container.setAttribute('data-eg-loading', 'true');
    container.removeAttribute('data-eg-loaded');
    container.removeAttribute('data-eg-error');
    container.removeAttribute('data-eg-timeout');

    iframe.addEventListener('load', onFrameLoad);
    iframe.addEventListener('error', onFrameError);
    window.addEventListener('message', onMessage);
    iframe.src = url.toString();
    container.appendChild(iframe);
  }

  function teardown(container) {
    var instance = container[EMBED_ATTRIBUTE];
    if (!instance) return;
    if (instance.timeout !== null) window.clearTimeout(instance.timeout);
    window.removeEventListener('message', instance.onMessage);
    instance.iframe.removeEventListener('load', instance.onFrameLoad);
    instance.iframe.removeEventListener('error', instance.onFrameError);
    if (instance.iframe.parentNode) instance.iframe.parentNode.removeChild(instance.iframe);
    if (instance.status.parentNode) instance.status.parentNode.removeChild(instance.status);
    delete container[EMBED_ATTRIBUTE];
    container.removeAttribute('data-eg-loading');
    container.removeAttribute('data-eg-loaded');
    container.removeAttribute('data-eg-ready');
    container.removeAttribute('data-eg-error');
    container.removeAttribute('data-eg-timeout');
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
      label: attr(script, 'data-label', ''),
      loading: attr(script, 'data-loading', ''),
      scrolling: attr(script, 'data-scrolling', '')
    };
  }

  function findMatches(node, selector) {
    if (!node || node.nodeType !== 1) return [];
    var matches = [];
    try {
      if (typeof node.matches === 'function' && node.matches(selector)) matches.push(node);
      if (typeof node.querySelectorAll === 'function') {
        matches = matches.concat(Array.prototype.slice.call(node.querySelectorAll(selector)));
      }
    } catch (error) {
      console.warn('EG-Maps embed selector is invalid:', selector, error);
    }
    return matches;
  }

  function init(script) {
    if (!script) return;
    var config = readConfig(script);
    var selector = config.target || DEFAULT_SELECTOR;

    function mountMatches(node) {
      findMatches(node, selector).forEach(function (container) {
        mount(container, {
          origin: attr(container, 'data-origin', config.origin),
          baseUrl: attr(container, 'data-base-url', config.baseUrl),
          minHeight: parseInt(attr(container, 'data-min-height', String(config.minHeight)), 10) || config.minHeight,
          path: attr(container, 'data-path', config.path),
          label: attr(container, 'data-label', config.label),
          loading: attr(container, 'data-loading', config.loading),
          scrolling: attr(container, 'data-scrolling', config.scrolling)
        });
      });
    }

    function teardownMatches(node) {
      findMatches(node, selector).forEach(function (container) {
        if (!document.documentElement.contains(container)) teardown(container);
      });
    }

    mountMatches(document.documentElement);

    if (typeof window.MutationObserver === 'function' && document.documentElement) {
      var observer = new MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.slice.call(record.removedNodes).forEach(teardownMatches);
          Array.prototype.slice.call(record.addedNodes).forEach(mountMatches);
        });
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  var script = document.currentScript || document.querySelector('script[data-eg-embed-launch]') || document.querySelector('script[src*="squarespace-embed.js"]');
  var start = function () { init(script); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
