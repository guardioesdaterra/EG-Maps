/**
 * lib/hexbin.ts
 * @why Geography-anchored hexbin (hexagonal binning) over Web Mercator — powers the
 *      satellite "grid view" density layer (composables/useGeoHexGrid.ts).
 * @functions projectLngX, projectLatY, unprojectXLng, unprojectYLat, binHexCells, hexCellRing
 * @interfaces GeoPoint, HexBinInput, HexBinCell, HexBinResult
 * @connections composables/useGeoHexGrid.ts
 */

export interface GeoPoint {
  lng: number
  lat: number
}

export interface HexBinInput {
  west: number
  east: number
  south: number
  north: number
  zoom: number
}

export interface HexBinCell {
  col: number
  row: number
  lng: number
  lat: number
  count: number
}

export interface HexBinResult {
  cells: HexBinCell[]
  /** Edge length (same projected units as `cellPx`) of the lattice that was built. */
  cellPx: number
  kmPerPx: number
  maxCount: number
  totalPoints: number
}

const TILE_SIZE = 512

/** longitude → world-x in tile pixels at the given zoom. */
export function projectLngX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * TILE_SIZE * Math.pow(2, zoom)
}

/** latitude → world-y in tile pixels at the given zoom (Web Mercator). */
export function projectLatY(lat: number, zoom: number): number {
  const clamped = Math.max(-85.051129, Math.min(85.051129, lat))
  const s = Math.sin((clamped * Math.PI) / 180)
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
  return y * TILE_SIZE * Math.pow(2, zoom)
}

/** world-x in tile pixels → longitude. */
export function unprojectXLng(x: number, zoom: number): number {
  return (x / (TILE_SIZE * Math.pow(2, zoom))) * 360 - 180
}

/** world-y in tile pixels → latitude. */
export function unprojectYLat(y: number, zoom: number): number {
  const n = y / (TILE_SIZE * Math.pow(2, zoom))
  const lat = (180 / Math.PI) * (2 * Math.atan(Math.exp(Math.PI * (1 - 2 * n))) - Math.PI / 2)
  return Math.max(-85.051129, Math.min(85.051129, lat))
}

/** Meters per world pixel (tile units) at a latitude/zoom — Mercator stretch. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
}

/**
 * Pointy-top hex lattice centers. Column step 1.5·s, row step 0.75·h with
 * h = √3·s; odd columns are staggered down by half a row height.
 */
function centerOf(col: number, row: number, s: number): [number, number] {
  const h = s * Math.sqrt(3)
  return [col * 1.5 * s, row * (h * 0.75) + (col % 2 !== 0 ? h * 0.5 : 0)]
}

/** GeoJSON ring (lng,lat pairs, closed) for one hex cell. */
export function hexCellRing(col: number, row: number, s: number, zoom: number): [number, number][] {
  const [cx, cy] = centerOf(col, row, s)
  const ring: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i
    ring.push([
      unprojectXLng(cx + s * Math.cos(angle), zoom),
      unprojectYLat(cy + s * Math.sin(angle), zoom),
    ])
  }
  ring.push(ring[0])
  return ring
}

/**
 * Bin `points` into a screen-regular hex lattice covering `input` bounds.
 * Cell size is fixed at `cellPx` projected pixels so hexes stay regular
 * on screen at any latitude, and the lattice re-anchors to geography
 * every time the camera moves.
 */
export function binHexCells(points: GeoPoint[], input: HexBinInput, cellPx: number): HexBinResult {
  const { west, east, south, north, zoom } = input
  const s = Math.max(8, cellPx)
  const h = s * Math.sqrt(3)

  const x0 = projectLngX(west, zoom)
  const x1 = projectLngX(east < west ? east + 360 : east, zoom)
  // North is smaller y in projected space.
  const y0 = projectLatY(north, zoom)
  const y1 = projectLatY(south, zoom)

  const colMin = Math.floor(x0 / (1.5 * s)) - 1
  const colMax = Math.ceil(x1 / (1.5 * s)) + 1
  const rowMin = Math.floor(y0 / (h * 0.75)) - 2
  const rowMax = Math.ceil(y1 / (h * 0.75)) + 2

  interface CellAcc { col: number; row: number; count: number }
  const cells = new Map<string, CellAcc>()

  for (const p of points) {
    if (!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) continue
    const px = projectLngX(p.lng, zoom)
    const py = projectLatY(p.lat, zoom)
    const cApprox = Math.round(px / (1.5 * s))
    const rApprox = Math.floor((py - (cApprox % 2 !== 0 ? h * 0.5 : 0)) / (h * 0.75))
    let bestKey: string | null = null
    let bestCenter: [number, number] | null = null
    let bestDistSq = Infinity
    // The nearest center is among the 4 lattice nodes bracketing the point.
    for (const dc of [0, 1]) {
      for (const dr of [0, 1]) {
        const col = cApprox + dc
        const row = rApprox + dr
        const [cx, cy] = centerOf(col, row, s)
        const dx = px - cx
        const dy = py - cy
        const d = dx * dx + dy * dy
        if (d < bestDistSq) {
          bestDistSq = d
          bestKey = `${col},${row}`
          bestCenter = [cx, cy]
        }
      }
    }
    if (!bestKey || !bestCenter) continue
    const existing = cells.get(bestKey)
    if (existing) {
      existing.count++
    } else {
      const [colText, rowText] = bestKey.split(',')
      cells.set(bestKey, { col: Number(colText), row: Number(rowText), count: 1 })
    }
  }

  const out: HexBinCell[] = []
  let maxCount = 0
  let totalPoints = 0
  for (const acc of cells.values()) {
    // Recompute geographic center; drop cells fully outside the padded bounds.
    const [cx, cy] = centerOf(acc.col, acc.row, s)
    if (cx < x0 - 2 * s || cx > x1 + 2 * s || cy < y0 - 2 * h || cy > y1 + 2 * h) continue
    // Stats describe the rendered grid only, so the colour ramp and the legend
    // reflect what the user can see rather than the whole source dataset.
    if (acc.count > maxCount) maxCount = acc.count
    totalPoints += acc.count
    out.push({ col: acc.col, row: acc.row, lng: unprojectXLng(cx, zoom), lat: unprojectYLat(cy, zoom), count: acc.count })
  }

  const centerLat = unprojectYLat((y0 + y1) / 2, zoom)
  return { cells: out, cellPx: s, kmPerPx: metersPerPixel(centerLat, zoom) / 1000, maxCount, totalPoints }
}
