/**
 * components/observatory/ObservatoryTopbar.vue
 * @why Merged Vulcan top bar — brand + live stat pills + site menu in ONE
 *      floating glass bar (used only by /vulcan-observatory 2D + 3D pages).
 *      Replaces the old stacked layout (global header band + full-bleed
 *      black stat bar) so the map keeps maximum vertical space. The menu
 *      merges the global header controls (2D/3D toggle, home, info,
 *      tile provider, theme) plus Nearby (geolocate) in the same bar.
 *
 *      Responsive contract (numbers disappear as the screen shrinks):
 *        1024px and up · full pills (dot + count + label) + total
 *        640–1024px · compact pills (dot + count, label via title)
 *        under 640px · stats hidden visually; brand + menu only (counts stay
 *                  available in the filter panel status + sidebar, and in
 *                  the bar's sr-only summary for assistive tech).
 *
 * @deps @/composables/useI18n; @/composables/useDarkMode;
 *       @/composables/useMapTileProvider
 * @connections pages/vulcan-observatory/index.vue, pages/vulcan-observatory/3d.vue
 */
<template>
  <header class="obs-topbar" role="toolbar" :aria-label="t('nav.observatoryOfVulcan')">
    <!-- Brand -->
    <div class="obs-topbar__brand">
      <span class="obs-topbar__pulse" aria-hidden="true" />
      <div class="obs-topbar__titles">
        <h1 class="obs-topbar__title">{{ title }}</h1>
        <span class="obs-topbar__sub">{{ subtitle }}</span>
      </div>
    </div>

    <!-- Live counters (progressively collapse; hidden on phones) -->
    <div class="obs-topbar__stats" role="status" :aria-label="statsSummary">
      <span class="sr-only">{{ statsSummary }}</span>
      <div
        v-for="s in categoryStats"
        :key="s.key"
        class="obs-stat"
        :title="`${s.label}: ${s.count.toLocaleString()}`"
      >
        <span class="obs-stat__dot" :style="{ background: s.color }" aria-hidden="true" />
        <span class="obs-stat__count">{{ animatedCount ? animatedCount(s.key, s.count) : s.count }}</span>
        <span class="obs-stat__label">{{ s.label }}</span>
      </div>
      <span class="obs-stat__sep" aria-hidden="true" />
      <span class="obs-stat__total">
        <strong>{{ totalCount.toLocaleString() }}</strong>
        <span class="obs-stat__total-label">{{ t('observatory.v2.claimsTotal') }}</span>
      </span>
    </div>

    <!-- Merged site menu (replaces the global header on this page only) -->
    <nav class="obs-topbar__menu" :aria-label="t('observatory.v2.actions')">
      <!-- 2D / 3D segmented toggle -->
      <div class="obs-view-toggle" role="group" :aria-label="t('globe.view3D')">
        <NuxtLink
          :to="view2DRoute"
          :aria-label="t('globe.view2D')"
          :aria-current="!is3D ? 'page' : undefined"
          :class="['obs-view-tab', !is3D && 'is-active']"
          :title="t('globe.view2D')"
        >
          <Icon name="lucide:map" class="obs-view-tab__icon" />
          <span class="obs-view-tab__text">{{ t('globe.view2D') }}</span>
        </NuxtLink>
        <NuxtLink
          :to="view3DRoute"
          :aria-label="t('globe.view3D')"
          :aria-current="is3D ? 'page' : undefined"
          :class="['obs-view-tab', is3D && 'is-active']"
          :title="t('globe.view3D')"
        >
          <Icon name="lucide:globe" class="obs-view-tab__icon" />
          <span class="obs-view-tab__text">{{ t('globe.view3D') }}</span>
        </NuxtLink>
      </div>

      <span class="obs-topbar__sep" aria-hidden="true" />

      <NuxtLink to="/" class="obs-menu-btn obs-menu-btn--home" :aria-label="t('nav.home')" :title="t('nav.home')">
        <Icon name="lucide:home" />
      </NuxtLink>
      <NuxtLink to="/info" class="obs-menu-btn obs-menu-btn--info" :aria-label="t('nav.info')" :title="t('nav.info')">
        <Icon name="lucide:info" />
      </NuxtLink>
      <button
        v-if="onNearMe"
        type="button"
        class="obs-menu-btn obs-menu-btn--nearby"
        :class="{ 'is-active': nearMeActive }"
        :aria-label="t('observatory.v2.nearMe')"
        :aria-pressed="nearMeActive"
        :title="t('observatory.v2.nearMe')"
        @click="onNearMe()"
      >
        <Icon name="lucide:map-pin" />
      </button>

      <span class="obs-topbar__sep obs-topbar__sep--utility" aria-hidden="true" />

      <button
        type="button"
        class="obs-menu-btn obs-menu-btn--tile"
        :aria-label="tileTitle"
        :title="tileTitle"
        @click="tileProvider.toggleProvider()"
      >
        <span class="obs-menu-btn__wrap">
          <Icon :name="tileProvider.isFallback.value ? 'lucide:mountain' : 'lucide:satellite'" />
          <span v-if="tileProvider.autoFallback.value" class="obs-menu-btn__dot" aria-hidden="true" />
        </span>
      </button>
      <button
        type="button"
        class="obs-menu-btn obs-menu-btn--theme"
        :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
        :title="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
        @click="toggleDarkMode()"
      >
        <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" />
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useDarkMode } from '@/composables/useDarkMode'
import { useMapTileProvider } from '@/composables/useMapTileProvider'

