/**
 * lib/map-export.ts
 * @why Map export utilities — canvas-to-image conversion, legend/title overlays, GeoJSON export
 * @functions exportMapToImage, buildMapExportCollection, downloadMapGeoJSON
 * @interfaces ExportOptions, ExportLegendItem
 * @deps file-saver (saveAs)
 * @connections components/observatory/ExportModal.vue, composables/useMapBase.ts
 */
import { saveAs } from 'file-saver'
import type { ProjectData, Species } from '@/lib/types'
import type { CrewLocation, CrewRegionData } from '@/lib/crew-data'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'

export interface ExportLegendItem {
  label: string
  color: string
}

export interface ExportOptions {
  format: 'png' | 'pdf'
  resolution: '1x' | '2x'
  paperSize?: 'a4' | 'letter'
  includeLegend: boolean
  includeTitle: boolean
  /** Optional dataset-specific items; a generic data-layer item is used when omitted. */
  legendItems?: ExportLegendItem[]
  legendTitle?: string
}

export async function exportMapToImage(
  mapContainer: HTMLElement,
  options: ExportOptions,
  metadata?: { title?: string; filterSummary?: string; date?: string },
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const scale = options.resolution === '2x' ? 2 : 1
  const captured = await html2canvas(mapContainer, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#09090b',
    logging: false,
  })
  const canvasOptions = options.format === 'pdf' ? { ...options, includeTitle: false } : options
  const canvas = decorateExportCanvas(captured, canvasOptions, metadata)

  if (options.format === 'png') {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Could not encode map image')
    saveAs(blob, buildFilename('png', metadata))
    return
  }

  const { jsPDF } = await import('jspdf')
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({ orientation, unit: 'mm', format: options.paperSize || 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const title = metadata?.title || 'EG-Maps'
  const date = metadata?.date || new Date().toISOString().split('T')[0]
  const imgTop = options.includeTitle ? 32 : 10
  if (options.includeTitle) {
    pdf.setFontSize(14)
    pdf.setTextColor(30, 30, 30)
    pdf.text(title, 15, 15)
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.text(`Generated: ${date}`, 15, 22)
    if (metadata?.filterSummary) {
      pdf.setFontSize(8)
      pdf.text(`Filters: ${metadata.filterSummary}`, 15, 28)
    }
  }

  const imgHeight = pageHeight - imgTop - 10
  const imgWidth = Math.min(pageWidth - 20, (canvas.width / canvas.height) * imgHeight)
  const imgX = (pageWidth - imgWidth) / 2
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgTop, imgWidth, imgHeight)
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Earth Guardians', 15, pageHeight - 5)
  pdf.text('For research and advocacy purposes.', pageWidth - 15, pageHeight - 5, { align: 'right' })
  pdf.save(buildFilename('pdf', metadata))
}

function decorateExportCanvas(
  source: HTMLCanvasElement,
  options: ExportOptions,
  metadata?: { title?: string; filterSummary?: string; date?: string },
): HTMLCanvasElement {
  if (!options.includeLegend && !options.includeTitle) return source
  const context = source.getContext('2d')
  if (!context) return source
  const ratio = options.resolution === '2x' ? 2 : 1
  const pad = 14 * ratio
  const textSize = 13 * ratio
  const lineHeight = 19 * ratio
  const title = metadata?.title || 'EG-Maps'

  if (options.includeTitle) {
    const titleWidth = Math.min(source.width - 2 * pad, 420 * ratio)
    const titleHeight = (metadata?.filterSummary ? 58 : 40) * ratio
    context.fillStyle = 'rgba(0, 0, 0, 0.78)'
    context.fillRect(pad, pad, titleWidth, titleHeight)
    context.fillStyle = '#ffffff'
    context.font = `600 ${textSize}px system-ui, sans-serif`
    context.fillText(title.slice(0, 80), pad + 10 * ratio, pad + 18 * ratio, titleWidth - 20 * ratio)
    context.fillStyle = '#cbd5e1'
    context.font = `${10 * ratio}px system-ui, sans-serif`
    const date = metadata?.date || new Date().toISOString().slice(0, 10)
    context.fillText(date, pad + 10 * ratio, pad + 33 * ratio)
    if (metadata?.filterSummary) {
      context.fillText(metadata.filterSummary.slice(0, 120), pad + 10 * ratio, pad + 48 * ratio, titleWidth - 20 * ratio)
    }
  }

  if (options.includeLegend) {
    const items = options.legendItems?.length ? options.legendItems : [{ label: 'Map data', color: '#22d3ee' }]
    const displayItems = items.slice(0, 12)
    const labelWidth = Math.max(1, Math.min(280 * ratio, source.width - 64 * ratio))
    const legendWidth = labelWidth + 42 * ratio
    const legendHeight = 30 * ratio + displayItems.length * lineHeight + (items.length > displayItems.length ? lineHeight : 0)
    const x = Math.max(pad, source.width - legendWidth - pad)
    const y = Math.max(pad, source.height - legendHeight - pad)
    context.fillStyle = 'rgba(0, 0, 0, 0.82)'
    context.fillRect(x, y, legendWidth, legendHeight)
    context.fillStyle = '#ffffff'
    context.font = `700 ${textSize}px system-ui, sans-serif`
    context.fillText(options.legendTitle || 'Legend', x + 10 * ratio, y + 19 * ratio)
    context.font = `${11 * ratio}px system-ui, sans-serif`
    displayItems.forEach((item, index) => {
      const itemY = y + 37 * ratio + index * lineHeight
      context.fillStyle = isSafeCssColor(item.color) ? item.color : '#94a3b8'
      context.beginPath()
      context.arc(x + 17 * ratio, itemY - 4 * ratio, 5 * ratio, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#e2e8f0'
      context.fillText(item.label.slice(0, 80), x + 30 * ratio, itemY, labelWidth)
    })
    if (items.length > displayItems.length) {
      context.fillStyle = '#cbd5e1'
      context.fillText(`+${items.length - displayItems.length} more`, x + 30 * ratio, y + 37 * ratio + displayItems.length * lineHeight, labelWidth)
    }
  }
  return source
}

function isSafeCssColor(color: string): boolean {
  return /^(#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{1,20})$/i.test(color)
}

function buildFilename(ext: string, metadata?: { title?: string; filterSummary?: string }): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const title = (metadata?.title || 'EG-Maps').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
  const filter = metadata?.filterSummary
    ? '-' + metadata.filterSummary.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 30)
    : ''
  return `${title || 'EG-Maps'}-${date}${filter}.${ext}`
}

