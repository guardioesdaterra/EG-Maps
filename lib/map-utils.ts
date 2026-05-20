import { getProjectColorByBeneficiaries } from './colors'
import type { ProjectData } from './types'

export interface Species {
  id: string
  commonName: string
  scientificName: string
  category: string
  taxonomicGroup: string
  region: string
  ecosystem: string
  lat: number
  lng: number
  imageUrl: string
  imageCredit: string
  description: string
  endangerment: string
  ecosystemNeeds: string
  actions: string
  threatTypes: string[]
  iucnUrl: string
  range: {
    type: string
    coordinates: number[][][]
  }
  content: Record<string, Record<string, string>>
}

export const GROUP_COLORS: Record<string, string> = {
  Mammal: '#B64032',
  Bird: '#D97706',
  Amphibian: '#5A8F3C',
  Reptile: '#7C3AED',
  Fish: '#2563EB',
  Plant: '#15803D',
  Invertebrate: '#DB2777'
}

export function buildProjectPopupHTML(project: ProjectData): string {
  const color = getProjectColorByBeneficiaries(project.direct_beneficiaries, project.indirect_beneficiaries)
  return `
    <div class="cyber-popup-content" data-type="project">
      <div style="border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-weight: bold; font-size: 1.125rem; background: linear-gradient(to right, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
          ${escapeHtml(project.project_title)}
        </h3>
        <span style="display: inline-block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: white; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">
          PROJECT GRANTEE
        </span>
      </div>
      <div style="margin-top: 12px; font-size: 0.875rem; color: #d1d5db;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span>&#x1F4CD;</span><span>${escapeHtml(project.country_province || 'Unknown location')}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span>&#x1F465;</span><span>Direct Beneficiaries: ${project.direct_beneficiaries.toLocaleString()}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>&#x1F465;</span><span>Indirect Beneficiaries: ${project.indirect_beneficiaries.toLocaleString()}</span>
        </div>
      </div>
    </div>
  `
}

export function buildSpeciesPopupHTML(species: Species): string {
  const color = GROUP_COLORS[species.taxonomicGroup] ?? '#B64032'
  return `
    <div class="cyber-popup-content cyber-popup-species" data-type="species">
      <div style="border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 8px; margin-bottom: 12px;">
        <h3 style="font-weight: bold; font-size: 1.125rem; background: linear-gradient(to right, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px;">
          ${escapeHtml(species.commonName)}
        </h3>
        <p style="font-style: italic; font-size: 0.875rem; color: #a3a3a3; margin-bottom: 4px;">${escapeHtml(species.scientificName)}</p>
        <span style="display: inline-block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: white; background-color: ${color}; padding: 2px 8px; border-radius: 9999px;">
          ${escapeHtml(species.category)}
        </span>
        <span style="display: inline-block; margin-left: 6px; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; color: ${color}; padding: 2px 8px; border-radius: 9999px; border: 1px solid ${color};">
          ${escapeHtml(species.taxonomicGroup)}
        </span>
      </div>
      <div style="margin-top: 12px; font-size: 0.875rem; color: #d1d5db;">
        <p style="margin-bottom: 8px; line-height: 1.5; max-height: 120px; overflow-y: auto;">${escapeHtml(species.description)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #22d3ee;">Region:</strong> ${escapeHtml(species.region)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #22d3ee;">Ecosystem:</strong> ${escapeHtml(species.ecosystem)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #22d3ee;">Threats:</strong> ${species.threatTypes.map(escapeHtml).join(', ')}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #ef4444;">Why endangered:</strong> ${escapeHtml(species.endangerment)}</p>
        <p style="margin-bottom: 8px;"><strong style="color: #10b981;">Ecosystem needs:</strong> ${escapeHtml(species.ecosystemNeeds)}</p>
        <p><strong style="color: #f59e0b;">How to help:</strong> ${escapeHtml(species.actions)}</p>
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
