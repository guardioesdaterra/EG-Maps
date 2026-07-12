import { ref, onMounted, onUnmounted } from 'vue'

export type DeviceTier = 'low' | 'medium' | 'high' | 'ultra'

export interface DeviceCapabilities {
  tier: DeviceTier
  cpuCores: number
  deviceMemory: number
  screenResolution: number
  devicePixelRatio: number
  maxTextureSize: number
  webglVersion: number
  gpuVendor: string
  gpuRenderer: string
  connectionType: string
  connectionDownlink: number
  connectionRtt: number
  saveData: boolean
  isLowEndDevice: boolean
  isMobile: boolean
  prefersReducedMotion: boolean
  prefersReducedData: boolean
  isBatterySaving: boolean
  orientation: 'portrait' | 'landscape'
}

const detected = ref<DeviceCapabilities | null>(null)
let dprListeners: Array<(dpr: number) => void> = []
let dprMediaQuery: MediaQueryList | null = null

function getCPUCount(): number {
  try {
    return navigator.hardwareConcurrency || 2
  } catch {
    return 2
  }
}

function getDeviceMemory(): number {
  try {
    return (navigator as { deviceMemory?: number }).deviceMemory || 4
  } catch {
    return 4
  }
}

function getConnectionInfo(): { effectiveType: string; downlink: number; rtt: number; saveData: boolean } {
  try {
    const conn = (navigator as { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection
    if (conn) {
      return {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink ?? 10,
        rtt: conn.rtt ?? 50,
        saveData: conn.saveData ?? false,
      }
    }
  } catch { /* not supported */ }
  return { effectiveType: 'unknown', downlink: 10, rtt: 50, saveData: false }
}

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function getWebGLInfo(): { version: number; vendor: string; renderer: string; maxTextureSize: number } {
  if (typeof document === 'undefined') {
    return { version: 1, vendor: '', renderer: '', maxTextureSize: 4096 }
  }

  let canvas: HTMLCanvasElement | null = null
  try {
    canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null
    if (gl2) {
      const debugInfo = gl2.getExtension('WEBGL_debug_renderer_info')
      const vendor = debugInfo ? gl2.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
      const renderer = debugInfo ? gl2.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
      const maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE)
      gl2.getExtension('WEBGL_lose_context')?.loseContext()
      return { version: 2, vendor, renderer, maxTextureSize }
    }
    const gl1 = canvas.getContext('webgl') as WebGLRenderingContext | null
    if (gl1) {
      const debugInfo = gl1.getExtension('WEBGL_debug_renderer_info')
      const vendor = debugInfo ? gl1.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
      const renderer = debugInfo ? gl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
      const maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE)
      gl1.getExtension('WEBGL_lose_context')?.loseContext()
      return { version: 1, vendor, renderer, maxTextureSize }
    }
  } catch {
    // WebGL not available
  } finally {
    canvas = null
  }
  return { version: 0, vendor: '', renderer: '', maxTextureSize: 4096 }
}

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getPrefersReducedData(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-data: reduce)').matches
  } catch {
    return false
  }
}

function getOrientation(): 'portrait' | 'landscape' {
  if (typeof screen === 'undefined') return 'landscape'
  return screen.orientation?.type?.includes('portrait') ? 'portrait' : 'landscape'
}

async function getBatterySaving(): Promise<boolean> {
  try {
    const battery = await (navigator as { getBattery?: () => Promise<{ savingMode?: boolean; charging?: boolean }> }).getBattery?.()
    if (battery) {
      return battery.savingMode === true
    }
  } catch { /* not supported */ }
  return false
}

