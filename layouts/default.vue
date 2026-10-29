/**
 * layouts/default.vue
 * @why Default app layout — header navigation, theme toggle, footer, and slot for page content
 * @component default
 * @deps vue (ref, computed, onMounted, onUnmounted); @/composables/useI18n (useI18n)
 */
<template>
  <div :class="[isMapRoute ? 'h-[100svh]' : 'min-h-viewport', 'bg-transparent']">
    <slot />

    
    <header v-if="showUnifiedHeader" data-map-popup-safe-area="top" class="fixed left-2 right-2 xs:left-4 xs:right-4 top-[max(0.5rem,env(safe-area-inset-top))] z-[10000] sm:left-auto sm:right-[max(1rem,env(safe-area-inset-right))]">
      <div :class="unifiedHeaderShellClass">
        
        <div v-if="showViewToggle" class="map-view-switcher flex flex-row items-center gap-0.5">
          <NuxtLink
            :to="view2DRoute"
            :aria-label="t('globe.view2D')"
            :aria-current="!is3DRoute ? 'page' : undefined"
            :class="[
              'map-view-tab map-view-tab-sm min-h-10 min-w-10 max-sm:justify-center max-sm:p-0',
              !is3DRoute ? 'map-view-tab-active' : 'map-view-tab-idle'
            ]"
          >
            <Icon name="lucide:map" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('globe.view2D') }}</span>
          </NuxtLink>
          <NuxtLink
            :to="view3DRoute"
            :aria-label="t('globe.view3D')"
            :aria-current="is3DRoute ? 'page' : undefined"
            :class="[
              'map-view-tab map-view-tab-sm min-h-10 min-w-10 max-sm:justify-center max-sm:p-0',
              is3DRoute ? 'map-view-tab-active' : 'map-view-tab-idle'
            ]"
          >
            <Icon name="lucide:globe" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('globe.view3D') }}</span>
          </NuxtLink>
        </div>

        
        <div v-if="showViewToggle" :class="[headerSeparatorClass, 'hidden sm:block']" />

        
        <div class="flex flex-row items-center gap-0.5">
          <NuxtLink
            v-for="item in headerItems"
            :key="item.path"
            :to="item.path"
            :class="getHeaderItemClass(item.path)"
            :aria-label="t(item.labelKey)"
            :aria-current="isActive(item.path) ? 'page' : undefined"
          >
            <Icon :name="item.icon" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t(item.labelKey) }}</span>
          </NuxtLink>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            :class="headerUtilityClass"
            :aria-label="t('nav.crews')"
          >
            <Icon name="lucide:users" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('nav.crews') }}</span>
          </a>

          
          <div :class="[headerSeparatorClass, 'hidden sm:block']" />

          
          <button
            v-if="isMapRoute"
            @click="toggleTileProvider"
            :class="[headerUtilityClass, tileProvider.isFallback.value ? 'tile-provider-active' : '']"
            :aria-label="tileProvider.isFallback.value ? t('mapTiles.switchToMaptiler') : t('mapTiles.switchToFallback')"
            :title="tileProviderTitle"
          >
            <span class="relative inline-flex">
              <Icon :name="tileProvider.isFallback.value ? 'lucide:mountain' : 'lucide:satellite'" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span v-if="tileProvider.autoFallback.value" class="tile-provider-auto-dot" aria-hidden="true" />
            </span>
            <span class="hidden sm:inline text-xs">{{ tileProvider.isFallback.value ? t('mapTiles.fallback') : t('mapTiles.maptiler') }}</span>
          </button>

          
          <button
            @click="toggleDarkMode"
            :class="headerUtilityClass"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
          >
            <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      </div>
    </header>

    
    <div v-if="layoutControlsReady && showDock && !hideAll && !isEgGrantsRoute" data-map-popup-safe-area="bottom" class="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] xs:bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-[9999] max-w-[calc(100vw-1rem)] xs:max-w-[calc(100vw-1.5rem)] -translate-x-1/2">
      <div :class="dockShellClass">
        <div class="flex items-center gap-1">
          <GooeyNav :items="navItems" />

          
          <div :class="separatorClass" />

          
          <div class="relative" ref="langDropdownRef">
            <button
              ref="langMenuButtonRef"
              type="button"
              @click="toggleLanguageMenu"
              class="group relative flex min-h-10 min-w-10 flex-col items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              :aria-label="t('nav.language')"
              :aria-expanded="showLangMenu"
              aria-controls="language-options"
            >
              <div
                :class="[tooltipClass, 'opacity-0 group-hover:opacity-100 transition-opacity duration-150']"
              >
                {{ t('nav.language') }}
                <div :class="tooltipArrowClass" />
              </div>

              <div :class="utilityIconClass">
                <Icon name="lucide:languages" class="h-4 w-4" />
              </div>
            </button>

            
            <Transition name="dropdown">
              <div
                v-if="showLangMenu"
                id="language-options"
                role="group"
                :aria-label="t('nav.language')"
                :class="dropdownClass"
                @keydown.esc.stop.prevent="closeLanguageMenu(true)"
              >
                <button
                  v-for="loc in availableLocales"
                  :key="loc"
                  type="button"
                  @click="selectLanguage(loc)"
                  :class="[getDropdownItemClass(loc), 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]']"
                  :aria-pressed="locale === loc"
                >
                  <span>{{ localeNames[loc] }}</span>
                  <Icon v-if="locale === loc" name="lucide:check" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </Transition>
          </div>

          
          <button
            v-if="showThemeToggleInDock"
            type="button"
            class="group relative flex min-h-10 min-w-10 flex-col items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            :title="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            :aria-pressed="isDark"
            @click="toggleDarkMode"
          >
            <div :class="[tooltipClass, 'opacity-0 group-hover:opacity-100 transition-opacity duration-150']">
              {{ isDark ? t('nav.switchToLight') : t('nav.switchToDark') }}
              <div :class="tooltipArrowClass" />
            </div>
            <div :class="utilityIconClass">
              <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="h-4 w-4" />
            </div>
          </button>

          <div :class="separatorClass" />

          
          <div class="relative" ref="importBtnRef">
            <button
              type="button"
              @click="showImportModal = !showImportModal"
              class="group relative flex min-h-10 min-w-10 flex-col items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              :aria-label="t('observatory.contribution.import')"
              :aria-expanded="showImportModal"
            >
              <div
                :class="[tooltipClass, 'opacity-0 group-hover:opacity-100 transition-opacity duration-150']"
              >
                {{ t('observatory.contribution.import') }}
                <div :class="tooltipArrowClass" />
              </div>

              <div :class="utilityIconClass">
                <Icon name="lucide:plus" class="h-4 w-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n as useAppI18n, type Locale } from '@/composables/useI18n'
