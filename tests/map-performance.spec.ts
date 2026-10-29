import { expect, test, type Download, type Frame, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PNG } from 'pngjs'

const BASE_ORIGIN = process.env.MAP_PERF_BASE_URL ?? 'http://localhost:3001'
const DESKTOP_VIEWPORT = { width: 1280, height: 800 }
const MAP_BUDGETS = {
  domContentLoadedMs: 2_500,
  renderedCanvasMs: 15_000,
  sameOriginTransferMiB: 5,
  scriptTransferMiB: 1.5,
  jsHeapMiB: 64,
  longestTaskMs: 2_500,
  longTaskTotalMs: 12_000,
  interactionResponseMs: 350,
  canvasViewportAreaRatio: 0.95,
  minimumDistinctCanvasSamples: 4,
} as const

interface MapScenario {
  name: string
  path: string
  mode: '2d' | '3d'
  controls: 'standard' | 'observatory'
}

const MAP_ROUTES: MapScenario[] = [
  { name: 'Project Grants · 2D', path: '/project-grants/', mode: '2d', controls: 'standard' },
  { name: 'Endangered Species · 2D', path: '/endangered-species/', mode: '2d', controls: 'standard' },
  { name: 'Crews Map · 2D', path: '/active-crews/', mode: '2d', controls: 'standard' },
  { name: 'Vulcan Observatory · 2D', path: '/vulcan-observatory/', mode: '2d', controls: 'observatory' },
  { name: 'Project Grants · 3D', path: '/project-grants/3d/', mode: '3d', controls: 'standard' },
  { name: 'Endangered Species · 3D', path: '/endangered-species/3d/', mode: '3d', controls: 'standard' },
  { name: 'Crews Map · 3D', path: '/active-crews/3d/', mode: '3d', controls: 'standard' },
  { name: 'Vulcan Observatory · 3D', path: '/vulcan-observatory/3d/', mode: '3d', controls: 'observatory' },
]

const MAP_EMBED_ROUTES: MapScenario[] = MAP_ROUTES.map((scenario) => ({
  ...scenario,
  name: `${scenario.name} · embed`,
  path: `${scenario.path}?embed=true&hideAll=true`,
}))

const MAP_TITLE_LOCALES = ['en', 'es', 'pt', 'fr', 'ja', 'zh', 'ar', 'hi', 'nl', 'de'] as const

interface MapLocaleCopy {
  home: { activeCrewsTitle: string }
  filter: { active: string }
  stats: { activeCrewsTitle: string; crewsInactive: string; close: string; markerLegend: string }
  mapControls: { exportData: string }
}

interface WidgetLifecycleSnapshot {
  activeMessageListeners: number
  activeResizeObservers: number
  activeMutationObservers: number
}

interface PageInstrumentation {
  longTasks: number[]
  lastInteractionMs: number | null
}

declare global {
  interface Window {
    __egMapPerf?: PageInstrumentation
    __egRafCallbackCount?: number
    __egEmbedMessages?: Array<{ origin: string; data: { type?: string; payload?: Record<string, unknown> } }>
    __egWidgetLifecycleSnapshot?: () => WidgetLifecycleSnapshot
  }
}

function installPerformanceObserver() {
  window.__egMapPerf = { longTasks: [], lastInteractionMs: null }
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__egMapPerf?.longTasks.push(entry.duration)
    })
    observer.observe({ type: 'longtask', buffered: true } as PerformanceObserverInit)
  } catch {
    // Long-task timing is an optional proxy; the rest of the budgets remain available.
  }
}

function installRafCounter() {
  let callbackCount = 0
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => nativeRequestAnimationFrame((timestamp) => {
    callbackCount++
    callback.call(window, timestamp)
  })) as typeof window.requestAnimationFrame
  Object.defineProperty(window, '__egRafCallbackCount', { configurable: true, get: () => callbackCount })
}

function installWidgetLifecycleObserver() {
  if (location.pathname !== '/__eg_map_performance_host__') return

  const activeMessageListeners = new Set<EventListenerOrEventListenerObject>()
  let activeResizeObservers = 0
  let activeMutationObservers = 0
  const nativeAddEventListener = EventTarget.prototype.addEventListener
  const nativeRemoveEventListener = EventTarget.prototype.removeEventListener

  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (this === window && type === 'message' && listener) activeMessageListeners.add(listener)
    return nativeAddEventListener.call(this, type, listener, options)
  }
  EventTarget.prototype.removeEventListener = function (type, listener, options) {
    if (this === window && type === 'message' && listener) activeMessageListeners.delete(listener)
    return nativeRemoveEventListener.call(this, type, listener, options)
  }

  const NativeResizeObserver = window.ResizeObserver
  if (NativeResizeObserver) {
    const live = new WeakSet<ResizeObserver>()
    class TrackedResizeObserver extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback)
        if (new Error().stack?.includes('eg-widget.js')) {
          live.add(this)
          activeResizeObservers++
        }
      }

      override disconnect() {
        if (live.delete(this)) activeResizeObservers--
        super.disconnect()
      }
    }
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, writable: true, value: TrackedResizeObserver })
  }

  const NativeMutationObserver = window.MutationObserver
  if (NativeMutationObserver) {
    const live = new WeakSet<MutationObserver>()
    class TrackedMutationObserver extends NativeMutationObserver {
      constructor(callback: MutationCallback) {
        super(callback)
        if (new Error().stack?.includes('eg-widget.js')) {
          live.add(this)
          activeMutationObservers++
        }
      }

      override disconnect() {
        if (live.delete(this)) activeMutationObservers--
        super.disconnect()
      }
    }
    Object.defineProperty(window, 'MutationObserver', { configurable: true, writable: true, value: TrackedMutationObserver })
  }

  window.__egWidgetLifecycleSnapshot = () => ({
    activeMessageListeners: activeMessageListeners.size,
    activeResizeObservers,
    activeMutationObservers,
  })
}

async function countCanvasColorSamples(canvas: Locator): Promise<number> {
  const png = PNG.sync.read(await canvas.screenshot())
  const colors = new Set<string>()
  const stepX = Math.max(1, Math.floor(png.width / 40))
  const stepY = Math.max(1, Math.floor(png.height / 40))

  for (let y = 0; y < png.height; y += stepY) {
    for (let x = 0; x < png.width; x += stepX) {
      const offset = (y * png.width + x) * 4
      if (png.data[offset + 3] === 0) continue
      colors.add(`${png.data[offset]},${png.data[offset + 1]},${png.data[offset + 2]}`)
    }
  }
  return colors.size
}

async function measurePage(page: Page, colorSamples: number) {
  return page.evaluate(({ colorSamples }) => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const mapRegion = document.querySelector('[role="region"][aria-busy]')
    const mapCanvas = mapRegion?.querySelector<HTMLCanvasElement>('canvas.maplibregl-canvas')
    const regionRect = mapRegion?.getBoundingClientRect()
    const canvasRect = mapCanvas?.getBoundingClientRect()
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const localResources = resources.filter((resource) => {
      try {
        return new URL(resource.name).origin === location.origin
      } catch {
        return false
      }
    })
    const localTransferBytes = localResources.reduce((total, resource) => total + resource.transferSize, 0)
    const scriptTransferBytes = localResources
      .filter((resource) => resource.initiatorType === 'script' || /\.m?js(?:\?|$)/i.test(resource.name))
      .reduce((total, resource) => total + resource.transferSize, 0)
    const memory = performance as Performance & { memory?: { usedJSHeapSize?: number } }
    const longTasks = window.__egMapPerf?.longTasks ?? []
    const longestTaskMs = longTasks.length ? Math.max(...longTasks) : 0
    const viewportArea = Math.max(1, (regionRect?.width ?? 0) * (regionRect?.height ?? 0))
    const canvasArea = (canvasRect?.width ?? 0) * (canvasRect?.height ?? 0)

    return {
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      pageLoadMs: navigation?.loadEventEnd ?? null,
      renderedCanvasMs: performance.now(),
      sameOriginTransferMiB: localTransferBytes / 1024 / 1024,
      scriptTransferMiB: scriptTransferBytes / 1024 / 1024,
      jsHeapMiB: typeof memory.memory?.usedJSHeapSize === 'number'
        ? memory.memory.usedJSHeapSize / 1024 / 1024
        : null,
      longestTaskMs,
      longTaskTotalMs: longTasks.reduce((total, duration) => total + duration, 0),
      longTaskCount: longTasks.length,
      mapBusy: mapRegion?.getAttribute('aria-busy') ?? null,
      mapCanvasBitmapPixels: (mapCanvas?.width ?? 0) * (mapCanvas?.height ?? 0),
      canvasViewportAreaRatio: canvasArea / viewportArea,
      colorSamples,
      mapCanvasCount: mapRegion?.querySelectorAll('canvas.maplibregl-canvas').length ?? 0,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    }
  }, { colorSamples })
}

