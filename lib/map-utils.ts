import { getProjectColorByBeneficiaries, COLOR_MAMMAL } from './colors'
import type { ProjectData, Species } from './types'
import type { CrewRegionData } from './crew-data'
import { isMilitaryInterest as _isMilitaryInterest, isHighEnvRisk as _isHighEnvRisk, isSuspiciousBasic, buildAnmVerifyUrl, buildClaimReportMailtoUrl, type SpeculatorIndexEntry } from './observatory-analysis'

export type { Species }

export const GROUP_COLORS: Record<string, string> = {
  Mammal: COLOR_MAMMAL,
  Bird: '#D97706',
  Amphibian: '#5A8F3C',
  Reptile: '#7C3AED',
  Fish: '#2563EB',
  Plant: '#15803D',
  Invertebrate: '#DB2777'
}

export interface PopupTranslations {
  projectGrantee: string
  directBeneficiaries: string
  indirectBeneficiaries: string
  location: string
  status: string
  unknownLocation: string
}

export interface SpeciesPopupTranslations {
  scientificName: string
  threatTypes: string
  population: string
  habitat: string
  region: string
  ecosystem: string
  groupLabels?: Record<string, string>
}

export function buildProjectPopupHTML(project: ProjectData, translations?: PopupTranslations): string {
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  const t = translations || {
    projectGrantee: 'Project Grantee',
    directBeneficiaries: 'Direct Beneficiaries',
    indirectBeneficiaries: 'Indirect Beneficiaries',
    location: 'Location',
    status: 'Status',
    unknownLocation: 'Unknown location'
  }
  const showDirect = project.direct_beneficiaries > 0
  const showIndirect = project.indirect_beneficiaries > 0
  const showMetrics = showDirect || showIndirect

  const directMetricHTML = showDirect ? `
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${t.directBeneficiaries}</span>
            </div>
            <span class="project-metric-value direct">${project.direct_beneficiaries.toLocaleString()}</span>
          </div>` : ''

  const indirectMetricHTML = showIndirect ? `
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>${t.indirectBeneficiaries}</span>
            </div>
            <span class="project-metric-value indirect">${project.indirect_beneficiaries.toLocaleString()}</span>
          </div>` : ''

  const metricsBlock = showMetrics
    ? `<div class="project-divider"></div>
        <div class="project-metrics">${directMetricHTML}${indirectMetricHTML}
        </div>`
    : ''

  return `
    <div class="project-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere; overflow: hidden;">
      <div class="project-popup-header">
        <div class="project-corner-accent top-left"></div>
        <div class="project-corner-accent top-right"></div>
        <div class="project-header-content">
          <div class="project-status-bar">
            <span class="project-badge">${t.projectGrantee}</span>
            <span class="project-indicator" style="background: ${color}"></span>
          </div>
          <h3 class="project-title" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(project.project_title)}</h3>
        </div>
        <div class="project-header-line"></div>
      </div>
      <div class="project-popup-body">
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.location}</span>
            <span class="project-stat-value" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(project.country_province || t.unknownLocation)}</span>
          </div>
        </div>
        ${metricsBlock}
      </div>
      <div class="project-popup-footer">
        <div class="project-footer-glow" style="background: ${color}"></div>
      </div>
    </div>
  `
}

export interface CrewPopupTranslations {
  activeCrews: string
  inactiveCrews: string
  totalMembers: string
  countries: string
  region: string
  growthSince2022: string
}

