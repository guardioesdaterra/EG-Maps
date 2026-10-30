import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMapPopupPadding, mountMapPopup, withMapPopupSafeArea } from '../lib/map-popup-safe-area'

function setBounds(element: HTMLElement, top: number, bottom: number) {
  element.getBoundingClientRect = () => ({ top, bottom } as DOMRect)
}

describe('map popup safe areas', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  it('reserves the space occupied by the mobile header and dock', () => {
    const header = document.createElement('header')
    header.dataset.mapPopupSafeArea = 'top'
    setBounds(header, 8, 64)
    const dock = document.createElement('div')
    dock.dataset.mapPopupSafeArea = 'bottom'
    setBounds(dock, 716, 780)
    document.body.append(header, dock)

    expect(getMapPopupPadding({ getBoundingClientRect: () => ({ top: 0, bottom: 800 } as DOMRect) }))
      .toEqual({ top: 76, right: 12, bottom: 96, left: 12 })
  })

  it('keeps a small fallback inset when a header or dock is hidden', () => {
    expect(getMapPopupPadding({ getBoundingClientRect: () => ({ top: 0, bottom: 800 } as DOMRect) }))
      .toEqual({ top: 12, right: 12, bottom: 12, left: 12 })
  })

  it('retains compact desktop padding and merges it into popup options', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    const padding = { top: 8, right: 8, bottom: 8, left: 8 }
    expect(withMapPopupSafeArea({ offset: 10 }, { getBoundingClientRect: () => ({ top: 0, bottom: 800 } as DOMRect) }))
      .toEqual({ offset: 10, padding })
  })

  it('promotes mobile details popups above map stacking contexts and closes on backdrop tap', () => {
    const container = document.createElement('div')
    document.body.append(container)
    const element = document.createElement('div')
    const popup = {
      addTo: vi.fn(() => { container.append(element); return popup }),
      getElement: () => element,
      remove: vi.fn(),
    }
    const map = { getContainer: () => container }

    mountMapPopup(popup as never, map as never)

    expect(popup.addTo).toHaveBeenCalledOnce()
    expect(element.parentElement).toBe(document.body)
    expect(element.classList.contains('map-popup-mobile-fullscreen')).toBe(true)
    element.click()
    expect(popup.remove).toHaveBeenCalledOnce()
  })
})
