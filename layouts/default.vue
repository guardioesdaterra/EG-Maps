/**
 * layouts/default.vue
 * @why Default app layout — header navigation, theme toggle, footer, and slot for page content
 * @component default
 * @deps vue (ref, computed, onMounted, onUnmounted); @/composables/useI18n (useI18n)
 */
<template>
  <div :class="[isMapRoute ? 'h-[100svh]' : 'min-h-viewport', 'bg-[var(--bg-secondary)]']">
    <slot />

    
    <header v-if="showUnifiedHeader" class="fixed left-2 xs:left-4 top-[clamp(4.5rem,12vw,6rem)] z-[10000] sm:left-auto sm:right-[max(1rem,env(safe-area-inset-right))] sm:top-[0.5rem]">
      <div :class="unifiedHeaderShellClass">
        
        <div v-if="showViewToggle" class="map-view-switcher flex flex-col sm:flex-row items-start sm:items-center gap-0.5">
          <NuxtLink
            :to="view2DRoute"
            :class="[
              'map-view-tab map-view-tab-sm max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:p-0',
              !is3DRoute ? 'map-view-tab-active' : 'map-view-tab-idle'
            ]"
          >
            <Icon name="lucide:map" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('globe.view2D') }}</span>
          </NuxtLink>
          <NuxtLink
            :to="view3DRoute"
            :class="[
              'map-view-tab map-view-tab-sm max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:p-0',
              is3DRoute ? 'map-view-tab-active' : 'map-view-tab-idle'
            ]"
          >
            <Icon name="lucide:globe" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('globe.view3D') }}</span>
          </NuxtLink>
        </div>

        
        <div v-if="showViewToggle" :class="[headerSeparatorClass, 'hidden sm:block']" />

        
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-0.5">
          <NuxtLink
            v-for="item in headerItems"
            :key="item.path"
            :to="item.path"
            :class="getHeaderItemClass(item.path)"
          >
            <Icon :name="item.icon" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t(item.labelKey) }}</span>
          </NuxtLink>
          <a
            href="https://www.earthguardians.org/crews"
            target="_blank"
            rel="noopener noreferrer"
            :class="headerUtilityClass"
          >
            <Icon name="lucide:users" class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('nav.crews') }}</span>
          </a>

          
          <div :class="[headerSeparatorClass, 'hidden sm:block']" />

          
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

    
    <nav v-if="showDock && !hideAll" class="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] xs:bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[9999] max-w-[calc(100vw-1rem)] xs:max-w-[calc(100vw-1.5rem)] -translate-x-1/2">
      <div :class="dockShellClass">
        <div class="flex items-center gap-1">
          <GooeyNav :items="navItems" />

          
          <div :class="separatorClass" />

          
          <div class="relative" ref="langDropdownRef">
            <button
              @click="showLangMenu = !showLangMenu"
              class="group relative flex flex-col items-center"
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
                :class="dropdownClass"
              >
                <button
                  v-for="loc in availableLocales"
                  :key="loc"
                  @click="setLocale(loc); showLangMenu = false"
                  :class="getDropdownItemClass(loc)"
                >
                  <span>{{ localeNames[loc] }}</span>
                  <Icon v-if="locale === loc" name="lucide:check" class="h-3.5 w-3.5" />
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n as useAppI18n } from '@/composables/useI18n'

const route = useRoute()

const { t, locale, availableLocales, localeNames, setLocale } = useAppI18n()

const showDock = ref(true)

function updateDockFromHash() {
  if (typeof window !== 'undefined') {
    showDock.value = !window.location.hash.includes('no-dock')
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  updateDockFromHash()
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
  { path: '/eg-grants', labelKey: 'nav.egGrants', icon: 'lucide:hand-coins', variant: 'purple' },
  { path: 'https://www.earthguardians.org/crews', labelKey: 'nav.joinEarthGuardians', icon: 'lucide:users', variant: 'cyan', external: true },
]

const headerItems: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: 'lucide:home', variant: 'cyan' },
  { path: '/eg-grants', labelKey: 'nav.egGrants', icon: 'lucide:hand-coins', variant: 'purple' },
  { path: '/info', labelKey: 'nav.info', icon: 'lucide:info', variant: 'cyan' },
]

