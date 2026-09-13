/**
 * lib/map-effects.ts
 * @why Visual map effects — particle systems, glow effects, animated connection lines
 * @functions buildMapConnectionFeatures, syncMapConnectionLayers, removeMapConnectionLayers, createMapParticleSystem
 * @interfaces ConnectionProperties, MapParticleSystem, ParticleQualityConfig
 * @types DatasetKey, MapConnectionFeature
 * @deps ./colors (getProjectMapColor); ./map-utils (MAP_GROUP_COLORS, generateCurvedPath, isValidCoordinate)
 * @connections composables/useMapConnections.ts
 */
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, LineString } from 'geojson'
import type { ProjectData, Species } from './types'
import { getProjectMapColor } from './colors'
import { MAP_GROUP_COLORS, generateCurvedPath, isValidCoordinate } from './map-utils'

type SpeciesLike = { id: string; lat: number; lng: number; commonName: string; taxonomicGroup: string }

export type DatasetKey = 'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'

export interface ConnectionProperties {
  color: string
  opacity: number
  weight: number
  dataset: DatasetKey
  group?: string
}

export type MapConnectionFeature = Feature<LineString, ConnectionProperties>

const CONNECTION_SOURCE_ID = 'connections-source'
const CONNECTION_GLOW_LAYER_ID = 'connections-glow-layer'
const CONNECTION_LAYER_ID = 'connections-layer'

interface BuildConnectionOptions {
  dataset: DatasetKey
  projects?: ProjectData[]
  species?: SpeciesLike[]
  crewLocations?: { name: string; country: string; city: string; state: string; region: string; status: 'active' | 'inactive'; lat: number; lng: number }[]
  isMobile: boolean
}

/* ── High-performance connection builder ─────────────────────────────
 * Previous implementation was O(n²): per-point `.filter()` over the whole
 * group plus `.find()` lookups, run over the *entire* dataset (4000+
 * species on desktop) on every filter change — even though only a handful
 * of lines (≤10) are ever rendered.
 *
 * New implementation is O(n):
 *  1. stride-sample inputs down to a bounded working set,
 *  2. single-pass grouping into index arrays (no per-item scans),
 *  3. deterministic consecutive pairing inside each group — no edge-key
 *     sets, no incoming-count maps, no hash lookups per candidate.
 * Only maxConnections features are ever materialized.
 */
const MAX_SAMPLE_PROJECTS = 150
const MAX_SAMPLE_SPECIES = 300
const MAX_SAMPLE_CREW_PER_REGION = 40

/** Deterministic stride sample — bounded working set preserving spread. */
function strideSample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = arr.length / max
  const out = new Array<T>(max)
  for (let i = 0; i < max; i++) out[i] = arr[Math.floor(i * step)] as T
  return out
}

/**
 * Round-robin pairing across groups: take one consecutive pair per group
 * per round until the budget is spent. Guarantees distinct edges without
 * any bookkeeping — pair (2k, 2k+1) can never repeat inside a group.
 */
function pairRoundRobin(
  groups: Map<string, number[]>,
  budget: number,
  make: (a: number, b: number, groupSize: number) => void,
): void {
  if (budget <= 0 || groups.size === 0) return
  const lists = [...groups.values()].sort((x, y) => y.length - x.length)
  const cursors = new Array<number>(lists.length).fill(0)
  let made = 0
  let progress = true
  while (made < budget && progress) {
    progress = false
    for (let g = 0; g < lists.length && made < budget; g++) {
      const list = lists[g] as number[]
      const c = cursors[g] as number
      if (c + 1 < list.length) {
        make(list[c] as number, list[c + 1] as number, list.length)
        cursors[g] = c + 2
        made++
        progress = true
      }
    }
  }
}

export function buildMapConnectionFeatures({
  dataset,
  projects = [],
  species = [],
  crewLocations = [],
  isMobile,
}: BuildConnectionOptions): MapConnectionFeature[] {
  switch (dataset) {
    case 'project-grants':
      return buildProjectConnectionFeatures(projects, isMobile)
    case 'endangered-species':
      return buildSpeciesConnectionFeatures(species, isMobile)
    case 'active-crews':
      return buildCrewConnectionFeatures(crewLocations, isMobile)
    default:
      return []
  }
}

