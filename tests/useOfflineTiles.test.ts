import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { MAX_TILE_BYTES, isSafeTileUrl, useOfflineTiles } from '../composables/useOfflineTiles'

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
})