interface CategoryStat {
  key: string
  label: string
  count: number
  color: string
}

const props = defineProps<{
  categoryStats: CategoryStat[]
  totalCount: number
  animatedCount?: (key: string, count: number) => number | string
  title?: string
  subtitle?: string
  onNearMe?: () => void
  nearMeActive?: boolean
}>()

const { t } = useI18n()
const route = useRoute()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const tileProvider = useMapTileProvider()

const title = computed(() => props.title ?? t('observatory.v2.brandTitle'))
const subtitle = computed(() => props.subtitle ?? t('observatory.v2.brandSub'))

const is3D = computed(() => route.path.endsWith('/3d'))
const view2DRoute = computed(() => {
  const p = route.path.replace(/\/+$/, '')
  return p.endsWith('/3d') ? p.replace(/\/3d$/, '') : p
})
const view3DRoute = computed(() => {
  const p = route.path.replace(/\/+$/, '')
  return p.endsWith('/3d') ? p : `${p}/3d`
})

const tileTitle = computed(() => {
  const base = tileProvider.isFallback.value
    ? t('mapTiles.switchToMaptiler')
    : t('mapTiles.switchToFallback')
  if (tileProvider.autoFallback.value && tileProvider.autoReason.value) {
    return `${base} — ${t('mapTiles.autoFallbackActive')}`
  }
  return base
})

/** Screen-reader summary so hidden numbers stay accessible on phones. */
const statsSummary = computed(() => {
  const parts = props.categoryStats.map((s) => `${s.label}: ${s.count.toLocaleString()}`)
  return `${parts.join(', ')}. ${t('observatory.v2.claimsTotal')}: ${props.totalCount.toLocaleString()}`
})
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── Merged floating bar: owns the top band alone (no global header above) ── */
.obs-topbar {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 0.5rem);
  left: clamp(0.5rem, 1.5vw, 0.9rem);
  right: clamp(0.5rem, 1.5vw, 0.9rem);
  z-index: 540;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: clamp(0.5rem, 1.5vw, 0.9rem);
  min-height: 3rem;
  padding: 0.35rem clamp(0.55rem, 1.2vw, 0.8rem);
  background: rgba(10, 10, 12, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
}