import { useCustomData } from '@/composables/useCustomData'
import { useMapTileProvider } from '@/composables/useMapTileProvider'
import { canonicalizeMapLayoutPath, isMapLayoutRoute } from '@/lib/map-routes'

const route = useRoute()
const router = useRouter()

const { t, locale, availableLocales, localeNames, setLocale } = useAppI18n()

const showDock = ref(true)
const layoutControlsReady = ref(false)

function updateDockFromHash() {
  if (typeof window !== 'undefined') {
    showDock.value = !window.location.hash.includes('no-dock')
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  if (isMapLayoutRoute(route.path)) {
    const initialQuery: Record<string, string> = {}
    const initialSearch = document.documentElement.dataset.egInitialMapSearch ?? ''
    new URLSearchParams(initialSearch).forEach((value, key) => { initialQuery[key] = value })
    const currentQuery = route.query
    const needsRestore = Object.entries(initialQuery).some(([key, value]) => String(currentQuery[key] ?? '') !== value)
    if (needsRestore) {
      try {
        await router.replace({ query: { ...initialQuery, ...currentQuery }, hash: route.hash })
      } catch { /* Keep captured flags active if the router cannot restore the URL. */ }
    }
    const queryRestored = Object.entries(initialQuery).every(([key, value]) => String(route.query[key] ?? '') === value)
    if (queryRestored) delete document.documentElement.dataset.egInitialMapSearch
  }
  updateDockFromHash()
  layoutControlsReady.value = true
  window.addEventListener('hashchange', updateDockFromHash)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('hashchange', updateDockFromHash)
})

