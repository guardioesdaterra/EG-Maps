<template>
  <div class="min-h-[100svh] bg-[var(--bg-secondary)]">
    <slot />

    <!-- Unified Top Header - 2D/3D + Utilities + Theme -->
    <header v-if="showUnifiedHeader" class="fixed left-2 xs:left-4 top-[clamp(4.5rem,14vw,6rem)] z-[10000] sm:left-auto sm:right-[max(1rem,env(safe-area-inset-right))] sm:top-[0.5rem]">
      <div :class="unifiedHeaderShellClass">
        <!-- Left: 2D/3D Toggle -->
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

        <!-- Separator -->
        <div v-if="showViewToggle" :class="[headerSeparatorClass, 'hidden sm:block']" />

        <!-- Right: Navigation + Theme -->
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

          <!-- Separator -->
          <div :class="[headerSeparatorClass, 'hidden sm:block']" />

          <!-- Theme toggle -->
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

    <!-- Map-focused Dock Navigation -->
    <nav v-if="showDock" class="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] xs:bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[9999] max-w-[calc(100vw-1rem)] xs:max-w-[calc(100vw-1.5rem)] -translate-x-1/2">
      <div :class="dockShellClass">
        <div class="flex items-end gap-1" ref="dockRef">
          <template v-for="(item, index) in navItems" :key="item.path || item.external">
            <!-- External link (Join Earth Guardians) -->
            <a
              v-if="item.external"
              :href="item.path"
              target="_blank"
              rel="noopener noreferrer"
              class="group relative flex flex-col items-center"
              :ref="(el: any) => { if (el?.nodeType === 1) dockItemRefs.set(index, el as Element); else dockItemRefs.delete(index) }"
              @mouseenter="onDockHover(index)"
              @mouseleave="onDockLeave()"
            >
              <!-- Tooltip -->
              <div
                :class="[tooltipClass, { 'opacity-100': hoveredIndex === index }]"
              >
                {{ t(item.labelKey) }}
                <div :class="tooltipArrowClass" />
              </div>

              <!-- Icon -->
              <div
                :class="utilityIconClass"
                :style="getItemStyle(index)"
              >
                <Icon :name="item.icon" class="transition-all duration-150" :class="getItemIconClass(index)" />
              </div>
            </a>

            <!-- Internal link -->
            <NuxtLink
              v-else
              :to="item.path"
              class="group relative flex flex-col items-center"
              :ref="(el: any) => { if (el?.nodeType === 1) dockItemRefs.set(index, el as Element); else dockItemRefs.delete(index) }"
              @mouseenter="onDockHover(index)"
              @mouseleave="onDockLeave()"
            >
              <!-- Tooltip -->
              <div
                :class="[tooltipClass, { 'opacity-100': hoveredIndex === index }]"
              >
                {{ t(item.labelKey) }}
                <div :class="tooltipArrowClass" />
              </div>

              <!-- Icon -->
              <div
                class="flex items-center justify-center rounded-xl transition-all duration-150 ease-out"
                :class="isActive(item.path)
                  ? getActiveStyle(item.variant)
                  : inactiveIconClass
                "
                :style="getItemStyle(index)"
              >
                <Icon :name="item.icon" class="transition-all duration-150" :class="getItemIconClass(index)" />
              </div>

              <!-- Active indicator -->
              <div
                v-if="isActive(item.path)"
                class="mt-1 h-1 w-1 rounded-full"
                :class="getActiveIndicatorClass(item.variant)"
              />
            </NuxtLink>
          </template>

          <!-- Separator -->
          <div :class="separatorClass" />

          <!-- Language Switcher -->
          <div class="relative" ref="langDropdownRef">
            <button
              @click="showLangMenu = !showLangMenu"
              class="group relative flex flex-col items-center"
              :ref="(el: any) => { if (el?.nodeType === 1) dockItemRefs.set(navItems.length, el as Element); else dockItemRefs.delete(navItems.length) }"
              @mouseenter="onDockHover(navItems.length)"
              @mouseleave="onDockLeave()"
            >
              <!-- Tooltip -->
              <div
                :class="[tooltipClass, { 'opacity-100': hoveredIndex === navItems.length }]"
              >
                {{ t('nav.language') }}
                <div :class="tooltipArrowClass" />
              </div>

              <div
                :class="utilityIconClass"
                :style="getItemStyle(navItems.length)"
              >
                <Icon name="lucide:languages" class="transition-all duration-150" :class="getItemIconClass(navItems.length)" />
              </div>
            </button>

            <!-- Language dropdown -->
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
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { useI18n as useAppI18n } from '@/composables/useI18n'

