import type { ProjectData } from '@/lib/types'
import { getProjectColorByBeneficiaries } from '@/lib/colors'
import { GROUP_COLORS, RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { getMarkerImageUrl } from '@/lib/image-utils'
import { formatCompact } from '@/lib/utils'
import { MAX_CLUSTER_SIZE } from '@/lib/constants'
import type { ClusterItem } from '@/composables/useMapCluster'

interface MarkerItem {
  imageUrl?: string | null
  taxonomicGroup?: string
  category?: string
  threatTypes?: string[]
}

export interface MarkerMetrics {
  hitSize: number
  visualSize: number
  color: string
  centerSize: number
  imageUrl?: string
  originalImageUrl?: string
  number?: string
}

export function getUnifiedMarkerMetrics(options: {
  color: string
  size: number
  centerScale?: number
  imageUrl?: string
  originalImageUrl?: string
  number?: string
}): MarkerMetrics {
  const hitSize = Math.max(34, Math.round(options.size + 12))
  const visualSize = Math.round(options.size)
  return {
    hitSize,
    visualSize,
    color: options.color,
    centerSize: Math.max(7, Math.round(visualSize * (options.centerScale ?? 0.42))),
    imageUrl: options.imageUrl,
    originalImageUrl: options.originalImageUrl,
    number: options.number,
  }
}

export function createUnifiedMarkerElement(metrics: MarkerMetrics, baseURL?: string) {
  const el = document.createElement('div')
  el.style.width = `${metrics.hitSize}px`
  el.style.height = `${metrics.hitSize}px`
  el.style.display = 'flex'
  el.style.justifyContent = 'center'
  el.style.alignItems = 'center'
  el.style.cursor = 'pointer'
  el.style.pointerEvents = 'auto'
  el.style.zIndex = '10'

  const inner = document.createElement('div')
  inner.style.width = `${metrics.visualSize}px`
  inner.style.height = `${metrics.visualSize}px`
  inner.style.borderRadius = '50%'
  inner.style.backgroundColor = 'rgba(0, 0, 0, 0.82)'
  inner.style.border = `2px solid ${metrics.color}`
  inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}`
  inner.style.display = 'flex'
  inner.style.justifyContent = 'center'
  inner.style.alignItems = 'center'
  inner.style.position = 'relative'
  inner.style.overflow = 'hidden'
  inner.style.transition = 'transform 160ms ease, box-shadow 160ms ease'
  inner.style.transformOrigin = 'center center'
  inner.style.transform = 'scale(1)'

  if (metrics.originalImageUrl) {
    const thumbUrl = getMarkerImageUrl(metrics.originalImageUrl, baseURL)
    if (thumbUrl) {
      inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${thumbUrl}")`
      inner.style.backgroundSize = 'cover'
      inner.style.backgroundPosition = 'center'
    }
  } else if (metrics.imageUrl) {
    inner.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${metrics.imageUrl}")`
    inner.style.backgroundSize = 'cover'
    inner.style.backgroundPosition = 'center'
  } else if (metrics.number) {
    const label = document.createElement('span')
    label.textContent = metrics.number
    label.style.color = '#fff'
    label.style.fontSize = `${Math.max(8, Math.round(metrics.visualSize * 0.38))}px`
    label.style.fontWeight = '700'
    label.style.lineHeight = '1'
    label.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)'
    inner.appendChild(label)
  }

  el.appendChild(inner)

  el.addEventListener('mouseenter', () => {
    inner.style.transform = 'scale(1.28)'
    inner.style.boxShadow = `0 0 ${Math.max(16, metrics.visualSize * 0.9)}px ${metrics.color}, 0 0 4px #fff`
    el.style.zIndex = '100'
  })
  el.addEventListener('mouseleave', () => {
    inner.style.transform = 'scale(1)'
    inner.style.boxShadow = `0 0 ${Math.max(8, metrics.visualSize * 0.5)}px ${metrics.color}`
    el.style.zIndex = '10'
  })

  return el
}