export function buildCrewPopupHTML(crew: CrewRegionData, translations?: CrewPopupTranslations): string {
  const t = translations || {
    activeCrews: 'Active Crews',
    inactiveCrews: 'Inactive Crews',
    totalMembers: 'Total Members',
    countries: 'Countries',
    region: 'Region',
    growthSince2022: 'Growth since 2022',
  }
  const color = crew.activeCrews > 20 ? '#22c55e' : crew.activeCrews > 5 ? '#3b82f6' : '#a855f7'
  const history2022 = crew.history.find(h => h.year === 2022)
  const growth = history2022 && history2022.activeCrews > 0
    ? Math.round(((crew.activeCrews - history2022.activeCrews) / history2022.activeCrews) * 100)
    : null

  return `
    <div class="project-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere; overflow: hidden;">
      <div class="project-popup-header">
        <div class="project-corner-accent top-left"></div>
        <div class="project-corner-accent top-right"></div>
        <div class="project-header-content">
          <div class="project-status-bar">
            <span class="project-badge">Earth Guardians Crew</span>
            <span class="project-indicator" style="background: ${color}"></span>
          </div>
          <h3 class="project-title" style="word-wrap: break-word; white-space: normal; overflow-wrap: anywhere;">${escapeHtml(crew.region)}</h3>
        </div>
        <div class="project-header-line"></div>
      </div>
      <div class="project-popup-body">
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.activeCrews}</span>
            <span class="project-stat-value">${crew.activeCrews}</span>
          </div>
        </div>
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.totalMembers}</span>
            <span class="project-stat-value">${crew.totalMembers.toLocaleString()}</span>
          </div>
        </div>
        <div class="project-stat-row">
          <div class="project-stat-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="project-stat-content">
            <span class="project-stat-label">${t.countries}</span>
            <span class="project-stat-value">${crew.countries}</span>
          </div>
        </div>
        ${growth !== null ? `
        <div class="project-divider"></div>
        <div class="project-metrics">
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
              <span>${t.growthSince2022}</span>
            </div>
            <span class="project-metric-value direct">+${growth}%</span>
          </div>
        </div>` : ''}
      </div>
      <div class="project-popup-footer">
        <div class="project-footer-glow" style="background: ${color}"></div>
      </div>
    </div>
  `
}

