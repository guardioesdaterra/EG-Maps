import { ref, nextTick, type Ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

export function useMapHexGrid(canvasRef: Ref<HTMLCanvasElement | null>) {
  const showHexGrid = ref(true)
  const isMobile = useMediaQuery('(max-width: 768px)')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function setupHexGrid() {
    const canvas = canvasRef.value
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const hexSize = isMobile.value ? 35 : 50
    const hexHeight = hexSize * Math.sqrt(3)
    const hexWidth = hexSize * 2
    const hexVerticalOffset = hexHeight * 0.75
    const hexHorizontalOffset = hexWidth * 0.5
    const columns = Math.ceil(window.innerWidth / hexHorizontalOffset) + 1
    const rows = Math.ceil(window.innerHeight / hexVerticalOffset) + 1

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)'
    ctx.lineWidth = 1.5

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = col * hexHorizontalOffset
        const y = row * hexVerticalOffset + (col % 2 === 0 ? 0 : hexHeight / 2)
        if (x < -hexWidth || x > window.innerWidth + hexWidth || y < -hexHeight || y > window.innerHeight + hexHeight) continue
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
  }

  function debouncedSetup() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      setupHexGrid()
      debounceTimer = null
    }, 150)
  }

  async function onVisibilityChange(visible: boolean) {
    if (!visible) return
    await nextTick()
    setupHexGrid()
  }

  function cleanup() {
    if (debounceTimer) clearTimeout(debounceTimer)
  }

  return {
    showHexGrid,
    setupHexGrid,
    debouncedSetup,
    onVisibilityChange,
    cleanup,
  }
}
