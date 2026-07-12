import { ref, nextTick, onScopeDispose, type Ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { HEX_GRID } from '@/lib/constants'

export interface HexGridOptions {
  /** Hex size for mobile (default: HEX_GRID.mobileSize) */
  mobileSize?: number
  /** Hex size for desktop (default: HEX_GRID.desktopSize) */
  desktopSize?: number
  /** Stroke color (default: HEX_GRID.strokeColor) */
  strokeColor?: string
  /** Line width (default: HEX_GRID.lineWidth) */
  lineWidth?: number
  /** Quality scale factor (0-1) — reduces hex density on low-end devices */
  qualityScale?: number
}

export function useMapHexGrid(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: HexGridOptions = {},
) {
  const showHexGrid = ref(true)
  const isMobile = useMediaQuery('(max-width: 768px)')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let rafHandle: number | null = null
  let isDrawing = false
  let cancelled = false
  let lastWidth = 0
  let lastHeight = 0
  let lastDpr = 0

  const cfg = {
    mobileSize: options.mobileSize ?? HEX_GRID.mobileSize,
    desktopSize: options.desktopSize ?? HEX_GRID.desktopSize,
    strokeColor: options.strokeColor ?? HEX_GRID.strokeColor,
    lineWidth: options.lineWidth ?? HEX_GRID.lineWidth,
    qualityScale: options.qualityScale ?? 1,
  }

  function setupHexGrid() {
    if (cancelled || isDrawing) return
    const canvas = canvasRef.value
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    if (dpr === lastDpr && w === lastWidth && h === lastHeight) return
    lastDpr = dpr
    lastWidth = w
    lastHeight = h

    isDrawing = true
    try {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const baseHexSize = isMobile.value ? cfg.mobileSize : cfg.desktopSize
      const hexSize = Math.round(baseHexSize / Math.max(cfg.qualityScale, 0.3))
      const hexHeight = hexSize * Math.sqrt(3)
      const hexWidth = hexSize * 2
      const hexVerticalOffset = hexHeight * 0.75
      const hexHorizontalOffset = hexWidth * 0.5
      const columns = Math.ceil(w / hexHorizontalOffset) + 1
      const rows = Math.ceil(h / hexVerticalOffset) + 1

      ctx.strokeStyle = cfg.strokeColor
      ctx.lineWidth = cfg.lineWidth

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const x = col * hexHorizontalOffset
          const y = row * hexVerticalOffset + (col % 2 === 0 ? 0 : hexHeight / 2)
          if (x < -hexWidth || x > w + hexWidth || y < -hexHeight || y > h + hexHeight) continue
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i
            const hx = x + hexSize * Math.cos(angle)
            const hy = y + hexSize * Math.sin(angle)
            if (i === 0) ctx.moveTo(hx, hy)
            else ctx.lineTo(hx, hy)
          }
          ctx.closePath()
          ctx.stroke()
        }
      }
    } finally {
      isDrawing = false
    }
  }

  function debouncedSetup() {
    if (cancelled) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (cancelled) return
      if (rafHandle) cancelAnimationFrame(rafHandle)
      rafHandle = requestAnimationFrame(() => {
        rafHandle = null
        setupHexGrid()
      })
    }, HEX_GRID.debounceMs)
  }

  async function onVisibilityChange(visible: boolean) {
    if (!visible) return
    await nextTick()
    setupHexGrid()
  }

  function cleanup() {
    cancelled = true
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (rafHandle) {
      cancelAnimationFrame(rafHandle)
      rafHandle = null
    }
  }

  onScopeDispose(cleanup)

  return {
    showHexGrid,
    setupHexGrid,
    debouncedSetup,
    onVisibilityChange,
    cleanup,
  }
}