const route = useRoute()

// i18n
const { t, locale, availableLocales, localeNames, setLocale } = useAppI18n()

// #no-dock hash support — hides the dock navigation bar
// Start with a safe default and only modify on client to avoid hydration mismatch
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
  { path: '/observatory-of-vulcan', labelKey: 'nav.observatoryOfVulcan', icon: 'lucide:microscope', variant: 'orange' },
  { path: '/active-crews', labelKey: 'nav.activeCrews', icon: 'lucide:users-round', variant: 'cyan' },
]

const headerItems: NavItem[] = [
  { path: '/', labelKey: 'nav.home', icon: 'lucide:home', variant: 'cyan' },
  { path: '/info', labelKey: 'nav.info', icon: 'lucide:info', variant: 'cyan' },
]

const { isDark, toggle: toggleDarkMode } = useDarkMode()

const isMapRoute = computed(() =>
  route.path.startsWith('/project-grants') || route.path.startsWith('/endangered-species') || route.path.startsWith('/observatory-of-vulcan') || route.path.startsWith('/active-crews')
)
const is3DRoute = computed(() => route.path.endsWith('/3d'))
const showUnifiedHeader = computed(() => isMapRoute.value || route.path === '/info')
const showViewToggle = computed(() => isMapRoute.value)

const view2DRoute = computed(() => {
  const base = route.path.endsWith('/3d') ? route.path.replace('/3d', '') : route.path
  return base
})
const view3DRoute = computed(() => {
  const base = route.path.endsWith('/3d') ? route.path : `${route.path}/3d`
  return base
})

const isLightTheme = computed(() => !isDark.value)
const unifiedHeaderShellClass = computed(() => [
  'flex flex-col sm:flex-row w-fit max-w-[calc(100vw-2rem)] sm:max-w-full items-start sm:items-center gap-2 sm:gap-1 rounded-xl border px-1.5 py-2 sm:px-1 sm:py-1 shadow-xl backdrop-blur-xl',
  isLightTheme.value
    ? 'bg-white/95 border-black text-black shadow-[0_12px_32px_rgba(0,0,0,0.18)]'
    : 'bg-black/80 border-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
])
const headerSeparatorClass = computed(() => [
  'mx-0.5 h-5 w-px self-center',
  isLightTheme.value ? 'bg-black/30' : 'bg-white/20',
])
const dockShellClass = computed(() => [
  'max-w-full px-2 py-2 rounded-2xl border shadow-xl backdrop-blur-xl transition-colors duration-200',
  isLightTheme.value
    ? 'bg-white/95 border-black text-black shadow-[0_12px_32px_rgba(0,0,0,0.18)]'
    : 'bg-black/90 border-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
])
const headerUtilityClass = computed(() => [
  'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:px-0',
  isLightTheme.value
    ? 'text-black hover:bg-black hover:text-white'
    : 'text-white/70 hover:bg-white/10 hover:text-white',
])
const tooltipClass = computed(() => [
  'absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium rounded-lg opacity-0 transition-all duration-150 pointer-events-none shadow-lg whitespace-nowrap',
  isLightTheme.value
    ? 'text-white bg-black border border-black'
    : 'text-white bg-gray-900/95 backdrop-blur border border-white/10',
])
const tooltipArrowClass = computed(() => [
  'absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent',
  isLightTheme.value ? 'border-t-black' : 'border-t-gray-900/95',
])
const inactiveIconClass = computed(() =>
  isLightTheme.value
    ? 'bg-white text-black border border-black hover:bg-black hover:text-white'
    : 'bg-[#1e1e1e] text-[#c8c8c8] hover:bg-white hover:text-black'
)
const utilityIconClass = computed(() => [
  'flex items-center justify-center rounded-xl transition-all duration-150 ease-out',
  inactiveIconClass.value,
])
const separatorClass = computed(() => [
  'mx-1 h-8 w-px self-center',
  isLightTheme.value ? 'bg-black' : 'bg-white/20',
])
const dropdownClass = computed(() => [
  'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden rounded-lg shadow-xl min-w-[120px]',
  isLightTheme.value
    ? 'bg-white border-2 border-black'
    : 'bg-gray-900/95 backdrop-blur border border-white/10',
])