export function buildSpeciesPopupHTML(species: Species, translations?: SpeciesPopupTranslations, baseURL?: string): string {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64032'
  const endangerment = species.endangerment ?? 'Unknown'
  const endangermentColor = endangerment.toLowerCase().includes('critical') ? '#dc2626' : 
                            endangerment.toLowerCase().includes('endangered') ? '#ea580c' : '#d97706'
  const t = translations || {
    scientificName: 'Scientific Name',
    threatTypes: 'Threat Types',
    population: 'Population',
    habitat: 'Habitat',
    region: 'Region',
    ecosystem: 'Ecosystem'
  }
  const groupLabel = t.groupLabels?.[species.taxonomicGroup] ?? species.taxonomicGroup
  
  let imageHTML = ''
  if (species.imageUrl) {
    let thumbUrl = species.imageUrl
    const isLocal = !species.imageUrl.startsWith('http://') && !species.imageUrl.startsWith('https://')
    if (isLocal) {
      const filename = species.imageUrl.replace(/^\//, '')
      const basename = filename.split('/').pop() || filename
      const name = basename.replace(/\.[^.]+$/, '')
      const prefix = baseURL && baseURL !== '/' ? baseURL : '/'
      thumbUrl = `${prefix}images/species/thumb/${name}_full.webp`
    } else if (species.imageUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
      const filename = species.imageUrl.split('/Special:FilePath/')[1]
      if (filename) {
        thumbUrl = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=560`
      }
    } else if (species.imageUrl.includes('upload.wikimedia.org')) {
      const separator = species.imageUrl.includes('?') ? '&' : '?'
      thumbUrl = `${species.imageUrl}${separator}width=560`
    }
    
    imageHTML = `
      <div class="species-image-frame" style="border-color: ${color}55;">
        <img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(species.commonName)}" class="species-image" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'" />
      </div>
    `
  }

  return `
    <div class="species-popup-wrapper" style="word-wrap: break-word; white-space: normal; overflow: hidden;">
      ${imageHTML}
      <div class="species-header" style="border-bottom-color: ${color}40;">
        <div class="species-header-bg" style="background: ${color}08;"></div>
        <div class="species-ornament top">
          <svg width="60" height="12" viewBox="0 0 60 12">
            <path d="M0 6 L15 6 L20 2 L25 10 L30 4 L35 8 L40 6 L60 6" stroke="${color}" fill="none" stroke-width="1" opacity="0.6"/>
          </svg>
        </div>
        <div class="species-badges">
          <span class="species-category-badge" style="background: ${color};">${escapeHtml(species.category)}</span>
          <span class="species-group-badge" style="border-color: ${color}; color: ${color};">${escapeHtml(groupLabel)}</span>
        </div>
        <h3 class="species-common-name" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.commonName)}</h3>
        <p class="species-scientific-name" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.scientificName)}</p>
        <div class="species-ornament bottom">
          <svg width="40" height="8" viewBox="0 0 40 8">
            <circle cx="4" cy="4" r="2" fill="${color}" opacity="0.8"/>
            <circle cx="12" cy="4" r="1.5" fill="${color}" opacity="0.5"/>
            <circle cx="20" cy="4" r="2" fill="${color}" opacity="0.8"/>
            <circle cx="28" cy="4" r="1.5" fill="${color}" opacity="0.5"/>
            <circle cx="36" cy="4" r="2" fill="${color}" opacity="0.8"/>
          </svg>
        </div>
      </div>
      <div class="species-body">
        <p class="species-description" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.description ?? '')}</p>
        <div class="species-details">
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.threatTypes}</span>
              <span class="species-detail-value">${species.threatTypes.map(t => `<span class="species-threat-tag">${escapeHtml(t)}</span>`).join('')}</span>
            </div>
          </div>
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.region}</span>
              <span class="species-detail-value" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.region)}</span>
            </div>
          </div>
          <div class="species-detail-row">
            <div class="species-detail-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.ecosystem}</span>
              <span class="species-detail-value" style="word-wrap: break-word; white-space: normal;">${escapeHtml(species.ecosystem)}</span>
            </div>
          </div>
          <div class="species-detail-row endangerment">
            <div class="species-detail-icon" style="color: ${endangermentColor};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="species-detail-content">
              <span class="species-detail-label">${t.habitat}</span>
              <span class="species-detail-value endangerment-value" style="color: ${endangermentColor};">${escapeHtml(species.endangerment ?? 'Unknown')}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="species-footer">
        <div class="species-footer-line" style="background: rgba(128, 128, 128, 0.3);"></div>
      </div>
    </div>
  `
}

export function isValidCoordinate(lat: number | undefined | null, lng: number | undefined | null): boolean {
  if (lat == null || lng == null) return false
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && isFinite(lat) && isFinite(lng)
}

export function getGroupColor(taxonomicGroup: string): string {
  return GROUP_COLORS[taxonomicGroup] ?? '#B64032'
}

export function generateCurvedPath(from: [number, number], to: [number, number]): [number, number] {
  const midX = (from[0] + to[0]) / 2
  const midY = (from[1] + to[1]) / 2
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const perpX = -dy
  const perpY = dx
  const length = Math.sqrt(perpX * perpX + perpY * perpY) || 1
  const normalizedPerpX = perpX / length
  const normalizedPerpY = perpY / length
  const distance = Math.sqrt(dx * dx + dy * dy)
  const seed = (from[0] * 1000 + from[1] + to[0] * 100 + to[1]) % 1000 / 1000
  const randomFactor = 0.1 + seed * 0.1
  const distanceFactor = Math.min(1, distance / 50)
  const curveFactor = Math.min(distance * randomFactor * distanceFactor, 25)
  return [midX + normalizedPerpX * curveFactor, midY + normalizedPerpY * curveFactor]
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Rare Earth popup constants ──
export const RARE_EARTH_CATEGORIES: Record<string, { label: string; color: string }> = {
  direct_ree: { label: 'Terras Raras Diretas', color: '#e74c3c' },
  carbonatite_associated: { label: 'Carbonatito/Alcalino', color: '#f39c12' },
  pegmatite_associated: { label: 'Pegmatito', color: '#27ae60' },
  heavy_mineral_associated: { label: 'Minerais Pesados', color: '#2980b9' },
  phosphate_associated: { label: 'Fosfato', color: '#8e44ad' },
  strategic_associated: { label: 'Estratégicos', color: '#e91e63' },
}

export const RARE_EARTH_PHASES: Record<string, { label: string; shortLabel: string; color: string }> = {
  REQUERIMENTO: { label: 'Requerimento', shortLabel: 'REQ', color: '#9ca3af' },
  'REQUERIMENTO DE PESQUISA': { label: 'Requerimento de Pesquisa', shortLabel: 'REQ', color: '#9ca3af' },
  'AUTORIZAÇÃO DE PESQUISA': { label: 'Autorização de Pesquisa', shortLabel: 'AUTH', color: '#f59e0b' },
  DISPONIBILIDADE: { label: 'Disponibilidade', shortLabel: 'AVAIL', color: '#ea580c' },
  LICENCIAMENTO: { label: 'Licenciamento', shortLabel: 'LICEN', color: '#dc2626' },
  CONCESSÃO: { label: 'Concessão', shortLabel: 'CONC', color: '#b91c1c' },
  LAVRA: { label: 'Lavra', shortLabel: 'LAVRA', color: '#7f1d1d' },
}

export function getPhaseShortLabel(phase: string): string {
  return RARE_EARTH_PHASES[phase]?.shortLabel ?? phase?.slice(0, 5) ?? '?'
}

export function getPhaseColor(phase: string): string {
  return RARE_EARTH_PHASES[phase]?.color ?? '#666'
}

export function getCategoryColor(cat: string): string {
  return RARE_EARTH_CATEGORIES[cat]?.color ?? '#666'
}

export const isMilitaryInterest = _isMilitaryInterest
export const isHighEnvRisk = _isHighEnvRisk
export function isSuspicious(props: Record<string, any>, speculator?: SpeculatorIndexEntry | null): boolean {
  return isSuspiciousBasic(props, speculator ?? null)
}

export function buildRareEarthPopupHTML(props: Record<string, any>): string {
  const cat = RARE_EARTH_CATEGORIES[props.c] ?? { label: props.c || 'Unknown', color: '#666' }
  const dangerColor = (props.ds ?? 5) >= 8 ? '#e74c3c' : (props.ds ?? 5) >= 6 ? '#f39c12' : '#27ae60'
  const areaHa = Number(props.a ?? 0)
  const area = areaHa >= 10000 ? `${(areaHa / 1000).toFixed(0)}K ha` : `${areaHa.toLocaleString()} ha`

  const milFlag = props.mil !== false && isMilitaryInterest(props.u || '')
  const envFlag = props.env !== false && isHighEnvRisk(props)
  const susFlag = props.sus !== false && isSuspicious(props)

  const flagsHTML = [milFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(231,76,60,0.2);color:#e74c3c">MIL</span>' : '',
    envFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(39,174,96,0.2);color:#27ae60">ENV</span>' : '',
    susFlag ? '<span style="font-size:7px;padding:1px 5px;border-radius:2px;font-weight:700;background:rgba(142,68,173,0.2);color:#8e44ad">SUS</span>' : '',
  ].filter(Boolean).join('')

  const anmUrl = buildAnmVerifyUrl(props.p, props.ano ?? props.y)
  const mailtoUrl = buildClaimReportMailtoUrl({
    processo: props.p,
    nome: props.n,
    lat: props.la,
    lng: props.lo,
    uf: props.u,
    subs: props.s,
  })

  const anmLink = anmUrl
    ? `<a href="${escapeHtml(anmUrl)}" target="_blank" rel="noopener" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:700;padding:5px 8px;border-radius:4px;text-decoration:none;letter-spacing:0.04em;border:1px solid rgba(52,152,219,0.3);background:rgba(52,152,219,0.10);color:#5dade2">↗ Verify on ANM</a>`
    : ''
  const reportLink = `<a href="${escapeHtml(mailtoUrl)}" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:700;padding:5px 8px;border-radius:4px;text-decoration:none;letter-spacing:0.04em;border:1px solid rgba(231,76,60,0.25);background:rgba(231,76,60,0.08);color:#e74c3c">⚑ Report issue</a>`

  const lastEvent = props.ev
  let lastEventHTML = ''
  if (lastEvent) {
    const refYear = Number(props.ano ?? props.y ?? 0)
    const currentYear = new Date().getFullYear()
    const ageYears = refYear ? Math.max(0, currentYear - refYear) : 99
    const evColor = ageYears < 1 ? '#27ae60' : ageYears <= 3 ? '#f39c12' : '#e74c3c'
    const evLabel = ageYears < 1 ? 'Recent' : ageYears <= 3 ? 'Active' : 'Stale'
    lastEventHTML = `<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:2px">Last event</div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:9.5px;color:#ccc;line-height:1.4;flex:1;word-wrap:break-word">${escapeHtml(lastEvent)}</span>
        <span style="font-size:7.5px;padding:1px 6px;border-radius:2px;font-weight:700;background:${evColor}22;color:${evColor}">${evLabel}</span>
      </div>
    </div>`
  }

  const overlaps: Array<{ name: string; kind: string; distance_km: number }> = Array.isArray(props.ov) ? props.ov : []
  let overlapHTML = ''
  if (overlaps.length) {
    const items = overlaps.slice(0, 3).map(o =>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;padding:1px 5px;border-radius:2px;background:rgba(231,76,60,0.18);color:#ff6b6b;font-weight:600;margin:1px">⚠ ${escapeHtml(o.name)}${o.distance_km ? ` <span style="opacity:0.7;font-weight:400">· ${o.distance_km}km</span>` : ''}</span>`
    ).join('')
    const more = overlaps.length > 3 ? `<span style="font-size:8px;color:#888;margin-left:4px">+${overlaps.length - 3} more</span>` : ''
    overlapHTML = `<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
      <div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:3px">Overlaps</div>
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:0">${items}${more}</div>
    </div>`
  }

  return `
    <div class="ree-popup-wrapper" style="word-wrap:break-word;white-space:normal;overflow:hidden;min-width:250px;position:relative">
      <!-- Corner accents -->
      <div style="position:absolute;top:8px;left:8px;width:10px;height:10px;border-top:2px solid ${cat.color}60;border-left:2px solid ${cat.color}60;pointer-events:none;z-index:1" />
      <div style="position:absolute;top:8px;right:8px;width:10px;height:10px;border-top:2px solid ${cat.color}60;border-right:2px solid ${cat.color}60;pointer-events:none;z-index:1" />

      <!-- Header -->
      <div style="padding:14px 14px 10px;position:relative">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${cat.color};color:#fff;letter-spacing:0.06em;text-transform:uppercase">${escapeHtml(cat.label)}</span>
          <span style="display:inline-flex;align-items:center;gap:3px;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;background:${dangerColor};color:#fff">${(props.ds ?? 5).toFixed(1)} Danger</span>
          ${props.net ? `<span style="font-size:7px;padding:2px 6px;border-radius:2px;font-weight:600;background:rgba(41,128,185,0.2);color:#5dade2;letter-spacing:0.03em">${escapeHtml(props.net)}</span>` : ''}
          ${flagsHTML}
        </div>
        <h3 style="margin:0;font-size:13px;font-weight:700;color:#e8e8e8;line-height:1.35;letter-spacing:0.01em;word-wrap:break-word">${escapeHtml(props.n || 'Unknown')}</h3>
        <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px;font-style:italic">${escapeHtml(props.s || '—')}</div>
      </div>

      <!-- Divider -->
      <div style="height:1px;background:linear-gradient(90deg,transparent,${cat.color}30,transparent);margin:0 12px" />

      <!-- Body -->
      <div style="padding:10px 14px 12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 14px">
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Process</div><div style="font-size:10.5px;color:#ccc;font-weight:500;word-wrap:break-word">${escapeHtml(props.p || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Phase</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${escapeHtml(props.f || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">UF</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${escapeHtml(props.u || '—')}</div></div>
          <div><div style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Area</div><div style="font-size:10.5px;color:#ccc;font-weight:500">${area}</div></div>
        </div>
        <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05)">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:7.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Danger Level</span>
            <div style="flex:1;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${Math.min(100, (props.ds ?? 5) * 10)}%;background:${dangerColor};border-radius:2px;box-shadow:0 0 4px ${dangerColor}"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${dangerColor};min-width:24px;text-align:right">${(props.ds ?? 5).toFixed(1)}</span>
          </div>
        </div>
        ${lastEventHTML}
        ${overlapHTML}
      </div>

      <!-- Footer actions -->
      <div style="display:flex;gap:6px;padding:8px 14px 12px;border-top:1px solid rgba(255,255,255,0.06)">
        ${anmLink}
        ${reportLink}
      </div>

      <!-- Footer glow bar -->
      <div style="height:2px;background:linear-gradient(90deg,transparent 0%,${cat.color} 50%,transparent 100%);opacity:0.5;box-shadow:0 0 6px ${cat.color}40" />
    </div>`
}

