import type { Map as MapLibreMap, Popup as MapLibrePopup } from 'maplibre-gl'

export interface MapPopupPadding {
  top: number
  right: number
  bottom: number
  left: number
}

type MapContainerBounds = Pick<DOMRect, 'top' | 'bottom'>
type MapContainerLike = { getBoundingClientRect: () => MapContainerBounds }

const MOBILE_BREAKPOINT = 768
const EDGE_GAP = 12
const DESKTOP_PADDING = 8

export function getMapPopupPadding(mapContainer?: MapContainerLike): MapPopupPadding {
  if (typeof window === 'undefined') {
    return { top: DESKTOP_PADDING, right: DESKTOP_PADDING, bottom: DESKTOP_PADDING, left: DESKTOP_PADDING }
  }

  if (window.innerWidth > MOBILE_BREAKPOINT) {
    return { top: DESKTOP_PADDING, right: DESKTOP_PADDING, bottom: DESKTOP_PADDING, left: DESKTOP_PADDING }
  }

  const mapBounds = mapContainer?.getBoundingClientRect()
  const mapTop = mapBounds?.top ?? 0
  const mapBottom = mapBounds?.bottom ?? window.innerHeight
  const header = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('[data-map-popup-safe-area="top"]')
  const dock = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('[data-map-popup-safe-area="bottom"]')
  const headerBottom = header?.getBoundingClientRect().bottom ?? mapTop
  const dockTop = dock?.getBoundingClientRect().top ?? mapBottom

  return {
    top: Math.max(EDGE_GAP, Math.ceil(headerBottom - mapTop + EDGE_GAP)),
    right: EDGE_GAP,
    bottom: Math.max(EDGE_GAP, Math.ceil(mapBottom - dockTop + EDGE_GAP)),
    left: EDGE_GAP,
  }
}

export function withMapPopupSafeArea<T extends object>(
  options: T,
  mapContainer?: MapContainerLike,
): T & { padding: MapPopupPadding } {
  return { ...options, padding: getMapPopupPadding(mapContainer) }
}

/** Mount a MapLibre popup and lift its mobile DOM out of the map stacking context. */
export function mountMapPopup(popup: MapLibrePopup, map: MapLibreMap): MapLibrePopup {
  popup.addTo(map)
  if (typeof window === 'undefined' || window.innerWidth > MOBILE_BREAKPOINT) return popup

  const element = popup.getElement()
  if (!element) return popup
  element.classList.add('map-popup-mobile-fullscreen')
  if (element.parentElement !== document.body) document.body.appendChild(element)
  element.addEventListener('click', (event) => {
    if (event.target === element) popup.remove()
  })
  return popup
}
