import { getProjectColorByBeneficiaries, COLOR_MAMMAL } from './colors'
import type { ProjectData, Species } from './types'

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
        <div class="project-divider"></div>
        <div class="project-metrics">
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>${t.directBeneficiaries}</span>
            </div>
            <span class="project-metric-value direct">${project.direct_beneficiaries.toLocaleString()}</span>
          </div>
          <div class="project-metric">
            <div class="project-metric-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>${t.indirectBeneficiaries}</span>
            </div>
            <span class="project-metric-value indirect">${project.indirect_beneficiaries.toLocaleString()}</span>
          </div>
        </div>
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

export function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(text))
  return div.innerHTML
}
