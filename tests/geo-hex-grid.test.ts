import { describe, expect, it } from 'vitest'
import { effectScope, nextTick, ref, type Ref } from 'vue'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { GEO_HEX_GRID } from '../lib/constants'
import { useGeoHexGrid, type HexGridMode } from '../composables/useGeoHexGrid'
import type { GeoPoint } from '../lib/hexbin'

interface StubMap {
  layers: Map<string, { id: string; type: string }>
  sources: Map<string, { data?: unknown; setData: (data: unknown) => void }>
  events: Map<string, Array<() => void>>
  setDataCalls: unknown[]
  map: MapLibreMap
  fire: (type: string) => void
  setStyleLoaded: (loaded: boolean) => void
}

const VIEW = { west: -10, east: 40, south: 35, north: 70, zoom: 5 }

function createStubMap(view = VIEW): StubMap {
  const layers = new Map<string, { id: string; type: string }>()
  const sources = new Map<string, { data?: unknown; setData: (data: unknown) => void }>()
  const events = new Map<string, Array<() => void>>()
  const setDataCalls: unknown[] = []
  const onceHandlers: Array<() => void> = []
  let styleLoaded = true
  const stub = {
    isStyleLoaded: () => styleLoaded,
    getZoom: () => view.zoom,
    getBounds: () => ({
      getSouthWest: () => ({ lng: view.west, lat: view.south }),
      getNorthEast: () => ({ lng: view.east, lat: view.north }),
    }),
    getSource: (id: string) => sources.get(id) as GeoJSONSource | undefined,
    getLayer: (id: string) => layers.get(id),
    addSource: (id: string, config: { data?: unknown }) => {
      sources.set(id, {
        data: config.data,
        setData: (data: unknown) => { setDataCalls.push(data) },
      })
    },
    addLayer: (layer: { id: string; type: string }) => { layers.set(layer.id, layer) },
    removeLayer: (id: string) => { layers.delete(id) },
    removeSource: (id: string) => { sources.delete(id) },
    on: (type: string, handler: () => void) => {
      events.set(type, [...(events.get(type) ?? []), handler])
    },
    once: (_type: string, handler: () => void) => { onceHandlers.push(handler) },
    off: (type: string, handler: () => void) => {
      events.set(type, (events.get(type) ?? []).filter(fn => fn !== handler))
    },
  }
  // `idle` also runs the queued once-handlers, like MapLibre does.
  const fire = (type: string) => {
    for (const fn of events.get(type) ?? []) fn()
    if (type === 'idle') for (const fn of onceHandlers.splice(0, onceHandlers.length)) fn()
  }
  return {
    layers,
    sources,
    events,
    setDataCalls,
    map: stub as unknown as MapLibreMap,
    fire,
    setStyleLoaded: (loaded: boolean) => { styleLoaded = loaded },
  }
}

const LONDON: GeoPoint = { lng: -0.1276, lat: 51.5072 }
const MADRID: GeoPoint = { lng: -3.7038, lat: 40.4168 }
const BERLIN: GeoPoint = { lng: 13.405, lat: 52.52 }

async function flushFrames() {
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  await nextTick()
}

function setup(points: GeoPoint[], mode: HexGridMode) {
  const scope = effectScope()
  const stub = createStubMap()
  const modeRef: Ref<HexGridMode> = ref(mode)
  const pointsRef: Ref<GeoPoint[]> = ref(points)
  const grid = scope.run(() => useGeoHexGrid(() => stub.map, pointsRef, modeRef))!
  return { scope, stub, modeRef, pointsRef, grid }
}

