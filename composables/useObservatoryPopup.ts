/**
 * composables/useObservatoryPopup.ts
 * @why Observatory popup display — builds HTML popup content for claim/agent markers
 * @functions clearPopupCache, buildRareEarthPopupContent, renderRareEarthPopup, openRareEarthPopup, attachRareEarthPopupHandler
 * @interfaces RareEarthPopupBadge, RareEarthPopupAction, RareEarthPopupOverlap, RareEarthPopupContent
 * @deps @/lib/observatory-analysis (isMilitaryInterest, isHighEnvRisk, isSuspiciousBasic, buildAnmVerifyUrl, buildClaimReportMailtoUrl); @/lib/map-utils (RARE_EARTH_CATEGORIES); @/composables/useObservatorySelection (useObservatorySelection)
 * @connections composables/useRareEarthLayers.ts
 */
import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import { isMilitaryInterest, isHighEnvRisk, isSuspiciousBasic, buildAnmVerifyUrl, buildClaimReportMailtoUrl } from '@/lib/observatory-analysis'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { useObservatorySelection } from '@/composables/useObservatorySelection'

export interface RareEarthPopupBadge {
  label: string
  color: string
  title?: string
}

export interface RareEarthPopupAction {
  kind: 'link' | 'event'
  label: string
  /** For kind:link */
  href?: string
  /** For kind:event */
  eventName?: string
  payload?: unknown
  variant: 'primary' | 'danger'
  icon?: string
}

export interface RareEarthPopupOverlap {
  name: string
  kind: 'ti' | 'quilombo'
  distance_km?: number
}

export interface RareEarthPopupContent {
  title: string
  subtitle?: string
  badges: RareEarthPopupBadge[]
  fields: Array<{ label: string; value: string }>
  collapsedFields?: Array<{ label: string; value: string }>
  dangerScore: number
  lastEvent?: { text: string; freshness: 'recent' | 'active' | 'stale' }
  overlaps?: RareEarthPopupOverlap[]
  actions: RareEarthPopupAction[]
  footer?: string
  sourceFeatureId?: string | number | null
}

function dangerColor(score: number): string {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}

function ageFreshness(year?: number): 'recent' | 'active' | 'stale' {
  if (!year) return 'stale'
  const age = new Date().getFullYear() - year
  if (age < 1) return 'recent'
  if (age <= 3) return 'active'
  return 'stale'
}

function formatArea(ha: number): string {
  if (ha >= 10000) return `${Math.round(ha / 1000).toLocaleString()}K ha`
  return `${ha.toLocaleString()} ha`
}

const popupCache = new Map<string, RareEarthPopupContent>()
const CACHE_MAX_SIZE = 200
let lastCacheLocale = ''

export function clearPopupCache() {
  popupCache.clear()
  lastCacheLocale = ''
}

function getCacheKey(props: Record<string, unknown>, locale?: string): string {
  const id = String(props.p ?? props.processo ?? props.id ?? JSON.stringify(props).slice(0, 100))
  return locale ? `${locale}:${id}` : id
}

/**
 * Convert a raw GeoJSON feature property set (snake_case keys, ANM format)
 * to the structured popup model. Results are cached by processo/ID.
 * Requires `t` and `locale` from the caller's Vue setup context.
 */
