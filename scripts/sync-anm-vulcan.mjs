#!/usr/bin/env node
/**
 * scripts/sync-anm-vulcan.mjs
 * @why Daily ANM sync for the Vulcan observatory — downloads the newest
 *      SIGMINE mining-process dumps (SP.zip + MG.zip, shapefiles), parses
 *      them with zero dependencies (manual SHP+DBF reader), keeps only the
 *      claims within RADIUS_KM of the Vulcan center, and rewrites the
 *      public/data/rare-earth/pococaldas/*.geojson inputs plus a
 *      deep_analysis.json refresh. Alternative live source: the SIGMINE
 *      ArcGIS service (same schema) via --source arcgis.
 *
 *      Source inventory (Playwright sniff, scripts/sniff-anm.mjs):
 *      - dadosabertos listing: static HTML, per-UF {UF}.zip (shapefile set:
 *        .shp PolygonZ SIRGAS-2000 degrees + .dbf UTF-8) and {UF}.kmz (viz).
 *      - webappviewer (SIGMINE): portal app-data -> webmap 1f5535fc… (11
 *        operational MapServers) -> per-service ?f=json -> World_Imagery
 *        tiles + MapServer/export renders; vector /query only on identify.
 *      - dashboard (Disponibilidade): portal app-data -> webmap fcca53…
 *        (estrutura_territorial + 2 Producao FeatureServers) -> statistic
 *        queries (groupBy Res_Final/Rodada/Uf) + tiled pbf geometry queries.
 *      Reports: scripts/output/anm-sniff/*.json
 *
 *      Vulcan center: 21°54'47.66"S 46°32'30.81"W = (-46.5418917, -21.9132389)
 *
 * Usage:
 *   node scripts/sync-anm-vulcan.mjs [--out DIR] [--source zip|arcgis|auto]
 *     [--radius-km 50] [--center lng,lat] [--ufs SP,MG] [--dry-run]
 *     [--no-download] [--tmp DIR] [--keep-tmp]
 *     [--with-overlaps PROTECTED OUT] [--report PATH]
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import https from 'node:https'
import { inflateRawSync } from 'node:zlib'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const VULCAN = { lng: -46.5418917, lat: -21.9132389 } // 21°54'47.66"S 46°32'30.81"W
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const BASE = 'https://dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS'
const ARCGIS = 'https://geo.anm.gov.br/arcgis/rest/services/SIGMINE/dados_anm/MapServer/0/query'

// Exact SUBS -> (category, label) table observed in the curated dataset.
const SUBS_TABLE = {
  'APATITA': ['phosphate_associated', 'Apatita (REE-bearing phosphate)'],
  'FONÓLITO': ['carbonatite_associated', 'Fonólito (alkaline complex)'],
  'ILMENITA': ['heavy_mineral_associated', 'Ilmenita (heavy mineral sand, REE assoc.)'],
  'MINÉRIO DE LÍTIO': ['pegmatite_associated', 'Minério de Lítio (pegmatite, REE assoc.)'],
  'MINÉRIO DE NIÓBIO': ['carbonatite_associated', 'Minério de Nióbio (carbonatite assoc.)'],
  'MINÉRIO DE TITÂNIO': ['heavy_mineral_associated', 'Minério de Titânio (heavy mineral, REE assoc.)'],
  'MINÉRIO DE URÂNIO': ['strategic_associated', 'Minério de Urânio (REE co-occurrence)'],
  'TERRAS RARAS': ['direct_ree', 'Terras Raras (REE)'],
  'TINGUAÍTO': ['carbonatite_associated', 'Tinguaito (alkaline complex)'],
  'TITÂNIO': ['heavy_mineral_associated', 'Titânio (heavy mineral sand)'],
  'ZIRCÔNIO': ['heavy_mineral_associated', 'Zircônio (heavy mineral, REE assoc.)'],
}
const SUBS_KEYWORDS = [
  [/FOSFAT|APATIT/, ['phosphate_associated', null]],
  [/LITIO|LÍTIO|SPODUM/, ['pegmatite_associated', null]],
  [/URANIO|URÂNIO|TORIO|TÓRIO/, ['strategic_associated', null]],
  [/NIÓBIO|NIOBIO|CARBONATIT|PIROCLORO|FONOLIT|TINGUA/, ['carbonatite_associated', null]],
  [/ZIRC|TITAN|ILMEN|RUTIL|MONAZIT|XENOTIM/, ['heavy_mineral_associated', null]],
  [/TERRAS?\s*RARAS|RARE\s*EARTH/, ['direct_ree', null]],
]
function classifySubs(subs) {
  const s = String(subs || '').trim().toUpperCase()
  if (SUBS_TABLE[s]) return SUBS_TABLE[s]
  for (const [re, [cat]] of SUBS_KEYWORDS) {
    if (re.test(s)) {
      const title = s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase())
      return [cat, `${title} (${cat.replace(/_/g, ' ')})`]
    }
  }
  const title = (s || 'Unknown').toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase())
  return ['unknown', `${title} (unclassified)`]
}

// ── CLI ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const opt = (name, fb) => {
  const i = args.indexOf(name)
  return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fb
}
const flag = (name) => args.includes(name)
const OPTS = {
  out: resolve(ROOT, opt('--out', 'public/data/rare-earth/pococaldas')),
  source: opt('--source', 'auto'),
  radiusKm: Number(opt('--radius-km', '50')),
  center: (() => {
    const c = opt('--center', `${VULCAN.lng},${VULCAN.lat}`).split(',').map(Number)
    return { lng: c[0], lat: c[1] }
  })(),
  ufs: opt('--ufs', 'SP,MG').split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
  substances: opt('--substances', 'ree'),
  dryRun: flag('--dry-run'),
  noDownload: flag('--no-download'),
  tmp: resolve(ROOT, opt('--tmp', '/tmp/opencode/anm-sync')),
  keepTmp: flag('--keep-tmp'),
  withOverlaps: opt('--with-overlaps', null), // "PROTECTED_GEOJSON:OUT_GEOJSON"
  report: opt('--report', null),
}

// ── geo helpers ────────────────────────────────────────────────────────
function haversineKm(aLng, aLat, bLng, bLat) {
  const R = 6371
  const dLa = ((bLat - aLat) * Math.PI) / 180
  const dLo = ((bLng - aLng) * Math.PI) / 180
  const h = Math.sin(dLa / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
function centroidOfRings(rings) {
  let best = null
  for (const r of rings) if (r && r.length >= 4 && (!best || r.length > best.length)) best = r
  if (!best) return null
  let x = 0, y = 0
  for (const c of best) { x += c[0]; y += c[1] }
  return [x / best.length, y / best.length]
}
// ── true-overlap helpers (shared rule with compute-overlaps.mjs) ──────
// An overlap means the claim touches the territory (distance 0) or sits
// within OVERLAP_NEAR_KM of its edge — never "within 50km of the centroid".
const OVERLAP_NEAR_KM = 2
function pointInRingOv(p, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}
function segIntOv(p1, p2, p3, p4) {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
  if (!d) return false
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}
function ptSegKmOv(p, a, b, kx) {
  const px = p[0] * kx, py = p[1] * 110.57
  const ax = a[0] * kx, ay = a[1] * 110.57
  const bx = b[0] * kx, by = b[1] * 110.57
  const dx = bx - ax, dy = by - ay
  const l2 = dx * dx + dy * dy
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
function ringDistKmOv(p, ring, kx) {
  let best = Infinity
  for (let i = 0; i < ring.length; i++) {
    const d = ptSegKmOv(p, ring[i], ring[(i + 1) % ring.length], kx)
    if (d < best) best = d
  }
  return best
}

// ── download ───────────────────────────────────────────────────────────
function download(url, dest) {
  return new Promise((resolveP, reject) => {
    const attempt = (u, redirects = 0) => {
      https.get(u, { headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
          res.resume()
          attempt(new URL(res.headers.location, u).toString(), redirects + 1)
          return
        }
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} for ${u}`))
          return
        }
        const out = createWriteStream(dest)
        res.pipe(out)
        out.on('finish', () => resolveP(dest))
        out.on('error', reject)
      }).on('error', reject)
    }
    attempt(url)
  })
}

// ── minimal ZIP extractor (stored + deflate via node:zlib) ─────────────
function unzipTo(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true })
  const buf = readFileSync(zipPath)
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  // Find End Of Central Directory
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('ZIP: EOCD not found in ' + zipPath)
  const cdCount = dv.getUint16(eocd + 10, true)
  let cdOff = dv.getUint32(eocd + 16, true)
  const names = []
  for (let n = 0; n < cdCount; n++) {
    if (dv.getUint32(cdOff, true) !== 0x02014b50) throw new Error('ZIP: bad central directory')
    const method = dv.getUint16(cdOff + 10, true)
    const compSize = dv.getUint32(cdOff + 20, true)
    const localOff = dv.getUint32(cdOff + 42, true)
    const nameLen = dv.getUint16(cdOff + 28, true)
    const extraLen = dv.getUint16(cdOff + 30, true)
    const commentLen = dv.getUint16(cdOff + 32, true)
    const name = Buffer.from(buf.subarray(cdOff + 46, cdOff + 46 + nameLen)).toString('utf8')
    if (!name.endsWith('/')) {
      const lhNameLen = dv.getUint16(localOff + 26, true)
      const lhExtraLen = dv.getUint16(localOff + 28, true)
      const dataOff = localOff + 30 + lhNameLen + lhExtraLen
      const comp = Buffer.from(buf.subarray(dataOff, dataOff + compSize))
      const data = method === 0 ? comp : method === 8 ? inflateRawSync(comp) : null
      if (!data) throw new Error(`ZIP: unsupported method ${method} for ${name}`)
      writeFileSync(join(destDir, name.split('/').pop()), data)
      names.push(name)
    }
    cdOff += 46 + nameLen + extraLen + commentLen
  }
  return names
}

// ── DBF reader (dBase III, C/N/F/D/L fields) ───────────────────────────
function readDbf(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const nrec = dv.getUint32(4, true)
  const hdrLen = dv.getUint16(8, true)
  const recLen = dv.getUint16(10, true)
  const nfields = Math.floor((hdrLen - 33) / 32)
  const fields = []
  for (let i = 0; i < nfields; i++) {
    const off = 32 + i * 32
    const rawName = Buffer.from(buf.subarray(off, off + 11))
    const name = rawName.toString('latin1').split('\0')[0]
    const type = String.fromCharCode(buf[off + 11])
    fields.push({ name, type, len: buf[off + 16] })
  }
  const rows = []
  const deleted = new Set()
  for (let r = 0; r < nrec; r++) {
    const base = hdrLen + r * recLen
    if (buf[base] === 0x2a) { deleted.add(r); continue } // '*' deleted
    const row = {}
    let p = base + 1
    for (const f of fields) {
      const raw = Buffer.from(buf.subarray(p, p + f.len)).toString('utf8').trim()
      if (f.type === 'N' || f.type === 'F') {
        const v = raw === '' ? 0 : Number(raw)
        row[f.name] = Number.isFinite(v) ? v : 0
      } else {
        row[f.name] = raw
      }
      p += f.len
    }
    rows.push({ index: r, row })
  }
  return { rows, deleted }
}

// ── SHP reader (Polygon=5, PolygonZ=15; 2D output) ──────────────────────
function readShpPolygons(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  if (dv.getUint32(0, false) !== 9994) throw new Error('SHP: bad file code')
  const shapeType = dv.getUint32(32, true)
  if (shapeType !== 5 && shapeType !== 15) throw new Error(`SHP: unsupported shape type ${shapeType}`)
  const recs = []
  let off = 100
  while (off + 8 <= buf.length) {
    const contentLen = dv.getUint32(off + 4, false) * 2 // words -> bytes
    if (contentLen <= 0 || off + 8 + contentLen > buf.length + 8) break
    const type = dv.getUint32(off + 8, true)
    let rings = null
    if (type === 5 || type === 15) {
      let p = off + 8 + 4 + 32
      const numParts = dv.getUint32(p, true); p += 4
      const numPoints = dv.getUint32(p, true); p += 4
      const parts = []
      for (let i = 0; i < numParts; i++) { parts.push(dv.getUint32(p, true)); p += 4 }
      const pts = []
      for (let i = 0; i < numPoints; i++) {
        pts.push([dv.getFloat64(p, true), dv.getFloat64(p + 8, true)])
        p += 16 // x,y packed; PolygonZ stores Z/M arrays after ALL points
      }
      rings = parts.map((start, i) => pts.slice(start, parts[i + 1] ?? numPoints))
    }
    recs.push(rings)
    off += 8 + contentLen
  }
  return recs
}

// ── ZIP source: SP.zip + MG.zip shapefiles ─────────────────────────────
async function loadZipSource() {
  const claims = [] // {props, rings}
  const perUf = {}
  for (const uf of OPTS.ufs) {
    const dir = join(OPTS.tmp, uf)
    const zipPath = join(OPTS.tmp, `${uf}.zip`)
    if (!OPTS.noDownload || !existsSync(zipPath)) {
      console.log(`[sync] downloading ${uf}.zip …`)
      await download(`${BASE}/${uf}.zip`, zipPath)
    } else {
      console.log(`[sync] reusing ${zipPath}`)
    }
    mkdirSync(dir, { recursive: true })
    console.log(`[sync] extracting ${uf}.zip …`)
    unzipTo(zipPath, dir)
    const base = readdirSync(dir).find(f => f.toLowerCase().endsWith('.shp'))
    if (!base) throw new Error(`no .shp found for ${uf}`)
    const stem = base.slice(0, -4)
    const shp = readFileSync(join(dir, `${stem}.shp`))
    const dbf = readFileSync(join(dir, `${stem}.dbf`))
    const polys = readShpPolygons(shp)
    const { rows } = readDbf(dbf)
    let kept = 0
    for (const { index, row } of rows) {
      const rings = polys[index]
      if (!rings || !rings.length) continue
      claims.push({ uf, props: row, rings })
      kept++
    }
    perUf[uf] = { records: rows.length, withGeom: kept }
    console.log(`[sync] ${uf}: ${rows.length} dbf rows, ${kept} with polygons`)
  }
  return { claims, perUf }
}

// ── ArcGIS source: live dados_anm envelope query (same schema) ──────────
function arcgisGet(params) {
  const qs = new URLSearchParams(params).toString()
  return new Promise((resolveP, reject) => {
    https.get(`${ARCGIS}?${qs}`, { headers: { 'User-Agent': UA } }, (res) => {
      let body = ''
      res.on('data', c => { body += c })
      res.on('end', () => {
        try { resolveP(JSON.parse(body)) }
        catch (e) { reject(new Error(`ArcGIS bad JSON: ${body.slice(0, 120)}`)) }
      })
    }).on('error', reject)
  })
}
async function loadArcgisSource() {
  // Envelope with margin, then exact haversine filter downstream.
  const mLat = (OPTS.radiusKm * 1.2) / 111.2
  const mLng = (OPTS.radiusKm * 1.2) / (111.2 * Math.cos((OPTS.center.lat * Math.PI) / 180))
  const env = [OPTS.center.lng - mLng, OPTS.center.lat - mLat, OPTS.center.lng + mLng, OPTS.center.lat + mLat]
  const claims = []
  // Quad-split recursion: robust without resultOffset (objectIdField is null).
  const queue = [env]
  let pages = 0
  while (queue.length) {
    const [x0, y0, x1, y1] = queue.pop()
    // No paging params: the service answers 400 to resultRecordCount
    // ("Pagination is not supported"). Quad-split on exceededTransferLimit.
    const data = await arcgisGet({
      geometry: `${x0},${y0},${x1},${y1}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
    })
    pages++
    if (data.error) throw new Error(`ArcGIS: ${data.error.message || data.error.code || 'unknown error'}`)
    if (pages > 600) throw new Error('ArcGIS: quad-split runaway, aborting')
    if (data.exceededTransferLimit && (x1 - x0) > 0.005) {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
      queue.push([x0, y0, mx, my], [mx, y0, x1, my], [x0, my, mx, y1], [mx, my, x1, y1])
      continue
    }
    for (const f of data.features || []) {
      if (!f.geometry || (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')) continue
      // Flatten MultiPolygon into one ring list (centroid uses largest ring).
      const flat = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat()
      claims.push({ uf: String(f.properties?.UF || ''), props: { ...f.properties }, rings: flat })
    }
  }
  console.log(`[sync] arcgis: ${pages} quad pages, ${claims.length} polygon features`)
  return { claims, perUf: { ARCGIS: { pages } } }
}

// ── main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('[sync] ANM Vulcan sync')
  console.log(`[sync] center=${OPTS.center.lng},${OPTS.center.lat} radius=${OPTS.radiusKm}km source=${OPTS.source} ufs=${OPTS.ufs.join(',')}`)
  mkdirSync(OPTS.tmp, { recursive: true })

  let loaded
  const want = OPTS.source
  if (want === 'arcgis') {
    loaded = await loadArcgisSource()
  } else if (want === 'zip') {
    loaded = await loadZipSource()
  } else {
    try {
      loaded = await loadArcgisSource()
      console.log('[sync] live service OK — using ArcGIS source')
    } catch (e) {
      console.log(`[sync] live service failed (${e.message}) — falling back to zips`)
      loaded = await loadZipSource()
    }
  }

  // Filter + dedupe by DSProcesso||PROCESSO (border claims can repeat per UF).
  const seen = new Map()
  let noCentroid = 0
  for (const c of loaded.claims) {
    const centroid = centroidOfRings(c.rings)
    if (!centroid) { noCentroid++; continue }
    const distKm = haversineKm(OPTS.center.lng, OPTS.center.lat, centroid[0], centroid[1])
    if (distKm > OPTS.radiusKm) continue
    const key = String(c.props.DSProcesso || c.props.PROCESSO || '')
    const prev = seen.get(key)
    if (!prev || distKm < prev.distKm) {
      seen.set(key, { ...c, centroid, distKm: Math.round(distKm * 10) / 10, lon: centroid[0], lat: centroid[1] })
    }
  }
  // REE scope (default): the observatory tracks rare-earth-relevant
  // substances only. Out-of-scope bulk mining (limestone, granite, sand…)
  // stays out, but any NEW REE-family claim is picked up automatically via
  // the keyword fallback. --substances all keeps everything.
  const scoped = []
  let outOfScope = 0
  for (const it of seen.values()) {
    if (OPTS.substances !== 'all') {
      const [cat] = classifySubs(it.props.SUBS)
      if (cat === 'unknown') { outOfScope++; continue }
    }
    scoped.push(it)
  }
  const items = scoped.sort((a, b) => String(a.props.PROCESSO).localeCompare(String(b.props.PROCESSO)))
  console.log(`[sync] in-radius: ${items.length} claims (${outOfScope} out-of-scope skipped, ${noCentroid} without centroid)`)
  if (!items.length) throw new Error('zero claims in radius — refusing to write empty dataset')

  // Category histogram (for the report).
  const catHist = {}
  for (const it of items) {
    const [cat] = classifySubs(it.props.SUBS)
    catHist[cat] = (catHist[cat] || 0) + 1
  }

  // Build GeoJSON outputs in the repo schemas.
  const polyFeatures = items.map((it) => {
    const p = it.props
    const [category, category_label] = classifySubs(p.SUBS)
    const rings = it.rings.map(r => r.map(c => [c[0], c[1]]))
    return {
      type: 'Feature',
      properties: {
        PROCESSO: String(p.PROCESSO ?? ''),
        NUMERO: Number(p.NUMERO ?? 0),
        ANO: Number(p.ANO ?? 0),
        AREA_HA: Number(p.AREA_HA ?? 0),
        FASE: String(p.FASE ?? ''),
        ULT_EVENTO: String(p.ULT_EVENTO ?? ''),
        NOME: String(p.NOME ?? ''),
        SUBS: String(p.SUBS ?? ''),
        USO: String(p.USO ?? ''),
        UF: String(p.UF ?? it.uf ?? ''),
        DSProcesso: String(p.DSProcesso ?? ''),
        category,
        category_label,
        lon: it.lon,
        lat: it.lat,
      },
      geometry: { type: 'Polygon', coordinates: rings },
    }
  })
  const pointFeatures = items.map((it) => {
    const p = it.props
    const [category, category_label] = classifySubs(p.SUBS)
    return {
      type: 'Feature',
      properties: {
        processo: String(p.PROCESSO ?? ''),
        numero: Number(p.NUMERO ?? 0),
        ano: Number(p.ANO ?? 0),
        area_ha: Number(p.AREA_HA ?? 0),
        fase: String(p.FASE ?? ''),
        nome: String(p.NOME ?? ''),
        subs: String(p.SUBS ?? ''),
        uso: String(p.USO ?? ''),
        uf: String(p.UF ?? it.uf ?? ''),
        category,
        category_label,
        dsprocesso: String(p.DSProcesso ?? ''),
      },
      geometry: { type: 'Point', coordinates: [it.lon, it.lat] },
    }
  })

  // Diff vs previous outputs.
  const prevProcessos = new Set()
  const prevPointsPath = join(OPTS.out, 'points.geojson')
  if (existsSync(prevPointsPath)) {
    try {
      const prev = JSON.parse(readFileSync(prevPointsPath, 'utf8'))
      for (const f of prev.features || []) {
        const pr = f.properties?.processo || f.properties?.PROCESSO
        if (pr) prevProcessos.add(String(pr))
      }
    } catch { /* ignore unreadable previous */ }
  }
  const nextProcessos = new Set(items.map(it => String(it.props.PROCESSO ?? '')))
  const added = [...nextProcessos].filter(p => p && !prevProcessos.has(p)).sort()
  const removed = [...prevProcessos].filter(p => !nextProcessos.has(p)).sort()

  // deep_analysis patch.
  const analysisPath = join(OPTS.out, 'deep_analysis.json')
  let analysis = {}
  if (existsSync(analysisPath)) {
    try { analysis = JSON.parse(readFileSync(analysisPath, 'utf8')) } catch { analysis = {} }
  }
  const now = new Date().toISOString()
  const yearCounts = {}
  let totalArea = 0
  let c25 = 0, c50 = 0
  for (const it of items) {
    const y = Number(it.props.ANO ?? 0)
    if (y > 0) yearCounts[String(y)] = (yearCounts[String(y)] || 0) + 1
    totalArea += Number(it.props.AREA_HA ?? 0)
    if (it.distKm <= 25) c25++
    if (it.distKm <= 50) c50++
  }
  analysis.last_sync = now
  analysis.data_source = 'ANM SIGMINE public dump (SP.zip + MG.zip shapefiles)'
  analysis.sync_frequency = 'daily'
  analysis.sync_url = 'https://dadosabertos.anm.gov.br/SIGMINE/PROCESSOS_MINERARIOS/'
  analysis.year_counts = yearCounts
  analysis.regional = {
    ...(typeof analysis.regional === 'object' ? analysis.regional : {}),
    center: [OPTS.center.lng, OPTS.center.lat],
    radius_km: OPTS.radiusKm,
    total_claims_100km: OPTS.radiusKm >= 100 ? items.length : (analysis.regional?.total_claims_100km ?? items.length),
    total_claims_50km: c50,
    total_claims_25km: c25,
    total_area_ha: Math.round(totalArea * 100) / 100,
  }
  analysis.generated = now

  const report = {
    at: now,
    center: OPTS.center,
    radiusKm: OPTS.radiusKm,
    perUf: loaded.perUf,
    inRadius: items.length,
    categories: catHist,
    added: added.length,
    removed: removed.length,
    addedSample: added.slice(0, 20),
    removedSample: removed.slice(0, 20),
  }

  if (OPTS.dryRun) {
    console.log('[sync] DRY RUN — no files written')
    console.log(JSON.stringify(report, null, 1))
    return
  }

  mkdirSync(OPTS.out, { recursive: true })
  writeFileSync(join(OPTS.out, 'polygons.geojson'), JSON.stringify({ type: 'FeatureCollection', features: polyFeatures }))
  writeFileSync(join(OPTS.out, 'points.geojson'), JSON.stringify({ type: 'FeatureCollection', features: pointFeatures }))
  writeFileSync(analysisPath, JSON.stringify(analysis, null, 1))
  console.log(`[sync] wrote polygons.geojson (${polyFeatures.length}) + points.geojson (${pointFeatures.length}) + deep_analysis.json`)

  // Optional overlaps recompute (true-geometry rule: boundary intersection
  // or centroid inside the territory = overlap; otherwise linked only when
  // within OVERLAP_NEAR_KM of the territory edge).
  if (OPTS.withOverlaps) {
    const [protPath, outPath] = OPTS.withOverlaps.split(':')
    const prot = JSON.parse(readFileSync(resolve(ROOT, protPath), 'utf8'))
    const areas = []
    for (const f of prot.features || []) {
      const g = f.geometry
      if (!g) continue
      const rings = g.type === 'Polygon' ? [g.coordinates[0]] : (g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : null)
      if (!rings || !rings.length) continue
      areas.push({ name: f.properties?.name, kind: f.properties?.kind, rings })
    }
    const feats = pointFeatures.map((f, fi) => {
      const [x, y] = f.geometry.coordinates
      const claimRings = (items[fi]?.rings || []).filter(r => r && r.length >= 4)
      const kx = Math.cos((y * Math.PI) / 180) * 111.32
      const overlaps = []
      for (const a of areas) {
        let touches = false
        for (const ring of a.rings) {
          if (pointInRingOv([x, y], ring)) { touches = true; break }
          let crossed = false
          for (const cr of claimRings) {
            for (let s = 0; s < cr.length && !crossed; s++) {
              for (let q = 0; q < ring.length; q++) {
                if (segIntOv(cr[s], cr[(s + 1) % cr.length], ring[q], ring[(q + 1) % ring.length])) { crossed = true; break }
              }
            }
            if (crossed) break
          }
          if (crossed) { touches = true; break }
          if (claimRings.some(cr => cr.some(v => pointInRingOv(v, ring)))) { touches = true; break }
          if (claimRings.some(cr => ring.some(v => pointInRingOv(v, cr)))) { touches = true; break }
        }
        if (touches) {
          overlaps.push({ name: a.name, kind: a.kind, distance_km: 0 })
          continue
        }
        let best = Infinity
        for (const ring of a.rings) {
          const d = ringDistKmOv([x, y], ring, kx)
          if (d < best) best = d
        }
        if (best <= OVERLAP_NEAR_KM) {
          overlaps.push({ name: a.name, kind: a.kind, distance_km: Math.round(best * 10) / 10 })
        }
      }
      // Delete-when-empty: matches compute-overlaps.mjs and the checked-in
      // files (the app treats a missing key as "no overlaps").
      const props = { ...f.properties }
      if (overlaps.length > 0) {
        props.overlaps = overlaps
        props.has_overlap = true
      } else {
        delete props.overlaps
        delete props.has_overlap
      }
      return { ...f, properties: props }
    })
    const withOv = feats.filter(f => f.properties.has_overlap).length
    writeFileSync(resolve(ROOT, outPath), JSON.stringify({ type: 'FeatureCollection', features: feats }))
    console.log(`[sync] wrote ${outPath} (${withOv}/${feats.length} with overlaps)`)
    report.overlaps = { withOverlap: withOv, total: feats.length }
  }

  if (OPTS.report) {
    writeFileSync(resolve(ROOT, OPTS.report), JSON.stringify(report, null, 1))
    console.log(`[sync] report -> ${OPTS.report}`)
  }
  console.log(`SYNC_STATUS=${added.length || removed.length ? 'changed' : 'unchanged'}`)
  console.log(`[sync] added=${added.length} removed=${removed.length}`)

  if (!OPTS.keepTmp) {
    try { rmSync(OPTS.tmp, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error('[sync] FATAL:', e.message)
  process.exit(1)
})
