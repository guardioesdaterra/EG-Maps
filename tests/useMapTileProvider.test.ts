import { afterEach, describe, expect, it } from 'vitest'
import { useMapTileProvider } from '@/composables/useMapTileProvider'

const originalOnline = navigator.onLine

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

afterEach(() => {
  setOnline(originalOnline)
  useMapTileProvider().setPreference('auto')
})

describe('offline tile provider selection', () => {
  it('uses the cached MapTiler style offline, but falls back when there is no cache', () => {
    setOnline(false)
    const provider = useMapTileProvider()
    provider.setPreference('auto')

    expect(provider.evaluateNetworkHints('test-api-key')).toBe('fallback')
    provider.resetToAuto()
    expect(provider.evaluateNetworkHints('test-api-key', true)).toBe('maptiler')
    expect(provider.isFallback.value).toBe(false)
  })
})
