const MARKER_THUMB_SIZE = 64
const POPUP_THUMB_SIZE = 560
const MAX_CONCURRENT_LOADS = 6
const CACHE_TTL_MS = 5 * 60 * 1000

const PLACEHOLDER_SVG_STRINGS: Record<string, string> = {
  Mammal: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="52" r="13" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><circle cx="38" cy="36" r="5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><circle cx="62" cy="36" r="5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/></svg>',
  Bird: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M15 60 Q35 30 50 50 Q65 30 85 60" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/></svg>',
  Amphibian: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="56" rx="15" ry="10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><circle cx="41" cy="44" r="3.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><circle cx="59" cy="44" r="3.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/></svg>',
  Reptile: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="52" rx="12" ry="7" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><path d="M38 52 L20 48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><path d="M62 52 L80 48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><path d="M50 59 L46 72" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></svg>',
  Fish: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="46" cy="50" rx="17" ry="8" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><path d="M63 50 L80 40 L80 60 Z" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><circle cx="34" cy="48" r="1.5" fill="rgba(255,255,255,0.15)"/></svg>',
  Plant: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M28 65C23 40 50 22 50 22C50 22 77 40 72 65C67 78 33 78 28 65Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/><line x1="50" y1="28" x2="50" y2="60" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/></svg>',
  Invertebrate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="40" cy="46" rx="10" ry="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><ellipse cx="60" cy="46" rx="10" ry="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/><ellipse cx="50" cy="58" rx="3.5" ry="7" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/></svg>',
  Tree: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,22 30,62 70,62" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><line x1="50" y1="62" x2="50" y2="76" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/></svg>',
  Recycle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><polyline points="50,34 56,42 44,42" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><polyline points="66,50 58,56 58,44" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><polyline points="34,50 42,44 42,56" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/></svg>',
  Agriculture: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 70 L50 40 Q50 25 35 30" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><path d="M50 40 Q50 25 65 30" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/></svg>',
  Water: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 30 Q38 50 38 58 A12 12 0 0 0 62 58 Q62 50 50 30Z" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/></svg>',
  Energy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polyline points="56,28 40,50 52,50 44,72" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linejoin="round"/></svg>',
  Education: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M30 35 L50 30 L70 35 L70 70 L50 65 L30 70 Z" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><line x1="50" y1="30" x2="50" y2="65" stroke="rgba(255,255,255,0.12)" stroke-width="1"/></svg>',
  Community: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 65 Q25 45 30 35 Q35 25 50 35 Q65 25 70 35 Q75 45 50 65Z" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/></svg>',
  Bee: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="10" ry="14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><line x1="42" y1="44" x2="58" y2="44" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><line x1="40" y1="50" x2="60" y2="50" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/><line x1="42" y1="56" x2="58" y2="56" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/></svg>',
  Health: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><line x1="50" y1="32" x2="50" y2="68" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/><line x1="32" y1="50" x2="68" y2="50" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-linecap="round"/></svg>',
  Climate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="44" y="30" width="12" height="30" rx="6" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><circle cx="50" cy="66" r="8" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/><line x1="50" y1="40" x2="50" y2="56" stroke="rgba(255,255,255,0.12)" stroke-width="1.2"/></svg>',
  Default: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="18" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/><ellipse cx="50" cy="50" rx="9" ry="18" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><line x1="32" y1="50" x2="68" y2="50" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></svg>',
}

