/**
 * lib/garden-grid.ts
 * @why Metric grid maths for the Agroecological Garden Tool. The garden is
 *      defined by a centre point, X/Y dimensions in metres, a cell size and a
 *      rotation — independent of latitude, so a 10 × 10 m plot really is
 *      10 × 10 m on the ground.
 * @functions normalizeGrid, gridSummary, buildGridGeometry, gridBounds,
 *            gridToGeoJSON, localMetersToLngLat, lngLatToLocalMeters
 * @types GardenGridGeometry
 * @connections lib/garden-types.ts, components/tools/garden/*
 */

import type { GardenGrid, GardenLocation } from './garden-types'

const METERS_PER_DEGREE_LAT = 111_320
export const GRID_MIN_SIDE_M = 1
export const GRID_MAX_SIDE_M = 2000
export const GRID_MIN_CELL_M = 0.25
export const GRID_MAX_CELL_M = 100
export const GRID_MAX_CELLS = 2500

export interface GardenGridGeometry {
  /** Boundary ring, closed, [lng, lat]. */
  boundary: [number, number][]
  /** Every vertical/horizontal grid line as a two-point segment. */
  lines: [[number, number], [number, number]][]
  cols: number
  rows: number
  cells: number
  areaM2: number
  center: [number, number]
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Clamp user input to sane garden dimensions and derive the grid counts. */
export function normalizeGrid(input: Partial<GardenGrid> | null | undefined): GardenGrid {
  const widthM = clamp(input?.widthM, GRID_MIN_SIDE_M, GRID_MAX_SIDE_M, 10)
  const heightM = clamp(input?.heightM, GRID_MIN_SIDE_M, GRID_MAX_SIDE_M, 10)
  const cellM = clamp(input?.cellM, GRID_MIN_CELL_M, GRID_MAX_CELL_M, 1)
  const rawRotation = clamp(input?.rotationDeg, -180, 180, 0)
  const rotationDeg = Math.round(rawRotation * 10) / 10
  return {
    widthM: Math.round(widthM * 100) / 100,
    heightM: Math.round(heightM * 100) / 100,
    cellM: Math.round(cellM * 100) / 100,
    rotationDeg,
    cols: Math.max(1, Math.ceil(widthM / cellM - 1e-9)),
    rows: Math.max(1, Math.ceil(heightM / cellM - 1e-9)),
  }
}

export function gridSummary(grid: GardenGrid): { cols: number; rows: number; cells: number; areaM2: number } {
  const g = normalizeGrid(grid)
  return {
    cols: g.cols,
    rows: g.rows,
    cells: g.cols * g.rows,
    areaM2: Math.round(g.widthM * g.heightM * 100) / 100,
  }
}

/** Offset [lng, lat] by local metres where +x is the grid X axis and +y the Y axis. */
export function localMetersToLngLat(
  origin: [number, number],
  xMeters: number,
  yMeters: number,
  rotationDeg = 0,
): [number, number] {
  const [lng, lat] = origin
  const theta = (rotationDeg * Math.PI) / 180
  const east = xMeters * Math.cos(theta) - yMeters * Math.sin(theta)
  const north = xMeters * Math.sin(theta) + yMeters * Math.cos(theta)
  const safeLat = Math.min(85, Math.max(-85, lat))
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos((safeLat * Math.PI) / 180))
  return [lng + east / metersPerDegreeLng, lat + north / METERS_PER_DEGREE_LAT]
}

/** Inverse of `localMetersToLngLat` — used for snapping and hit testing. */
export function lngLatToLocalMeters(
  origin: [number, number],
  lng: number,
  lat: number,
  rotationDeg = 0,
): [number, number] {
  const [originLng, originLat] = origin
  const safeLat = Math.min(85, Math.max(-85, originLat))
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos((safeLat * Math.PI) / 180))
  const east = (lng - originLng) * metersPerDegreeLng
  const north = (lat - originLat) * METERS_PER_DEGREE_LAT
  const theta = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return [east * cos + north * sin, -east * sin + north * cos]
}

/** Build the boundary ring and grid lines for a garden area centred on `center`. */
export function buildGridGeometry(center: GardenLocation, input: GardenGrid): GardenGridGeometry {
  const grid = normalizeGrid(input)
  const { widthM, heightM, cellM, rotationDeg, cols, rows } = grid
  const origin: [number, number] = [center.lng, center.lat]
  const halfW = widthM / 2
  const halfH = heightM / 2
  const point = (x: number, y: number): [number, number] => localMetersToLngLat(origin, x, y, rotationDeg)

  const corners: [number, number][] = [
    point(-halfW, -halfH),
    point(halfW, -halfH),
    point(halfW, halfH),
    point(-halfW, halfH),
  ]
  const boundary: [number, number][] = [...corners, corners[0]!]

  const lines: [[number, number], [number, number]][] = []
  for (let col = 0; col <= cols; col++) {
    const x = -halfW + Math.min(col * cellM, widthM)
    lines.push([point(x, -halfH), point(x, halfH)])
  }
  for (let row = 0; row <= rows; row++) {
    const y = -halfH + Math.min(row * cellM, heightM)
    lines.push([point(-halfW, y), point(halfW, y)])
  }

  return {
    boundary,
    lines,
    cols,
    rows,
    cells: cols * rows,
    areaM2: Math.round(widthM * heightM * 100) / 100,
    center: origin,
  }
}

/** [[minLng, minLat], [maxLng, maxLat]] for a boundary ring. */
export function gridBounds(boundary: [number, number][]): [[number, number], [number, number]] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of boundary) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  if (!Number.isFinite(minLng)) return [[0, 0], [0, 0]]
  return [[minLng, minLat], [maxLng, maxLat]]
}

export interface GardenGridGeoJSON {
  area: GeoJSON.FeatureCollection
  lines: GeoJSON.FeatureCollection
}

/** GeoJSON for the grid fill and line layers. */
export function gridToGeoJSON(center: GardenLocation, grid: GardenGrid): GardenGridGeoJSON {
  const geometry = buildGridGeometry(center, grid)
  const boundary: GeoJSON.Polygon = { type: 'Polygon', coordinates: [geometry.boundary] }
  const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = geometry.lines.map((segment) => ({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: segment },
    properties: { kind: 'cell' },
  }))
  lineFeatures.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: geometry.boundary },
    properties: { kind: 'boundary' },
  })
  return {
    area: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: boundary,
        properties: { kind: 'boundary' },
      }],
    },
    lines: {
      type: 'FeatureCollection',
      features: lineFeatures,
    },
  }
}
