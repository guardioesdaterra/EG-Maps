/**
 * lib/water-defense.ts
 * @why Water defense analysis — measures mining-claim pressure on named
 *      water bodies (reservoirs, lakes, rivers) so communities can see which
 *      waters are most exposed to dewatering, runoff and tailings risk.
 *      Two radii: PRESSURE (≤2km direct: dust, runoff, drawdown) and WATCH
 *      (≤5km shared aquifer / sub-basin). Pure functions, fully unit-tested.
 * @functions haversineKm, polygonCentroid, computeWaterThreats, summarizeWaterThreats, enrichWaterFeatures
 * @interfaces WaterThreat, WaterThreatSummary, ClaimPoint
 * @consts PRESSURE_KM, WATCH_KM
 * @connections composables/useRareEarthData.ts, components/observatory/tabs/TerritoryTab.vue, lib/territory-dossier.ts
 */

/** Direct-pressure radius: dust, runoff, pit dewatering drawdown. */
export const PRESSURE_KM = 2
/** Watch radius: shared aquifer / sub-basin exposure. */
export const WATCH_KM = 5

export interface ClaimPoint {
  lng: number
  lat: number
  processo: string
  nome: string
}

export interface WaterThreat {
  name: string
  water_type: string
  area_km2: number
  lng: number
  lat: number
  claimsPressure: number
  claimsWatch: number
  nearestProcesso: string
  nearestHolder: string
  nearestKm: number
  /** "processo · holder · X.Xkm" scalar for map popups. */
  nearestLabel: string
}

export interface WaterThreatSummary {
  watersAssessed: number
  watersUnderPressure: number
  watersOnWatch: number
  claimsNearWater: number
  top: WaterThreat[]
}

export function haversineKm(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const sLat = Math.sin(dLat / 2)
  const sLng = Math.sin(dLng / 2)
  const h = sLat * sLat + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * sLng * sLng
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cheap centroid: mean of the exterior ring (fine for small water bodies). */
export function polygonCentroid(geometry: GeoJSON.Geometry | undefined): { lng: number; lat: number } | null {
  if (!geometry) return null
  let ring: number[][] | null = null
  if (geometry.type === 'Polygon') ring = (geometry.coordinates as number[][][])[0] ?? null
  else if (geometry.type === 'MultiPolygon') {
    let biggest: number[][] | null = null
    for (const poly of geometry.coordinates as number[][][][]) {
      const r = poly[0]
      if (r && (!biggest || r.length > biggest.length)) biggest = r
    }
    ring = biggest
  } else if (geometry.type === 'Point') {
    const c = (geometry as GeoJSON.Point).coordinates
    return typeof c[0] === 'number' && typeof c[1] === 'number' ? { lng: c[0], lat: c[1] } : null
  }
  if (!ring?.length) return null
  let lng = 0
  let lat = 0
  for (const c of ring) { lng += c[0] ?? 0; lat += c[1] ?? 0 }
  return { lng: lng / ring.length, lat: lat / ring.length }
}

function claimPointsFromFC(points: GeoJSON.FeatureCollection | undefined | null): ClaimPoint[] {
  const out: ClaimPoint[] = []
  for (const f of points?.features ?? []) {
    const coords = (f.geometry as GeoJSON.Point | undefined)?.coordinates
    if (!Array.isArray(coords) || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') continue
    const p = (f.properties ?? {}) as Record<string, unknown>
    out.push({
      lng: coords[0],
      lat: coords[1],
      processo: String(p.processo ?? p.p ?? ''),
      nome: String(p.nome ?? p.n ?? ''),
    })
  }
  return out
}

/**
 * Claim pressure for every NAMED water body (unnamed ponds carry no
 * community reference point and are skipped to keep this O(named × claims)).
 */
export function computeWaterThreats(
  water: GeoJSON.FeatureCollection | undefined | null,
  points: GeoJSON.FeatureCollection | undefined | null,
  pressureKm = PRESSURE_KM,
  watchKm = WATCH_KM,
): WaterThreat[] {
  const claims = claimPointsFromFC(points)
  if (!claims.length) return []
  const out: WaterThreat[] = []
  for (const f of water?.features ?? []) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const name = String(p.name ?? '').trim()
    if (!name) continue
    const center = polygonCentroid(f.geometry)
    if (!center) continue
    let claimsPressure = 0
    let claimsWatch = 0
    let nearest: ClaimPoint | null = null
    let nearestKm = Infinity
    for (const c of claims) {
      const d = haversineKm(center.lng, center.lat, c.lng, c.lat)
      if (d <= pressureKm) claimsPressure++
      if (d <= watchKm) claimsWatch++
      if (d < nearestKm) { nearestKm = d; nearest = c }
    }
    out.push({
      name,
      water_type: String(p.water_type ?? p.water ?? p.waterway ?? 'water'),
      area_km2: Number(p.area_km2 ?? 0) || 0,
      lng: Math.round(center.lng * 1e6) / 1e6,
      lat: Math.round(center.lat * 1e6) / 1e6,
      claimsPressure,
      claimsWatch,
      nearestProcesso: nearest?.processo ?? '',
      nearestHolder: nearest?.nome ?? '',
      nearestKm: nearest ? Math.round(nearestKm * 10) / 10 : -1,
      nearestLabel: nearest ? `${nearest.processo} · ${nearest.nome} · ${(Math.round(nearestKm * 10) / 10).toFixed(1)}km` : '',
    })
  }
  // OSM often splits one reservoir into several polygons under one name —
  // merge duplicates keeping the most pressured fragment so lists and the
  // dossier read per water body, not per fragment.
  const byName = new Map<string, WaterThreat>()
  for (const t of out) {
    const prev = byName.get(t.name)
    if (!prev || t.claimsPressure > prev.claimsPressure
      || (t.claimsPressure === prev.claimsPressure && t.claimsWatch > prev.claimsWatch)) {
      byName.set(t.name, t)
    }
  }
  return [...byName.values()].sort((a, b) => b.claimsPressure - a.claimsPressure || b.claimsWatch - a.claimsWatch)
}

export function summarizeWaterThreats(threats: WaterThreat[], topN = 12): WaterThreatSummary {
  const top = threats.slice(0, topN)
  return {
    watersAssessed: threats.length,
    watersUnderPressure: threats.filter(t => t.claimsPressure > 0).length,
    watersOnWatch: threats.filter(t => t.claimsPressure === 0 && t.claimsWatch > 0).length,
    claimsNearWater: threats.reduce((n, t) => n + t.claimsWatch, 0),
    top,
  }
}

/**
 * Stamp threat scalars onto named water features (in place, scalar-only so
 * MapLibre paint + popups can read them). Returns the same collection.
 */
export function enrichWaterFeatures(
  water: GeoJSON.FeatureCollection | undefined,
  threats: WaterThreat[],
): GeoJSON.FeatureCollection | undefined {
  if (!water) return water
  const byName = new Map<string, WaterThreat>()
  for (const t of threats) if (!byName.has(t.name)) byName.set(t.name, t)
  for (const f of water.features) {
    const p = (f.properties ?? {}) as Record<string, unknown>
    const t = byName.get(String(p.name ?? ''))
    if (!t) continue
    p.threat_claims_2km = t.claimsPressure
    p.threat_claims_5km = t.claimsWatch
    p.threat_nearest = t.nearestLabel
  }
  return water
}