interface BlobPoint {
  x: number
  y: number
}

export function computeClusterBlobPath(centers: BlobPoint[], miniRadius: number, padding: number): string {
  if (centers.length === 0) return ''
  const R = miniRadius + padding

  // Single circle
  if (centers.length === 1) {
    const c = centers[0]
    return `M${c.x - R},${c.y}A${R},${R},0,1,1,${c.x + R},${c.y}A${R},${R},0,1,1,${c.x - R},${c.y}Z`
  }

  // Centroid for sorting
  const cx = centers.reduce((s, c) => s + c.x, 0) / centers.length
  const cy = centers.reduce((s, c) => s + c.y, 0) / centers.length

  // Sort by angle around centroid = convex hull order
  const sorted = [...centers].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx))

  // 2 points → pill/oval
  if (sorted.length === 2) {
    const p0 = sorted[0], p1 = sorted[1]
    const dx = p1.x - p0.x, dy = p1.y - p0.y
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = -dy / d * R, ny = dx / d * R
    return `M${p0.x + nx},${p0.y + ny}A${R},${R},0,0,1,${p0.x - nx},${p0.y - ny}L${p1.x - nx},${p1.y - ny}A${R},${R},0,0,1,${p1.x + nx},${p1.y + ny}Z`
  }

  // 3+ points → expand outward from centroid, smooth Catmull-Rom curve
  const expanded = sorted.map(p => {
    const dx = p.x - cx, dy = p.y - cy
    const d = Math.sqrt(dx * dx + dy * dy) || 1
    return { x: p.x + (dx / d) * R, y: p.y + (dy / d) * R }
  })

  const tension = 0.35
  const n = expanded.length
  let path = ''
  for (let i = 0; i < n; i++) {
    const p = expanded[i]
    const p1 = expanded[(i + 1) % n]
    const p_1 = expanded[(i - 1 + n) % n]
    const cp1x = p.x + (p1.x - p_1.x) * tension
    const cp1y = p.y + (p1.y - p_1.y) * tension
    const cp2x = p1.x - (p.x - p_1.x) * tension
    const cp2y = p1.y - (p.y - p_1.y) * tension
    if (i === 0) path += `M${p.x},${p.y}`
    path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`
  }
  path += 'Z'
  return path
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}