export function createProjectMarkerElement(project: ProjectData): HTMLElement {
  const totalBeneficiaries = project.direct_beneficiaries + project.indirect_beneficiaries
  const beneficiaryFactor = Math.min(Math.max(totalBeneficiaries / 10000, 0.5), 5)
  const markerSize = 15 + beneficiaryFactor * 10
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: markerSize,
    number: formatCompact(totalBeneficiaries),
  }))
}

export function createSpeciesMarkerElement(species: { imageUrl?: string | null; taxonomicGroup?: string; category?: string; threatTypes?: string[] }): HTMLElement {
  const color = GROUP_COLORS[species.taxonomicGroup ?? ''] ?? '#B64032'
  const cat = (species.category ?? '').toUpperCase()
  const categoryFactor = cat === 'CR' ? 5 : cat === 'EN' ? 3.5 : cat === 'VU' ? 2 : 1
  const markerSize = 16 + categoryFactor * 5
  const threatCount = species.threatTypes?.length ?? 0
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: markerSize,
    centerScale: 0.62,
    originalImageUrl: species.imageUrl || undefined,
    number: species.imageUrl ? undefined : (threatCount > 0 ? String(threatCount) : (species.taxonomicGroup?.charAt(0) || '?')),
  }))
}

function dangerColor(ds: number): string {
  if (ds >= 8) return '#e74c3c'
  if (ds >= 6) return '#f39c12'
  return '#f1c40f'
}

export function createRareEarthMarkerElement(feature: GeoJSON.Feature, baseURL?: string): HTMLElement {
  const props = feature.properties as Record<string, unknown> || {}
  const cat = RARE_EARTH_CATEGORIES[props.c as string] ?? { label: 'Unknown', color: '#666' }
  const ds = Number(props.ds ?? props.danger_score ?? 5)
  const color = dangerColor(ds)
  const el = createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color: cat.color,
    size: 20,
  }), baseURL)

  const inner = el.querySelector<HTMLDivElement>('div')
  if (inner) {
    inner.style.background = `radial-gradient(circle at 40% 35%, rgba(0,0,0,0.15), rgba(0,0,0,0.65))`
    inner.style.border = `2px solid ${color}`
    inner.style.boxShadow = `0 0 ${ds >= 8 ? 14 : ds >= 6 ? 10 : 7}px ${color}, 0 0 2px rgba(255,255,255,0.3)`

    const emoji = document.createElement('span')
    emoji.textContent = '⚠'
    emoji.style.fontSize = '11px'
    emoji.style.lineHeight = '1'
    emoji.style.filter = ds >= 8 ? 'drop-shadow(0 0 3px #e74c3c)' : ds >= 6 ? 'drop-shadow(0 0 2px #f39c12)' : 'drop-shadow(0 0 2px #f1c40f)'
    inner.appendChild(emoji)
  }

  return el
}

export function createCrewMarkerElement(crew: { totalMembers: number; activeCrews: number }): HTMLElement {
  const memberFactor = Math.min(Math.max(crew.totalMembers / 200, 0.5), 5)
  const markerSize = 15 + memberFactor * 10
  const color = crew.activeCrews > 20 ? '#22c55e' : crew.activeCrews > 5 ? '#3b82f6' : '#a855f7'
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: markerSize,
    number: formatCompact(crew.activeCrews),
  }))
}

export function createCrewLocationMarkerElement(crew: { name: string; region: string; status?: string }): HTMLElement {
  const color = crew.status === 'inactive' ? '#f59e0b' : '#22c55e'
  return createUnifiedMarkerElement(getUnifiedMarkerMetrics({
    color,
    size: 18,
    number: '',
  }))
}

function parseColor(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  return [parseInt(c.substring(0, 2), 16), parseInt(c.substring(2, 4), 16), parseInt(c.substring(4, 6), 16)]
}