export function buildRareEarthPopupContent(
  props: Record<string, unknown>,
  lngLat: [number, number],
  t: (_key: string, _params?: Record<string, unknown>) => string,
  locale: { value: string },
): RareEarthPopupContent {
  if (lastCacheLocale && lastCacheLocale !== locale.value) {
    popupCache.clear()
  }
  lastCacheLocale = locale.value

  const cacheKey = getCacheKey(props, locale.value)
  const cached = popupCache.get(cacheKey)
  if (cached) return cached

  const catKey = String(props.c ?? props.category ?? 'unknown')
  const cat = RARE_EARTH_CATEGORIES[catKey] ?? { label: catKey, color: '#666' }
  const catLabelKey = `observatory.categories.${catKey}`
  const catLabel = (locale.value && t(catLabelKey) !== catLabelKey) ? t(catLabelKey) : cat.label

  const dangerScore = Number(props.ds ?? props.danger_score ?? 5)
  const areaHa = Number(props.a ?? props.area_ha ?? 0)
  const uf = String(props.u ?? props.uf ?? '')
  const processo = String(props.p ?? props.processo ?? '')
  const nome = String(props.n ?? props.nome ?? t('observatory.popups.unknown'))
  const subs = String(props.s ?? props.subs ?? '—')
  const fase = String(props.f ?? props.fase ?? '—')
  const ano = Number(props.ano ?? props.y ?? 0)
  const networkId = String(props.net ?? props.network_id ?? '')
  const lastEventText = String(props.ev ?? props.ultimo_evento ?? '')
  const overlaps: RareEarthPopupOverlap[] = Array.isArray(props.ov) ? props.ov : []

  const badges: RareEarthPopupBadge[] = []
  badges.push({ label: catLabel, color: cat.color, title: catKey })
  badges.push({
    label: t('observatory.popups.dangerLabel', { score: dangerScore.toFixed(1) }),
    color: dangerColor(dangerScore),
  })
  if (networkId) {
    badges.push({
      label: networkId,
      color: '#5dade2',
      title: t('observatory.popups.networkBadgeTitle'),
    })
  }
  if (isMilitaryInterest(uf)) {
    badges.push({ label: t('observatory.badges.mil'), color: '#e74c3c' })
  }
  if (isHighEnvRisk(props)) {
    badges.push({ label: t('observatory.badges.env'), color: '#27ae60' })
  }
  if (isSuspiciousBasic(props, null)) {
    badges.push({ label: t('observatory.badges.sus'), color: '#8e44ad' })
  }

  const fields: RareEarthPopupContent['fields'] = [
    { label: t('observatory.popups.process'), value: processo || '—' },
    { label: t('observatory.popups.phase'), value: fase },
    { label: t('observatory.popups.uf'), value: uf || '—' },
    { label: t('observatory.popups.area'), value: formatArea(areaHa) },
    { label: t('observatory.popups.substances'), value: subs },
  ]
  const anoField = ano ? { label: t('observatory.popups.year'), value: String(ano), collapsed: true as const } : null

  const lastEvent = lastEventText
    ? { text: lastEventText, freshness: ageFreshness(ano) }
    : undefined

  const actions: RareEarthPopupAction[] = []
  const anmUrl = buildAnmVerifyUrl(processo, ano)
  if (anmUrl) {
    actions.push({
      kind: 'link',
      label: t('observatory.actions.verify'),
      href: anmUrl,
      variant: 'primary',
      icon: '↗',
    })
  }
  const mailto = buildClaimReportMailtoUrl({
    processo, nome,
    lat: lngLat[1], lng: lngLat[0],
    uf, subs,
  })
  actions.push({
    kind: 'link',
    label: t('observatory.actions.report'),
    href: mailto,
    variant: 'danger',
    icon: '⚑',
  })
  actions.push({
    kind: 'event',
    label: t('observatory.actions.openInSidebar'),
    eventName: 'observatory:open',
    payload: { processo, nome, tab: 'danger', coords: lngLat },
    variant: 'primary',
    icon: '⤴',
  })

  const result: RareEarthPopupContent = {
    title: nome,
    subtitle: subs,
    badges,
    fields,
    collapsedFields: anoField ? [anoField] : undefined,
    dangerScore,
    lastEvent,
    overlaps,
    actions,
    sourceFeatureId: typeof props.id === 'string' || typeof props.id === 'number' ? props.id : null,
  }

  if (popupCache.size >= CACHE_MAX_SIZE) {
    const firstKey = popupCache.keys().next().value
    if (firstKey) popupCache.delete(firstKey)
  }
  popupCache.set(cacheKey, result)

  return result
}

