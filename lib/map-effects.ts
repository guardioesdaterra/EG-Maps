import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Feature, LineString } from 'geojson'
import type { ProjectData, Species } from './types'
import { getProjectColorByBeneficiaries } from './colors'
import { GROUP_COLORS, generateCurvedPath, isValidCoordinate } from './map-utils'

export type DatasetKey = 'project-grants' | 'endangered-species' | 'vulcan-observatory'

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
  species?: Species[]
  isMobile: boolean
}

export function buildMapConnectionFeatures({
  dataset,
  projects = [],
  species = [],
  isMobile,
}: BuildConnectionOptions): MapConnectionFeature[] {
  return dataset === 'project-grants'
    ? buildProjectConnectionFeatures(projects, isMobile)
    : buildSpeciesConnectionFeatures(species, isMobile)
}

function buildProjectConnectionFeatures(projects: ProjectData[], isMobile: boolean): MapConnectionFeature[] {
  const projectsToProcess = isMobile ? projects.slice(0, Math.min(15, projects.length)) : projects
  const incomingCountByProject = new Map<string, number>()
  const edgeKeys = new Set<string>()
  const features: MapConnectionFeature[] = []

  // Pre-compute colors to avoid repeated calls
  const colorCache = new Map<ProjectData, string>()
  for (const p of projectsToProcess) {
    colorCache.set(p, getProjectColorByBeneficiaries(p.direct_beneficiaries, p.indirect_beneficiaries))
  }

  // Group valid projects by color for O(N) target lookup
  const byColor = new Map<string, string[]>()
  for (const p of projectsToProcess) {
    if (!isValidCoordinate(p.latitude, p.longitude)) continue
    const c = colorCache.get(p)!
    if (!byColor.has(c)) byColor.set(c, [])
    byColor.get(c)!.push(p.project_title)
  }

  projectsToProcess.forEach((project) => {
    if (!isValidCoordinate(project.latitude, project.longitude)) return

    const projectKey = project.project_title
    const color = colorCache.get(project)!

    const sameColorKeys = byColor.get(color) ?? []
    const availableTargetNames = sameColorKeys.filter(k =>
      k !== projectKey &&
      !edgeKeys.has([projectKey, k].sort().join('::')) &&
      (incomingCountByProject.get(k) ?? 0) < 1
    )

    if (!availableTargetNames.length) return

    const targetName = availableTargetNames[Math.floor(Math.random() * availableTargetNames.length)]
    const target = projectsToProcess.find(p => p.project_title === targetName)!
    if (!target) return

    features.push(createConnectionFeature({
      from: [project.longitude, project.latitude],
      to: [target.longitude, target.latitude],
      color,
      opacity: 0.2,
      weight: 1.55,
      dataset: 'project-grants',
    }))

    edgeKeys.add([projectKey, targetName].sort().join('::'))
    incomingCountByProject.set(targetName, (incomingCountByProject.get(targetName) ?? 0) + 1)
  })

  return features
}

