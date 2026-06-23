import { ref, nextTick, onScopeDispose, type Ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

export function useMapHexGrid(canvasRef: Ref<HTMLCanvasElement | null>) {
  const showHexGrid = ref(true)
  const isMobile = useMediaQuery('(max-width: 768px)')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let rafHandle: number | null = null
  let isDrawing = false
  let cancelled = false
  let lastWidth = 0
  let lastHeight = 0
  let lastDpr = 0

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

      const hexSize = isMobile.value ? 35 : 50
      const hexHeight = hexSize * Math.sqrt(3)
      const hexWidth = hexSize * 2
      const hexVerticalOffset = hexHeight * 0.75
      const hexHorizontalOffset = hexWidth * 0.5
      const columns = Math.ceil(w / hexHorizontalOffset) + 1
      const rows = Math.ceil(h / hexVerticalOffset) + 1

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)'
      ctx.lineWidth = 1.5

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
    }, 150)
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