/**
 * Render the structured popup content into a MapLibre Popup DOM element.
 * Re-renders when locale changes (re-call with same content).
 */
export function renderRareEarthPopup(
  content: RareEarthPopupContent,
  t: (_key: string) => string,
  _options: { className?: string; maxWidth?: string } = {},
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'ree-popup'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', content.title)
  root.innerHTML = rareEarthPopupHTML(content, t)
  return root
}

function rareEarthPopupHTML(c: RareEarthPopupContent, t: (_key: string) => string): string {
  const dangerColorVal = dangerColor(c.dangerScore)
  const badgesHTML = c.badges
    .map(b => `<span class="ree-popup__badge" style="background:${b.color};color:#fff" title="${escapeAttr(b.title ?? b.label)}">${escapeText(b.label)}</span>`)
    .join('')

  const fieldsHTML = c.fields
    .map(f => `<div class="ree-popup__field"><div class="ree-popup__field-label">${escapeText(f.label)}</div><div class="ree-popup__field-value">${escapeText(f.value)}</div></div>`)
    .join('')

  const lastEventHTML = c.lastEvent
    ? `<div class="ree-popup__section">
         <div class="ree-popup__section-label">${escapeText(label('lastEvent', t))}</div>
         <div class="ree-popup__last-event">
           <span class="ree-popup__event-text">${escapeText(c.lastEvent.text)}</span>
           <span class="ree-popup__event-freshness ree-popup__event-freshness--${c.lastEvent.freshness}">${escapeText(label('lastEvent' + c.lastEvent.freshness.charAt(0).toUpperCase() + c.lastEvent.freshness.slice(1), t))}</span>
         </div>
       </div>`
    : ''

  const overlapsHTML = c.overlaps && c.overlaps.length
    ? `<div class="ree-popup__section">
         <div class="ree-popup__section-label">${escapeText(label('overlaps', t))}</div>
         <div class="ree-popup__overlaps">
           ${c.overlaps.slice(0, 4).map(o => `<span class="ree-popup__overlap">⚠ ${escapeText(o.name)}${o.distance_km ? ` <span class="ree-popup__overlap-dist">· ${o.distance_km}km</span>` : ''}</span>`).join('')}
           ${c.overlaps.length > 4 ? `<span class="ree-popup__overlap-more">+${c.overlaps.length - 4}</span>` : ''}
         </div>
       </div>`
    : ''

  const actionsHTML = c.actions
    .map(a => {
      if (a.kind === 'link') {
        return `<a class="ree-popup__action ree-popup__action--${a.variant}" href="${escapeAttr(a.href ?? '#')}" target="_blank" rel="noopener">${a.icon ? `<span class="ree-popup__action-icon">${a.icon}</span>` : ''}${escapeText(a.label)}</a>`
      }
      return `<button type="button" class="ree-popup__action ree-popup__action--${a.variant}" data-event="${escapeAttr(a.eventName ?? '')}" data-payload='${escapeAttr(JSON.stringify(a.payload ?? null))}'>${a.icon ? `<span class="ree-popup__action-icon">${a.icon}</span>` : ''}${escapeText(a.label)}</button>`
    })
    .join('')

  const collapsedFieldsHTML = c.collapsedFields && c.collapsedFields.length
    ? `<details style="margin-top:12px;padding-top:10px;border-top:1px solid var(--obs-panel-border)">
        <summary style="font-size:11px;color:var(--obs-text-muted);text-transform:uppercase;letter-spacing:0.08em;font-weight:600;cursor:pointer;list-style:none;user-select:none">▸ ${escapeText(c.collapsedFields[0].label)}</summary>
        <div style="font-size:15px;color:var(--text-secondary);font-weight:500;margin-top:5px">${escapeText(c.collapsedFields[0].value)}</div>
      </details>`
    : ''

  return `
    <div class="ree-popup__inner" style="--ree-accent:${dangerColorVal}">
      <div class="ree-popup__header">
        <div class="ree-popup__badges">${badgesHTML}</div>
        <h3 class="ree-popup__title">${escapeText(c.title)}</h3>
        ${c.subtitle ? `<p class="ree-popup__subtitle">${escapeText(c.subtitle)}</p>` : ''}
      </div>
      <div class="ree-popup__body">
        <div class="ree-popup__danger">
          <div class="ree-popup__danger-label">${escapeText(label('dangerLevel', t))}</div>
          <div class="ree-popup__danger-bar"><div class="ree-popup__danger-fill" style="width:${Math.min(100, c.dangerScore * 10)}%;background:${dangerColorVal}"></div></div>
          <div class="ree-popup__danger-score" style="color:${dangerColorVal}">${c.dangerScore.toFixed(1)}</div>
        </div>
        <div class="ree-popup__fields">${fieldsHTML}</div>
        ${collapsedFieldsHTML}
        ${lastEventHTML}
        ${overlapsHTML}
      </div>
      <div class="ree-popup__footer">${actionsHTML}</div>
    </div>
  `
}