function buildSpeciesConnectionFeatures(species: Species[], isMobile: boolean): MapConnectionFeature[] {
  const speciesToProcess = isMobile ? species.slice(0, Math.min(50, species.length)) : species
  const incomingCountByGroup = new Map<string, Map<string, number>>()
  const edgeKeys = new Set<string>()
  const features: MapConnectionFeature[] = []

  // Group species by taxonomic group for O(N) lookup per group
  const byGroup = new Map<string, string[]>()
  for (const s of speciesToProcess) {
    if (!isValidCoordinate(s.lat, s.lng)) continue
    const key = s.id || s.commonName
    if (!byGroup.has(s.taxonomicGroup)) byGroup.set(s.taxonomicGroup, [])
    byGroup.get(s.taxonomicGroup)!.push(key)
  }

  speciesToProcess.forEach((source) => {
    if (!isValidCoordinate(source.lat, source.lng)) return

    const group = source.taxonomicGroup
    if (!incomingCountByGroup.has(group)) {
      incomingCountByGroup.set(group, new Map())
    }
    const incomingCount = incomingCountByGroup.get(group)!
    const sourceKey = source.id || source.commonName
    const color = GROUP_COLORS[group] ?? '#B64032'

    const sameGroupKeys = byGroup.get(group) ?? []
    const availableTargetKeys = sameGroupKeys.filter(k => {
      const normalizedEdgeKey = [sourceKey, k].sort().join('::')
      return k !== sourceKey &&
        !edgeKeys.has(normalizedEdgeKey) &&
        (incomingCount.get(k) ?? 0) < (isMobile ? 1 : 2)
    })

    if (!availableTargetKeys.length) return

    const targetKey = availableTargetKeys[Math.floor(Math.random() * availableTargetKeys.length)]
    const target = speciesToProcess.find(s => (s.id || s.commonName) === targetKey)!
    if (!target) return

    features.push(createConnectionFeature({
      from: [source.lng, source.lat],
      to: [target.lng, target.lat],
      color,
      opacity: 0.2,
      weight: 1.55,
      dataset: 'endangered-species',
      group,
    }))

    edgeKeys.add([sourceKey, targetKey].sort().join('::'))
    incomingCount.set(targetKey, (incomingCount.get(targetKey) ?? 0) + 1)
  })

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

export function syncMapConnectionLayers(map: MapLibreMap, features: MapConnectionFeature[]) {
  removeMapConnectionLayers(map)

  if (features.length === 0) return

  if (!map.isStyleLoaded()) return

  map.addSource(CONNECTION_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features,
    },
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
        5, 2.8,
        12, 5.6,
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

interface Particle {
  from: [number, number]
  control: [number, number]
  to: [number, number]
  progress: number
  speed: number
  size: number
  color: string
  group?: string
  trail: { x: number; y: number }[]
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
}

export function createMapParticleSystem({
  map,
  container,
  getFeatures,
  isMobile,
  zIndex = 2,
}: ParticleSystemOptions): MapParticleSystem {
  let particleCanvas: HTMLCanvasElement | null = null
  let particleAnimationFrame: number | null = null
  let particles: Particle[] = []
  let activeGroup: string | null = null
  let groupChangeTimer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function stop() {
    cancelled = true
    if (particleAnimationFrame) {
      cancelAnimationFrame(particleAnimationFrame)
      particleAnimationFrame = null
    }
    if (groupChangeTimer) {
      clearTimeout(groupChangeTimer)
      groupChangeTimer = null
    }
    particles = []
    activeGroup = null
    if (particleCanvas?.parentNode) {
      particleCanvas.parentNode.removeChild(particleCanvas)
    }
    particleCanvas = null
  }

  function spawnParticle() {
    const features = getFeatures()
    const mobile = isMobile()
    if (!features.length || particles.length > (mobile ? 45 : 90)) return

    const speciesFeatures = features.filter(f => f.properties?.dataset === 'endangered-species')
    if (!speciesFeatures.length) {
      const feature = features[Math.floor(Math.random() * features.length)]
      const [from, control, to] = feature.geometry.coordinates as [number, number][]
      if (!from || !control || !to) return

      particles.push({
        from,
        control,
        to,
        progress: 0,
        speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
        size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
        color: feature.properties?.color || '#ffffff',
        trail: [],
      })
      return
    }

    if (!activeGroup || Math.random() < 0.15) {
      const groups = [...new Set(speciesFeatures.map(f => f.properties?.group).filter(Boolean))]
      if (groups.length) {
        activeGroup = groups[Math.floor(Math.random() * groups.length)] as string
      }
    }

    const groupFeatures = activeGroup
      ? speciesFeatures.filter(f => f.properties?.group === activeGroup)
      : speciesFeatures

    if (!groupFeatures.length) return

    const feature = groupFeatures[Math.floor(Math.random() * groupFeatures.length)]
    const [from, control, to] = feature.geometry.coordinates as [number, number][]
    if (!from || !control || !to) return

    particles.push({
      from,
      control,
      to,
      progress: 0,
      speed: mobile ? 0.006 + Math.random() * 0.008 : 0.004 + Math.random() * 0.007,
      size: mobile ? 1.2 : 1.5 + Math.random() * 1.2,
      color: feature.properties?.color || '#ffffff',
      group: activeGroup || undefined,
      trail: [],
    })
  }

  function start() {
    if (!getFeatures().length) return

    stop()
    cancelled = false

    const computedPosition = window.getComputedStyle(container).position
    if (computedPosition === 'static') {
      container.style.position = 'relative'
    }

    particleCanvas = document.createElement('canvas')
    particleCanvas.className = 'map-particle-canvas'
    particleCanvas.style.position = 'absolute'
    particleCanvas.style.inset = '0'
    particleCanvas.style.width = '100%'
    particleCanvas.style.height = '100%'
    particleCanvas.style.pointerEvents = 'none'
    particleCanvas.style.zIndex = String(zIndex)
    container.appendChild(particleCanvas)

    const ctx = particleCanvas.getContext('2d')
    if (!ctx) return

    let lastFrame = 0
    const frameInterval = isMobile() ? 1000 / 24 : 1000 / 36

    let lastRectW = 0; let lastRectH = 0; let lastDpr = 1

    const resizeCanvas = () => {
      if (!particleCanvas) return
      const dpr = window.devicePixelRatio || 1
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

      const dpr = window.devicePixelRatio || 1
      if (dpr !== lastDpr) {
        resizeCanvas()
      }

      ctx.clearRect(0, 0, lastRectW, lastRectH)

      const mobile = isMobile()
      const spawnAttempts = mobile ? 1 : 2
      for (let i = 0; i < spawnAttempts; i++) {
        if (Math.random() < (mobile ? 0.32 : 0.45)) spawnParticle()
      }

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
        if (particle.trail.length > (mobile ? 4 : 7)) particle.trail.shift()

        const fade = particle.progress > 0.8 ? 1 - (particle.progress - 0.8) / 0.2 : 1
        ctx.save()
        ctx.globalAlpha = 0.75 * fade
        ctx.strokeStyle = particle.color
        ctx.lineWidth = particle.size * 0.75
        ctx.shadowColor = particle.color
        ctx.shadowBlur = mobile ? 3 : 6

        if (particle.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y)
          particle.trail.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
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

  return { start, stop }
}

function getBezierPoint(from: [number, number], control: [number, number], to: [number, number], t: number): [number, number] {
  const oneMinusT = 1 - t
  return [
    oneMinusT * oneMinusT * from[0] + 2 * oneMinusT * t * control[0] + t * t * to[0],
    oneMinusT * oneMinusT * from[1] + 2 * oneMinusT * t * control[1] + t * t * to[1],
  ]
}