function buildProjectConnectionFeatures(projects: ProjectData[], isMobile: boolean): MapConnectionFeature[] {
  const maxConnections = isMobile ? 3 : 7
  if (!projects.length || maxConnections <= 0) return []

  // Bound the working set first (spread-preserving), then single-pass
  // validate + group indices by color. O(n).
  const pool = projects.length > MAX_SAMPLE_PROJECTS ? strideSample(projects, MAX_SAMPLE_PROJECTS) : projects
  const sampled: ProjectData[] = []
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i] as ProjectData
    if (isValidCoordinate(p.latitude, p.longitude)) sampled.push(p)
  }
  if (sampled.length < 2) return []

  const colors = new Array<string>(sampled.length)
  const byColor = new Map<string, number[]>()
  for (let i = 0; i < sampled.length; i++) {
    const p = sampled[i] as ProjectData
    const c = getProjectMapColor(p.direct_beneficiaries, p.indirect_beneficiaries)
    colors[i] = c
    let list = byColor.get(c)
    if (!list) { list = []; byColor.set(c, list) }
    list.push(i)
  }

  const features: MapConnectionFeature[] = []
  pairRoundRobin(byColor, maxConnections, (a, b) => {
    const from = sampled[a] as ProjectData
    const to = sampled[b] as ProjectData
    features.push(createConnectionFeature({
      from: [from.longitude, from.latitude],
      to: [to.longitude, to.latitude],
      color: colors[a] as string,
      opacity: 0.2,
      weight: 1.55,
      dataset: 'project-grants',
    }))
  })

  return features
}

function buildSpeciesConnectionFeatures(species: SpeciesLike[], isMobile: boolean): MapConnectionFeature[] {
  const maxConnections = isMobile ? 5 : 10
  if (!species.length || maxConnections <= 0) return []

  // Bound the working set first (spread-preserving), then single-pass
  // validate + group indices by taxonomic group. O(n).
  const pool = species.length > MAX_SAMPLE_SPECIES ? strideSample(species, MAX_SAMPLE_SPECIES) : species
  const sampled: SpeciesLike[] = []
  for (let i = 0; i < pool.length; i++) {
    const s = pool[i] as SpeciesLike
    if (isValidCoordinate(s.lat, s.lng)) sampled.push(s)
  }
  if (sampled.length < 2) return []

  const byGroup = new Map<string, number[]>()
  for (let i = 0; i < sampled.length; i++) {
    const group = (sampled[i] as SpeciesLike).taxonomicGroup
    let list = byGroup.get(group)
    if (!list) { list = []; byGroup.set(group, list) }
    list.push(i)
  }

  const features: MapConnectionFeature[] = []
  pairRoundRobin(byGroup, maxConnections, (a, b) => {
    const source = sampled[a] as SpeciesLike
    const target = sampled[b] as SpeciesLike
    const group = source.taxonomicGroup
    features.push(createConnectionFeature({
      from: [source.lng, source.lat],
      to: [target.lng, target.lat],
      color: MAP_GROUP_COLORS[group] ?? '#e74c3c',
      opacity: 0.2,
      weight: 1.55,
      dataset: 'endangered-species',
      group,
    }))
  })

  return features
}

type CrewLocationLike = { name: string; country: string; city: string; state: string; region: string; status: 'active' | 'inactive'; lat: number; lng: number }

const CREW_REGION_COLORS: Record<string, string> = {
  'Africa': '#22c55e',
  'North America': '#3b82f6',
  'South America': '#a855f7',
  'Europe': '#ec4899',
  'East Asia': '#f59e0b',
  'South Asia': '#06b6d4',
}

