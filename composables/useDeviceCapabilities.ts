import { ref, onMounted } from 'vue'

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
  isLowEndDevice: boolean
  isMobile: boolean
}

const detected = ref<DeviceCapabilities | null>(null)

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

function getConnectionType(): string {
  try {
    const conn = (navigator as { connection?: { effectiveType?: string } }).connection
    return conn?.effectiveType || 'unknown'
  } catch {
    return 'unknown'
  }
}

function detectMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function getWebGLInfo(): { version: number; vendor: string; renderer: string; maxTextureSize: number } {
  if (typeof document === 'undefined') {
    return { version: 1, vendor: '', renderer: '', maxTextureSize: 4096 }
  }

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
      return { version: 2, vendor, renderer, maxTextureSize }
    }
    const gl1 = canvas.getContext('webgl') as WebGLRenderingContext | null
    if (gl1) {
      const debugInfo = gl1.getExtension('WEBGL_debug_renderer_info')
      const vendor = debugInfo ? gl1.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : ''
      const renderer = debugInfo ? gl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
      const maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE)
      return { version: 1, vendor, renderer, maxTextureSize }
    }
  } catch {
    // WebGL not available
  }
  return { version: 0, vendor: '', renderer: '', maxTextureSize: 4096 }
}

function classifyTier(caps: {
  cpuCores: number
  deviceMemory: number
  webglVersion: number
  gpuRenderer: string
  connectionType: string
  screenResolution: number
  isMobile: boolean
}): DeviceTier {
  const { cpuCores, deviceMemory, webglVersion, gpuRenderer, connectionType, screenResolution, isMobile } = caps

  let score = 0

  // CPU cores
  if (cpuCores >= 8) score += 3
  else if (cpuCores >= 4) score += 2
  else score += 1

  // Memory
  if (deviceMemory >= 8) score += 3
  else if (deviceMemory >= 4) score += 2
  else score += 1

  // WebGL
  if (webglVersion >= 2) score += 2
  else if (webglVersion === 1) score += 1

  // GPU renderer hints (common low-end GPUs)
  const lowEndGPUs = ['swiftshader', 'llvmpipe', 'softpipe', 'mesa', 'intel', 'adreno 3', 'adreno 4', 'mali-4', 'mali-t']
  const highEndGPUs = ['nvidia', 'radeon', 'amd', 'apple', 'adreno 6', 'adreno 7', 'mali-g', 'mali-b']
  const rendererLower = gpuRenderer.toLowerCase()
  if (lowEndGPUs.some(g => rendererLower.includes(g))) score -= 1
  if (highEndGPUs.some(g => rendererLower.includes(g))) score += 2

  // Connection
  if (connectionType === '4g') score += 1
  else if (connectionType === '3g' || connectionType === '2g') score -= 1

  // Screen resolution (total pixels)
  if (screenResolution > 4000000) score += 1 // > 4MP
  if (screenResolution < 1000000) score -= 1 // < 1MP

  // Mobile penalty
  if (isMobile) score -= 1

  if (score >= 8) return 'ultra'
  if (score >= 6) return 'high'
  if (score >= 4) return 'medium'
  return 'low'
}

function detect(): DeviceCapabilities {
  const cpuCores = getCPUCount()
  const deviceMemory = getDeviceMemory()
  const connectionType = getConnectionType()
  const isMobile = detectMobile()
  const { version: webglVersion, vendor: gpuVendor, renderer: gpuRenderer, maxTextureSize } = getWebGLInfo()
  const screenResolution = (typeof screen !== 'undefined') ? screen.width * screen.height : 1920 * 1080
  const devicePixelRatio = (typeof window !== 'undefined') ? window.devicePixelRatio || 1 : 1

  const tier = classifyTier({
    cpuCores,
    deviceMemory,
    webglVersion,
    gpuRenderer,
    connectionType,
    screenResolution,
    isMobile,
  })

  const isLowEndDevice = tier === 'low'

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
    connectionType,
    isLowEndDevice,
    isMobile,
  }
}

/**
 * Detects device hardware capabilities (CPU, GPU, memory, screen).
 * Runs once; result is cached and shared across all consumers.
 */
export function useDeviceCapabilities() {
  onMounted(() => {
    if (!detected.value) {
      detected.value = detect()
    }
  })

  return {
    capabilities: detected,
  }
}
