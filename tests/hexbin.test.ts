import { describe, expect, it } from 'vitest'
import {
  binHexCells,
  hexCellRing,
  metersPerPixel,
  projectLatY,
  projectLngX,
  unprojectXLng,
  unprojectYLat,
  type GeoPoint,
} from '../lib/hexbin'

const LONDON: GeoPoint = { lng: -0.1276, lat: 51.5072 }
const NAIROBI: GeoPoint = { lng: 36.8219, lat: -1.2921 }
const SAO_PAULO: GeoPoint = { lng: -46.6333, lat: -23.5505 }

describe('hexbin projections', () => {
  it.each([-180, -120.5, -0.1, 0, 77.4, 180])('round-trips longitude %s', (lng) => {
    for (const zoom of [0, 3, 9, 14]) {
      expect(unprojectXLng(projectLngX(lng, zoom), zoom)).toBeCloseTo(lng, 6)
    }
  })

  it.each([-84, -60, -1.3, 0, 35.7, 84])('round-trips latitude %s', (lat) => {
    for (const zoom of [0, 3, 9, 14]) {
      expect(unprojectYLat(projectLatY(lat, zoom), zoom)).toBeCloseTo(lat, 4)
    }
  })

  it('grows world-x with longitude and shrinks world-y northward', () => {
    expect(projectLngX(10, 5)).toBeGreaterThan(projectLngX(-10, 5))
    expect(projectLatY(60, 5)).toBeLessThan(projectLatY(-60, 5))
  })

  it('clamps latitudes beyond the Mercator limit', () => {
    expect(projectLatY(90, 4)).toBe(projectLatY(85.051129, 4))
    expect(projectLatY(-90, 4)).toBe(projectLatY(-85.051129, 4))
  })

  it('halves ground resolution per zoom level', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(156543.03392, 3)
    expect(metersPerPixel(45, 1)).toBeCloseTo(metersPerPixel(45, 0) / 2, 6)
  })
})

describe('hexCellRing', () => {
  it('returns a closed six-vertex ring around the cell center', () => {
    const ring = hexCellRing(3, 7, 90, 6)
    expect(ring).toHaveLength(7)
    expect(ring[0]).toEqual(ring[6])
    expect(new Set(ring.slice(0, 6).map(([lng, lat]) => `${lng}:${lat}`)).size).toBe(6)
    for (const [lng, lat] of ring) {
      expect(Number.isFinite(lng)).toBe(true)
      expect(Number.isFinite(lat)).toBe(true)
    }
  })

  it('anchors the ring geographically for a negative column index', () => {
    const ring = hexCellRing(-2, 40, 120, 6)
    const lngs = ring.map(([lng]) => lng)
    const lats = ring.map(([, lat]) => lat)
    for (const value of [...lngs, ...lats]) expect(Number.isFinite(value)).toBe(true)
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeGreaterThan(0)
    expect(Math.max(...lats) - Math.min(...lats)).toBeGreaterThan(0)
  })
})

describe('binHexCells', () => {
  const europe = { west: -10, east: 40, south: 35, north: 70, zoom: 5 }

  it('bins every in-bounds point exactly once', () => {
    const result = binHexCells([LONDON, NAIROBI, SAO_PAULO], europe, 90)
    expect(result.totalPoints).toBe(1)
    expect(result.cells).toHaveLength(1)
    expect(result.cells[0]?.count).toBe(1)
  })

  it('counts repeated locations inside a single cell', () => {
    const center = binHexCells([LONDON], europe, 90).cells[0]!
    const cluster: GeoPoint[] = [
      { lng: center.lng, lat: center.lat },
      { lng: center.lng, lat: center.lat },
      { lng: center.lng, lat: center.lat },
      { lng: center.lng + 0.01, lat: center.lat },
      { lng: center.lng, lat: center.lat + 0.01 },
    ]
    const result = binHexCells(cluster, europe, 90)
    expect(result.cells).toHaveLength(1)
    expect(result.maxCount).toBe(5)
    expect(result.totalPoints).toBe(5)
    expect(result.cells.reduce((sum, cell) => sum + cell.count, 0)).toBe(5)
  })

  it('ignores non-finite coordinates', () => {
    const result = binHexCells(
      [{ lng: Number.NaN, lat: 10 }, { lng: 5, lat: Number.POSITIVE_INFINITY }, LONDON],
      europe,
      90,
    )
    expect(result.totalPoints).toBe(1)
  })

  it('reports statistics for visible cells only', () => {
    const farAway: GeoPoint = { lng: 170, lat: 0 }
    const result = binHexCells([LONDON, farAway, farAway], europe, 90)
    expect(result.totalPoints).toBe(1)
    expect(result.maxCount).toBe(1)
    for (const cell of result.cells) {
      expect(cell.lng).toBeGreaterThanOrEqual(europe.west - 5)
      expect(cell.lng).toBeLessThanOrEqual(europe.east + 5)
    }
  })

  it('keeps cell centers inside the queried bounds', () => {
    const points = Array.from({ length: 200 }, (_, i) => ({
      lng: europe.west + (i / 200) * (europe.east - europe.west),
      lat: europe.south + 5 + (i % 7),
    }))
    const result = binHexCells(points, europe, 60)
    expect(result.cells.length).toBeGreaterThan(1)
    for (const cell of result.cells) {
      expect(cell.lat).toBeLessThanOrEqual(europe.north + 20)
      expect(cell.lat).toBeGreaterThanOrEqual(europe.south - 20)
    }
  })

  it('enforces a minimum lattice size and exposes metric cell width', () => {
    const result = binHexCells([LONDON], europe, 1)
    expect(result.cellPx).toBe(8)
    expect(result.kmPerPx).toBeGreaterThan(0)
  })

  it('handles views crossing the antimeridian', () => {
    const crossing = { west: 170, east: -170, south: -10, north: 10, zoom: 3 }
    const result = binHexCells([{ lng: 180, lat: 0 }], crossing, 80)
    expect(result.totalPoints).toBe(1)
    expect(result.cells[0]?.count).toBe(1)
  })
})