async function measureStateChange(
  page: Page,
  name: string,
  attribute: string,
  expectedValue: string,
): Promise<number> {
  const button = page.getByRole('button', { name, exact: true })
  await expect(button).toBeVisible()
  const buttonHandle = await button.elementHandle()
  expect(buttonHandle, `button ${name} should have a stable DOM element`).toBeTruthy()
  await page.evaluate(({ name, attribute, expectedValue }) => {
    const target = [...document.querySelectorAll<HTMLButtonElement>('button[aria-label]')]
      .find((candidate) => candidate.getAttribute('aria-label') === name)
    if (!target) throw new Error(`Could not find map control: ${name}`)
    if (window.__egMapPerf) window.__egMapPerf.lastInteractionMs = null
    target.addEventListener('click', () => {
      const startedAt = performance.now()
      if (target.getAttribute(attribute) === expectedValue) {
        if (window.__egMapPerf) window.__egMapPerf.lastInteractionMs = 0
        return
      }
      const observer = new MutationObserver(() => {
        if (target.getAttribute(attribute) !== expectedValue) return
        if (window.__egMapPerf) window.__egMapPerf.lastInteractionMs = performance.now() - startedAt
        observer.disconnect()
      })
      observer.observe(target, { attributes: true, attributeFilter: [attribute] })
    }, { once: true, capture: true })
  }, { name, attribute, expectedValue })
  await button.click()
  await expect.poll(() => buttonHandle!.getAttribute(attribute), { timeout: 3_000 })
    .toBe(expectedValue)
  const duration = await page.evaluate(() => window.__egMapPerf?.lastInteractionMs ?? Number.POSITIVE_INFINITY)
  await buttonHandle!.dispose()
  return duration
}

async function assertInteractionBudget(durationMs: number) {
  expect(durationMs, `map control response took ${durationMs.toFixed(1)} ms`).toBeLessThanOrEqual(MAP_BUDGETS.interactionResponseMs)
}