function buildCrewConnectionFeatures(locations: CrewLocationLike[], isMobile: boolean): MapConnectionFeature[] {
  if (locations.length < 2) return []

  // Single-pass validate + group by region. O(n).
  const byRegion = new Map<string, CrewLocationLike[]>()
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i] as CrewLocationLike
    if (loc.status !== 'active' || !isValidCoordinate(loc.lat, loc.lng)) continue
    const region = loc.region || 'Other'
    let list = byRegion.get(region)
    if (!list) { list = []; byRegion.set(region, list) }
    list.push(loc)
  }
  if (byRegion.size === 0) return []

  const features: MapConnectionFeature[] = []
  const perRegionMax = isMobile ? 2 : 4

  for (const [region, regionLocs] of byRegion) {
    const color = CREW_REGION_COLORS[region] ?? '#22c55e'
    // Bound + deterministic consecutive pairing — distinct edges, no scans.
    const pool = regionLocs.length > MAX_SAMPLE_CREW_PER_REGION
      ? strideSample(regionLocs, MAX_SAMPLE_CREW_PER_REGION)
      : regionLocs
    const pairs = Math.min(perRegionMax, Math.floor(pool.length / 2))
    for (let k = 0; k < pairs; k++) {
      const source = pool[k * 2] as CrewLocationLike
      const target = pool[k * 2 + 1] as CrewLocationLike
      features.push(createConnectionFeature({
        from: [source.lng, source.lat],
        to: [target.lng, target.lat],
        color,
        opacity: 0.15,
        weight: 1.0,
        dataset: 'active-crews',
        group: region,
      }))
    }
  }

  return features
}

function createConnectionFeature({
  from,
  to,
  color,
  opacity,
  weight,
  dataset,
  group,
}: {
  from: [number, number]
  to: [number, number]
  color: string
  opacity: number
  weight: number
  dataset: DatasetKey
  group?: string
}): MapConnectionFeature {
  return {
    type: 'Feature',
    properties: {
      color,
      opacity,
      weight,
      dataset,
      ...(group ? { group } : {}),
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        from,
        generateCurvedPath(from, to),
        to,
      ],
    },
  }
}

export function syncMapConnectionLayers(
  map: MapLibreMap,
  features: MapConnectionFeature[],
  qualityBlur?: number,
) {
  if (features.length === 0) {
    removeMapConnectionLayers(map)
    return
  }
  if (!map.isStyleLoaded()) return

  const glowBlur = qualityBlur ?? 5.6

  // Fast path: source + layers already exist (common case on filter changes
  // and provider style re-syncs) — push new data in place instead of tearing
  // down and recreating layers (avoids flicker + relayout cost).
  const existing = map.getSource(CONNECTION_SOURCE_ID) as { setData?: (data: unknown) => void } | undefined
  if (existing && typeof existing.setData === 'function' && map.getLayer(CONNECTION_GLOW_LAYER_ID)) {
    try {
      existing.setData({ type: 'FeatureCollection', features })
      try {
        map.setPaintProperty(CONNECTION_GLOW_LAYER_ID, 'line-blur', [
          'interpolate', ['linear'], ['zoom'],
          5, glowBlur * 0.5,
          12, glowBlur,
        ])
      } catch { /* ignore */ }
      return
    } catch { /* fall through to full rebuild */ }
  }

  removeMapConnectionLayers(map)

  map.addSource(CONNECTION_SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
  })

  map.addLayer({
    id: CONNECTION_GLOW_LAYER_ID,
    type: 'line',
    source: CONNECTION_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'],
        5, ['*', ['*', ['get', 'weight'], 4], 0.7],
        12, ['*', ['*', ['get', 'weight'], 4], 1.4],
      ],
      'line-opacity': ['*', ['get', 'opacity'], 0.55],
      'line-blur': ['interpolate', ['linear'], ['zoom'],
        5, glowBlur * 0.5,
        12, glowBlur,
      ],
    },
  })

  map.addLayer({
    id: CONNECTION_LAYER_ID,
    type: 'line',
    source: CONNECTION_SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'],
        5, ['*', ['get', 'weight'], 0.7],
        12, ['*', ['get', 'weight'], 1.4],
      ],
      'line-opacity': ['get', 'opacity'],
      'line-dasharray': [0.75, 2.5],
    },
  })
}