function classifyTier(caps: {
  cpuCores: number
  deviceMemory: number
  webglVersion: number
  gpuRenderer: string
  connectionDownlink: number
  screenResolution: number
  isMobile: boolean
  prefersReducedMotion: boolean
  isBatterySaving: boolean
}): DeviceTier {
  const { cpuCores, deviceMemory, webglVersion, gpuRenderer, connectionDownlink, screenResolution, isMobile, prefersReducedMotion, isBatterySaving } = caps

  let score = 0

  // CPU cores (0-3)
  if (cpuCores >= 8) score += 3
  else if (cpuCores >= 4) score += 2
  else score += 1

  // Memory (0-3)
  if (deviceMemory >= 8) score += 3
  else if (deviceMemory >= 4) score += 2
  else if (deviceMemory >= 2) score += 1

  // WebGL (0-2)
  if (webglVersion >= 2) score += 2
  else if (webglVersion === 1) score += 1

  // GPU renderer (±2)
  const lowEndGPUs = ['swiftshader', 'llvmpipe', 'softpipe', 'mesa', 'intel iris', 'intel hd', 'intel uhd', 'adreno 3', 'adreno 4', 'mali-4', 'mali-t', 'powervr']
  const highEndGPUs = ['nvidia', 'radeon', 'amd rx', 'amd na', 'apple m', 'adreno 6', 'adreno 7', 'mali-g', 'mali-b', 'rtx', 'geforce']
  const rendererLower = gpuRenderer.toLowerCase()
  if (lowEndGPUs.some(g => rendererLower.includes(g))) score -= 2
  if (highEndGPUs.some(g => rendererLower.includes(g))) score += 2

  // Network speed (0-1, -1)
  if (connectionDownlink >= 5) score += 1
  else if (connectionDownlink < 1) score -= 1

  // Screen resolution (0-1, -1)
  if (screenResolution > 4000000) score += 1
  if (screenResolution < 1000000) score -= 1

  // Mobile penalty (-1)
  if (isMobile) score -= 1

  // User preferences (-1 each)
  if (prefersReducedMotion) score -= 2
  if (isBatterySaving) score -= 2

  if (score >= 8) return 'ultra'
  if (score >= 5) return 'high'
  if (score >= 3) return 'medium'
  return 'low'
}

async function detect(): Promise<DeviceCapabilities> {
  const cpuCores = getCPUCount()
  const deviceMemory = getDeviceMemory()
  const conn = getConnectionInfo()
  const isMobile = detectMobile()
  const { version: webglVersion, vendor: gpuVendor, renderer: gpuRenderer, maxTextureSize } = getWebGLInfo()
  const screenResolution = (typeof screen !== 'undefined') ? screen.width * screen.height : 1920 * 1080
  const devicePixelRatio = (typeof window !== 'undefined') ? window.devicePixelRatio || 1 : 1
  const prefersReducedMotion = getPrefersReducedMotion()
  const prefersReducedData = getPrefersReducedData()
  const isBatterySaving = await getBatterySaving()
  const orientation = getOrientation()

  const tier = classifyTier({
    cpuCores,
    deviceMemory,
    webglVersion,
    gpuRenderer,
    connectionDownlink: conn.downlink,
    screenResolution,
    isMobile,
    prefersReducedMotion,
    isBatterySaving,
  })

  return {
    tier,
    cpuCores,
    deviceMemory,
    screenResolution,
    devicePixelRatio,
    maxTextureSize,
    webglVersion,
    gpuVendor,
    gpuRenderer,
    connectionType: conn.effectiveType,
    connectionDownlink: conn.downlink,
    connectionRtt: conn.rtt,
    saveData: conn.saveData,
    isLowEndDevice: tier === 'low',
    isMobile,
    prefersReducedMotion,
    prefersReducedData,
    isBatterySaving,
    orientation,
  }
}

/**
 * Detects device hardware capabilities (CPU, GPU, memory, network, preferences).
 * Runs once; result is cached and shared. Also watches DPR changes (e.g. iPad zoom).
 */
export function useDeviceCapabilities() {
  onMounted(async () => {
    if (!detected.value) {
      detected.value = await detect()
    }

    // Watch for devicePixelRatio changes (e.g. pinch-zoom on iPad changes effective DPR)
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mqString = `(resolution: ${window.devicePixelRatio}dppx)`
      dprMediaQuery = window.matchMedia(mqString)
      const handler = () => {
        if (detected.value) {
          detected.value = { ...detected.value, devicePixelRatio: window.devicePixelRatio || 1 }
        }
        // Re-register with new DPR
        dprMediaQuery?.removeEventListener('change', handler)
        if (typeof window !== 'undefined' && window.matchMedia) {
          const newMqString = `(resolution: ${window.devicePixelRatio}dppx)`
          dprMediaQuery = window.matchMedia(newMqString)
          dprMediaQuery.addEventListener('change', handler)
        }
      }
      dprMediaQuery.addEventListener('change', handler)
    }
  })

  onUnmounted(() => {
    // Don't tear down — shared singleton
  })

  return {
    capabilities: detected,
    onDprChange: (cb: (dpr: number) => void) => {
      dprListeners.push(cb)
      return () => { dprListeners = dprListeners.filter(l => l !== cb) }
    },
  }
}