async function measureAndCheckMapRoute(page: Page, scenario: MapScenario) {
  const response = await page.goto(`${BASE_ORIGIN}${scenario.path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  expect(response?.status(), `${scenario.name} HTTP status`).toBe(200)

  const region = page.locator('[role="region"][aria-busy]').filter({
    has: page.locator('canvas.maplibregl-canvas'),
  })
  await expect(region, `${scenario.name} should expose one accessible map region`).toHaveCount(1)
  const canvas = region.locator('canvas.maplibregl-canvas').first()
  await expect(canvas, `${scenario.name} MapLibre canvas`).toBeVisible({ timeout: 15_000 })
  if (scenario.mode === '2d') {
    await expect(region, `${scenario.name} should finish its 2D loading state`).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
  }

  await page.waitForTimeout(250)
  let colorSamples = await countCanvasColorSamples(canvas)
  if (colorSamples < MAP_BUDGETS.minimumDistinctCanvasSamples) {
    await expect.poll(() => countCanvasColorSamples(canvas), {
      timeout: 5_000,
      intervals: [250, 500, 1_000],
      message: `${scenario.name} should paint a non-empty MapLibre canvas`,
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    colorSamples = await countCanvasColorSamples(canvas)
  }
  await page.waitForTimeout(200)
  const metrics = await measurePage(page, colorSamples)

  expect(metrics.domContentLoadedMs, `${scenario.name} DOMContentLoaded`).not.toBeNull()
  expect(metrics.domContentLoadedMs!).toBeLessThanOrEqual(MAP_BUDGETS.domContentLoadedMs)
  expect(metrics.renderedCanvasMs, `${scenario.name} rendered-canvas readiness`).toBeLessThanOrEqual(MAP_BUDGETS.renderedCanvasMs)
  expect(metrics.sameOriginTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.sameOriginTransferMiB)
  expect(metrics.scriptTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.scriptTransferMiB)
  if (metrics.jsHeapMiB !== null) expect(metrics.jsHeapMiB).toBeLessThanOrEqual(MAP_BUDGETS.jsHeapMiB)
  expect(metrics.longestTaskMs).toBeLessThanOrEqual(MAP_BUDGETS.longestTaskMs)
  expect(metrics.longTaskTotalMs).toBeLessThanOrEqual(MAP_BUDGETS.longTaskTotalMs)
  expect(metrics.mapCanvasBitmapPixels).toBeGreaterThan(0)
  expect(metrics.canvasViewportAreaRatio).toBeGreaterThanOrEqual(MAP_BUDGETS.canvasViewportAreaRatio)
  expect(metrics.mapCanvasCount).toBe(1)

  const interactions: Record<string, number> = {}
  if (scenario.controls === 'standard') {
    const hiddenCanvas = page.locator('canvas[aria-hidden="true"]')
    const initialHiddenCanvasCount = await hiddenCanvas.count()
    const initialGridLabel = await page.getByRole('button', { name: /grid/i }).getAttribute('aria-label')
    expect(initialGridLabel).toMatch(/^(Hide|Show) Grid$/)
    const initialGridPressed = await page.getByRole('button', { name: initialGridLabel!, exact: true }).getAttribute('aria-pressed')
    expect(initialGridPressed).toBe('true')

    interactions.gridOffMs = await measureStateChange(page, initialGridLabel!, 'aria-pressed', 'false')
    await assertInteractionBudget(interactions.gridOffMs)
    expect(await hiddenCanvas.count(), `${scenario.name} grid layer should be removed when switched off`)
      .toBe(initialHiddenCanvasCount - 1)
    const showGridLabel = await page.getByRole('button', { name: /grid/i }).getAttribute('aria-label')
    expect(showGridLabel).toBe('Show Grid')
    interactions.gridOnMs = await measureStateChange(page, showGridLabel!, 'aria-pressed', 'true')
    await assertInteractionBudget(interactions.gridOnMs)
    expect(await hiddenCanvas.count(), `${scenario.name} grid layer should return when switched on`)
      .toBe(initialHiddenCanvasCount)

    if (scenario.mode === '2d') {
      const filtersOff = page.getByRole('button', { name: 'Show Filters', exact: true })
      expect(await filtersOff.getAttribute('aria-expanded')).toBe('false')
      interactions.filtersOpenMs = await measureStateChange(page, 'Show Filters', 'aria-expanded', 'true')
      await assertInteractionBudget(interactions.filtersOpenMs)
      interactions.filtersCloseMs = await measureStateChange(page, 'Hide Filters', 'aria-expanded', 'false')
      await assertInteractionBudget(interactions.filtersCloseMs)
    }

    if (scenario.path === '/project-grants/') {
      interactions.connectionsOffMs = await measureStateChange(page, 'Hide Connections', 'aria-pressed', 'false')
      await assertInteractionBudget(interactions.connectionsOffMs)
      interactions.connectionsOnMs = await measureStateChange(page, 'Show Connections', 'aria-pressed', 'true')
      await assertInteractionBudget(interactions.connectionsOnMs)
    }
  } else if (scenario.path === '/vulcan-observatory/') {
    interactions.actionsOpenMs = await measureStateChange(page, 'Expand actions', 'aria-expanded', 'true')
    await assertInteractionBudget(interactions.actionsOpenMs)
    await expect(page.getByRole('region', { name: 'Actions', exact: true })
      .getByRole('navigation', { name: 'Actions', exact: true })).toBeVisible()
    interactions.actionsCloseMs = await measureStateChange(page, 'Collapse actions', 'aria-expanded', 'false')
    await assertInteractionBudget(interactions.actionsCloseMs)
  }

  const postInteractionHeapMiB = await page.evaluate(() => {
    const memory = performance as Performance & { memory?: { usedJSHeapSize?: number } }
    return typeof memory.memory?.usedJSHeapSize === 'number'
      ? memory.memory.usedJSHeapSize / 1024 / 1024
      : null
  })
  if (postInteractionHeapMiB !== null) expect(postInteractionHeapMiB).toBeLessThanOrEqual(MAP_BUDGETS.jsHeapMiB)

  return { name: scenario.name, path: scenario.path, mode: scenario.mode, ...metrics, postInteractionHeapMiB, interactions }
}

async function measureAndCheckEmbeddedMapRoute(page: Page, scenario: MapScenario) {
  const response = await page.goto(`${BASE_ORIGIN}${scenario.path}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  expect(response?.status(), `${scenario.name} HTTP status`).toBe(200)
  const url = new URL(page.url())
  const expectedPath = new URL(scenario.path, BASE_ORIGIN).pathname.replace(/\/$/, '') || '/'
  expect(url.pathname.replace(/\/$/, '') || '/', `${scenario.name} must stay on its map route, not fall back to /`)
    .toBe(expectedPath)
  expect(url.searchParams.get('embed')).toBe('true')
  expect(url.searchParams.get('hideAll')).toBe('true')

  const region = page.locator('[role="region"][aria-busy]').filter({
    has: page.locator('canvas.maplibregl-canvas'),
  })
  await expect(region, `${scenario.name} should expose one accessible map region`).toHaveCount(1)
  const canvas = region.locator('canvas.maplibregl-canvas').first()
  await expect(canvas, `${scenario.name} embedded canvas`).toBeVisible({ timeout: 15_000 })
  if (scenario.mode === '2d') {
    await expect(region, `${scenario.name} should finish its loading state`).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
  }

  await page.waitForTimeout(250)
  let colorSamples = await countCanvasColorSamples(canvas)
  if (colorSamples < MAP_BUDGETS.minimumDistinctCanvasSamples) {
    await expect.poll(() => countCanvasColorSamples(canvas), {
      timeout: 5_000,
      intervals: [250, 500, 1_000],
      message: `${scenario.name} should paint a non-empty embedded canvas`,
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    colorSamples = await countCanvasColorSamples(canvas)
  }
  await page.waitForTimeout(200)
  const metrics = await measurePage(page, colorSamples)

  expect(metrics.domContentLoadedMs, `${scenario.name} DOMContentLoaded`).not.toBeNull()
  expect(metrics.domContentLoadedMs!).toBeLessThanOrEqual(MAP_BUDGETS.domContentLoadedMs)
  expect(metrics.renderedCanvasMs, `${scenario.name} rendered-canvas readiness`).toBeLessThanOrEqual(MAP_BUDGETS.renderedCanvasMs)
  expect(metrics.sameOriginTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.sameOriginTransferMiB)
  expect(metrics.scriptTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.scriptTransferMiB)
  if (metrics.jsHeapMiB !== null) expect(metrics.jsHeapMiB).toBeLessThanOrEqual(MAP_BUDGETS.jsHeapMiB)
  expect(metrics.longestTaskMs).toBeLessThanOrEqual(MAP_BUDGETS.longestTaskMs)
  expect(metrics.longTaskTotalMs).toBeLessThanOrEqual(MAP_BUDGETS.longTaskTotalMs)
  expect(metrics.mapCanvasBitmapPixels).toBeGreaterThan(0)
  expect(metrics.canvasViewportAreaRatio).toBeGreaterThanOrEqual(MAP_BUDGETS.canvasViewportAreaRatio)
  expect(metrics.mapCanvasCount).toBe(1)
  await expect(page.getByRole('navigation', { name: 'Our Maps', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /grid/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /filter/i })).toHaveCount(0)
  if (scenario.path.startsWith('/active-crews/') && scenario.mode === '2d') {
    expect(url.pathname.replace(/\/$/, ''), `${scenario.name} should remain on the Crews Map route`).toBe(expectedPath)
    expect(metrics.colorSamples, `${scenario.name} should render a non-empty map canvas`)
      .toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
  }

  return { name: scenario.name, path: scenario.path, mode: scenario.mode, ...metrics }
}

function stateMessages(page: Page) {
  return page.evaluate(() => window.__egEmbedMessages ?? [])
}

async function requestEmbedState(page: Page, origin: string, previousStateCount: number) {
  await page.evaluate((targetOrigin) => {
    const iframe = document.querySelector<HTMLIFrameElement>('#eg-active-crews')
    iframe?.contentWindow?.postMessage({ type: 'crew-request-state' }, targetOrigin)
  }, origin)
  await expect.poll(async () => (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-state').length)
    .toBeGreaterThan(previousStateCount)
  const states = (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-state')
  return states.at(-1)?.data.payload ?? {}
}

async function openSquarespacePerformanceHost(page: Page, script: 'eg-widget' | 'squarespace-embed', hostMarkup = ''): Promise<Frame> {
  const origin = new URL(BASE_ORIGIN).origin
  const shellUrl = `${origin}/__eg_map_performance_shell__`
  const hostUrl = `${origin}/__eg_map_performance_host__`
  const scriptMarkup = script === 'eg-widget'
    ? `<script defer data-eg-widget-launch src="${origin}/EG-Maps/eg-widget.js"></script>`
    : `<script defer data-eg-embed-launch src="${origin}/EG-Maps/squarespace-embed.js" data-origin="${origin}" data-base-url="/EG-Maps/" data-path="/active-crews" data-label="Crews Map"></script>`

  await page.route(shellUrl, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><iframe id="squarespace-frame" title="Squarespace host" src="${hostUrl}" style="display:block;width:100%;height:100vh;border:0"></iframe></body></html>`,
  }))
  await page.route(hostUrl, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Squarespace map host</title></head><body style="margin:0">${hostMarkup}<script>window.__egEmbedMessages=[];window.addEventListener('message',event=>window.__egEmbedMessages.push({origin:event.origin,data:event.data}))</script>${scriptMarkup}</body></html>`,
  }))

  await page.goto(shellUrl, { waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.frames().some((frame) => frame.url() === hostUrl)).toBe(true)
  const host = page.frames().find((frame) => frame.url() === hostUrl)
  if (!host) throw new Error('Nested Squarespace performance host did not load')
  return host
}

interface LateSquarespaceMapOptions {
  id: string
  path?: string
  label?: string
  loading?: 'eager' | 'lazy'
}

async function insertLateSquarespaceMap(host: Frame, options: LateSquarespaceMapOptions): Promise<Locator> {
  await host.evaluate(({ id, path, label, loading }) => {
    const container = document.createElement('div')
    container.id = id
    container.setAttribute('data-eg-embed', '')
    container.setAttribute('data-path', path)
    container.setAttribute('data-label', label)
    container.setAttribute('data-base-url', '/EG-Maps')
    container.setAttribute('data-min-height', '480')
    if (loading) container.setAttribute('data-loading', loading)
    document.body.appendChild(container)
  }, {
    id: options.id,
    path: options.path ?? '/active-crews',
    label: options.label ?? 'Crews Map',
    loading: options.loading,
  })
  return host.locator(`#${options.id}`)
}

function loadMapLocaleCopy(locale: typeof MAP_TITLE_LOCALES[number]): MapLocaleCopy {
  return JSON.parse(readFileSync(join(process.cwd(), 'locales', `${locale}.json`), 'utf8')) as MapLocaleCopy
}

async function setAppLocale(page: Page, locale: string) {
  const didSetLocale = await page.evaluate((nextLocale) => {
    const root = document.querySelector('#__nuxt') as (HTMLElement & {
      __vue_app__?: { config?: { globalProperties?: { $i18n?: { locale?: string | { value?: string } } } } }
    }) | null
    const i18n = root?.__vue_app__?.config?.globalProperties?.$i18n
    if (!i18n?.locale) return false
    if (typeof i18n.locale === 'string') i18n.locale = nextLocale
    else i18n.locale.value = nextLocale
    return true
  }, locale)

  expect(didSetLocale, 'mounted Nuxt i18n API should be available to the locale test').toBe(true)
  await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(locale)
}

async function readGeoJSONDownload(download: Download): Promise<GeoJSON.FeatureCollection> {
  const path = await download.path()
  if (!path) throw new Error('GeoJSON download did not produce a local file')
  return JSON.parse(await readFile(path, 'utf8')) as GeoJSON.FeatureCollection
}

function exportedCrewStatuses(collection: GeoJSON.FeatureCollection): string[] {
  return collection.features
    .filter((feature) => feature.properties?.featureType === 'crew-location')
    .map((feature) => String(feature.properties?.status ?? 'unknown'))
}

test.describe('map performance and behavior regression pass', () => {
  test('main map routes stay inside CI budgets and retain visual surfaces and controls', async ({ browser }, testInfo) => {
    test.setTimeout(240_000)
    const measurements = []

    for (const scenario of MAP_ROUTES) {
      const context = await browser.newContext({
        viewport: DESKTOP_VIEWPORT,
        locale: 'en-US',
        colorScheme: 'dark',
      })
      await context.addInitScript(installPerformanceObserver)
      const page = await context.newPage()
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      const result = await measureAndCheckMapRoute(page, scenario)
      expect(pageErrors, `${scenario.name} should not emit uncaught page errors`).toEqual([])
      measurements.push(result)
      console.log(`[map-performance:route] ${JSON.stringify(result)}`)
      await context.close()
    }

    await testInfo.attach('map-route-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: MAP_BUDGETS, measurements }, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance] ${JSON.stringify({ budgets: MAP_BUDGETS, measurements })}`)
  })

  test('Crews Map direct 2D route loads its own map and records a standalone baseline', async ({ browser }, testInfo) => {
    test.setTimeout(90_000)
    const scenario = MAP_ROUTES.find((candidate) => candidate.path === '/active-crews/' && candidate.mode === '2d')
    if (!scenario) throw new Error('Crews Map 2D scenario is missing from the route matrix')
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      locale: 'en-US',
      colorScheme: 'dark',
    })
    await context.addInitScript(installPerformanceObserver)
    await context.addInitScript(installRafCounter)
    const page = await context.newPage()
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const result = await measureAndCheckMapRoute(page, scenario)
    const currentPath = new URL(page.url()).pathname.replace(/\/$/, '')
    expect(currentPath).toBe('/active-crews')
    await expect(page).toHaveTitle(/Crews Map \(2D\)/)
    expect(pageErrors, 'Active Crews direct page should not emit uncaught errors').toEqual([])
    await page.waitForTimeout(500)
    const initialRafCount = await page.evaluate(() => window.__egRafCallbackCount ?? 0)
    await page.waitForTimeout(2_000)
    const finalRafCount = await page.evaluate(() => window.__egRafCallbackCount ?? 0)
    const idleRafProbe = { windowMs: 2_000, callbackCount: finalRafCount - initialRafCount }
    expect(idleRafProbe.callbackCount).toBeGreaterThanOrEqual(0)
    await testInfo.attach('active-crews-2d-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: MAP_BUDGETS, measurement: result, idleRafProbe }, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance:active-crews-baseline] ${JSON.stringify({ ...result, idleRafProbe })}`)
    await context.close()
  })

  test('all documented embedded map routes stay full-bleed and within CI budgets', async ({ browser }, testInfo) => {
    test.setTimeout(240_000)
    const measurements = []

    for (const scenario of MAP_EMBED_ROUTES) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        locale: 'en-US',
        colorScheme: 'dark',
      })
      await context.addInitScript(installPerformanceObserver)
      const page = await context.newPage()
      const pageErrors: string[] = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      const result = await measureAndCheckEmbeddedMapRoute(page, scenario)
      expect(pageErrors, `${scenario.name} should not emit uncaught page errors`).toEqual([])
      measurements.push(result)
      console.log(`[map-performance:embedded-route] ${JSON.stringify(result)}`)
      await context.close()
    }

    await testInfo.attach('embedded-route-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: MAP_BUDGETS, measurements }, null, 2)),
      contentType: 'application/json',
    })
  })

  test('deployed eg-widget.js loads the actual Active Crews route under /EG-Maps, not /', async ({ browser }, testInfo) => {
    test.setTimeout(90_000)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'en-US',
      colorScheme: 'dark',
    })
    await context.addInitScript(installPerformanceObserver)
    const page = await context.newPage()
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const origin = new URL(BASE_ORIGIN).origin
    const harnessUrl = `${origin}/__eg_map_performance_eg_widget_harness__`
    await page.route(harnessUrl, (route) => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><head><meta charset="utf-8"><title>EG widget subpath harness</title></head><body style="margin:0"><div id="eg-active-crews" data-eg-map="active-crews" style="min-height:480px"></div><script data-eg-widget-launch src="/EG-Maps/eg-widget.js" defer></script></body></html>`,
    }))

    await page.goto(harnessUrl, { waitUntil: 'domcontentloaded' })
    const iframeElement = page.locator('#eg-active-crews iframe')
    await expect(iframeElement).toHaveCount(1)
    const iframeSrc = await iframeElement.getAttribute('src')
    expect(iframeSrc, 'widget should create a Crews Map iframe URL').toBeTruthy()
    const target = new URL(iframeSrc!)
    expect(target.origin).toBe(origin)
    expect(target.pathname).toBe('/EG-Maps/active-crews')
    expect(target.pathname.replace(/^\/EG-Maps/, '').replace(/\/$/, '')).toBe('/active-crews')
    expect(target.searchParams.get('embed')).toBe('true')
    expect(target.searchParams.get('hideAll')).toBe('true')

    const embedded = page.frameLocator('#eg-active-crews iframe')
    const region = embedded.locator('[role="region"][aria-busy]').filter({
      has: embedded.locator('canvas.maplibregl-canvas'),
    })
    await expect(region, 'prefixed iframe should render one map region, not the home page').toHaveCount(1, { timeout: 15_000 })
    await expect(region).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    const canvas = region.locator('canvas.maplibregl-canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => countCanvasColorSamples(canvas), {
      timeout: MAP_BUDGETS.renderedCanvasMs,
      intervals: [250, 500, 1_000],
      message: 'the deployed-prefix Active Crews route should paint a non-empty map',
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    const colorSamples = await countCanvasColorSamples(canvas)
    const child = page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame()
      && candidate.url().includes('/EG-Maps/active-crews'))
    expect(child, 'prefixed widget iframe should load the Active Crews page').toBeTruthy()
    const childPath = new URL(child!.url()).pathname.replace(/\/$/, '')
    expect(childPath).toBe('/EG-Maps/active-crews')
    expect(childPath.replace(/^\/EG-Maps/, '')).toBe('/active-crews')
    expect(await child!.evaluate(() => document.title)).toMatch(/Crews Map \(2D\)/)

    const metrics = await child!.evaluate(({ colorSamples }) => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const mapRegion = document.querySelector('[role="region"][aria-busy]')
      const mapCanvas = mapRegion?.querySelector<HTMLCanvasElement>('canvas.maplibregl-canvas')
      const regionRect = mapRegion?.getBoundingClientRect()
      const canvasRect = mapCanvas?.getBoundingClientRect()
      const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((resource) => new URL(resource.name).origin === location.origin)
      const memory = performance as Performance & { memory?: { usedJSHeapSize?: number } }
      const longTasks = window.__egMapPerf?.longTasks ?? []
      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
        renderedCanvasMs: performance.now(),
        sameOriginTransferMiB: resources.reduce((total, resource) => total + resource.transferSize, 0) / 1024 / 1024,
        scriptTransferMiB: resources
          .filter((resource) => resource.initiatorType === 'script' || /\.m?js(?:\?|$)/i.test(resource.name))
          .reduce((total, resource) => total + resource.transferSize, 0) / 1024 / 1024,
        jsHeapMiB: typeof memory.memory?.usedJSHeapSize === 'number'
          ? memory.memory.usedJSHeapSize / 1024 / 1024
          : null,
        longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
        longTaskTotalMs: longTasks.reduce((total, duration) => total + duration, 0),
        mapCanvasBitmapPixels: (mapCanvas?.width ?? 0) * (mapCanvas?.height ?? 0),
        canvasViewportAreaRatio: ((canvasRect?.width ?? 0) * (canvasRect?.height ?? 0))
          / Math.max(1, (regionRect?.width ?? 0) * (regionRect?.height ?? 0)),
        mapCanvasCount: document.querySelectorAll('canvas.maplibregl-canvas').length,
        mapBusy: mapRegion?.getAttribute('aria-busy') ?? null,
        colorSamples,
      }
    }, { colorSamples })

    expect(metrics.domContentLoadedMs).not.toBeNull()
    expect(metrics.domContentLoadedMs!).toBeLessThanOrEqual(MAP_BUDGETS.domContentLoadedMs)
    expect(metrics.renderedCanvasMs).toBeLessThanOrEqual(MAP_BUDGETS.renderedCanvasMs)
    expect(metrics.sameOriginTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.sameOriginTransferMiB)
    expect(metrics.scriptTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.scriptTransferMiB)
    if (metrics.jsHeapMiB !== null) expect(metrics.jsHeapMiB).toBeLessThanOrEqual(MAP_BUDGETS.jsHeapMiB)
    expect(metrics.longestTaskMs).toBeLessThanOrEqual(MAP_BUDGETS.longestTaskMs)
    expect(metrics.longTaskTotalMs).toBeLessThanOrEqual(MAP_BUDGETS.longTaskTotalMs)
    expect(metrics.mapCanvasBitmapPixels).toBeGreaterThan(0)
    expect(metrics.canvasViewportAreaRatio).toBeGreaterThanOrEqual(MAP_BUDGETS.canvasViewportAreaRatio)
    expect(metrics.mapCanvasCount).toBe(1)
    expect(metrics.colorSamples).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    expect(pageErrors, 'prefixed Active Crews embed should not emit uncaught errors').toEqual([])

    await testInfo.attach('active-crews-deployed-prefix-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: MAP_BUDGETS, target: target.toString(), metrics }, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance:active-crews-deployed-prefix] ${JSON.stringify({ target: target.toString(), metrics })}`)
    await context.close()
  })

  test('Active Crews embedded map stays full-bleed and preserves its host messaging contract', async ({ browser }, testInfo) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'en-US',
      colorScheme: 'dark',
    })
    await context.addInitScript(installPerformanceObserver)
    const page = await context.newPage()
    const origin = new URL(BASE_ORIGIN).origin
    const harnessUrl = `${origin}/__eg_map_performance_harness__`
    await page.route(harnessUrl, (route) => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><head><meta charset="utf-8"><title>Map embed performance harness</title></head><body style="margin:0"><script>window.__egEmbedMessages=[];window.addEventListener('message',event=>window.__egEmbedMessages.push({origin:event.origin,data:event.data}))</script><iframe id="eg-active-crews" title="Crews Map" src="/active-crews/?embed=true&hideAll=true" style="display:block;width:100%;height:100vh;border:0"></iframe></body></html>`,
    }))
    const childDocumentRequests: string[] = []
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() !== page.mainFrame()) childDocumentRequests.push(request.url())
    })

    await page.goto(harnessUrl, { waitUntil: 'domcontentloaded' })
    const frame = page.frameLocator('#eg-active-crews')
    const mapRegion = frame.locator('[role="region"][aria-busy]').filter({
      has: frame.locator('canvas.maplibregl-canvas'),
    })
    await expect(mapRegion).toHaveCount(1)
    const canvas = mapRegion.locator('canvas.maplibregl-canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    await expect(mapRegion).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    await expect.poll(() => countCanvasColorSamples(canvas), {
      timeout: MAP_BUDGETS.renderedCanvasMs,
      intervals: [250, 500, 1_000],
      message: 'embedded Active Crews map should paint its canvas',
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    const colorSamples = await countCanvasColorSamples(canvas)
    const child = page.frames().find((candidate: Frame) => candidate.url().includes('/active-crews/'))
    expect(child, 'embedded map frame should be available').toBeTruthy()
    const childPath = new URL(child!.url()).pathname.replace(/\/$/, '')
    expect(childPath, 'iframe must load Active Crews, not the app home route').toBe('/active-crews')
    expect(colorSamples, 'embedded Active Crews route should render a non-empty canvas')
      .toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    await page.waitForTimeout(200)
    const metrics = await child!.evaluate(({ colorSamples }) => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const region = document.querySelector('[role="region"][aria-busy]')
      const mapCanvas = region?.querySelector<HTMLCanvasElement>('canvas.maplibregl-canvas')
      const regionRect = region?.getBoundingClientRect()
      const canvasRect = mapCanvas?.getBoundingClientRect()
      const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((resource) => new URL(resource.name).origin === location.origin)
      const memory = performance as Performance & { memory?: { usedJSHeapSize?: number } }
      const longTasks = window.__egMapPerf?.longTasks ?? []
      return {
        domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
        renderedCanvasMs: performance.now(),
        sameOriginTransferMiB: resources.reduce((total, resource) => total + resource.transferSize, 0) / 1024 / 1024,
        scriptTransferMiB: resources
          .filter((resource) => resource.initiatorType === 'script' || /\.m?js(?:\?|$)/i.test(resource.name))
          .reduce((total, resource) => total + resource.transferSize, 0) / 1024 / 1024,
        jsHeapMiB: typeof memory.memory?.usedJSHeapSize === 'number'
          ? memory.memory.usedJSHeapSize / 1024 / 1024
          : null,
        longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
        longTaskTotalMs: longTasks.reduce((total, duration) => total + duration, 0),
        longTaskCount: longTasks.length,
        mapBusy: region?.getAttribute('aria-busy') ?? null,
        mapCanvasBitmapPixels: (mapCanvas?.width ?? 0) * (mapCanvas?.height ?? 0),
        canvasViewportAreaRatio: ((canvasRect?.width ?? 0) * (canvasRect?.height ?? 0))
          / Math.max(1, (regionRect?.width ?? 0) * (regionRect?.height ?? 0)),
        colorSamples,
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      }
    }, { colorSamples })

    expect(metrics.domContentLoadedMs).not.toBeNull()
    expect(metrics.domContentLoadedMs!).toBeLessThanOrEqual(MAP_BUDGETS.domContentLoadedMs)
    expect(metrics.renderedCanvasMs).toBeLessThanOrEqual(MAP_BUDGETS.renderedCanvasMs)
    expect(metrics.sameOriginTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.sameOriginTransferMiB)
    expect(metrics.scriptTransferMiB).toBeLessThanOrEqual(MAP_BUDGETS.scriptTransferMiB)
    if (metrics.jsHeapMiB !== null) expect(metrics.jsHeapMiB).toBeLessThanOrEqual(MAP_BUDGETS.jsHeapMiB)
    expect(metrics.longestTaskMs).toBeLessThanOrEqual(MAP_BUDGETS.longestTaskMs)
    expect(metrics.longTaskTotalMs).toBeLessThanOrEqual(MAP_BUDGETS.longTaskTotalMs)
    expect(metrics.mapCanvasBitmapPixels).toBeGreaterThan(0)
    expect(metrics.canvasViewportAreaRatio).toBeGreaterThanOrEqual(MAP_BUDGETS.canvasViewportAreaRatio)

    await expect(frame.getByRole('button', { name: 'Search Crews', exact: true })).toHaveCount(0)
    await expect(frame.getByRole('button', { name: 'Show Filters', exact: true })).toHaveCount(0)
    await expect.poll(async () => (await stateMessages(page)).some((message) => message.data.type === 'crew-map-ready'))
      .toBe(true)
    const initialDocumentRequestCount = childDocumentRequests.length
    const initialState = await requestEmbedState(page, origin, 0)
    expect(initialState.hideAll).toBe('true')

    await page.evaluate(({ targetOrigin }) => {
      const iframe = document.querySelector<HTMLIFrameElement>('#eg-active-crews')
      iframe?.contentWindow?.postMessage({
        type: 'crew-filter-update',
        payload: { region: 'south-america', hideAll: 'true', zoom: '0.5' },
      }, targetOrigin)
    }, { targetOrigin: origin })
    await expect.poll(() => child!.url()).toContain('region=south-america')
    const filteredState = await requestEmbedState(page, origin, 1)
    expect(filteredState.region).toBe('south-america')
    expect(filteredState.hideAll).toBe('true')
    expect(Number(filteredState.zoom)).toBeCloseTo(0.5, 1)

    const messagesBeforeSwitch = (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-ready').length
    await page.evaluate(({ targetOrigin }) => {
      document.querySelector<HTMLIFrameElement>('#eg-active-crews')?.contentWindow?.postMessage(
        { type: 'crew-view-switch', payload: { view: '3d' } },
        targetOrigin,
      )
    }, { targetOrigin: origin })
    await expect.poll(() => child!.url()).toContain('/active-crews/3d')
    await expect.poll(async () => (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-ready').length)
      .toBeGreaterThan(messagesBeforeSwitch)
    expect(childDocumentRequests.length, '2D-to-3D switching should not reload the iframe document')
      .toBe(initialDocumentRequestCount)
    await expect(child!.locator('[role="region"][aria-busy] canvas.maplibregl-canvas')).toBeVisible({ timeout: 15_000 })
    await expect.poll(() => countCanvasColorSamples(child!.locator('[role="region"][aria-busy] canvas.maplibregl-canvas').first()), {
      timeout: MAP_BUDGETS.renderedCanvasMs,
      intervals: [250, 500, 1_000],
      message: '3D Active Crews view from the embed should render',
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)

    const ready3dCount = (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-ready').length
    await page.evaluate(({ targetOrigin }) => {
      document.querySelector<HTMLIFrameElement>('#eg-active-crews')?.contentWindow?.postMessage(
        { type: 'crew-view-switch', payload: { view: '2d' } },
        targetOrigin,
      )
    }, { targetOrigin: origin })
    await expect.poll(() => child!.url()).toMatch(/\/active-crews\/?(?:\?|$)/)
    await expect.poll(async () => (await stateMessages(page)).filter((message) => message.data.type === 'crew-map-ready').length)
      .toBeGreaterThan(ready3dCount)
    expect(childDocumentRequests.length, '3D-to-2D switching should not reload the iframe document')
      .toBe(initialDocumentRequestCount)
    expect(child!.url()).toContain('region=south-america')

    await testInfo.attach('embedded-map-performance.json', {
      body: Buffer.from(JSON.stringify({ budgets: MAP_BUDGETS, metrics, initialState, filteredState }, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance:embed] ${JSON.stringify({ budgets: MAP_BUDGETS, metrics, initialState, filteredState })}`)
    await context.close()
  })

  test('Crews Map DataBubble stays localized and Active/Inactive exports follow the selected status', async ({ browser }, testInfo) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      locale: 'en-US',
      colorScheme: 'dark',
      acceptDownloads: true,
    })
    await context.addInitScript(installPerformanceObserver)
    const page = await context.newPage()
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const response = await page.goto(`${BASE_ORIGIN}/active-crews/`, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)

    const mapRegion = page.locator('[role="region"][aria-busy]').filter({
      has: page.locator('canvas.maplibregl-canvas'),
    })
    await expect(mapRegion).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    await expect(page.locator('.bubble-trigger')).toBeVisible()

    let bubbleOpen = false
    for (const locale of MAP_TITLE_LOCALES) {
      const copy = loadMapLocaleCopy(locale)
      expect(copy.stats.activeCrewsTitle, `${locale} bubble title should match the localized map name`)
        .toBe(copy.home.activeCrewsTitle)
      expect(copy.filter.active).not.toBe(copy.stats.activeCrewsTitle)
      expect(copy.stats.crewsInactive).not.toBe(copy.stats.activeCrewsTitle)

      await setAppLocale(page, locale)
      if (!bubbleOpen) {
        await page.getByRole('button', { name: copy.stats.activeCrewsTitle, exact: true }).click()
        bubbleOpen = true
      }
      const panel = page.getByRole('region', { name: copy.stats.activeCrewsTitle, exact: true })
      await expect(panel).toBeVisible()
      await expect(panel.locator('.bubble-panel-title')).toHaveText(copy.stats.activeCrewsTitle)
      await expect(panel.getByRole('button', { name: copy.filter.active, exact: true }))
        .toHaveAttribute('aria-pressed', 'true')
      await expect(panel.getByRole('button', { name: copy.stats.crewsInactive, exact: true }))
        .toHaveAttribute('aria-pressed', 'true')
    }

    const english = loadMapLocaleCopy('en')
    await setAppLocale(page, 'en')
    const englishPanel = page.getByRole('region', { name: english.stats.activeCrewsTitle, exact: true })
    const inactive = englishPanel.getByRole('button', { name: english.stats.crewsInactive, exact: true })
    const active = englishPanel.getByRole('button', { name: english.filter.active, exact: true })

    const inactiveOffMs = await measureStateChange(page, english.stats.crewsInactive, 'aria-pressed', 'false')
    await assertInteractionBudget(inactiveOffMs)
    const activeOnlyDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: english.mapControls.exportData, exact: true }).click()
    const activeOnly = exportedCrewStatuses(await readGeoJSONDownload(await activeOnlyDownloadPromise))
    expect(activeOnly.length, 'active-only export should retain visible active location records').toBeGreaterThan(0)
    expect(activeOnly.every(status => status === 'active')).toBe(true)

    const inactiveOnMs = await measureStateChange(page, english.stats.crewsInactive, 'aria-pressed', 'true')
    await assertInteractionBudget(inactiveOnMs)
    const activeOffMs = await measureStateChange(page, english.filter.active, 'aria-pressed', 'false')
    await assertInteractionBudget(activeOffMs)
    const inactiveOnlyDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: english.mapControls.exportData, exact: true }).click()
    const inactiveOnly = exportedCrewStatuses(await readGeoJSONDownload(await inactiveOnlyDownloadPromise))
    expect(inactiveOnly.length, 'inactive-only export should retain visible inactive location records').toBeGreaterThan(0)
    expect(inactiveOnly.every(status => status === 'inactive')).toBe(true)

    const activeOnMs = await measureStateChange(page, english.filter.active, 'aria-pressed', 'true')
    await assertInteractionBudget(activeOnMs)
    await expect(active).toHaveAttribute('aria-pressed', 'true')
    await expect(inactive).toHaveAttribute('aria-pressed', 'true')
    expect(pageErrors, 'localized map route should not emit uncaught errors').toEqual([])

    const result = {
      localesChecked: [...MAP_TITLE_LOCALES],
      statusToggleMs: { inactiveOffMs, inactiveOnMs, activeOffMs, activeOnMs },
      exportedLocationCounts: { activeOnly: activeOnly.length, inactiveOnly: inactiveOnly.length },
    }
    await testInfo.attach('crew-map-locales-and-status-filter-behavior.json', {
      body: Buffer.from(JSON.stringify(result, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance:crew-map-behavior] ${JSON.stringify(result)}`)
    await context.close()
  })

  test('mobile WebView-like viewport keeps home content visible before reveal and scrollable after resize', async ({ browser }) => {
    test.setTimeout(45_000)
    const context = await browser.newContext({
      viewport: { width: 390, height: 1 },
      isMobile: true,
      deviceScaleFactor: 2,
      hasTouch: true,
      locale: 'en-US',
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    await page.goto(`${BASE_ORIGIN}/`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'EG–Maps.' })).toBeVisible()

    const initial = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('#main-content')
      const story = document.querySelector<HTMLElement>('#home-story')
      return {
        revealReady: root?.classList.contains('reveal-ready') ?? false,
        storyVisibleClass: story?.classList.contains('is-visible') ?? false,
        storyOpacity: story ? getComputedStyle(story).opacity : null,
        viewportHeight: innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
      }
    })
    expect(initial.revealReady, 'unmeasured WebView dimensions must not hide page content').toBe(false)
    expect(initial.storyVisibleClass).toBe(false)
    expect(initial.storyOpacity).toBe('1')
    expect(initial.viewportHeight).toBe(1)

    await page.setViewportSize({ width: 390, height: 844 })
    const story = page.locator('#home-story')
    await story.scrollIntoViewIfNeeded()
    await expect.poll(() => story.evaluate(element => element.classList.contains('is-visible')))
      .toBe(true)

    await page.setViewportSize({ width: 844, height: 390 })
    const landscape = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: innerHeight,
    }))
    expect(landscape.width).toBeGreaterThan(800)
    expect(landscape.scrollWidth).toBeLessThanOrEqual(landscape.width + 1)
    expect(landscape.height).toBe(390)
    await page.locator('.home-footer').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => scrollY), 'the page should remain scrollable in a short landscape viewport')
      .toBeGreaterThan(0)
    await context.close()
  })

  test('Squarespace embed observes late blocks and retains one iframe through move and re-entry', async ({ browser }, testInfo) => {
    test.setTimeout(60_000)
    let releaseAppResponse = () => {}
    let markAppRequest = () => {}
    const responseGate = new Promise<void>(resolve => { releaseAppResponse = resolve })
    const appRequestStarted = new Promise<void>(resolve => { markAppRequest = resolve })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 2,
      hasTouch: true,
      locale: 'en-US',
    })
    await context.addInitScript(installWidgetLifecycleObserver)
    const page = await context.newPage()
    const navigations: string[] = []
    page.on('request', request => {
      if (request.isNavigationRequest() && request.url().includes('/EG-Maps/active-crews')) {
        navigations.push(request.url())
      }
    })
    await page.route('**/EG-Maps/active-crews**', async route => {
      markAppRequest()
      await responseGate
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>map frame fixture</title></head><body>map frame fixture</body></html>',
      })
    })
    const host = await openSquarespacePerformanceHost(page, 'squarespace-embed')
    const baseline = await host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null)
    expect(baseline).not.toBeNull()

    const container = await insertLateSquarespaceMap(host, { id: 'late-map' })
    await expect(container).toHaveAttribute('data-eg-loading', 'true')
    await expect(container.locator('[data-eg-status="loading"]')).toContainText('Loading Crews Map')
    await appRequestStarted
    await expect(container.locator('iframe')).toHaveCount(1)
    expect(await container.locator('iframe').evaluate(frame => getComputedStyle(frame).opacity)).toBe('0')
    releaseAppResponse()
    await expect(container).toHaveAttribute('data-eg-loaded', 'true')
    await expect(container.locator('[data-eg-status]')).toHaveCount(0)
    await expect.poll(() => navigations.length).toBe(1)
    const initialNavigationCount = navigations.length

    const element = await container.elementHandle()
    expect(element, 'late embed node should remain available for relocation and re-entry').toBeTruthy()
    await host.evaluate(node => {
      const movedHost = document.createElement('section')
      movedHost.id = 'moved-map-host'
      document.body.appendChild(movedHost)
      movedHost.appendChild(node)
    }, element!)
    await expect(host.locator('#moved-map-host #late-map iframe')).toHaveCount(1)
    await page.waitForTimeout(250)
    expect(navigations.length).toBeLessThanOrEqual(initialNavigationCount + 1)
    const reparentNavigationCount = navigations.length - initialNavigationCount

    await host.evaluate(node => node.remove(), element!)
    await expect(host.locator('#late-map')).toHaveCount(0)
    await expect.poll(() => host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null))
      .toEqual(baseline)

    const navigationCountBeforeReentry = navigations.length
    await host.evaluate(node => document.body.appendChild(node), element!)
    await expect(host.locator('#late-map')).toHaveAttribute('data-eg-loaded', 'true')
    await expect(host.locator('#late-map iframe')).toHaveCount(1)
    await expect.poll(() => navigations.length).toBeGreaterThan(navigationCountBeforeReentry)
    await host.evaluate(node => node.remove(), element!)
    await expect(host.locator('#late-map')).toHaveCount(0)
    await expect.poll(() => host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null))
      .toEqual(baseline)
    const result = {
      initialNavigationCount,
      reparentNavigationCount,
      reentryNavigationCount: navigations.length - navigationCountBeforeReentry,
      finalIframeCount: 0,
    }
    await testInfo.attach('squarespace-late-block-lifecycle.json', {
      body: Buffer.from(JSON.stringify(result, null, 2)),
      contentType: 'application/json',
    })
    console.log(`[map-performance:squarespace-lifecycle] ${JSON.stringify(result)}`)
    await context.close()
  })

  test('Squarespace embed renders the iframe error fallback and direct-link action', async ({ browser }) => {
    test.setTimeout(30_000)
    let releaseAppResponse = () => {}
    let markAppRequest = () => {}
    const responseGate = new Promise<void>(resolve => { releaseAppResponse = resolve })
    const appRequestStarted = new Promise<void>(resolve => { markAppRequest = resolve })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
    const page = await context.newPage()
    await page.route('**/EG-Maps/active-crews**', async route => {
      markAppRequest()
      await responseGate
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>recovered map frame</body></html>',
      })
    })
    const host = await openSquarespacePerformanceHost(page, 'squarespace-embed')
    const container = await insertLateSquarespaceMap(host, { id: 'error-map' })
    await appRequestStarted
    const frame = container.locator('iframe')
    await expect(frame).toHaveCount(1)
    await frame.evaluate(iframe => iframe.dispatchEvent(new Event('error')))
    await expect(container).toHaveAttribute('data-eg-error', 'true')
    await expect(container).not.toHaveAttribute('data-eg-loading')
    const problem = container.locator('[data-eg-status="problem"]')
    await expect(problem).toContainText('This embed could not be loaded.')
    const directLink = problem.getByRole('link', { name: 'Open directly', exact: true })
    await expect(directLink).toHaveAttribute('href', /\/EG-Maps\/active-crews\?embed=true&hideAll=true/)
    releaseAppResponse()
    await expect(container).toHaveAttribute('data-eg-loaded', 'true')
    await context.close()
  })

  test('Squarespace embed exposes the timeout fallback and recovers when a delayed frame loads', async ({ browser }) => {
    test.setTimeout(30_000)
    let releaseAppResponse = () => {}
    let markAppRequest = () => {}
    const responseGate = new Promise<void>(resolve => { releaseAppResponse = resolve })
    const appRequestStarted = new Promise<void>(resolve => { markAppRequest = resolve })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
    await context.addInitScript(() => {
      if (location.pathname !== '/__eg_map_performance_host__') return
      const nativeSetTimeout = window.setTimeout.bind(window)
      window.setTimeout = ((handler: TimerHandler, timeout?: number) =>
        nativeSetTimeout(handler, timeout === 20_000 ? 500 : timeout)) as typeof window.setTimeout
    })
    const page = await context.newPage()
    await page.route(url => url.pathname === '/EG-Maps/' && url.searchParams.get('embed') === 'true', async route => {
      markAppRequest()
      await responseGate
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body>delayed home frame</body></html>',
      })
    })
    const host = await openSquarespacePerformanceHost(page, 'squarespace-embed')
    const container = await insertLateSquarespaceMap(host, {
      id: 'timeout-map',
      path: '/',
      label: 'EG-Maps home',
      loading: 'eager',
    })
    await expect(container).toHaveAttribute('data-eg-loading', 'true')
    await appRequestStarted
    await expect(container).toHaveAttribute('data-eg-timeout', 'true', { timeout: 5_000 })
    await expect(container).not.toHaveAttribute('data-eg-loading')
    await expect(container.locator('[data-eg-status="problem"]'))
      .toContainText('This embed is taking longer than expected.')
    releaseAppResponse()
    await expect(container).toHaveAttribute('data-eg-loaded', 'true')
    await context.close()
  })

  test('mobile nested eg-map lifecycle preserves one canvas and releases host observers/listeners on re-entry', async ({ browser }) => {
    test.setTimeout(120_000)
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      deviceScaleFactor: 2,
      hasTouch: true,
      locale: 'en-US',
      colorScheme: 'dark',
    })
    await context.addInitScript(installWidgetLifecycleObserver)
    const page = await context.newPage()
    const pageErrors: string[] = []
    const mapNavigations: string[] = []
    page.on('pageerror', error => pageErrors.push(error.message))
    const host = await openSquarespacePerformanceHost(page, 'eg-widget')
    page.on('request', request => {
      if (request.isNavigationRequest() && request.frame().parentFrame() === host
        && request.url().includes('/EG-Maps/active-crews')) mapNavigations.push(request.url())
    })

    await expect.poll(() => host.evaluate(() => Boolean(customElements.get('eg-map')))).toBe(true)
    const baseline = await host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null)
    expect(baseline).not.toBeNull()
    await host.evaluate(() => {
      const element = document.createElement('eg-map')
      element.id = 'nested-eg-map'
      element.setAttribute('dataset', 'active-crews')
      element.setAttribute('mode', 'iframe')
      element.setAttribute('height', '520')
      element.setAttribute('base-url', '/EG-Maps')
      document.body.appendChild(element)
    })

    const widget = host.locator('eg-map#nested-eg-map')
    await expect(widget.locator('iframe')).toHaveCount(1)
    await expect(widget.locator('iframe')).toHaveAttribute('title', 'Earth Guardians — Crews Map')
    const iframeSrc = await widget.locator('iframe').getAttribute('src')
    expect(iframeSrc).toBeTruthy()
    const embeddedUrl = new URL(iframeSrc!)
    expect(embeddedUrl.pathname).toBe('/EG-Maps/active-crews')
    expect(embeddedUrl.searchParams.get('embed')).toBe('true')
    expect(embeddedUrl.searchParams.get('hideAll')).toBe('true')

    const mapFrame = () => page.frames().find(frame => {
      if (frame.parentFrame() !== host) return false
      try {
        return new URL(frame.url()).pathname === '/EG-Maps/active-crews'
      } catch {
        return false
      }
    })
    await expect.poll(() => Boolean(mapFrame())).toBe(true)
    const nestedMap = mapFrame()!
    const region = nestedMap.locator('[role="region"][aria-busy]').filter({
      has: nestedMap.locator('canvas.maplibregl-canvas'),
    })
    await expect(region).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    const canvas = region.locator('canvas.maplibregl-canvas')
    await expect(canvas).toHaveCount(1)
    await expect(canvas.first()).toBeVisible()
    await expect.poll(() => countCanvasColorSamples(canvas.first()), {
      timeout: MAP_BUDGETS.renderedCanvasMs,
      intervals: [250, 500, 1_000],
      message: 'mobile nested eg-map should render a non-empty 2D map canvas',
    }).toBeGreaterThanOrEqual(MAP_BUDGETS.minimumDistinctCanvasSamples)
    await expect.poll(() => host.evaluate(() => window.__egEmbedMessages
      ?.filter(message => message.data.type === 'crew-map-ready').length ?? 0)).toBeGreaterThan(0)

    const widgetHandle = await widget.elementHandle()
    expect(widgetHandle).toBeTruthy()
    await host.evaluate(element => {
      const customElement = element as HTMLElement & { __egOriginalShadowRoot?: ShadowRoot }
      customElement.__egOriginalShadowRoot = customElement.shadowRoot ?? undefined
    }, widgetHandle!)
    const activeSnapshot = await host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null)
    expect(activeSnapshot?.activeMessageListeners).toBe((baseline?.activeMessageListeners ?? 0) + 1)
    expect(activeSnapshot?.activeResizeObservers).toBe((baseline?.activeResizeObservers ?? 0) + 1)
    expect(activeSnapshot?.activeMutationObservers).toBe((baseline?.activeMutationObservers ?? 0) + 1)

    const firstNavigationCount = mapNavigations.length
    await page.locator('#squarespace-frame').evaluate(frame => { frame.style.visibility = 'hidden' })
    await page.waitForTimeout(150)
    await page.locator('#squarespace-frame').evaluate(frame => { frame.style.visibility = 'visible' })
    await expect(canvas.first()).toBeVisible()
    expect(mapNavigations.length).toBe(firstNavigationCount)

    await host.evaluate(element => element.remove(), widgetHandle!)
    await expect(widget).toHaveCount(0)
    await expect.poll(() => host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null))
      .toEqual(baseline)
    await expect.poll(() => Boolean(mapFrame())).toBe(false)

    const previousReadyCount = await host.evaluate(() => window.__egEmbedMessages
      ?.filter(message => message.data.type === 'crew-map-ready').length ?? 0)
    await host.evaluate(element => document.body.appendChild(element), widgetHandle!)
    await expect(widget.locator('iframe')).toHaveCount(1)
    await expect.poll(() => Boolean(mapFrame())).toBe(true)
    const reenteredMap = mapFrame()!
    const reenteredRegion = reenteredMap.locator('[role="region"][aria-busy]').filter({
      has: reenteredMap.locator('canvas.maplibregl-canvas'),
    })
    await expect(reenteredRegion).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
    await expect(reenteredRegion.locator('canvas.maplibregl-canvas')).toHaveCount(1)
    await expect.poll(() => host.evaluate(() => window.__egEmbedMessages
      ?.filter(message => message.data.type === 'crew-map-ready').length ?? 0)).toBeGreaterThan(previousReadyCount)
    expect(await widget.evaluate(element => {
      const customElement = element as HTMLElement & { __egOriginalShadowRoot?: ShadowRoot }
      return customElement.shadowRoot === customElement.__egOriginalShadowRoot
        && customElement.shadowRoot?.childElementCount === 1
    })).toBe(true)

    await host.evaluate(element => element.remove(), widgetHandle!)
    await expect.poll(() => host.evaluate(() => window.__egWidgetLifecycleSnapshot?.() ?? null))
      .toEqual(baseline)
    expect(pageErrors, 'nested mobile embed should not emit uncaught errors').toEqual([])
    expect(mapNavigations.length).toBe(firstNavigationCount + 1)
    await context.close()
  })
})
