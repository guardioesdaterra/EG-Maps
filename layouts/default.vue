<template>
  <div class="min-h-screen bg-[var(--bg-secondary)]">
    <slot />

    <!-- macOS-style Dock Navigation -->
    <nav class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div class="panel-floating px-2 py-2 rounded-2xl">
        <div class="flex items-end gap-1" ref="dockRef">
          <template v-for="(item, index) in navItems" :key="item.path || item.external">
            <!-- External link (Join Earth Guardians) -->
            <a
              v-if="item.external"
              :href="item.path"
              target="_blank"
              rel="noopener noreferrer"
              class="group relative flex flex-col items-center"
              :ref="el => { if (el && el.nodeType === 1) dockItemRefs.set(index, el); else dockItemRefs.delete(index) }"
              @mouseenter="onDockHover(index)"
              @mouseleave="onDockLeave()"
            >
              <!-- Tooltip -->
              <div
                class="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 backdrop-blur rounded-lg opacity-0 transition-all duration-150 pointer-events-none shadow-lg border border-white/10 whitespace-nowrap"
                :class="{ 'opacity-100': hoveredIndex === index }"
              >
                {{ item.label }}
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
              </div>

              <!-- Icon -->
              <div
                class="flex items-center justify-center rounded-xl transition-all duration-150 ease-out bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]"
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
              :ref="el => { if (el && el.nodeType === 1) dockItemRefs.set(index, el); else dockItemRefs.delete(index) }"
              @mouseenter="onDockHover(index)"
              @mouseleave="onDockLeave()"
            >
              <!-- Tooltip -->
              <div
                class="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 backdrop-blur rounded-lg opacity-0 transition-all duration-150 pointer-events-none shadow-lg border border-white/10 whitespace-nowrap"
                :class="{ 'opacity-100': hoveredIndex === index }"
              >
                {{ item.label }}
                <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
              </div>

              <!-- Icon -->
              <div
                class="flex items-center justify-center rounded-xl transition-all duration-150 ease-out"
                :class="isActive(item.path)
                  ? getActiveStyle(item.variant)
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]'
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
          <div class="mx-1 h-8 w-px bg-[var(--border-color)] self-center" />

          <!-- Dark mode toggle -->
          <button
            @click="toggleDarkMode"
            class="group relative flex flex-col items-center"
            :ref="el => { if (el && el.nodeType === 1) dockItemRefs.set(navItems.length, el); else dockItemRefs.delete(navItems.length) }"
            @mouseenter="onDockHover(navItems.length)"
            @mouseleave="onDockLeave()"
          >
            <!-- Tooltip -->
            <div
              class="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-white bg-gray-900/95 backdrop-blur rounded-lg opacity-0 transition-all duration-150 pointer-events-none shadow-lg border border-white/10 whitespace-nowrap"
              :class="{ 'opacity-100': hoveredIndex === navItems.length }"
            >
              {{ isDark ? 'Switch to Light' : 'Switch to Dark' }}
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95" />
            </div>

            <div
              class="flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-all duration-150 ease-out hover:bg-[var(--border-color)] hover:text-[var(--text-primary)]"
              :style="getItemStyle(navItems.length)"
            >
              <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="transition-all duration-150" :class="getItemIconClass(navItems.length)" />
            </div>
          </button>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const route = useRoute()

interface NavItem {
  path: string
  label: string
  icon: string
  variant?: 'cyan' | 'green' | 'purple' | 'orange'
  external?: boolean
}

const navItems: NavItem[] = [
  { path: '/info', label: 'Info & Feedback', icon: 'lucide:info', variant: 'cyan' },
  { path: '/project-grants', label: 'Project Grants', icon: 'lucide:hand-heart', variant: 'purple' },
  { path: '/endangered-species', label: 'Endangered Species', icon: 'lucide:bird', variant: 'green' },
  { path: 'https://www.earthguardians.org/crews', label: 'Join Earth Guardians', icon: 'lucide:users', external: true },
]

const { isDark, toggle: toggleDarkMode } = useDarkMode()

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function getActiveStyle(variant: string = 'cyan') {
  const styles: Record<string, string> = {
    cyan: 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30',
    green: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30',
    orange: 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30',
  }
  return styles[variant] || styles.cyan
}

function getActiveIndicatorClass(variant: string = 'cyan') {
  const classes: Record<string, string> = {
    cyan: 'bg-cyan-400',
    green: 'bg-green-400',
    purple: 'bg-purple-400',
    orange: 'bg-orange-400',
  }
  return classes[variant] || classes.cyan
}

// Dock magnification logic
const dockRef = ref<HTMLElement | null>(null)
const dockItemRefs = new Map<number, Element>()
const hoveredIndex = ref<number | null>(null)

const baseSize = 48
const maxSize = 64
const neighborSize = 56

const itemSizes = ref<number[]>(Array(navItems.length + 1).fill(baseSize))

function onDockHover(index: number) {
  hoveredIndex.value = index
  const newSizes = [...itemSizes.value]
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
  itemSizes.value = Array(navItems.length + 1).fill(baseSize)
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