export function removeMapConnectionLayers(map: MapLibreMap) {
  if (map.getLayer(CONNECTION_GLOW_LAYER_ID)) map.removeLayer(CONNECTION_GLOW_LAYER_ID)
  if (map.getLayer(CONNECTION_LAYER_ID)) map.removeLayer(CONNECTION_LAYER_ID)
  if (map.getSource(CONNECTION_SOURCE_ID)) map.removeSource(CONNECTION_SOURCE_ID)
}

class CircularBuffer<T> {
  private buffer: T[]
  private head = 0
  private size = 0
  private capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity)
  }

  push(item: T): void {
    this.buffer[(this.head + this.size) % this.capacity] = item
    if (this.size < this.capacity) {
      this.size++
    } else {
      this.head = (this.head + 1) % this.capacity
    }
  }

  forEach(cb: (item: T, index: number) => void): void {
    for (let i = 0; i < this.size; i++) {
      cb(this.buffer[(this.head + i) % this.capacity], i)
    }
  }

  get length(): number { return this.size }

  clear(): void { this.size = 0; this.head = 0 }
}

interface Particle {
  from: [number, number]
  control: [number, number]
  to: [number, number]
  progress: number
  speed: number
  size: number
  color: string
  group?: string
  trail: CircularBuffer<{ x: number; y: number }>
}

interface ParticleSystemOptions {
  map: MapLibreMap
  container: HTMLElement
  getFeatures: () => MapConnectionFeature[]
  isMobile: () => boolean
  zIndex?: number
}

export interface MapParticleSystem {
  start: () => void
  stop: () => void
  updateQuality: (config: ParticleQualityConfig) => void
}

export interface ParticleQualityConfig {
  particleMaxCount?: number
  particleFps?: number
  particleTrailLength?: number
  particleShadowBlur?: number
  particleSpawnRate?: number
}