export type MapExportDataset = 'project-grants' | 'endangered-species' | 'active-crews' | 'vulcan-observatory'

export interface MapExportInput {
  dataset: MapExportDataset
  projects?: ProjectData[]
  species?: Array<Species | SpeciesIndexItem>
  crews?: CrewRegionData[]
  crewLocations?: CrewLocation[]
  observatory?: GeoJSON.FeatureCollection | null
}

function validCoordinates(longitude: unknown, latitude: unknown): longitude is number {
  return typeof longitude === 'number' && typeof latitude === 'number' &&
    Number.isFinite(longitude) && Number.isFinite(latitude) &&
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
}

function pointFeature(longitude: number, latitude: number, properties: Record<string, unknown>): GeoJSON.Feature<GeoJSON.Point> {
  return { type: 'Feature', geometry: { type: 'Point', coordinates: [longitude, latitude] }, properties }
}

/** Converts only the currently visible map data into a portable GeoJSON collection. */
export function buildMapExportCollection(input: MapExportInput): GeoJSON.FeatureCollection {
  if (input.dataset === 'vulcan-observatory') {
    return {
      type: 'FeatureCollection',
      features: (input.observatory?.features ?? []).map(feature => ({ ...feature, properties: { ...(feature.properties ?? {}) } })),
    }
  }
  if (input.dataset === 'project-grants') {
    return {
      type: 'FeatureCollection',
      features: (input.projects ?? []).filter(p => validCoordinates(p.longitude, p.latitude)).map(p => pointFeature(p.longitude, p.latitude, {
        title: p.project_title,
        location: p.country_province,
        directBeneficiaries: p.direct_beneficiaries,
        indirectBeneficiaries: p.indirect_beneficiaries,
      })),
    }
  }
  if (input.dataset === 'endangered-species') {
    return {
      type: 'FeatureCollection',
      features: (input.species ?? []).filter(s => validCoordinates(s.lng, s.lat)).map(s => pointFeature(s.lng, s.lat, {
        id: s.id,
        commonName: s.commonName,
        scientificName: s.scientificName,
        taxonomicGroup: s.taxonomicGroup,
        category: s.category,
        ...(s.region ? { region: s.region } : {}),
        ...(s.ecosystem ? { ecosystem: s.ecosystem } : {}),
        ...(s.threatTypes ? { threatTypes: s.threatTypes } : {}),
        ...('endangerment' in s && s.endangerment ? { endangerment: s.endangerment } : {}),
      })),
    }
  }

  const features: GeoJSON.Feature[] = []
  for (const location of input.crewLocations ?? []) {
    if (!validCoordinates(location.lng, location.lat)) continue
    features.push(pointFeature(location.lng, location.lat, {
      featureType: 'crew-location',
      name: location.name,
      city: location.city,
      state: location.state,
      country: location.country,
      region: location.region,
      status: location.status,
    }))
  }
  for (const crew of input.crews ?? []) {
    if (!validCoordinates(crew.longitude, crew.latitude)) continue
    features.push(pointFeature(crew.longitude, crew.latitude, {
      featureType: 'crew-region',
      id: crew.id,
      region: crew.region,
      activeCrews: crew.activeCrews,
      inactiveCrews: crew.inactiveCrews,
      totalMembers: crew.totalMembers,
      countries: crew.countries,
    }))
  }
  return { type: 'FeatureCollection', features }
}

export function serializeMapExport(collection: GeoJSON.FeatureCollection): string {
  return JSON.stringify(collection, null, 2)
}

export function mapExportFilename(dataset: MapExportDataset, date = new Date()): string {
  return `eg-maps-${dataset}-${date.toISOString().slice(0, 10)}.geojson`
}

export function downloadMapGeoJSON(collection: GeoJSON.FeatureCollection, filename: string): void {
  const unsafePathChars = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])
  const safeName = Array.from(filename, char => unsafePathChars.has(char) || char.charCodeAt(0) < 32 ? '-' : char).join('').replace(/\.\.+/g, '.')
  saveAs(new Blob([serializeMapExport(collection)], { type: 'application/geo+json;charset=utf-8' }), safeName.endsWith('.geojson') ? safeName : `${safeName}.geojson`)
}