function blendColors(colors: string[]): string {
  if (!colors.length) return '#6366f1'
  const counts = new Map<string, number>()
  for (const c of colors) {
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let maxCount = 0
  let dominant = colors[0]
  for (const [color, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      dominant = color
    }
  }
  return dominant
}

function getMarkerColor(dataset: string, sourceProjects?: ProjectData[], sourceSpecies?: MarkerItem[], sourceRareEarth?: GeoJSON.Feature[], sourceCrews?: { lng: number; lat: number }[]): string {
  if (dataset === 'project-grants' && sourceProjects?.length) {
    return blendColors(sourceProjects.map(p => getProjectColorByBeneficiaries(p.direct_beneficiaries, p.indirect_beneficiaries)))
  }
  if (dataset === 'endangered-species' && sourceSpecies?.length) {
    return blendColors(sourceSpecies.map(s => GROUP_COLORS[s.taxonomicGroup ?? ''] ?? '#B64032'))
  }
  if (dataset === 'vulcan-observatory' && sourceRareEarth?.length) {
    return blendColors(sourceRareEarth.map(f => {
      const props = f.properties as Record<string, unknown> || {}
      const cat = RARE_EARTH_CATEGORIES[props.c as string] ?? { label: 'Unknown', color: '#666' }
      return cat.color
    }))
  }
  if (dataset === 'active-crews' && sourceCrews?.length) {
    return '#22c55e'
  }
  return '#6366f1'
}

function getMiniColor(dataset: string, item: ClusterItem, sourceProjects?: ProjectData[], sourceSpecies?: MarkerItem[], sourceRareEarth?: GeoJSON.Feature[], sourceCrews?: { lng: number; lat: number }[]): string {
  if (dataset === 'endangered-species' && sourceSpecies?.length) {
    const sp = sourceSpecies[item.index]
    if (sp) return GROUP_COLORS[sp.taxonomicGroup ?? ''] ?? '#B64032'
  }
  if (dataset === 'project-grants' && sourceProjects?.length) {
    const pr = sourceProjects[item.index]
    if (pr) return getProjectColorByBeneficiaries(pr.direct_beneficiaries, pr.indirect_beneficiaries)
  }
  if (dataset === 'vulcan-observatory' && sourceRareEarth?.length) {
    const feature = sourceRareEarth[item.index]
    const props = feature?.properties as Record<string, unknown> || {}
    const cat = RARE_EARTH_CATEGORIES[props.c as string] ?? { label: 'Unknown', color: '#666' }
    return cat.color
  }
  if (dataset === 'active-crews' && sourceCrews?.length) {
    return '#22c55e'
  }
  return '#6366f1'
}

function getMiniImage(item: ClusterItem, dataset: string, sourceSpecies?: MarkerItem[], baseURL?: string): string | undefined {
  if (dataset !== 'endangered-species' || !sourceSpecies?.length) return undefined
  const sp = sourceSpecies[item.index]
  if (!sp?.imageUrl) return undefined
  return getMarkerImageUrl(sp.imageUrl, baseURL) || undefined
}

function getClusterAggregateDanger(items: ClusterItem[], sourceRareEarth?: GeoJSON.Feature[]): { maxDs: number; avgDs: number } {
  if (!sourceRareEarth?.length) return { maxDs: 0, avgDs: 0 }
  let sum = 0; let max = 0; let n = 0
  for (const item of items) {
    const f = sourceRareEarth[item.index]
    if (!f) continue
    const props = (f.properties as Record<string, unknown>) || {}
    const ds = Number(props.ds ?? props.danger_score ?? 5)
    sum += ds; n++; if (ds > max) max = ds
  }
  return { maxDs: max, avgDs: n ? sum / n : 0 }
}

function getClusterAggregateThreatCount(items: ClusterItem[], sourceSpecies?: MarkerItem[]): number {
  if (!sourceSpecies?.length) return 0
  let total = 0
  for (const item of items) {
    const sp = sourceSpecies[item.index]
    if (sp?.threatTypes?.length) total += sp.threatTypes.length
  }
  return total
}

function createClusterDangerBadge(dangerScore: number, _count: number): HTMLDivElement | null {
  if (!dangerScore) return null
  const color = dangerScore >= 8 ? '#e74c3c' : dangerScore >= 6 ? '#f39c12' : '#27ae60'
  const badge = document.createElement('div')
  badge.textContent = `⚠ ${dangerScore.toFixed(1)}`
  badge.style.position = 'absolute'
  badge.style.top = '-4px'
  badge.style.left = '-4px'
  badge.style.background = color
  badge.style.color = '#fff'
  badge.style.fontSize = '7px'
  badge.style.fontWeight = '800'
  badge.style.lineHeight = '1'
  badge.style.padding = '2px 4px'
  badge.style.borderRadius = '6px'
  badge.style.border = '1px solid rgba(0,0,0,0.5)'
  badge.style.boxShadow = `0 0 6px ${color}`
  badge.style.zIndex = '6'
  badge.style.whiteSpace = 'nowrap'
  return badge
}

export function createClusterMarkerElement(
  dataset: string,
  count: number,
  items: ClusterItem[],
  onItemClick: (_item: ClusterItem) => void,
  sourceProjects?: ProjectData[],
  sourceSpecies?: MarkerItem[],
  sourceRareEarth?: GeoJSON.Feature[],
  sourceCrews?: { lng: number; lat: number }[],
  baseURL?: string
) {
  const dominant = getMarkerColor(dataset, sourceProjects, sourceSpecies, sourceRareEarth, sourceCrews)
  const [dr, dg, db] = parseColor(dominant)

  const aggDanger = getClusterAggregateDanger(items, sourceRareEarth)
  const aggThreats = getClusterAggregateThreatCount(items, sourceSpecies)

  const outer = document.createElement('div')
  outer.className = 'globe-marker-item'
  outer.style.cursor = 'pointer'
  outer.style.pointerEvents = 'auto'
  outer.style.zIndex = '20'
  outer.style.position = 'relative'
  outer.title = dataset === 'vulcan-observatory' && aggDanger.maxDs
    ? `${count} items · ⚠ ${aggDanger.maxDs.toFixed(1)} max danger`
    : dataset === 'endangered-species' && aggThreats
      ? `${count} items · ${aggThreats} threats`
      : `${count} items`

  if (items.length <= MAX_CLUSTER_SIZE) {
    const miniSize = items.length <= 3 ? 24 : 20
    const containerSize = items.length <= 2 ? 48 : items.length <= 4 ? 58 : 66
    const orbitRadius = items.length <= 2 ? 10 : items.length <= 4 ? 14 : 17

    outer.style.width = `${containerSize}px`
    outer.style.height = `${containerSize}px`
    outer.style.display = 'flex'
    outer.style.justifyContent = 'center'
    outer.style.alignItems = 'center'

    const clusterInner = document.createElement('div')
    clusterInner.style.position = 'relative'
    clusterInner.style.width = `${containerSize}px`
    clusterInner.style.height = `${containerSize}px`
    clusterInner.style.display = 'flex'
    clusterInner.style.justifyContent = 'center'
    clusterInner.style.alignItems = 'center'

    const angleStep = (Math.PI * 2) / items.length
    const centers: { x: number; y: number }[] = []
    items.forEach((_, i) => {
      const angle = angleStep * i - Math.PI / 2
      centers.push({ x: Math.cos(angle) * orbitRadius, y: Math.sin(angle) * orbitRadius })
    })

    items.forEach((item, i) => {
      const itemColor = getMiniColor(dataset, item, sourceProjects, sourceSpecies, sourceRareEarth, sourceCrews)
      const img = getMiniImage(item, dataset, sourceSpecies, baseURL)
      const c = centers[i]
      const mini = document.createElement('div')
      mini.className = 'cluster-mini-hover'
      mini.style.position = 'absolute'
      mini.style.width = `${miniSize}px`
      mini.style.height = `${miniSize}px`
      mini.style.borderRadius = '50%'
      mini.style.backgroundColor = 'rgba(0, 0, 0, 0.82)'
      if (img) {
        mini.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${img}")`
        mini.style.backgroundSize = 'cover'
        mini.style.backgroundPosition = 'center'
      }
      mini.style.border = `1.5px solid ${itemColor}`
      mini.style.boxShadow = `0 0 7px ${itemColor}`
      mini.style.top = `calc(50% + ${c.y}px - ${miniSize / 2}px)`
      mini.style.left = `calc(50% + ${c.x}px - ${miniSize / 2}px)`
      mini.style.cursor = 'pointer'
      mini.style.zIndex = '2'
      mini.setAttribute('tabindex', '0')
      mini.setAttribute('role', 'button')
      mini.setAttribute('aria-label', `Open item ${i + 1} of ${items.length}`)
      mini.addEventListener('click', (e) => {
        e.stopPropagation()
        onItemClick(item)
      })
      mini.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onItemClick(item)
        }
      })
      clusterInner.appendChild(mini)
    })

    const countBadge = document.createElement('div')
    countBadge.textContent = `${count}`
    countBadge.style.position = 'absolute'
    countBadge.style.bottom = '-4px'
    countBadge.style.right = '-4px'
    countBadge.style.background = dominant
    countBadge.style.color = '#fff'
    countBadge.style.fontSize = '8px'
    countBadge.style.fontWeight = '800'
    countBadge.style.lineHeight = '1'
    countBadge.style.padding = '2px 5px'
    countBadge.style.borderRadius = '8px'
    countBadge.style.border = '1.5px solid rgba(0,0,0,0.5)'
    countBadge.style.boxShadow = `0 0 8px ${dominant}`
    countBadge.style.zIndex = '5'
    clusterInner.appendChild(countBadge)

    const dangerBadge = dataset === 'vulcan-observatory'
      ? createClusterDangerBadge(aggDanger.maxDs, count)
      : dataset === 'endangered-species' && aggThreats > 0
        ? (() => {
            const b = document.createElement('div')
            b.textContent = `${aggThreats}`
            b.style.position = 'absolute'
            b.style.top = '-4px'
            b.style.left = '-4px'
            b.style.background = aggThreats >= 5 ? '#e74c3c' : aggThreats >= 3 ? '#f39c12' : '#f1c40f'
            b.style.color = '#fff'
            b.style.fontSize = '7px'
            b.style.fontWeight = '800'
            b.style.lineHeight = '1'
            b.style.padding = '2px 4px'
            b.style.borderRadius = '6px'
            b.style.border = '1px solid rgba(0,0,0,0.5)'
            b.style.boxShadow = `0 0 6px ${b.style.background}`
            b.style.zIndex = '6'
            b.style.whiteSpace = 'nowrap'
            return b
          })()
        : null
    if (dangerBadge) clusterInner.appendChild(dangerBadge)

    outer.appendChild(clusterInner)

    outer.addEventListener('mouseenter', () => {
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      outer.style.zIndex = '20'
    })
  } else {
    const miniSize = 14
    const cols = 4
    const rows = Math.ceil(Math.min(items.length, 12) / cols)
    const gap = 2
    const pad = 5
    const gridW = cols * (miniSize + gap) - gap + pad * 2
    const gridH = rows * (miniSize + gap) - gap + pad * 2

    outer.style.width = `${gridW}px`
    outer.style.height = `${gridH}px`
    outer.style.display = 'flex'
    outer.style.justifyContent = 'center'
    outer.style.alignItems = 'center'

    const grid = document.createElement('div')
    grid.style.position = 'relative'
    grid.style.display = 'flex'
    grid.style.flexWrap = 'wrap'
    grid.style.alignContent = 'center'
    grid.style.justifyContent = 'center'
    grid.style.gap = `${gap}px`
    grid.style.width = '100%'
    grid.style.height = '100%'
    grid.style.padding = `${pad}px`
    grid.style.borderRadius = '14px'
    grid.style.transition = 'transform 200ms ease'
    grid.style.transformOrigin = 'center center'

    const maxShow = cols * rows - 1

    const gridInner = document.createElement('div')
    gridInner.style.position = 'relative'
    gridInner.style.display = 'flex'
    gridInner.style.flexWrap = 'wrap'
    gridInner.style.alignContent = 'center'
    gridInner.style.justifyContent = 'center'
    gridInner.style.gap = `${gap}px`
    gridInner.style.width = '100%'
    gridInner.style.height = '100%'
    gridInner.style.zIndex = '1'

    items.slice(0, maxShow).forEach((item, _idx) => {
      const itemColor = getMiniColor(dataset, item, sourceProjects, sourceSpecies, sourceRareEarth, sourceCrews)
      const img = getMiniImage(item, dataset, sourceSpecies, baseURL)
      const mini = document.createElement('div')
      mini.className = 'cluster-mini-hover'
      mini.style.width = `${miniSize}px`
      mini.style.height = `${miniSize}px`
      mini.style.borderRadius = '50%'
      mini.style.backgroundColor = 'rgba(0, 0, 0, 0.82)'
      if (img) {
        mini.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.18)), url("${img}")`
        mini.style.backgroundSize = 'cover'
        mini.style.backgroundPosition = 'center'
      }
      mini.style.border = `1px solid ${itemColor}`
      mini.style.boxShadow = `0 0 4px ${itemColor}`
      mini.style.cursor = 'pointer'
      mini.style.flexShrink = '0'
      mini.setAttribute('tabindex', '0')
      mini.setAttribute('role', 'button')
      mini.addEventListener('click', (e) => {
        e.stopPropagation()
        if (item) onItemClick(item)
      })
      mini.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          if (item) onItemClick(item)
        }
      })
      gridInner.appendChild(mini)
    })

    if (items.length > maxShow) {
      const more = document.createElement('div')
      more.className = 'cluster-mini-hover'
      more.textContent = `+${items.length - maxShow}`
      more.style.width = `${miniSize}px`
      more.style.height = `${miniSize}px`
      more.style.borderRadius = '50%'
      more.style.background = `rgba(${dr},${dg},${db},0.55)`
      more.style.backdropFilter = 'blur(4px)'
      more.style.border = `1.5px solid ${dominant}`
      more.style.color = '#fff'
      more.style.fontSize = '7px'
      more.style.fontWeight = '800'
      more.style.display = 'flex'
      more.style.alignItems = 'center'
      more.style.justifyContent = 'center'
      more.style.flexShrink = '0'
      gridInner.appendChild(more)
    }

    const gridDangerBadge = dataset === 'vulcan-observatory'
      ? createClusterDangerBadge(aggDanger.maxDs, count)
      : dataset === 'endangered-species' && aggThreats > 0
        ? (() => {
            const b = document.createElement('div')
            b.textContent = `${aggThreats}`
            b.style.position = 'absolute'
            b.style.top = '-2px'
            b.style.left = '-2px'
            b.style.background = aggThreats >= 5 ? '#e74c3c' : aggThreats >= 3 ? '#f39c12' : '#f1c40f'
            b.style.color = '#fff'
            b.style.fontSize = '6px'
            b.style.fontWeight = '800'
            b.style.lineHeight = '1'
            b.style.padding = '1px 3px'
            b.style.borderRadius = '5px'
            b.style.border = '1px solid rgba(0,0,0,0.5)'
            b.style.boxShadow = `0 0 5px ${b.style.background}`
            b.style.zIndex = '6'
            b.style.whiteSpace = 'nowrap'
            return b
          })()
        : null
    if (gridDangerBadge) grid.appendChild(gridDangerBadge)

    grid.appendChild(gridInner)

    outer.addEventListener('mouseenter', () => {
      grid.style.transform = 'scale(1.1)'
      outer.style.zIndex = '100'
    })
    outer.addEventListener('mouseleave', () => {
      grid.style.transform = 'scale(1)'
      outer.style.zIndex = '20'
    })
  }

  return outer
}
