/**
 * Reactive, i18n-aware popup content for Rare Earth Observatory features.
 * Replaces the raw HTML string builder with a structured data model that
 * can be rendered reactively and rebuilt on locale change.
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

/**
 * Convert a raw GeoJSON feature property set (snake_case keys, ANM format)
 * to the structured popup model.
 */
export function buildRareEarthPopupContent(props: Record<string, unknown>, lngLat: [number, number]): RareEarthPopupContent {
  const { t, locale } = useI18n()

  const catKey: string = props.c ?? props.category ?? 'unknown'
  const cat = RARE_EARTH_CATEGORIES[catKey] ?? { label: catKey, color: '#666' }
  const catLabelKey = `observatory.categories.${catKey}`
  const catLabel = (locale.value && t(catLabelKey) !== catLabelKey) ? t(catLabelKey) : cat.label

  const dangerScore = Number(props.ds ?? props.danger_score ?? 5)
  const areaHa = Number(props.a ?? props.area_ha ?? 0)
  const uf: string = props.u ?? props.uf ?? ''
  const processo: string = props.p ?? props.processo ?? ''
  const nome: string = props.n ?? props.nome ?? t('observatory.popups.unknown')
  const subs: string = props.s ?? props.subs ?? '—'
  const fase: string = props.f ?? props.fase ?? '—'
  const ano: number = Number(props.ano ?? props.y ?? 0)
  const networkId: string = props.net ?? props.network_id ?? ''
  const lastEventText: string = props.ev ?? props.ultimo_evento ?? ''
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
  if (ano) {
    fields.push({ label: t('observatory.popups.year'), value: String(ano) })
  }

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
  // Sidebar bridge action
  actions.push({
    kind: 'event',
    label: t('observatory.actions.openInSidebar'),
    eventName: 'observatory:open',
    payload: { processo, nome, tab: 'danger', coords: lngLat },
    variant: 'primary',
    icon: '⤴',
  })

  return {
    title: nome,
    subtitle: subs,
    badges,
    fields,
    dangerScore,
    lastEvent,
    overlaps,
    actions,
    sourceFeatureId: props.id ?? null,
  }
}

/**
 * Render the structured popup content into a MapLibre Popup DOM element.
 * Re-renders when locale changes (re-call with same content).
 */
export function renderRareEarthPopup(
  content: RareEarthPopupContent,
  _options: { className?: string; maxWidth?: string } = {},
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'ree-popup'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', content.title)
  root.innerHTML = rareEarthPopupHTML(content)
  return root
}

function rareEarthPopupHTML(c: RareEarthPopupContent): string {
  const dangerColorVal = dangerColor(c.dangerScore)
  const badgesHTML = c.badges
    .map(b => `<span class="ree-popup__badge" style="background:${b.color};color:#fff" title="${escapeAttr(b.title ?? b.label)}">${escapeText(b.label)}</span>`)
    .join('')

  const fieldsHTML = c.fields
    .map(f => `<div class="ree-popup__field"><div class="ree-popup__field-label">${escapeText(f.label)}</div><div class="ree-popup__field-value">${escapeText(f.value)}</div></div>`)
    .join('')

  const lastEventHTML = c.lastEvent
    ? `<div class="ree-popup__section">
         <div class="ree-popup__section-label">${escapeText(label('lastEvent'))}</div>
         <div class="ree-popup__last-event">
           <span class="ree-popup__event-text">${escapeText(c.lastEvent.text)}</span>
           <span class="ree-popup__event-freshness ree-popup__event-freshness--${c.lastEvent.freshness}">${escapeText(label('lastEvent' + c.lastEvent.freshness.charAt(0).toUpperCase() + c.lastEvent.freshness.slice(1)))}</span>
         </div>
       </div>`
    : ''

  const overlapsHTML = c.overlaps && c.overlaps.length
    ? `<div class="ree-popup__section">
         <div class="ree-popup__section-label">${escapeText(label('overlaps'))}</div>
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

  return `
    <div class="ree-popup__inner" style="--ree-accent:${dangerColorVal}">
      <div class="ree-popup__header">
        <div class="ree-popup__badges">${badgesHTML}</div>
        <h3 class="ree-popup__title">${escapeText(c.title)}</h3>
        ${c.subtitle ? `<p class="ree-popup__subtitle">${escapeText(c.subtitle)}</p>` : ''}
      </div>
      <div class="ree-popup__body">
        <div class="ree-popup__danger">
          <div class="ree-popup__danger-label">${escapeText(label('dangerLevel'))}</div>
          <div class="ree-popup__danger-bar"><div class="ree-popup__danger-fill" style="width:${Math.min(100, c.dangerScore * 10)}%;background:${dangerColorVal}"></div></div>
          <div class="ree-popup__danger-score" style="color:${dangerColorVal}">${c.dangerScore.toFixed(1)}</div>
        </div>
        <div class="ree-popup__fields">${fieldsHTML}</div>
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
function label(key: string): string {
  const { t } = useI18n()
  return t(`observatory.popups.${key}`)
}

interface ClickHandlers {
  onSidebarOpen?: (_payload: { processo: string; nome: string; tab: string; coords: [number, number] }) => void
}

/**
 * Open a MapLibre popup on the map for the given feature properties.
 * Wires the "open in sidebar" action through the provided handler.
 */
export function openRareEarthPopup(
  map: MapLibreMap,
  props: Record<string, unknown>,
  lngLat: [number, number],
  handlers: ClickHandlers = {},
): maplibregl.Popup {
  const content = buildRareEarthPopupContent(props, lngLat)
  const node = renderRareEarthPopup(content, { className: 'ree-popup' })

  // Wire sidebar action
  node.querySelectorAll<HTMLButtonElement>('[data-event="observatory:open"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const payload = btn.dataset.payload ? JSON.parse(btn.dataset.payload) : null
      if (payload && handlers.onSidebarOpen) handlers.onSidebarOpen(payload)
      // Also update global selection state
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
    offset: 10,
    closeButton: true,
    className: 'ree-popup-wrap',
    maxWidth: '320px',
  })
    .setLngLat(lngLat)
    .setDOMContent(node)
    .addTo(map)
  return popup
}

/**
 * Wire up the global click-to-popup handler for the rare-earth layers.
 * Returns a cleanup function.
 */
export function attachRareEarthPopupHandler(
  map: MapLibreMap,
  layerIds: string[],
  handlers: ClickHandlers = {},
): () => void {
  const wrapped = layerIds.map((id) => {
    const handler = (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return
      const p = e.features[0].properties as Record<string, unknown>
      openRareEarthPopup(map, p, [e.lngLat.lng, e.lngLat.lat], handlers)
    }
    map.on('click', id, handler)
    return [id, handler] as const
  })
  return () => {
    for (const [id, h] of wrapped) map.off('click', id, h)
  }
}
