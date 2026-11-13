import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { MAX_PARENT_ZOOM_WALK, MAX_TILE_BYTES, isSafeTileUrl, useOfflineTiles } from '../composables/useOfflineTiles'
import { offlineSatelliteStyle } from '../composables/useMapLibre'

const originalOnLine = navigator.onLine
const urlApi = globalThis.URL
const originalCreateObjectURL = urlApi.createObjectURL
const originalRevokeObjectURL = urlApi.revokeObjectURL

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

function createTiles() {
  const scope = effectScope()
  const tiles = scope.run(() => useOfflineTiles())!
  return { scope, tiles }
}

afterEach(() => {
  setOnline(originalOnLine)
  if (originalCreateObjectURL) urlApi.createObjectURL = originalCreateObjectURL
  else Reflect.deleteProperty(urlApi, 'createObjectURL')
  if (originalRevokeObjectURL) urlApi.revokeObjectURL = originalRevokeObjectURL
  else Reflect.deleteProperty(urlApi, 'revokeObjectURL')
  vi.restoreAllMocks()
})

describe('useOfflineTiles', () => {
  it('validates only supported MapTiler tile URLs and coordinates', () => {
    expect(isSafeTileUrl('https://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg?key=test')).toBe(true)
    expect(isSafeTileUrl('https://evil.example/tiles/satellite-v2/4/2/3.jpg')).toBe(false)
    expect(isSafeTileUrl('https://api.maptiler.com.attacker.test/tiles/satellite-v2/4/2/3.jpg')).toBe(false)
    expect(isSafeTileUrl('https://evilmaptiler.com/tiles/satellite-v2/4/2/3.jpg')).toBe(false)
    expect(isSafeTileUrl('http://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg')).toBe(false)
    expect(isSafeTileUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeTileUrl('https://api.maptiler.com/tiles/satellite-v2/25/2/3.jpg')).toBe(false)
    expect(isSafeTileUrl('https://api.maptiler.com/tiles/satellite-v2/4/99/3.jpg')).toBe(false)
  })

  it('keeps the original URL when offline data has not been loaded into memory', () => {
    setOnline(false)
    const { scope, tiles } = createTiles()
    const url = 'https://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg?key=test'
    expect(tiles.transformRequest(url, 'Tile')).toEqual({ url })
    scope.stop()
  })

  it('returns a Blob URL for cached offline data and preserves getTile API', async () => {
    setOnline(false)
    let nextUrl = 0
    URL.createObjectURL = vi.fn(() => `blob:test-${++nextUrl}`)
    URL.revokeObjectURL = vi.fn()
    const { scope, tiles } = createTiles()
    const data = new Uint8Array([1, 2, 3]).buffer
    await tiles.setTile(4, 2, 3, data, 'image/jpeg')

    expect(await tiles.getTile(4, 2, 3)).toBe(data)
    expect(await tiles.getTileUrl(4, 2, 3)).toBe('blob:test-1')
    expect(tiles.transformRequest('https://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg?key=test', 'Tile')).toEqual({ url: 'blob:test-1' })
    expect(tiles.transformRequest('https://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg?key=test', 'Source')).toEqual({ url: 'https://api.maptiler.com/tiles/satellite-v2/4/2/3.jpg?key=test' })
    scope.stop()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1')
  })

  it('rejects oversized or non-image tiles without exposing them as cached', async () => {
    const { scope, tiles } = createTiles()
    await tiles.setTile(1, 0, 0, new ArrayBuffer(MAX_TILE_BYTES + 1), 'image/jpeg')
    await tiles.setTile(1, 0, 0, new ArrayBuffer(3), 'application/octet-stream')
    expect(await tiles.hasTile(1, 0, 0)).toBe(false)
    expect(await tiles.getTileUrl(1, 0, 0)).toBe(null)
    scope.stop()
  })

  it('does not create a fictitious /tiles URL when no object URL API exists', async () => {
    setOnline(false)
    Object.defineProperty(urlApi, 'createObjectURL', { configurable: true, value: undefined })
    const { scope, tiles } = createTiles()
    await tiles.setTile(1, 0, 0, new Uint8Array([1]).buffer, 'image/png')
    expect(await tiles.getTileUrl(1, 0, 0)).toBe(null)
    expect(tiles.transformRequest('https://api.maptiler.com/tiles/satellite-v2/1/0/0.png', 'Tile')).toEqual({ url: 'https://api.maptiler.com/tiles/satellite-v2/1/0/0.png' })
    scope.stop()
  })

  it('serves parent-zoom backup levels when the exact tile is missing', async () => {
    const { scope, tiles } = createTiles()
    // Pyramid only has z10 — map asking for z12 must walk up to the parent.
    const parent = new Uint8Array([9, 9, 9]).buffer
    await tiles.setTile(10, 512, 341, parent, 'image/jpeg')

    expect(await tiles.getTileOrAncestor(12, 2048, 1366)).toBe(parent)
    expect(await tiles.getTileOrAncestor(11, 1024, 683)).toBe(parent)
    expect(await tiles.getTileOrAncestor(10, 512, 341)).toBe(parent)
    // Unrelated leaf with no ancestor in range stays null.
    expect(await tiles.getTileOrAncestor(12, 0, 0)).toBeNull()
    scope.stop()
  })

  it('walks at most MAX_PARENT_ZOOM_WALK levels of backup', async () => {
    const { scope, tiles } = createTiles()
    const deep = new Uint8Array([1]).buffer
    // Store z2 only; children of (2,1,1) at level k have x=y=2^k … 2^(k+1)-1.
    await tiles.setTile(2, 1, 1, deep, 'image/jpeg')
    // One level beyond the walk budget: lands on z3 after MAX walks, never reaches z2.
    const beyondZ = 2 + MAX_PARENT_ZOOM_WALK + 1
    expect(await tiles.getTileOrAncestor(beyondZ, 2 ** (beyondZ - 2), 2 ** (beyondZ - 2))).toBeNull()
    // Exactly MAX walks from a direct child of the stored tile.
    const edgeZ = 2 + MAX_PARENT_ZOOM_WALK
    expect(await tiles.getTileOrAncestor(edgeZ, 2 ** (edgeZ - 2), 2 ** (edgeZ - 2))).toBe(deep)
    scope.stop()
  })

  it('builds an offline raster style that points at cached MapTiler satellite tiles', () => {
    const style = offlineSatelliteStyle('test-key')
    const source = style.sources['eg-offline-satellite']
    expect(source).toBeDefined()
    expect(source?.type).toBe('raster')
    expect('tiles' in (source ?? {}) ? (source as { tiles?: string[] }).tiles?.[0] : undefined)
      .toContain('/tiles/satellite-v2/{z}/{x}/{y}.jpg')
    expect('tiles' in (source ?? {}) ? (source as { tiles?: string[] }).tiles?.[0] : undefined)
      .toContain('key=test-key')
    expect(style.layers[0]?.type).toBe('raster')
  })

  it('counts non-ok downloads as errors and skips 404 as no-data', async () => {
    const { scope, tiles } = createTiles()
    const fetchMock = vi.fn(async () => new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    await tiles.prefetchRegion({ north: 1, south: 0, east: 1, west: 0 }, 1, 1)
    // Single z1 tile that 404s: not an error (no imagery), not cached.
    expect(tiles.prefetchErrors.value).toBe(0)
    expect(await tiles.hasTile(1, 1, 0)).toBe(false)
    expect(fetchMock).toHaveBeenCalled()
    scope.stop()
  })
})
