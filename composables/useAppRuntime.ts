import { createSharedComposable, useBroadcastChannel, useEventBus, useLocalStorage, usePreferredDark, usePreferredReducedMotion, useUrlSearchParams, useOnline, useBreakpoints, useSupported } from '@vueuse/core'
import { computed, watch } from 'vue'

export type AppTheme = 'auto' | 'light' | 'dark'
export type MapEvent =
  | { type: 'map:ready'; dataset?: string }
  | { type: 'cluster:open'; dataset?: string; count?: number }
  | { type: 'cluster:item-select'; id?: string }
  | { type: 'embed:error'; message?: string }
  | { type: 'campaign:open'; campaign?: string }

export const useAppRuntime = createSharedComposable(() => {
  const preferredDark = usePreferredDark()
  const prefersReducedMotion = usePreferredReducedMotion()
  const online = useOnline()
  const breakpoints = useBreakpoints({ mobile: 640, tablet: 1024 })
  const isMobile = breakpoints.smaller('mobile')
  const isTablet = breakpoints.smaller('tablet')
  const supportsShare = useSupported(() => typeof navigator !== 'undefined' && 'share' in navigator)
  const supportsGeolocation = useSupported(() => typeof navigator !== 'undefined' && 'geolocation' in navigator)
  const supportsClipboard = useSupported(() => typeof navigator !== 'undefined' && 'clipboard' in navigator)
  const supportsWorkers = useSupported(() => typeof Worker !== 'undefined')
  const params = useUrlSearchParams<'history', { dataset?: string; theme?: AppTheme; reducedMotion?: string }>('history')
  const themePreference = useLocalStorage<AppTheme>('eg-theme', 'auto')
  const connectionsPreference = useLocalStorage('eg-show-connections', true)
  const hexGridPreference = useLocalStorage('eg-show-hex-grid', true)

  const isDark = computed(() => themePreference.value === 'dark' || (themePreference.value === 'auto' && preferredDark.value))
  const reducedMotion = computed(() => prefersReducedMotion.value || params.reducedMotion === 'true')
  const effectiveTheme = computed(() => themePreference.value === 'auto' ? (preferredDark.value ? 'dark' : 'light') : themePreference.value)
  const eventBus = useEventBus<MapEvent>('eg-maps')
  const broadcast = useBroadcastChannel<MapEvent, MapEvent>({ name: 'eg-maps-runtime' })

  let forwardingRemoteEvent = false
  eventBus.on((event) => {
    if (forwardingRemoteEvent) {
      forwardingRemoteEvent = false
      return
    }
    broadcast.post(event)
  })
  watch(broadcast.data, (event) => {
    if (event) {
      forwardingRemoteEvent = true
      eventBus.emit(event)
    }
  })

  watch(themePreference, (value) => {
    if (params.theme !== value) params.theme = value === 'auto' ? undefined : value
  }, { immediate: true })

  function setTheme(value: AppTheme) {
    themePreference.value = value
  }

  function setDataset(value: string) {
    params.dataset = value
  }

  function emit(event: MapEvent) {
    eventBus.emit(event)
  }

  return {
    params,
    themePreference,
    effectiveTheme,
    isDark,
    reducedMotion,
    online,
    isMobile,
    isTablet,
    supportsShare,
    supportsGeolocation,
    supportsClipboard,
    supportsWorkers,
    connectionsPreference,
    hexGridPreference,
    setTheme,
    setDataset,
    eventBus,
    broadcast,
    emit,
  }
})