describe('useGeoHexGrid', () => {
  it('stays inert while the grid mode is off', async () => {
    const { scope, stub, grid } = setup([LONDON, MADRID], 'off')
    scope.stop()
    await flushFrames()
    expect(stub.sources.size).toBe(0)
    expect(stub.layers.size).toBe(0)
    expect(grid.geoHexStats.value).toEqual({ cells: 0, binned: 0, max: 0, topCells: [], cellKm: 0 })
  })

  it('adds fill and line layers and bins the dataset when density is on', async () => {
    const { scope, stub, grid } = setup([LONDON, MADRID, BERLIN, BERLIN], 'density')
    await flushFrames()
    expect(stub.layers.has('eg-geo-hex-fill')).toBe(true)
    expect(stub.layers.has('eg-geo-hex-line')).toBe(true)
    expect(grid.geoHexStats.value.binned).toBe(4)
    expect(grid.geoHexStats.value.max).toBe(2)
    expect(grid.geoHexStats.value.cells).toBeGreaterThan(0)
    expect(stub.setDataCalls.at(-1)).toMatchObject({ type: 'FeatureCollection' })
    scope.stop()
  })

  it('waits for the style to finish loading before adding layers', async () => {
    const scope = effectScope()
    const stub = createStubMap()
    stub.setStyleLoaded(false)
    const modeRef: Ref<HexGridMode> = ref('density')
    const pointsRef: Ref<GeoPoint[]> = ref([LONDON, MADRID])
    const grid = scope.run(() => useGeoHexGrid(() => stub.map, pointsRef, modeRef))!
    await flushFrames()
    expect(stub.layers.size).toBe(0)
    stub.setStyleLoaded(true)
    stub.fire('idle')
    await flushFrames()
    expect(stub.layers.has('eg-geo-hex-fill')).toBe(true)
    expect(grid.geoHexStats.value.cells).toBeGreaterThan(0)
    scope.stop()
  })

  it('re-adds the grid after a basemap style swap', async () => {
    const { scope, stub, grid } = setup([LONDON, MADRID], 'density')
    await flushFrames()
    stub.layers.clear()
    stub.sources.clear()
    stub.fire('styledata')
    await flushFrames()
    expect(stub.layers.has('eg-geo-hex-line')).toBe(true)
    expect(grid.geoHexStats.value.binned).toBe(2)
    scope.stop()
  })

  it('renders one closed hexagon with ramp styling per cell', async () => {
    const { scope, stub, grid } = setup([LONDON, MADRID, BERLIN], 'density')
    await flushFrames()
    const fc = stub.setDataCalls.at(-1) as GeoJSON.FeatureCollection
    expect(fc.features).toHaveLength(grid.geoHexStats.value.cells)
    for (const feature of fc.features) {
      const ring = (feature.geometry as GeoJSON.Polygon).coordinates[0] as [number, number][]
      expect(ring).toHaveLength(7)
      expect(ring[0]).toEqual(ring[6])
      expect(GEO_HEX_GRID.fillRamp).toContain(feature.properties?.color)
      const opacity = Number(feature.properties?.opacity)
      expect(opacity).toBeGreaterThanOrEqual(GEO_HEX_GRID.minFillOpacity)
      expect(opacity).toBeLessThanOrEqual(GEO_HEX_GRID.maxFillOpacity)
    }
    scope.stop()
  })

  it('removes its layers and clears stats when density is switched off', async () => {
    const { scope, stub, grid, modeRef } = setup([LONDON, MADRID], 'density')
    await flushFrames()
    expect(stub.layers.size).toBe(2)
    modeRef.value = 'off'
    await flushFrames()
    expect(stub.layers.size).toBe(0)
    expect(stub.sources.size).toBe(0)
    expect(grid.geoHexStats.value.cells).toBe(0)
    scope.stop()
  })

  it('re-anchors the grid when the camera moves', async () => {
    const { scope, stub, grid } = setup([LONDON, MADRID], 'density')
    await flushFrames()
    const calls = stub.setDataCalls.length
    stub.fire('move')
    await flushFrames()
    expect(stub.setDataCalls.length).toBe(calls + 1)
    expect(grid.geoHexStats.value.cellKm).toBeGreaterThan(0)
    scope.stop()
  })

  it('re-bins when the dataset changes', async () => {
    const { scope, stub, pointsRef, grid } = setup([LONDON], 'density')
    await flushFrames()
    expect(grid.geoHexStats.value.binned).toBe(1)
    pointsRef.value = [LONDON, MADRID, BERLIN]
    await flushFrames()
    expect(grid.geoHexStats.value.binned).toBe(3)
    expect(stub.setDataCalls.length).toBeGreaterThan(1)
    scope.stop()
  })

  it('grows cells instead of flooding the map past the cell budget', async () => {
    const dense: GeoPoint[] = Array.from({ length: 4000 }, (_, i) => ({
      lng: VIEW.west + ((i * 7919) % 5000) / 5000 * (VIEW.east - VIEW.west),
      lat: VIEW.south + ((i * 104729) % 5000) / 5000 * (VIEW.north - VIEW.south),
    }))
    const { scope, grid } = setup(dense, 'density')
    await flushFrames()
    expect(grid.geoHexStats.value.cells).toBeGreaterThan(0)
    expect(grid.geoHexStats.value.cells).toBeLessThanOrEqual(GEO_HEX_GRID.maxCells)
    scope.stop()
  })

  it('detaches listeners and layers on scope dispose', async () => {
    const { scope, stub } = setup([LONDON, MADRID], 'density')
    await flushFrames()
    expect(stub.events.get('move')?.length).toBe(1)
    scope.stop()
    expect(stub.events.get('move')).toHaveLength(0)
    expect(stub.layers.size).toBe(0)
  })
})