const { isDark, toggle: toggleDarkMode } = useDarkMode()

const isMapRoute = computed(() =>
  route.path.startsWith('/project-grants') || route.path.startsWith('/endangered-species') || route.path.startsWith('/vulcan-observatory') || route.path.startsWith('/active-crews')
)
const is3DRoute = computed(() => route.path.endsWith('/3d'))
const noControl = computed(() => route.query['no-control'] === 'true')
const hideAll = computed(() => route.query.hideAll === 'true')
const controlsForced = computed(() => route.query.controls === 'true')
const showUnifiedHeader = computed(() => (isMapRoute.value || route.path === '/info') && !noControl.value && !hideAll.value && !controlsForced.value)
const showViewToggle = computed(() => isMapRoute.value && !noControl.value && !hideAll.value && !controlsForced.value)

const view2DRoute = computed(() => {
  const p = route.path.replace(/\/+$/, '')
  return p.endsWith('/3d') ? p.replace(/\/3d$/, '') : p
})
const view3DRoute = computed(() => {
  const p = route.path.replace(/\/+$/, '')
  return p.endsWith('/3d') ? p : `${p}/3d`
})

const isLightTheme = computed(() => !isDark.value)
const unifiedHeaderShellClass = computed(() => [
  'flex flex-col sm:flex-row w-fit max-w-[calc(100vw-2rem)] sm:max-w-full items-start sm:items-center gap-2 sm:gap-1 rounded-xl border px-1.5 py-2 sm:px-1 sm:py-1 shadow-xl backdrop-blur-xl',
  isLightTheme.value
    ? 'bg-white/95 border-black text-black shadow-[var(--panel-shadow)]'
    : 'bg-black/80 border-white/20 text-white shadow-[var(--panel-shadow)]',
])
const headerSeparatorClass = computed(() => [
  'mx-0.5 h-5 w-px self-center',
  isLightTheme.value ? 'bg-black/30' : 'bg-white/20',
])
const dockShellClass = 'max-w-full px-1.5 py-1.5 rounded-xl shadow-lg backdrop-blur-2xl bg-black/80 text-white'
const headerUtilityClass = computed(() => [
  'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:px-0',
  isLightTheme.value
    ? 'text-black hover:bg-black hover:text-white'
    : 'text-white/70 hover:bg-white/10 hover:text-white',
])
const tooltipClass = 'absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-md opacity-0 transition-all duration-150 pointer-events-none shadow-lg whitespace-nowrap z-10 text-white bg-gray-900 border border-white/10'
const tooltipArrowClass = 'absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900'
const utilityIconClass = 'flex items-center justify-center rounded-lg transition-all duration-150 ease-out text-white/70 hover:bg-white/10 hover:text-white w-7 h-7'
const separatorClass = 'mx-1 h-6 w-px self-center bg-white/15'
const dropdownClass = computed(() => [
  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden rounded-lg shadow-xl min-w-[clamp(8rem,15vw,9rem)]',
  'bg-gray-900/95 backdrop-blur border border-white/10',
])

const showLangMenu = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)

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
  return `${base} hover:bg-white/10 ${locale.value === loc ? 'text-white bg-white/20' : 'text-gray-300'}`
}

function getHeaderItemClass(path: string) {
  const base = 'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:px-0'
  if (isLightTheme.value) {
    return `${base} ${isActive(path) ? 'bg-black text-white' : 'text-black hover:bg-black/10'}`
  }
  return `${base} ${isActive(path) ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
}

</script>

<style scoped>
nav > div {
  transition: transform 0.2s ease;
}

nav:hover > div {
  transform: scale(1.02);
}
</style>
