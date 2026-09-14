/**
 * composables/useMapHexGrid.ts
 * @why Canvas-based hex grid overlay for density visualization on the map
 * @functions useMapHexGrid
 * @interfaces HexGridOptions
 * @deps vue (ref, nextTick, onScopeDispose, type Ref); @/composables/useMediaQuery (useMediaQuery); @/lib/constants (HEX_GRID)
 * @connections composables/useMapBase.ts
 */
import { ref, nextTick, onScopeDispose, type Ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { HEX_GRID } from '@/lib/constants'

export interface HexGridOptions {
  mobileSize?: number
  desktopSize?: number
  strokeColor?: string
  lineWidth?: number
  /** Quality scale factor (0-1) — higher = coarser hexes = fewer = less work */
  qualityScale?: number
  /** Cap for devicePixelRatio on the overlay canvas. The grid is a faint
   * decorative overlay — DPR 1 is visually identical but uses 4x less
   * backing memory and fill-rate than DPR 2 (e.g. 8MB vs 33MB at 1080p). */
  maxDpr?: number
}

const TAU_DIV_6 = Math.PI / 3

export function useMapHexGrid(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: HexGridOptions = {},
) {
  const showHexGrid = ref(true)
  const isMobile = useMediaQuery('(max-width: 768px)')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let rafHandle: number | null = null
  let scheduledRaf = false
  let cancelled = false
  let lastWidth = 0
  let lastHeight = 0
  let lastDpr = 0
  let lastQualityScale = 1
  let lastBaseSize = 0

  const cfg = {
    mobileSize: options.mobileSize ?? HEX_GRID.mobileSize,
    desktopSize: options.desktopSize ?? HEX_GRID.desktopSize,
    strokeColor: options.strokeColor ?? HEX_GRID.strokeColor,
    lineWidth: options.lineWidth ?? HEX_GRID.lineWidth,
    qualityScale: options.qualityScale ?? 1,
    maxDpr: options.maxDpr ?? 1,
  }

  function drawHexGrid() {
    if (cancelled) return
    const canvas = canvasRef.value
    if (!canvas) return

    // DPR 1 is plenty for a faint line overlay — avoids 4x backing store
    // and 4x fragment work versus DPR 2.
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr)
    const w = window.innerWidth
    const h = window.innerHeight
    const qs = cfg.qualityScale
    const baseHexSize = isMobile.value ? cfg.mobileSize : cfg.desktopSize
    if (dpr === lastDpr && w === lastWidth && h === lastHeight && qs === lastQualityScale && baseHexSize === lastBaseSize) return
    lastDpr = dpr
    lastWidth = w
    lastHeight = h
    lastQualityScale = qs
    lastBaseSize = baseHexSize

    const cw = Math.round(w * dpr)
    const ch = Math.round(h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Clear without resetting canvas size (resizing would realloc + lose cache)
    ctx.clearRect(0, 0, w, h)

    const hexSize = Math.round(baseHexSize / Math.max(qs, 0.3))
    const hexHeight = hexSize * Math.sqrt(3)
    const hexWidth = hexSize * 2
    const hexVerticalOffset = hexHeight * 0.75
    const hexHorizontalOffset = hexWidth * 0.5
    const halfHexHeight = hexHeight / 2
    const columns = Math.ceil(w / hexHorizontalOffset) + 1
    const rows = Math.ceil(h / hexVerticalOffset) + 1

    // Precompute the 6 unit-corner offsets once — avoids ~4k trig calls.
    const ox = new Array<number>(6)
    const oy = new Array<number>(6)
    for (let i = 0; i < 6; i++) {
      const angle = TAU_DIV_6 * i
      ox[i] = hexSize * Math.cos(angle)
      oy[i] = hexSize * Math.sin(angle)
    }

    ctx.strokeStyle = cfg.strokeColor
    ctx.lineWidth = cfg.lineWidth

    // Batch ALL hexagons into a single path + single stroke call.
    // Previously each hex did beginPath/stroke (~700 state changes and
    // draw calls per redraw) — now it's exactly one.
    ctx.beginPath()
    for (let row = 0; row < rows; row++) {
      const yBase = row * hexVerticalOffset
      for (let col = 0; col < columns; col++) {
        const x = col * hexHorizontalOffset
        const y = yBase + (col % 2 === 0 ? 0 : halfHexHeight)
        if (x < -hexWidth || x > w + hexWidth || y < -hexHeight || y > h + hexHeight) continue
        ctx.moveTo(x + ox[0], y + oy[0])
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(x + ox[i], y + oy[i])
        }
        ctx.closePath()
      }
    }
    ctx.stroke()
  }

  /** Immediate redraw (used by init / visibility toggles). The batched
   * single-stroke draw is ~1ms, so synchronous drawing is fine here. */
  function setupHexGrid() {
    if (scheduledRaf) {
      if (rafHandle) cancelAnimationFrame(rafHandle)
      rafHandle = null
      scheduledRaf = false
    }
    drawHexGrid()
  }

  /** Coalesced redraw — collapses resize/quality bursts into one frame. */
  function requestDraw() {
    if (cancelled || scheduledRaf) return
    scheduledRaf = true
    rafHandle = requestAnimationFrame(() => {
      rafHandle = null
      scheduledRaf = false
      drawHexGrid()
    })
  }

  function debouncedSetup() {
    if (cancelled) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (cancelled) return
      requestDraw()
    }, HEX_GRID.debounceMs)
  }

  function updateQualityScale(scale: number) {
    if (cfg.qualityScale === scale) return
    cfg.qualityScale = scale
    requestDraw()
  }

  async function onVisibilityChange(visible: boolean) {
    if (!visible) return
    await nextTick()
    requestDraw()
  }

  function cleanup() {
    cancelled = true
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
    if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null }
    scheduledRaf = false
  }

  onScopeDispose(cleanup)

  return {
    showHexGrid,
    setupHexGrid,
    debouncedSetup,
    updateQualityScale,
    onVisibilityChange,
    cleanup,
  }
}
