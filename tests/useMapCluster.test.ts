import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMapCluster } from '../composables/useMapCluster'

function makeItems(count: number, baseLng = 0, baseLat = 0) {
  return Array.from({ length: count }, (_, i) => ({
    lng: baseLng + i * 0.01,
    lat: baseLat + i * 0.01,
    type: 'species' as const,
    index: i,
  }))
}

describe('useMapCluster', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty clusters when nothing loaded', () => {
    const { getClusters, destroy } = useMapCluster()
    const result = getClusters([-180, -85, 180, 85], 5)
    expect(result).toEqual([])
    destroy()
  })

  it('schedules a debounced load and resolves clusters after the timer', () => {
    const { load, getClusters, destroy } = useMapCluster()
    load(makeItems(50))
    // Not yet flushed
    expect(getClusters([-180, -85, 180, 85], 5)).toEqual([])
    vi.advanceTimersByTime(80)
    const result = getClusters([-180, -85, 180, 85], 1)
    // At low zoom, 50 points in a small area should cluster into 1
    expect(result.length).toBeGreaterThanOrEqual(1)
    const clusterOrPoint = result[0]
    expect(['cluster', 'point']).toContain(clusterOrPoint.type)
    destroy()
  })

  it('coalesces rapid back-to-back loads into one rebuild', () => {
    const { load, getClusters, destroy } = useMapCluster()
    load(makeItems(10))
    vi.advanceTimersByTime(20)
    load(makeItems(20))
    vi.advanceTimersByTime(20)
    load(makeItems(30))
    // Still nothing — the timer keeps getting pushed
    expect(getClusters([-180, -85, 180, 85], 5)).toEqual([])
    vi.advanceTimersByTime(80)
    // After the full debounce, the latest data wins
    const result = getClusters([-180, -85, 180, 85], 1)
    expect(result.length).toBeGreaterThan(0)
    destroy()
  })

  it('loadImmediate bypasses the debounce', () => {
    const { loadImmediate, getClusters, destroy } = useMapCluster()
    loadImmediate(makeItems(40))
    // No timer advance needed
    const result = getClusters([-180, -85, 180, 85], 1)
    expect(result.length).toBeGreaterThan(0)
    destroy()
  })

  it('destroy cancels pending debounced loads', () => {
    const { load, getClusters: _getClusters, destroy } = useMapCluster()
    load(makeItems(10))
    destroy()
    // Advancing time after destroy should not bring clusters back
    vi.advanceTimersByTime(200)
    // Use a fresh clusterer to verify
    const fresh = useMapCluster()
    expect(fresh.getClusters([-180, -85, 180, 85], 5)).toEqual([])
    fresh.destroy()
  })

  it('produces valid ClusterPoint shapes', () => {
    const { loadImmediate, getClusters, destroy } = useMapCluster()
    loadImmediate(makeItems(8))
    const result = getClusters([-180, -85, 180, 85], 1)
    for (const point of result) {
      if (point.type === 'cluster') {
        expect(typeof point.count).toBe('number')
        expect(typeof point.clusterId).toBe('number')
        expect(point.lng).toBeGreaterThanOrEqual(-180)
        expect(point.lng).toBeLessThanOrEqual(180)
        expect(point.lat).toBeGreaterThanOrEqual(-85)
        expect(point.lat).toBeLessThanOrEqual(85)
      } else {
        expect(typeof point.sourceIndex).toBe('number')
      }
    }
    destroy()
  })
})
