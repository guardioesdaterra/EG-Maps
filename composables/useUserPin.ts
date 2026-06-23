export interface UserPin {
  lng: number
  lat: number
  label: string
  savedAt: number
}

const STORAGE_KEY = 'egmaps.userPin.v1'
const HASH_PREFIX = 'pin='

function isClient() {
  return typeof window !== 'undefined'
}

function readStorage(): UserPin | null {
  if (!isClient()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as UserPin
    if (typeof obj?.lng !== 'number' || typeof obj?.lat !== 'number') return null
    return obj
  } catch {
    return null
  }
}

function writeStorage(pin: UserPin | null) {
  if (!isClient()) return
  try {
    if (pin) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pin))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    /* quota or privacy mode — fail silently */
  }
}

function readHash(): UserPin | null {
  if (!isClient()) return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.startsWith(HASH_PREFIX)) return null
  const params = new URLSearchParams(hash.slice(HASH_PREFIX.length))
  const coord = params.get('c')
  const label = params.get('l') ?? 'Shared location'
  if (!coord) return null
  const parts = coord.split(',').map(Number)
  if (parts.length !== 2 || parts.some(n => Number.isNaN(n))) return null
  return { lng: parts[0]!, lat: parts[1]!, label, savedAt: Date.now() }
}

function buildHash(pin: UserPin): string {
  const params = new URLSearchParams()
  params.set('c', `${pin.lng.toFixed(4)},${pin.lat.toFixed(4)}`)
  params.set('l', pin.label)
  return `#${HASH_PREFIX}${params.toString()}`
}

export function useUserPin() {
  const pin = ref<UserPin | null>(null)
  const sharedFromUrl = ref(false)

  if (isClient()) {
    const fromHash = readHash()
    const fromStorage = readStorage()
    if (fromHash) {
      pin.value = fromHash
      sharedFromUrl.value = true
      writeStorage(fromHash)
    } else {
      pin.value = fromStorage
    }

    watch(pin, (next) => {
      writeStorage(next)
    }, { deep: true })
  }

  function setPin(coords: { lng: number; lat: number }, label = 'My territory') {
    pin.value = { lng: coords.lng, lat: coords.lat, label, savedAt: Date.now() }
    if (sharedFromUrl.value && isClient()) {
      const url = new URL(window.location.href)
      url.hash = ''
      window.history.replaceState({}, '', url.toString())
      sharedFromUrl.value = false
    }
  }

  function clearPin() {
    pin.value = null
  }

  function getShareUrl(): string {
    if (!pin.value || !isClient()) return ''
    const url = new URL(window.location.href)
    url.hash = buildHash(pin.value)
    return url.toString()
  }

  async function copyShareUrl(): Promise<boolean> {
    if (!isClient() || !pin.value) return false
    const url = getShareUrl()
    if (!url) return false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        return true
      }
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }

  return { pin, sharedFromUrl, setPin, clearPin, getShareUrl, copyShareUrl }
}