export function getMarkerPlaceholder(group?: string): string {
  const svg = (group && PLACEHOLDER_SVG_STRINGS[group]) || PLACEHOLDER_SVG_STRINGS.Default
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const PROJECT_PLACEHOLDER_RULES: [RegExp, string][] = [
  [/tree|rebois|arbres|fore[tç]|reforest|mangrove|bamboo/, 'Tree'],
  [/recycl|waste|d[eé]chet|plastic|garbage|trash|clean.?up|briquette|charcoal/, 'Recycle'],
  [/agricultur|farming|agro|organic|food|garden|jardin|aliment|seed/, 'Agriculture'],
  [/water|river|riverbank|coastal|wetland|lake|marine|ocean/, 'Water'],
  [/energy|electric|solar|power/, 'Energy'],
  [/school|education|student|youth|children|kids|training|debat|literacy|contest|club/, 'Education'],
  [/community|indigenous|wom[e]n|rural|displaced|people|social/, 'Community'],
  [/bee|beekee|apicultur|melipon|stingless/, 'Bee'],
  [/health|healthcare|mental|hospital|clinic/, 'Health'],
  [/climate|warming|carbon/, 'Climate'],
]

export function getProjectPlaceholder(title: string): string {
  const lower = title.toLowerCase()
  for (const [pattern, key] of PROJECT_PLACEHOLDER_RULES) {
    if (pattern.test(lower)) return key
  }
  return 'Default'
}

interface CacheEntry {
  url: string
  timestamp: number
  error?: boolean
}

const imageCache = new Map<string, CacheEntry>()
const loadingPromises = new Map<string, Promise<string | null>>()
let activeLoads = 0
const loadQueue: Array<() => void> = []

function resolveLocalUrl(url: string, baseURL?: string): string {
  if (!baseURL || baseURL === '/') return url
  return baseURL + url.replace(/^\//, '')
}

function getThumbnailPath(originalUrl: string, width: number, baseURL?: string): string {
  const filename = originalUrl.replace(/^\//, '')
  const basename = filename.split('/').pop() || filename
  const name = basename.replace(/\.[^.]+$/, '')
  const prefix = baseURL && baseURL !== '/' ? baseURL : '/'
  return `${prefix}images/species/thumb/${name}.webp`
}

export function getThumbnailUrl(originalUrl: string, width: number, baseURL?: string): string {
  if (!originalUrl) return ''

  // Local files: serve WebP thumbnail for markers, original for popups
  if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
    if (width === MARKER_THUMB_SIZE) {
      return getThumbnailPath(originalUrl, width, baseURL)
    }
    return resolveLocalUrl(originalUrl, baseURL)
  }

  if (originalUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    const filename = originalUrl.split('/Special:FilePath/')[1]
    if (!filename) return originalUrl
    const encoded = encodeURIComponent(filename)
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encoded}?width=${width}`
  }

  if (originalUrl.includes('upload.wikimedia.org')) {
    const separator = originalUrl.includes('?') ? '&' : '?'
    return `${originalUrl}${separator}width=${width}`
  }

  return originalUrl
}

export function getMarkerImageUrl(originalUrl: string, baseURL?: string): string {
  if (!originalUrl) return ''
  return getThumbnailUrl(originalUrl, MARKER_THUMB_SIZE, baseURL)
}

export function getPopupImageUrl(originalUrl: string, baseURL?: string): string {
  if (!originalUrl) return ''
  // Full-size WebP at 100% quality for popup images
  if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
    const filename = originalUrl.replace(/^\//, '')
    const basename = filename.split('/').pop() || filename
    const name = basename.replace(/\.[^.]+$/, '')
    const prefix = baseURL && baseURL !== '/' ? baseURL : '/'
    return `${prefix}images/species/thumb/${name}_full.webp`
  }
  return getThumbnailUrl(originalUrl, POPUP_THUMB_SIZE, baseURL)
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL_MS
}

function enqueueLoad(): boolean {
  if (activeLoads < MAX_CONCURRENT_LOADS) {
    activeLoads++
    return true
  }
  return false
}

function dequeueLoad(): void {
  activeLoads--
  if (loadQueue.length > 0) {
    const next = loadQueue.shift()!
    next()
  }
}

async function loadImageWithQueue(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const tryLoad = async () => {
      try {
        await new Promise<void>((resolveImg, rejectImg) => {
          const img = new Image()
          const timer = setTimeout(() => {
            img.src = ''
            rejectImg(new Error('Timeout'))
          }, 8000)
          img.onload = () => { clearTimeout(timer); resolveImg() }
          img.onerror = () => { clearTimeout(timer); rejectImg(new Error('Failed to load')) }
          img.src = url
        })
        resolve(url)
      } catch {
        resolve(null)
      } finally {
        dequeueLoad()
      }
    }

    if (!enqueueLoad()) {
      loadQueue.push(tryLoad)
    } else {
      tryLoad()
    }
  })
}

export async function preloadImage(url: string): Promise<string | null> {
  if (!url) return null

  const cached = imageCache.get(url)
  if (cached && isCacheValid(cached)) {
    return cached.error ? null : url
  }

  const existing = loadingPromises.get(url)
  if (existing) return existing

  const promise = (async () => {
    const loadedUrl = await loadImageWithQueue(url)
    if (loadedUrl) {
      imageCache.set(url, { url: loadedUrl, timestamp: Date.now() })
      return loadedUrl
    }
    imageCache.set(url, { url, timestamp: Date.now(), error: true })
    return null
  })()

  loadingPromises.set(url, promise)
  promise.finally(() => loadingPromises.delete(url))

  return promise
}

export function preloadSpeciesImages(imageUrls: string[], markerOnly = false, baseURL?: string): void {
  const urls = [...new Set(imageUrls.filter(Boolean))]
  const markerUrls = urls.map(u => getMarkerImageUrl(u, baseURL))
  
  markerUrls.forEach(url => {
    if (url) preloadImage(url)
  })

  if (!markerOnly) {
    const popupUrls = urls.map(u => getPopupImageUrl(u, baseURL))
    popupUrls.forEach(url => {
      if (url) preloadImage(url)
    })
  }
}

export function clearImageCache(): void {
  imageCache.clear()
  loadingPromises.clear()
  loadQueue.length = 0
  activeLoads = 0
}