function escapeText(s: string): string {
  return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}
function escapeAttr(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
function label(key: string, t: ReturnType<typeof useI18n>['t']): string {
  return t(`observatory.popups.${key}`)
}

interface ClickHandlers {
  onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
}

/**
 * Open a MapLibre popup on the map for the given feature properties.
 * Wires the "open in sidebar" action through the provided handler.
 * Requires `t` and `locale` from the caller's Vue setup context.
 */
export function openRareEarthPopup(
  map: MapLibreMap,
  props: Record<string, unknown>,
  lngLat: [number, number],
  handlers: ClickHandlers = {},
  t: (_key: string, _params?: Record<string, unknown>) => string = (k) => k,
  locale: { value: string } = { value: 'en' },
): maplibregl.Popup {
  const content = buildRareEarthPopupContent(props, lngLat, t, locale)
  const node = renderRareEarthPopup(content, t, { className: 'ree-popup' })

  node.querySelectorAll<HTMLButtonElement>('[data-event="observatory:open"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const payload = btn.dataset.payload ? JSON.parse(btn.dataset.payload) : null
      if (payload && handlers.onSidebarOpen) handlers.onSidebarOpen(payload)
      const sel = useObservatorySelection()
      sel.select({
        processo: payload?.processo ?? null,
        nome: payload?.nome ?? null,
        coords: payload?.coords ?? null,
        tab: payload?.tab ?? 'danger',
      })
    })
  })

  const popup = new maplibregl.Popup({
    offset: 12,
    closeButton: true,
    className: 'ree-popup-wrap',
    maxWidth: '640px',
  })
    .setLngLat(lngLat)
    .setDOMContent(node)
    .addTo(map)
  return popup
}

export interface StackedHit {
  kind: 'claim' | 'boundary' | 'protected' | 'water' | 'site' | 'geo'
  label: string
  props: Record<string, unknown>
  layerId: string
}

interface StackedPopupConfig {
  t: (_key: string, _params?: Record<string, unknown>) => string
  locale: { value: string }
  onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
}

function adaptBoundaryProps(p: Record<string, unknown>): Record<string, unknown> {
  return {
    c: p.category ?? p.c ?? 'unknown',
    ds: p.ds ?? p.danger_score ?? p.dangerScore ?? 5,
    n: p.NOME ?? p.nome ?? p.n ?? p.enterprise ?? 'Polygon',
    s: p.SUBS ?? p.substances ?? p.s ?? '—',
    p: p.PROCESSO ?? p.processo ?? '',
    f: p.FASE ?? p.fase ?? '—',
    u: p.UF ?? p.uf ?? '',
    a: p.AREA_HA ?? p.area_ha ?? 0,
    net: p.network_id ?? p.net ?? '',
    ev: p.ULT_EVENTO ?? p.ultimo_evento ?? p.ev ?? '',
    ano: p.ANO ?? p.ano ?? p.y ?? 0,
    numero: p.NUMERO ?? p.numero ?? 0,
  }
}

