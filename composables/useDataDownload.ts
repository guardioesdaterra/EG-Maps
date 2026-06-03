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
    id: 'points-geojson',
    label: 'Mining Claims — Points (8.5 MB)',
    description: 'All 20,700 mining claim points from ANM SIGMINE. Properties: processo, numero, ano, area_ha, fase, nome, subs, uso, uf, category, category_label, dsprocesso.',
    filename: 'rare-earth-points',
    format: 'geojson',
    getData: () => fetchAndPackageGeoJson('/data/rare-earth/points.geojson'),
  },
  {
    id: 'polygons-geojson',
    label: 'Mining Claims — Polygons (14.6 MB)',
    description: 'All 20,700 mining claim polygons. UPPERCASE properties: PROCESSO, NUMERO, ANO, AREA_HA, FASE, ULT_EVENTO, NOME, SUBS, USO, UF, DSProcesso, category, category_label, lat, lon.',
    filename: 'rare-earth-polygons',
    format: 'geojson',
    getData: () => fetchAndPackageGeoJson('/data/rare-earth/polygons.geojson'),
  },
  {
    id: 'deep-analysis',
    label: 'Deep Analysis (5 KB)',
    description: 'Aggregated statistics: 437 suspicious speculators, top 10 by suspicion score, foreign claims breakdown by country, year counts 2000-2026, key events, sigilo stats, military-critical totals.',
    filename: 'rare-earth-deep-analysis',
    format: 'json',
    getData: () => fetchAndPackageGeoJson('/data/rare-earth/deep_analysis.json'),
  },
  {
    id: 'protected-areas',
    label: 'Protected Areas — Indigenous Lands & Quilombola Territories',
    description: '9 TIs (Terra Indígena) + 7 Quilombola territories + 2 Conservation Units, simplified to <50 vertices each. Source: FUNAI + INCRA + ICMBio.',
    filename: 'protected-areas',
    format: 'geojson',
    getData: () => fetchAndPackageGeoJson('/data/rare-earth/protected-areas.geojson'),
  },
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
    description: 'All curated observatory data + timeline + corporate network in one file',
    filename: 'observatory-of-vulcan-curated',
    format: 'json',
    getData: () => ({
      reportTitle: 'Observatory of Vulcan — Curated Data Bundle',
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
      note: 'For raw claim-level data (20,700 points/polygons), use the individual download items above.',
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

function getBaseURL(): string {
  if (typeof window === 'undefined') return ''
  const cfg = (window as any).$nuxt?.$config?.app?.baseURL
  if (typeof cfg === 'string') return cfg
  if (typeof (window as any).__NUXT__?.config?.app?.baseURL === 'string') return (window as any).__NUXT__.config.app.baseURL
  const meta = document.querySelector('meta[name="nuxt-baseurl"]') as HTMLMetaElement | null
  if (meta?.content) return meta.content
  return '/'
}

async function fetchAndPackageGeoJson(path: string): Promise<unknown> {
  const base = getBaseURL().replace(/\/+$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  return res.json()
}

function isPromiseLike(v: unknown): v is PromiseLike<unknown> {
  return !!v && typeof v === 'object' && typeof (v as any).then === 'function'
}

function triggerDownload(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadData(dataset: DownloadableDataset) {
  let data: unknown
  try {
    const result = dataset.getData()
    data = isPromiseLike(result) ? await result : result
  } catch (err) {
    console.error(`[downloadData] ${dataset.id} failed:`, err)
    throw err
  }

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

  triggerDownload(content, mime, `${dataset.filename}.${ext}`)
}

export async function downloadAllDatasets() {
  for (const ds of DOWNLOADABLE_DATASETS) {
    try {
      await downloadData(ds)
    } catch (err) {
      console.error(`[downloadAllDatasets] ${ds.id} skipped:`, err)
    }
  }
}