/* ── Brand ── */
.obs-topbar__brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex-shrink: 0;
}
.obs-topbar__pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--obs-red, #e74c3c);
  flex-shrink: 0;
  box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7);
  animation: obs-pulse 2s ease-out infinite;
}
@keyframes obs-pulse {
  0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.6); }
  70% { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
  100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
}
.obs-topbar__titles {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}
.obs-topbar__title {
  margin: 0;
  font-size: clamp(0.78rem, 1.6vw, 0.95rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #f87171;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.obs-topbar__sub {
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Stats (middle, flexible — shrinks first, scrolls with fade) ── */
.obs-topbar__stats {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  mask-image: linear-gradient(to right, black calc(100% - 1.25rem), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 1.25rem), transparent 100%);
  padding-right: 1.25rem;
}
.obs-topbar__stats::-webkit-scrollbar { display: none; }
.obs-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.28rem 0.55rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
.obs-stat:hover { background: rgba(255, 255, 255, 0.09); border-color: rgba(255, 255, 255, 0.16); }
.obs-stat__dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; flex-shrink: 0; }
.obs-stat__count { font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.obs-stat__label { color: rgba(255, 255, 255, 0.55); font-weight: 500; }
.obs-stat__sep { width: 1px; height: 1rem; background: rgba(255, 255, 255, 0.12); flex-shrink: 0; }
.obs-stat__total { font-size: 12px; color: rgba(255, 255, 255, 0.55); white-space: nowrap; flex-shrink: 0; }
.obs-stat__total strong { color: #fff; font-weight: 800; font-variant-numeric: tabular-nums; }
.obs-stat__total-label { margin-left: 0.25rem; }

/* ── Merged menu (right, never shrinks) ── */
.obs-topbar__menu {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  margin-left: auto;
}
.obs-topbar__sep { width: 1px; height: 1.15rem; background: rgba(255, 255, 255, 0.12); margin-inline: 0.15rem; flex-shrink: 0; }

.obs-view-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
}
.obs-view-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.9rem;
  padding: 0 0.55rem;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.obs-view-tab:hover { color: #fff; background: rgba(255, 255, 255, 0.07); }
.obs-view-tab.is-active { background: rgba(255, 255, 255, 0.14); color: #fff; }
.obs-view-tab__icon { width: 0.85rem; height: 0.85rem; flex-shrink: 0; }
.obs-view-tab__text { white-space: nowrap; }

.obs-menu-btn {
  position: relative;
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  flex-shrink: 0;
}
.obs-menu-btn svg { width: 1rem; height: 1rem; }
.obs-menu-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; border-color: rgba(255, 255, 255, 0.08); }
.obs-menu-btn.is-active {
  background: color-mix(in srgb, var(--obs-emerald, #10b981) 20%, transparent);
  border-color: color-mix(in srgb, var(--obs-emerald, #10b981) 45%, transparent);
  color: var(--obs-emerald, #10b981);
}
.obs-menu-btn:focus-visible,
.obs-view-tab:focus-visible {
  outline: 2px solid var(--obs-red, #e74c3c);
  outline-offset: 2px;
}
.obs-menu-btn__wrap { position: relative; display: inline-flex; }
.obs-menu-btn__dot {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #22d3ee;
  box-shadow: 0 0 4px #22d3ee;
}

/* ── Progressive disclosure: numbers disappear as space shrinks ── */
@media (max-width: 1100px) {
  .obs-stat__label,
  .obs-stat__total-label { display: none; }
  .obs-view-tab__text { display: none; }
  .obs-view-tab { padding: 0 0.45rem; }
}
@media (max-width: 840px) {
  .obs-topbar__sub { display: none; }
  .obs-topbar__stats { gap: 0.35rem; }
  .obs-stat { padding: 0.25rem 0.5rem; }
  .obs-topbar__sep--utility { display: none; }
  .obs-menu-btn--home { display: none; } /* home reachable via browser back / landing */
}
@media (max-width: 640px) {
  /* Numbers disappear: stats hidden, brand + menu own the bar. */
  .obs-topbar__stats { display: none; }
  .obs-topbar { gap: 0.5rem; min-height: 2.9rem; border-radius: 12px; }
  .obs-view-toggle { order: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .obs-topbar__pulse { animation: none; }
  .obs-stat, .obs-menu-btn, .obs-view-tab { transition: none; }
}
</style>