function stackedKindColor(kind: StackedHit['kind'], props: Record<string, unknown>): string {
  if (kind === 'claim' || kind === 'boundary') {
    const catKey = String(props.c ?? props.category ?? 'unknown')
    return RARE_EARTH_CATEGORIES[catKey]?.color ?? '#e74c3c'
  }
  if (kind === 'protected') {
    const pk = String(props.kind ?? '')
    if (pk === 'quilombo') return '#f39c12'
    if (pk === 'uc') return '#27ae60'
    if (pk === 'buffer') return '#2dd4bf'
    return '#e74c3c'
  }
  if (kind === 'water') return '#3498db'
  if (kind === 'site') return '#e74c3c'
  return '#9b59b6'
}

function protectedPanelHTML(p: Record<string, unknown>): string {
  const rawKind = String(p.kind ?? '')
  const kind = rawKind === 'ti' ? 'Indigenous Land (Terra Indígena)'
    : rawKind === 'quilombo' ? 'Quilombola Territory'
    : rawKind === 'uc' ? 'Conservation Unit (Unidade de Conservação)'
    : rawKind === 'buffer' ? 'Buffer Zone (Zona de Amortecimento)'
    : 'Protected Territory'
  const protColor = rawKind === 'ti' ? '#e74c3c'
    : rawKind === 'quilombo' ? '#f39c12'
    : rawKind === 'uc' ? '#27ae60'
    : rawKind === 'buffer' ? '#2dd4bf' : '#e74c3c'
  const badge = rawKind === 'buffer' ? 'BUFFER ZONE' : rawKind === 'uc' ? 'CONSERVATION UNIT' : 'PROTECTED AREA'
  const name = String(p.name ?? 'Unknown')
  const sourceUrl = typeof p.source_url === 'string' ? p.source_url : ''
  const note = rawKind === 'uc'
    ? 'Conservation units restrict land use by law — mining inside an APA without a license violates its creation decree and the SNUC (Law 9.985/2000).'
    : rawKind === 'buffer'
      ? 'Indicative buffer ring around a protected area — activities here require heightened environmental licensing scrutiny.'
      : 'Mining claims overlapping this territory may violate Free, Prior and Informed Consent (FPIC) under ILO Convention 169.'
  return `<div class="ree-popup__inner" style="--ree-accent:${protColor}">
    <div class="ree-popup__header">
      <div class="ree-popup__badges"><span class="ree-popup__badge" style="background:${protColor};color:#fff">${badge}</span></div>
      <h3 class="ree-popup__title">${escapeText(name)}</h3>
      <p class="ree-popup__subtitle">${escapeText(kind)}</p>
    </div>
    <div class="ree-popup__body">
      <p style="font-size:16px;line-height:1.55;color:var(--obs-text-body);margin:0">${note}</p>
      ${sourceUrl ? `<a class="ree-popup__action ree-popup__action--primary" style="margin-top:12px" href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
    </div>
  </div>`
}

function waterPanelHTML(p: Record<string, unknown>): string {
  const waterType = String(p.water_type ?? p.water ?? p.waterway ?? 'water')
  const typeLabel = waterType.charAt(0).toUpperCase() + waterType.slice(1)
  const name = String(p.name ?? 'Unnamed water body')
  let sizeInfo = ''
  if (p.area_km2) sizeInfo = `Area: ${p.area_km2} km²`
  else if (p.length_km) sizeInfo = `Length: ${p.length_km} km`
  const threat2 = Number(p.threat_claims_2km ?? 0)
  const threat5 = Number(p.threat_claims_5km ?? 0)
  const nearest = p.threat_nearest ? String(p.threat_nearest) : ''
  const threatBadge = threat2 > 0
    ? `<span class="ree-popup__badge" style="background:#e74c3c;color:#fff">UNDER PRESSURE</span>`
    : threat5 > 0
      ? `<span class="ree-popup__badge" style="background:#f39c12;color:#fff">WATCH</span>`
      : ''
  return `<div class="ree-popup__inner" style="--ree-accent:#3498db">
    <div class="ree-popup__header">
      <div class="ree-popup__badges"><span class="ree-popup__badge" style="background:#3498db;color:#fff">WATER</span><span class="ree-popup__badge" style="background:rgba(52,152,219,0.2);color:#5dade2">${escapeText(typeLabel)}</span>${threatBadge}</div>
      <h3 class="ree-popup__title">${escapeText(name)}</h3>
      ${sizeInfo ? `<p class="ree-popup__subtitle">${escapeText(sizeInfo)}</p>` : ''}
    </div>
    ${(threat2 > 0 || threat5 > 0) ? `<div class="ree-popup__body"><div class="ree-popup__section" style="margin-top:0;padding-top:0;border-top:0"><div class="ree-popup__section-label">Mining pressure</div><div style="font-size:16px;font-weight:600">${threat2} claims ≤2km · ${threat5} claims ≤5km</div>${nearest ? `<div style="font-size:14px;color:var(--obs-text-muted);margin-top:4px">Nearest: ${escapeText(nearest)}</div>` : ''}</div></div>` : ''}
  </div>`
}

function sitePanelHTML(p: Record<string, unknown>): string {
  const dangerScore = Number(p.danger ?? 5)
  const dColor = dangerScore >= 9 ? '#e74c3c' : dangerScore >= 7 ? '#f39c12' : '#27ae60'
  return `<div class="ree-popup__inner" style="--ree-accent:${dColor}">
    <div class="ree-popup__header">
      <div class="ree-popup__badges"><span class="ree-popup__badge" style="background:${dColor};color:#fff">${dangerScore.toFixed(1)} Danger</span><span class="ree-popup__badge" style="background:rgba(239,68,68,0.2);color:#e74c3c">CONFLICT ZONE</span></div>
      <h3 class="ree-popup__title">${escapeText(String(p.name ?? 'Unknown'))}</h3>
      <p class="ree-popup__subtitle">${escapeText(String(p.tag ?? ''))}</p>
    </div>
  </div>`
}

function geoPanelHTML(p: Record<string, unknown>): string {
  const type = String(p.type ?? 'area')
  const typeColor = type === 'basin' ? '#3b82f6' : type === 'aquifer' ? '#a855f7' : type === 'nuclear' || type === 'nuclear_buffer' ? '#dc2626' : '#3b82f6'
  const typeLabel = type === 'nuclear_buffer' ? 'BUFFER ZONE' : escapeText(type.toUpperCase())
  const body = type === 'nuclear_buffer'
    ? 'Zona de amortecimento (3 km) around the INB Caldas uranium mining claim — the oversized legacy INB box was removed; only the real claim plus this buffer remain.'
    : 'Geological context overlay — basins, aquifers and nuclear sites framing mining pressure in the region.'
  return `<div class="ree-popup__inner" style="--ree-accent:${typeColor}">
    <div class="ree-popup__header">
      <div class="ree-popup__badges"><span class="ree-popup__badge" style="background:${typeColor};color:#fff">${typeLabel}</span></div>
      <h3 class="ree-popup__title">${escapeText(String(p.name ?? 'Unnamed area'))}</h3>
    </div>
    <div class="ree-popup__body"><p style="font-size:16px;line-height:1.55;color:var(--obs-text-body);margin:0">${body}</p></div>
  </div>`
}

let stackedUid = 0

/** Strip a leading emoji/symbol prefix (`⛏ `, `◈ `, …) — the tab eyebrow already carries the kind. */
function cleanTabLabel(label: string): string {
  const cleaned = label.replace(/^[^\p{L}\p{N}]+/u, '').trim()
  return cleaned || label
}

function tr(t: StackedPopupConfig['t'], key: string, fallback: string): string {
  const v = t(key)
  return v && v !== key ? v : fallback
}

/** Short translated kind eyebrow shown above each tab label. */
function stackedKindEyebrow(kind: StackedHit['kind'], props: Record<string, unknown>, t: StackedPopupConfig['t']): string {
  if (kind === 'claim') return tr(t, 'observatory.popups.tabClaim', 'Claim')
  if (kind === 'boundary') return tr(t, 'observatory.popups.tabBoundary', 'Boundary')
  if (kind === 'water') return tr(t, 'observatory.popups.tabWater', 'Water')
  if (kind === 'site') return tr(t, 'observatory.popups.tabConflict', 'Conflict')
  if (kind === 'geo') {
    const gt = String(props.type ?? '').toLowerCase()
    if (gt === 'nuclear_buffer' || gt === 'buffer') return tr(t, 'observatory.layers.bufferZones', 'Buffer Zones')
    if (gt) return gt.charAt(0).toUpperCase() + gt.slice(1)
    return tr(t, 'observatory.popups.tabTerrain', 'Terrain')
  }
  const pk = String(props.kind ?? '')
  if (pk === 'ti') return tr(t, 'observatory.layers.indigenousLands', 'Indigenous Lands')
  if (pk === 'quilombo') return tr(t, 'observatory.layers.quilombolaTerritories', 'Quilombola Territories')
  if (pk === 'uc') return tr(t, 'observatory.layers.conservationUnits', 'Conservation Units')
  if (pk === 'buffer') return tr(t, 'observatory.layers.bufferZones', 'Buffer Zones')
  return tr(t, 'observatory.popups.protectedArea', 'Protected Area')
}

/**
 * Open a tabbed popup for stacked/overlapping layers at one click point.
 * Two-line tabs (kind eyebrow + feature name) under a visible "N overlapping
 * layers" header keep every overlapping layer reachable and legible instead
 * of only the topmost feature winning.
 */
export function openStackedObservatoryPopup(
  map: MapLibreMap,
  hits: StackedHit[],
  lngLat: [number, number],
  config: StackedPopupConfig,
): maplibregl.Popup | null {
  const list = hits.slice(0, 12)
  if (!list.length) return null
  const { t, locale, onSidebarOpen } = config
  const uid = ++stackedUid

  const root = document.createElement('div')
  root.className = 'ree-popup ree-popup--stacked'
  root.setAttribute('role', 'dialog')
  const stackTitle = tr(t, 'observatory.popups.stackedLayers', 'Overlapping layers')
  root.setAttribute('aria-label', `${stackTitle} (${list.length})`)
  root.style.setProperty('--stack-accent', stackedKindColor(list[0]!.kind, list[0]!.props))

  const tabsHTML = list.map((h, i) => {
    const color = stackedKindColor(h.kind, h.props)
    const eyebrow = stackedKindEyebrow(h.kind, h.props, t)
    const label = cleanTabLabel(h.label)
    return `<button type="button" role="tab" id="ree-tab-${uid}-${i}" aria-controls="ree-panel-${uid}-${i}" class="ree-popup__tab${i === 0 ? ' is-active' : ''}" data-index="${i}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" title="${escapeAttr(label)}" style="--tab-accent:${color}"><span class="ree-popup__tab-dot" style="background:${color}" aria-hidden="true"></span><span class="ree-popup__tab-text"><span class="ree-popup__tab-kind" style="color:${color}">${escapeText(eyebrow)}</span><span class="ree-popup__tab-label">${escapeText(label)}</span></span></button>`
  }).join('')

  const panelsHTML = list.map((h, i) => {
    let inner: string
    if (h.kind === 'claim') {
      const content = buildRareEarthPopupContent(h.props, lngLat, t, locale)
      inner = rareEarthPopupHTML(content, t)
    } else if (h.kind === 'boundary') {
      const content = buildRareEarthPopupContent(adaptBoundaryProps(h.props), lngLat, t, locale)
      inner = rareEarthPopupHTML(content, t)
    } else if (h.kind === 'protected') {
      inner = protectedPanelHTML(h.props)
    } else if (h.kind === 'water') {
      inner = waterPanelHTML(h.props)
    } else if (h.kind === 'site') {
      inner = sitePanelHTML(h.props)
    } else {
      inner = geoPanelHTML(h.props)
    }
    return `<section role="tabpanel" id="ree-panel-${uid}-${i}" aria-labelledby="ree-tab-${uid}-${i}" class="ree-popup__panel${i === 0 ? ' is-active' : ''}" data-index="${i}" tabindex="0"${i === 0 ? '' : ' hidden'}>${inner}</section>`
  }).join('')

  root.innerHTML = `<div class="ree-popup__stack-head"><span class="ree-popup__stack-title">${escapeText(stackTitle)}</span><span class="ree-popup__stack-count">${list.length}</span></div><div class="ree-popup__tabs" role="tablist" aria-label="${escapeAttr(stackTitle)}">${tabsHTML}</div><div class="ree-popup__panels">${panelsHTML}</div>`

  const tabs = [...root.querySelectorAll<HTMLButtonElement>('.ree-popup__tab')]
  const panels = [...root.querySelectorAll<HTMLElement>('.ree-popup__panel')]
  function activate(index: number, focusTab = false) {
    tabs.forEach((tb, i) => {
      const active = i === index
      tb.classList.toggle('is-active', active)
      tb.setAttribute('aria-selected', active ? 'true' : 'false')
      tb.tabIndex = active ? 0 : -1
      if (active) {
        const accent = getComputedStyle(tb).getPropertyValue('--tab-accent').trim()
        if (accent) root.style.setProperty('--stack-accent', accent)
        try { tb.scrollIntoView({ block: 'nearest', inline: 'nearest' }) } catch { /* ignore */ }
        if (focusTab) tb.focus()
      }
    })
    panels.forEach((pn, i) => {
      const active = i === index
      pn.classList.toggle('is-active', active)
      if (active) pn.removeAttribute('hidden')
      else pn.setAttribute('hidden', '')
    })
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i))
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length, true) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length, true) }
      else if (e.key === 'Home') { e.preventDefault(); activate(0, true) }
      else if (e.key === 'End') { e.preventDefault(); activate(tabs.length - 1, true) }
    })
  })

  root.querySelectorAll<HTMLButtonElement>('[data-event="observatory:open"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const payload = btn.dataset.payload ? JSON.parse(btn.dataset.payload) : null
      if (payload && onSidebarOpen) onSidebarOpen(payload)
      const sel = useObservatorySelection()
      sel.select({
        processo: payload?.processo ?? null,
        nome: payload?.nome ?? null,
        coords: payload?.coords ?? null,
        tab: payload?.tab ?? 'danger',
      })
    })
  })

  const popup = new maplibregl.Popup({
    offset: 12,
    closeButton: true,
    className: 'ree-popup-wrap ree-popup-wrap--stacked',
    maxWidth: '660px',
  })
    .setLngLat(lngLat)
    .setDOMContent(root)
    .addTo(map)
  return popup
}

/**
 * Wire up the global click-to-popup handler for the rare-earth layers.
 * Returns a cleanup function.
 * Requires `t` and `locale` from the caller's Vue setup context.
 */
export function attachRareEarthPopupHandler(
  map: MapLibreMap,
  layerIds: string[],
  handlers: ClickHandlers = {},
  t: (_key: string, _params?: Record<string, unknown>) => string = (k) => k,
  locale: { value: string } = { value: 'en' },
): () => void {
  const wrapped = layerIds.map((id) => {
    const handler = (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as Record<string, unknown>
      openRareEarthPopup(map, p, [e.lngLat.lng, e.lngLat.lat], handlers, t, locale)
    }
    map.on('click', id, handler)
    return [id, handler] as const
  })
  return () => {
    for (const [id, h] of wrapped) map.off('click', id, h)
  }
}