export function createMapParticleSystem({
  map,
  container,
  getFeatures,
  isMobile,
  zIndex = 2,
  quality: initialQuality,
}: ParticleSystemOptions & { quality?: ParticleQualityConfig }): MapParticleSystem {
  let particleCanvas: HTMLCanvasElement | null = null
  let particleAnimationFrame: number | null = null
  let particles: Particle[] = []
  let activeGroup: string | null = null
  let cancelled = false

  let quality = { ...initialQuality }

  function stop() {
    cancelled = true
    if (particleAnimationFrame) { cancelAnimationFrame(particleAnimationFrame); particleAnimationFrame = null }
    particles = []
    activeGroup = null
    if (particleCanvas?.parentNode) particleCanvas.parentNode.removeChild(particleCanvas)
    particleCanvas = null
  }

  function updateQuality(config: ParticleQualityConfig) {
    quality = { ...quality, ...config }
  }

  function spawnParticle() {
    const features = getFeatures()
    const mobile = isMobile()
    const maxParticles = quality.particleMaxCount ?? (mobile ? 45 : 90)
    if (maxParticles <= 0 || !features.length || particles.length >= maxParticles) return

    const trailLen = quality.particleTrailLength ?? (mobile ? 4 : 7)

    const speciesFeatures = features.filter(f => f.properties?.dataset === 'endangered-species')
    if (!speciesFeatures.length) {
      const feature = features[Math.floor(Math.random() * features.length)]
      const coords = feature.geometry.coordinates as [number, number][]
      if (!coords || coords.length < 3) return
      const [from, control, to] = coords
      if (!from || !control || !to) return

      particles.push({
        from, control, to,
        progress: 0,
        speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
        size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
        color: feature.properties?.color || '#ffffff',
        trail: new CircularBuffer(trailLen),
      })
      return
    }

    if (!activeGroup || Math.random() < 0.15) {
      const groups = [...new Set(speciesFeatures.map(f => f.properties?.group).filter(Boolean))]
      if (groups.length) activeGroup = groups[Math.floor(Math.random() * groups.length)] as string
    }

    const groupFeatures = activeGroup
      ? speciesFeatures.filter(f => f.properties?.group === activeGroup)
      : speciesFeatures

    if (!groupFeatures.length) return

    const feature = groupFeatures[Math.floor(Math.random() * groupFeatures.length)]
    const coords = feature.geometry.coordinates as [number, number][]
    if (!coords || coords.length < 3) return
    const [from, control, to] = coords
    if (!from || !control || !to) return

    particles.push({
      from, control, to,
      progress: 0,
      speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
      size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
      color: feature.properties?.color || '#ffffff',
      group: activeGroup || undefined,
      trail: new CircularBuffer(trailLen),
    })
  }

  function start() {
    if (!getFeatures().length) return

    stop()
    cancelled = false

    const computedPosition = window.getComputedStyle(container).position
    if (computedPosition === 'static') container.style.position = 'relative'

    particleCanvas = document.createElement('canvas')
    particleCanvas.className = 'map-particle-canvas'
    particleCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;will-change:transform'
    particleCanvas.style.zIndex = String(zIndex)
    container.appendChild(particleCanvas)

    const ctx = particleCanvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return

    let lastFrame = 0
    const mobile = isMobile()
    const targetFps = quality.particleFps ?? (mobile ? 24 : 36)
    const frameInterval = 1000 / targetFps

    let lastRectW = 0; let lastRectH = 0; let lastDpr = 1

    const resizeCanvas = () => {
      if (!particleCanvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (particleCanvas.width === w && particleCanvas.height === h) return
      particleCanvas.width = w
      particleCanvas.height = h
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastRectW = rect.width; lastRectH = rect.height; lastDpr = dpr
    }

    resizeCanvas()

    const animate = (timestamp: number) => {
      if (cancelled || !particleCanvas) return
      particleAnimationFrame = requestAnimationFrame(animate)
      if (timestamp - lastFrame < frameInterval) return
      lastFrame = timestamp

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (dpr !== lastDpr) resizeCanvas()

      ctx.clearRect(0, 0, lastRectW, lastRectH)

      const spawnRate = quality.particleSpawnRate ?? (mobile ? 0.32 : 0.45)
      const spawnAttempts = mobile ? 1 : 2
      for (let i = 0; i < spawnAttempts; i++) {
        if (spawnRate > 0 && Math.random() < spawnRate) spawnParticle()
      }

      const maxTrail = quality.particleTrailLength ?? (mobile ? 4 : 7)
      const shadowBlur = quality.particleShadowBlur ?? (mobile ? 3 : 6)

      particles = particles.filter((particle) => {
        particle.progress += particle.speed
        if (particle.progress >= 1) return false

        const lngLat = getBezierPoint(particle.from, particle.control, particle.to, particle.progress)
        let point
        try {
          point = map.project(lngLat)
        } catch {
          return false
        }

        const visible = point.x > -40 && point.x < lastRectW + 40 && point.y > -40 && point.y < lastRectH + 40
        if (!visible) return true

        particle.trail.push({ x: point.x, y: point.y })

        const fade = particle.progress > 0.8 ? 1 - (particle.progress - 0.8) / 0.2 : 1
        ctx.save()
        ctx.globalAlpha = 0.75 * fade
        ctx.strokeStyle = particle.color
        ctx.lineWidth = particle.size * 0.75

        if (shadowBlur > 0) {
          ctx.shadowColor = particle.color
          ctx.shadowBlur = shadowBlur
        }

        if (particle.trail.length > 1) {
          ctx.beginPath()
          let first = true
          particle.trail.forEach((p) => {
            if (first) { ctx.moveTo(p.x, p.y); first = false }
            else ctx.lineTo(p.x, p.y)
          })
          ctx.stroke()
        }

        ctx.globalAlpha = 0.95 * fade
        ctx.beginPath()
        ctx.arc(point.x, point.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.fill()
        ctx.restore()

        return true
      })
    }

    particleAnimationFrame = requestAnimationFrame(animate)
  }

  return { start, stop, updateQuality }
}

function getBezierPoint(from: [number, number], control: [number, number], to: [number, number], t: number): [number, number] {
  const oneMinusT = 1 - t
  return [
    oneMinusT * oneMinusT * from[0] + 2 * oneMinusT * t * control[0] + t * t * to[0],
    oneMinusT * oneMinusT * from[1] + 2 * oneMinusT * t * control[1] + t * t * to[1],
  ]
}