// Language dropdown state
const showLangMenu = ref(false)
const langDropdownRef = ref<HTMLElement | null>(null)

// Close dropdown when clicking outside
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

function getActiveStyle(_variant: string = 'cyan') {
  if (isLightTheme.value) {
    return 'bg-black text-white shadow-none'
  }

  return 'bg-white text-black shadow-none'
}

function getActiveIndicatorClass(_variant: string = 'cyan') {
  if (isLightTheme.value) {
    return 'bg-black'
  }

  return 'bg-white'
}

function getDropdownItemClass(loc: string) {
  const base = 'w-full px-3 py-2 text-xs text-left transition-colors flex items-center justify-between'
  if (isLightTheme.value) {
    return `${base} ${locale.value === loc ? 'text-white bg-black' : 'text-black hover:bg-black/10'}`
  }
  return `${base} hover:bg-gray-700/50 ${locale.value === loc ? 'text-white bg-white/20' : 'text-gray-300'}`
}

function getHeaderItemClass(path: string) {
  const base = 'inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors max-sm:h-8 max-sm:w-8 max-sm:justify-center max-sm:px-0'
  if (isLightTheme.value) {
    return `${base} ${isActive(path) ? 'bg-black text-white' : 'text-black hover:bg-black/10'}`
  }
  return `${base} ${isActive(path) ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
}

// Dock magnification logic
const dockRef = ref<HTMLElement | null>(null)
const dockItemRefs = shallowRef(new Map<number, Element>())
const hoveredIndex = ref<number | null>(null)

const baseSize = 44
const maxSize = 58
const neighborSize = 50

// +1 for language switcher (dark mode moved to header)
const totalDockItems = computed(() => navItems.length + 1)
const itemSizes = shallowRef<number[]>(Array(totalDockItems.value).fill(baseSize))

function onDockHover(index: number) {
  hoveredIndex.value = index
  const newSizes = new Array(itemSizes.value.length)
  for (let i = 0; i < newSizes.length; i++) {
    const distance = Math.abs(i - index)
    if (distance === 0) {
      newSizes[i] = maxSize
    } else if (distance === 1) {
      newSizes[i] = neighborSize
    } else {
      newSizes[i] = baseSize
    }
  }
  itemSizes.value = newSizes
}

function onDockLeave() {
  hoveredIndex.value = null
  itemSizes.value = Array(totalDockItems.value).fill(baseSize)
}

function getItemStyle(index: number) {
  const size = itemSizes.value[index] || baseSize
  return {
    width: `${size}px`,
    height: `${size}px`,
  }
}

function getItemIconClass(index: number) {
  const size = itemSizes.value[index] || baseSize
  if (size >= maxSize) return 'h-7 w-7'
  if (size >= neighborSize) return 'h-6 w-6'
  return 'h-5 w-5'
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
