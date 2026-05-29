import { ENTERPRISES, CORPORATE_CONNECTIONS } from '@/lib/enterprise-data'
import { GEOPOLITICAL_TIMELINE, MINING_PHASE_TIMELINE } from '@/lib/observatory-timeline'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'

export interface DownloadableDataset {
  id: string
  label: string
  description: string
  filename: string
  format: 'json' | 'csv' | 'geojson'
  getData: () => any
}

export const DOWNLOADABLE_DATASETS: DownloadableDataset[] = [
  {
    id: 'enterprises',
    label: 'Empresas (Enterprises)',
    description: '16 mining & REE companies with HQ locations, shareholders, subsidiaries',
    filename: 'enterprises',
    format: 'json',
    getData: () => ENTERPRISES,
  },
  {
    id: 'corporate-connections',
    label: 'Rede Corporativa (Corporate Connections)',
    description: 'Shareholdings, subsidiaries, JVs, board overlaps between enterprises',
    filename: 'corporate-connections',
    format: 'json',
    getData: () => CORPORATE_CONNECTIONS,
  },
  {
    id: 'timeline',
    label: 'Linha do Tempo Geopolítica',
    description: '15 key geopolitical events from 2010 to 2026',
    filename: 'geopolitical-timeline',
    format: 'json',
    getData: () => GEOPOLITICAL_TIMELINE,
  },
  {
    id: 'mining-phases',
    label: 'Fases de Mineração',
    description: '5 mining phases with descriptions, duration, risk levels',
    filename: 'mining-phases',
    format: 'json',
    getData: () => MINING_PHASE_TIMELINE,
  },
  {
    id: 'categories',
    label: 'Categorias de Terras Raras',
    description: '6 REE categories with labels and colors',
    filename: 'rare-earth-categories',
    format: 'json',
    getData: () => RARE_EARTH_CATEGORIES,
  },
  {
    id: 'enterprises-geojson',
    label: 'Empresas GeoJSON',
    description: 'Enterprise headquarters as GeoJSON points for map layers',
    filename: 'enterprises',
    format: 'geojson',
    getData: () => ({
      type: 'FeatureCollection',
      features: ENTERPRISES.filter(e => e.lat !== 0).map(e => ({
        type: 'Feature',
        properties: {
          name: e.name,
          ticker: e.ticker ?? undefined,
          country: e.country,
          city: e.city,
          sector: e.sector,
          description: e.description,
          shareholders: e.shareholders.join('; '),
          subsidiaries: e.subsidiaries.join('; '),
          holdings: e.holdings.join('; '),
        },
        geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
      })),
    }),
  },
  {
    id: 'full-report',
    label: 'Relatório Completo (Full Report)',
    description: 'All observatory data + timeline + corporate network in one file',
    filename: 'observatory-of-vulcan-complete',
    format: 'json',
    getData: () => ({
      reportTitle: 'Observatory of Vulcan — Complete Data Dump',
      generatedAt: new Date().toISOString(),
      source: 'Earth Guardians — EG-Maps',
      license: 'Educational use. Verify independently.',
      geoPoliticalTimeline: GEOPOLITICAL_TIMELINE,
      miningPhases: MINING_PHASE_TIMELINE,
      enterprises: ENTERPRISES,
      corporateConnections: CORPORATE_CONNECTIONS,
      categories: RARE_EARTH_CATEGORIES,
      statistics: {
        totalEnterprises: ENTERPRISES.length,
        totalConnections: CORPORATE_CONNECTIONS.length,
        totalTimelineEvents: GEOPOLITICAL_TIMELINE.length,
        totalMiningPhases: MINING_PHASE_TIMELINE.length,
        countriesRepresented: [...new Set(ENTERPRISES.map(e => e.country))].length,
      },
    }),
  },
]

function convertToCSV(data: Record<string, any>[]): string {
  if (!data.length) return ''
  const headers = Object.keys(data[0])
  const lines = [headers.join(',')]
  data.forEach(row => {
    lines.push(headers.map(h => {
      const val = row[h]
      const str = val == null ? '' : String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(','))
  })
  return lines.join('\n')
}

export function downloadData(dataset: DownloadableDataset) {
  const data = dataset.getData()
  let content: string
  let mime: string
  let ext: string

  switch (dataset.format) {
    case 'csv':
      content = convertToCSV(Array.isArray(data) ? data : [data])
      mime = 'text/csv'
      ext = 'csv'
      break
    case 'geojson':
      content = JSON.stringify(data, null, 2)
      mime = 'application/geo+json'
      ext = 'geojson'
      break
    default:
      content = JSON.stringify(data, null, 2)
      mime = 'application/json'
      ext = 'json'
  }

  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${dataset.filename}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadAllDatasets() {
  DOWNLOADABLE_DATASETS.forEach(ds => downloadData(ds))
}