interface NavItem {
  path: string
  labelKey: string
  icon: string
  variant?: 'cyan' | 'green' | 'purple' | 'orange'
  external?: boolean
}

const navItems: NavItem[] = [
  { path: '/project-grants', labelKey: 'nav.projectGrants', icon: 'lucide:hand-heart', variant: 'purple' },
  { path: '/endangered-species', labelKey: 'nav.endangeredSpecies', icon: 'lucide:bird', variant: 'green' },
  { path: '/vulcan-observatory', labelKey: 'nav.observatoryOfVulcan', icon: 'lucide:microscope', variant: 'orange' },
  { path: '/active-crews', labelKey: 'nav.activeCrews', icon: 'lucide:users-round', variant: 'cyan' },
  { path: 'https://www.earthguardians.org/crews', labelKey: 'nav.joinEarthGuardians', icon: 'lucide:users', variant: 'cyan', external: true },
]

const headerItems: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: 'lucide:home', variant: 'cyan' },
  { path: '/info', labelKey: 'nav.info', icon: 'lucide:info', variant: 'cyan' },
]

const { isDark, toggle: toggleDarkMode } = useDarkMode()
const { showImportModal } = useCustomData()
const tileProvider = useMapTileProvider()

function toggleTileProvider() {
  tileProvider.toggleProvider()
}

const tileProviderTitle = computed(() => {
  const base = tileProvider.isFallback.value ? t('mapTiles.switchToMaptiler') : t('mapTiles.switchToFallback')
  if (tileProvider.autoFallback.value && tileProvider.autoReason.value) {
    return `${base} — ${t('mapTiles.autoFallbackActive')}`
  }
  return base
})

const mapRoutePath = computed(() => canonicalizeMapLayoutPath(route.path))
const isMapRoute = computed(() => isMapLayoutRoute(route.path))
const is3DRoute = computed(() => mapRoutePath.value.endsWith('/3d'))
function queryFlagIsTrue(name: string): boolean {
  if (route.query[name] === 'true') return true
  if (import.meta.client !== true) return false
  const initialSearch = document.documentElement.dataset.egInitialMapSearch ?? ''
  return new URLSearchParams(window.location.search).get(name) === 'true'
    || new URLSearchParams(initialSearch).get(name) === 'true'
}
const noControl = computed(() => queryFlagIsTrue('no-control'))
const hideAll = computed(() => queryFlagIsTrue('hideAll'))
const controlsForced = computed(() => queryFlagIsTrue('controls'))
const isVulcanRoute = computed(() => route.path.startsWith('/vulcan-observatory'))
const isEgGrantsRoute = computed(() => route.path.startsWith('/eg-grants'))
const showUnifiedHeader = computed(() => layoutControlsReady.value && (isMapRoute.value || route.path === '/info') && !noControl.value && !hideAll.value && !controlsForced.value && !isVulcanRoute.value)
const showViewToggle = computed(() => isMapRoute.value && !noControl.value && !hideAll.value && !controlsForced.value)

const view2DRoute = computed(() => {
  const p = mapRoutePath.value
  return p.endsWith('/3d') ? p.replace(/\/3d$/, '') : p
})
const view3DRoute = computed(() => {
  const p = mapRoutePath.value
  return p.endsWith('/3d') ? p : `${p}/3d`
})

const isLightTheme = computed(() => !isDark.value)
const showThemeToggleInDock = computed(() => {
  const path = route.path.replace(/\/+$/, '') || '/'
  const hasAlwaysVisiblePageToggle = isVulcanRoute.value || ['/', '/campaigns', '/crew-projects', '/masterclasses'].includes(path)
  const hasVisibleUnifiedHeaderToggle = (isMapRoute.value || path === '/info') && !noControl.value && !hideAll.value && !controlsForced.value && !isVulcanRoute.value
  const hasPageThemeToggle = hasAlwaysVisiblePageToggle || hasVisibleUnifiedHeaderToggle
  return !hasPageThemeToggle
})
const unifiedHeaderShellClass = computed(() => [
  'flex flex-row w-full sm:w-fit max-w-full items-center justify-between gap-1 rounded-xl border p-1 shadow-xl backdrop-blur-xl overflow-x-auto scrollbar-none',
  isLightTheme.value
    ? 'bg-white/95 border-[var(--border-color)] text-[var(--text-primary)] shadow-[var(--panel-shadow)]'
    : 'bg-black/80 border-white/20 text-white shadow-[var(--panel-shadow)]',
])
const headerSeparatorClass = computed(() => [
  'mx-0.5 h-5 w-px self-center',
  isLightTheme.value ? 'bg-[var(--border-color)]' : 'bg-white/20',
])
const dockShellClass = computed(() => [
  'max-w-full px-1.5 py-1.5 rounded-xl border shadow-lg backdrop-blur-2xl',
  isLightTheme.value
    ? 'bg-white/95 border-[var(--border-color)] text-[var(--text-primary)]'
    : 'bg-black/90 border-white/15 text-white',
])
const headerUtilityClass = computed(() => [
  'inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:px-0',
  isLightTheme.value
    ? 'text-black hover:bg-black hover:text-white'
    : 'text-white/70 hover:bg-white/10 hover:text-white',
])
const tooltipClass = 'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-md opacity-0 transition-all duration-150 pointer-events-none shadow-lg whitespace-nowrap z-10 text-white bg-gray-900 border border-white/10'
const tooltipArrowClass = 'absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900'
const utilityIconClass = computed(() => [
  'flex items-center justify-center rounded-lg transition-all duration-150 ease-out w-7 h-7',
  isLightTheme.value
    ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    : 'text-white/80 hover:bg-white/10 hover:text-white',
])
const separatorClass = computed(() => [
  'mx-1 h-6 w-px self-center',
  isLightTheme.value ? 'bg-[var(--border-color)]' : 'bg-white/20',
])
const dropdownClass = computed(() => [
  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden rounded-lg shadow-xl min-w-[clamp(8rem,15vw,9rem)]',
  isLightTheme.value
    ? 'bg-white/95 backdrop-blur border border-[var(--border-color)]'
    : 'bg-gray-900/95 backdrop-blur border border-white/10',
])

const showLangMenu = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)
const langMenuButtonRef = ref<HTMLButtonElement | null>(null)

function toggleLanguageMenu() {
  if (showLangMenu.value) {
    closeLanguageMenu()
  } else {
    showLangMenu.value = true
  }
}

function closeLanguageMenu(returnFocus = false) {
  showLangMenu.value = false
  if (returnFocus) nextTick(() => langMenuButtonRef.value?.focus())
}

function selectLanguage(loc: Locale) {
  setLocale(loc)
  closeLanguageMenu(true)
}

function handleClickOutside(event: MouseEvent) {
  if (langDropdownRef.value && !langDropdownRef.value.contains(event.target as Node)) {
    showLangMenu.value = false
  }
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  if (path === '/info') return route.path === '/info'
  return route.path.startsWith(path)
}

function getDropdownItemClass(loc: string) {
  const base = 'w-full px-3 py-2 text-xs text-left transition-colors flex items-center justify-between'
  if (isLightTheme.value) {
    return `${base} hover:bg-[var(--bg-secondary)] ${locale.value === loc ? 'text-[var(--primary-foreground)] bg-[var(--primary)]' : 'text-[var(--text-primary)]'}`
  }
  return `${base} hover:bg-white/10 ${locale.value === loc ? 'text-white bg-white/20' : 'text-gray-300'}`
}

function getHeaderItemClass(path: string) {
  const base = 'inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:px-0'
  if (isLightTheme.value) {
    return `${base} ${isActive(path) ? 'bg-black text-white' : 'text-black hover:bg-black/10'}`
  }
  return `${base} ${isActive(path) ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
}

</script>

<style scoped>
.tile-provider-active {
  outline: 1px solid currentColor;
  outline-offset: -1px;
}
.tile-provider-auto-dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #22d3ee;
  box-shadow: 0 0 4px #22d3ee;
}
nav > div {
  transition: transform 0.2s ease;
}

nav:hover > div {
  transform: scale(1.02);
}
</style>
