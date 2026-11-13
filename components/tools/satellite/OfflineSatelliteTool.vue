/**
 * components/tools/satellite/OfflineSatelliteTool.vue
 * @why Tools-section satellite area downloader — picks a region (current map
 *      view or manual bounds), shows the tile cost, caches satellite imagery
 *      in IndexedDB for offline field use, and reports/clears the cache.
 * @component OfflineSatelliteTool
 * @deps vue (computed, onMounted, onUnmounted, ref); @/composables/useI18n;
 *       @/composables/useToast; @/composables/useOfflineTileCache;
 *       @/composables/useAppRuntime; @/components/Icon.vue, @/components/ui/Button.vue
 * @connections lib/tools.ts, composables/useOfflineTiles.ts, pages/tools/[tool].vue
 */
<template>
  <div class="offline-satellite w-full h-full text-[var(--text-primary)]">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section class="space-y-4">
        <div class="rounded-xl border border-[var(--glass-border)] p-4 space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{{ t('tools.satelliteDownloader.area') }}</h3>
          <div class="flex flex-wrap gap-2">
            <UiButton :variant="source === 'view' ? 'default' : 'outline'" size="sm" @click="useCurrentView">
              <Icon name="tabler:target-arrow" class="h-4 w-4 mr-1.5" />
              {{ t('tools.satelliteDownloader.useView') }}
            </UiButton>
            <UiButton :variant="source === 'manual' ? 'default' : 'outline'" size="sm" @click="source = 'manual'; boundsTouched = true">
              <Icon name="tabler:pencil" class="h-4 w-4 mr-1.5" />
              {{ t('tools.satelliteDownloader.manual') }}
            </UiButton>
          </div>
          <p v-if="source === 'view' && !hasLiveMapView" class="text-xs text-[var(--text-muted)]">
            {{ t('tools.satelliteDownloader.noMapView') }}
          </p>

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label v-for="field in boundFields" :key="field.key" class="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
              {{ t(field.labelKey) }}
              <input
                v-model.number="bounds[field.key]"
                type="number"
                :step="0.1"
                :min="field.min"
                :max="field.max"
                class="rounded-md border border-[var(--glass-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                @input="source = 'manual'; boundsTouched = true"
              />
            </label>
          </div>
          <p v-if="boundsTouched && !boundsValid" class="text-xs text-red-400">{{ t('tools.satelliteDownloader.invalidBounds') }}</p>

          <!-- Live preview of the area that will be downloaded -->
          <div class="mt-1 rounded-lg overflow-hidden border border-[var(--glass-border)]" aria-hidden="true">
            <svg :viewBox="`0 0 ${PREVIEW_W} ${PREVIEW_H}`" class="block w-full h-28 bg-[var(--input-bg)]" role="img" :aria-label="t('tools.satelliteDownloader.previewLabel')">
              <rect x="0" y="0" :width="PREVIEW_W" :height="PREVIEW_H" fill="transparent" />
              <!-- equirectangular land hint grid -->
              <g stroke="currentColor" stroke-opacity="0.12" stroke-width="1">
                <line v-for="i in 5" :key="`v${i}`" :x1="(PREVIEW_W / 6) * i" y1="0" :x2="(PREVIEW_W / 6) * i" :y2="PREVIEW_H" />
                <line v-for="i in 3" :key="`h${i}`" x1="0" :y1="(PREVIEW_H / 4) * i" :x2="PREVIEW_W" :y2="(PREVIEW_H / 4) * i" />
              </g>
              <rect
                :x="previewRect.x"
                :y="previewRect.y"
                :width="Math.max(2, previewRect.w)"
                :height="Math.max(2, previewRect.h)"
                fill="rgba(34, 211, 238, 0.22)"
                stroke="#22d3ee"
                stroke-width="1.5"
                rx="2"
              />
              <text x="6" y="14" fill="currentColor" fill-opacity="0.55" font-size="9" font-family="monospace">
                {{ trim(bounds.west) }},{{ trim(bounds.south) }} → {{ trim(bounds.east) }},{{ trim(bounds.north) }}
              </text>
            </svg>
          </div>
        </div>

        <div class="rounded-xl border border-[var(--glass-border)] p-4 space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{{ t('tools.satelliteDownloader.zoomLevels') }}</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
              {{ t('tools.satelliteDownloader.minZoom') }} — z{{ zoomRange.min }}
              <input v-model.number="zoomRange.min" type="range" min="2" max="18" class="accent-cyan-500" />
            </label>
            <label class="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
              {{ t('tools.satelliteDownloader.maxZoom') }} — z{{ zoomRange.max }}
              <input v-model.number="zoomRange.max" type="range" min="4" max="20" class="accent-cyan-500" />
            </label>
          </div>
          <p v-if="!zoomValid" class="text-xs text-red-400">{{ t('tools.satelliteDownloader.invalidZoom') }}</p>
          <p class="text-xs text-[var(--text-secondary)]">
            {{ t('tools.satelliteDownloader.estimate', { tiles: tileEstimate }) }}
            <span v-if="approxBytes" class="text-[var(--text-muted)]">· ≈ {{ approxBytes }}</span>
            <span v-if="alreadyCachedEstimate > 0" class="text-[var(--text-muted)]">· {{ t('tools.satelliteDownloader.alreadyCached', { count: alreadyCachedEstimate }) }}</span>
          </p>
          <p v-if="tileEstimate > WARN_TILE_COUNT && tileEstimate <= MAX_TILE_COUNT" class="text-xs text-amber-400">{{ t('tools.satelliteDownloader.largeAreaWarning') }}</p>
          <p v-if="tileEstimate > MAX_TILE_COUNT" class="text-xs text-red-400">{{ t('tools.satelliteDownloader.tooLarge', { max: MAX_TILE_COUNT }) }}</p>
          <p v-if="!hasApiKey" class="text-xs text-amber-400">{{ t('tools.satelliteDownloader.needsApiKey') }}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UiButton
            variant="default"
            size="sm"
            :disabled="!canDownload || tiles.isPrefetching.value"
            @click="startDownload"
          >
            <Icon name="tabler:cloud-download" class="h-4 w-4 mr-1.5" />
            {{ t('tools.satelliteDownloader.download') }}
          </UiButton>
          <UiButton v-if="tiles.isPrefetching.value" variant="outline" size="sm" @click="cancelDownload">
            <Icon name="tabler:circle-x" class="h-4 w-4 mr-1.5" />
            {{ t('tools.satelliteDownloader.cancel') }}
          </UiButton>
          <p v-if="!tiles.isOnline.value" class="text-xs text-amber-400">{{ t('tools.satelliteDownloader.needsConnection') }}</p>
        </div>

        <div v-if="progressVisible" class="space-y-1">
          <div
            class="h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="progress"
            :aria-label="t('tools.satelliteDownloader.progress', { done: tiles.prefetchProgress.value, total: tiles.prefetchTotal.value })"
          >
            <div class="h-full bg-cyan-500 transition-[width] duration-200" :style="{ width: `${progress}%` }" />
          </div>
          <p class="text-xs text-[var(--text-secondary)]" role="status" aria-live="polite">
            {{ t('tools.satelliteDownloader.progress', { done: tiles.prefetchProgress.value, total: tiles.prefetchTotal.value }) }}
            <span v-if="tiles.prefetchSkipped.value" class="text-[var(--text-muted)]"> · {{ t('tools.satelliteDownloader.skipped', { count: tiles.prefetchSkipped.value }) }}</span>
            <span v-if="tiles.prefetchErrors.value" class="text-amber-400"> · {{ t('tools.satelliteDownloader.failed', { count: tiles.prefetchErrors.value }) }}</span>
          </p>
          <p v-if="tiles.storageFull.value" class="text-xs text-red-400" role="alert">
            {{ t('tools.satelliteDownloader.storageFull') }}
          </p>
          <p v-if="tiles.prefetchAbortReason.value === 'auth'" class="text-xs text-red-400" role="alert">
            {{ t('tools.satelliteDownloader.authFailed') }}
          </p>
        </div>
      </section>

      <aside class="space-y-3 rounded-xl border border-[var(--glass-border)] p-4 h-fit">
        <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">{{ t('tools.satelliteDownloader.cache') }}</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex items-center justify-between gap-2">
            <dt class="text-[var(--text-secondary)]">{{ t('tools.satelliteDownloader.cachedTiles') }}</dt>
            <dd class="font-mono font-semibold">{{ tiles.stats.value.cachedTiles }}</dd>
          </div>
          <div class="flex items-center justify-between gap-2">
            <dt class="text-[var(--text-secondary)]">{{ t('tools.satelliteDownloader.cacheSize') }}</dt>
            <dd class="font-mono font-semibold">{{ tiles.stats.value.cacheSizeFormatted }}</dd>
          </div>
          <div v-if="tiles.stats.value.cachedTiles > 0" class="flex items-center justify-between gap-2">
            <dt class="text-[var(--text-secondary)]">{{ t('tools.satelliteDownloader.cachedZoom') }}</dt>
            <dd class="font-mono font-semibold">z{{ tiles.stats.value.minZoom }}–z{{ tiles.stats.value.maxZoom }}</dd>
          </div>
          <div v-if="storageEstimate" class="flex items-center justify-between gap-2">
            <dt class="text-[var(--text-secondary)]">{{ t('tools.satelliteDownloader.storageUsage') }}</dt>
            <dd class="font-mono font-semibold">{{ storageEstimate.usageLabel }} / {{ storageEstimate.quotaLabel }}</dd>
          </div>
          <div class="flex items-center justify-between gap-2">
            <dt class="text-[var(--text-secondary)]">{{ t('tools.satelliteDownloader.connection') }}</dt>
            <dd :class="tiles.isOnline.value ? 'text-emerald-400' : 'text-amber-400'">
              {{ tiles.isOnline.value ? t('tools.satelliteDownloader.online') : t('tools.satelliteDownloader.offline') }}
            </dd>
          </div>
        </dl>
        <UiButton variant="outline" size="sm" class="w-full" :disabled="tiles.isPrefetching.value || tiles.stats.value.cachedTiles === 0" @click="clearCache">
          <Icon name="tabler:trash" class="h-4 w-4 mr-1.5" />
          {{ t('tools.satelliteDownloader.clearCache') }}
        </UiButton>
        <UiButton v-if="!storagePersisted" variant="outline" size="sm" class="w-full" @click="persistStorage">
          <Icon name="tabler:device-floppy" class="h-4 w-4 mr-1.5" />
          {{ t('tools.satelliteDownloader.persistStorage') }}
        </UiButton>
        <p class="text-[11px] leading-relaxed text-[var(--text-muted)]">{{ t('tools.satelliteDownloader.cacheNote') }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useAppRuntime, type MapViewportBounds } from '@/composables/useAppRuntime'
import { useOfflineTileCache } from '@/composables/useOfflineTileCache'
import { MAX_PREFETCH_JOBS } from '@/composables/useOfflineTiles'
import Icon from '@/components/Icon.vue'
import UiButton from '@/components/ui/Button.vue'

/** Above this the download is field-impractical; the UI warns. */
const WARN_TILE_COUNT = 4000
/** Hard ceiling — prefetch refuses to materialize more jobs than this. */
const MAX_TILE_COUNT = MAX_PREFETCH_JOBS
/** Largest area (degrees) the downloader accepts — one side of a world view is 180°. */
const MAX_DOWNLOAD_SPAN = 60
const PREVIEW_W = 360
const PREVIEW_H = 112

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const runtime = useAppRuntime()
const tiles = useOfflineTileCache()

const boundFields = [
  { key: 'north', labelKey: 'tools.satelliteDownloader.north', min: -85, max: 85 },
  { key: 'south', labelKey: 'tools.satelliteDownloader.south', min: -85, max: 85 },
  { key: 'east', labelKey: 'tools.satelliteDownloader.east', min: -180, max: 180 },
  { key: 'west', labelKey: 'tools.satelliteDownloader.west', min: -180, max: 180 },
] as const

const bounds = reactive({ north: 0, south: 0, east: 0, west: 0 })
const zoomRange = reactive({ min: 12, max: 15 })
const source = ref<'view' | 'manual'>('view')
/** True once the user typed bounds, so the warning does not fire on first paint. */
const boundsTouched = ref(false)
const progressVisible = ref(false)
const storageEstimate = ref<{ usageLabel: string; quotaLabel: string } | null>(null)
const storagePersisted = ref(false)
let lastRunFetched = 0
let lastRunSkipped = 0
let lastRunErrors = 0

const hasLiveMapView = computed(() => Boolean(runtime.mapBounds.value))
const hasApiKey = computed(() => Boolean(String(useRuntimeConfig().public.maptilerApiKey || '')))

const boundsValid = computed(() =>
  Number.isFinite(bounds.north) && Number.isFinite(bounds.south)
  && Number.isFinite(bounds.east) && Number.isFinite(bounds.west)
  && bounds.north > bounds.south && bounds.east > bounds.west
  && Math.abs(bounds.north - bounds.south) <= MAX_DOWNLOAD_SPAN && Math.abs(bounds.east - bounds.west) <= MAX_DOWNLOAD_SPAN,
)
const zoomValid = computed(() => zoomRange.min <= zoomRange.max && zoomRange.max <= 20)
const tileEstimate = computed(() => {
  if (!boundsValid.value || !zoomValid.value) return 0
  return tiles.countRegionTiles({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }, zoomRange.min, zoomRange.max)
})
const canDownload = computed(() =>
  boundsValid.value
  && zoomValid.value
  && Boolean(tiles.isOnline.value)
  && hasApiKey.value
  && tileEstimate.value > 0
  && tileEstimate.value <= MAX_TILE_COUNT,
)
// Satellite jpg tiles average ~60 KB; the estimate is deliberately rough.
const approxBytes = computed(() => {
  if (!tileEstimate.value) return ''
  const bytes = tileEstimate.value * 60 * 1024
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes / Math.pow(1024, i + 1) >= 1 && i < units.length - 1) i++
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
})
const alreadyCachedEstimate = computed(() => tiles.stats.value.cachedTiles)
const progress = computed(() => {
  const total = tiles.prefetchTotal.value
  return total > 0 ? Math.round((tiles.prefetchProgress.value / total) * 100) : 0
})

/** Equirectangular preview rect for the selected bounds. */
const previewRect = computed(() => {
  const x = ((bounds.west + 180) / 360) * PREVIEW_W
  const w = ((bounds.east - bounds.west) / 360) * PREVIEW_W
  // lat → y (Mercator-ish clamp is fine for a schematic)
  const yFor = (lat: number) => {
    const clamped = Math.max(-85, Math.min(85, lat))
    return ((85 - clamped) / 170) * PREVIEW_H
  }
  const y = yFor(bounds.north)
  const h = Math.max(2, yFor(bounds.south) - y)
  return { x, y, w: Math.max(2, w), h }
})

/**
 * Area to cache, taken from the live viewport the map publishes. Tile pyramids
 * grow ~4x per level, so the cache budget drives the download ceiling more than
 * the zoom labels do: two levels above the current view, three below it.
 */
function applyBounds(view: MapViewportBounds) {
  const lat = clampSpan(view.north, view.south)
  const lng = clampSpan(view.east, view.west)
  bounds.west = round(clamp(lng[1], -180, 180))
  bounds.east = round(clamp(lng[0], -180, 180))
  bounds.south = round(clamp(lat[1], -85, 85))
  bounds.north = round(clamp(lat[0], -85, 85))
  const zoom = clamp(Math.round(view.zoom), 2, 20)
  zoomRange.max = Math.min(20, zoom + 2)
  zoomRange.min = Math.max(2, zoomRange.max - 3)
}

function clampSpan(max: number, min: number): [number, number] {
  const hi = Number.isFinite(max) ? max : 0
  const lo = Number.isFinite(min) ? min : 0
  if (hi - lo <= MAX_DOWNLOAD_SPAN) return [hi, lo]
  const mid = (hi + lo) / 2
  return [mid + MAX_DOWNLOAD_SPAN / 2, mid - MAX_DOWNLOAD_SPAN / 2]
}

function useCurrentView() {
  source.value = 'view'
  boundsTouched.value = false
  const live = runtime.mapBounds.value
  if (live) {
    applyBounds(live)
    return
  }
  // No map has published a view yet (panel opened before the map, or a page
  // without one): a small window around the shared URL camera.
  const lng = clamp(Number(route.query.mapLng ?? 0), -180, 180)
  const lat = clamp(Number(route.query.mapLat ?? 0), -85, 85)
  applyBounds({ west: lng - 1.5, south: lat - 1.5, east: lng + 1.5, north: lat + 1.5, zoom: clamp(Number(route.query.mapZoom ?? 4), 2, 20) })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

// Follow the map while the panel is in "current view" mode, but never steal the
// area being downloaded mid-flight.
watch(() => runtime.mapBounds.value, (view) => {
  if (!view || source.value !== 'view' || tiles.isPrefetching.value) return
  applyBounds(view)
}, { immediate: true })

function round(v: number) {
  return Math.round(v * 1000) / 1000
}

function trim(v: number) {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '—'
}

async function refreshStorageEstimate() {
  try {
    const nav = navigator as Navigator & { storage?: { estimate?: () => Promise<StorageEstimate>; persist?: () => Promise<boolean> } }
    if (nav.storage?.estimate) {
      const est = await nav.storage.estimate()
      storageEstimate.value = {
        usageLabel: formatBytes(est.usage || 0),
        quotaLabel: formatBytes(est.quota || 0),
      }
    }
    if (nav.storage && typeof (nav.storage as { persist?: () => Promise<boolean> }).persist === 'function') {
      // persisted() is not in all TS libs — probe via try on persisted if present.
      const persistedFn = (nav.storage as { persisted?: () => Promise<boolean> }).persisted
      if (persistedFn) storagePersisted.value = await persistedFn.call(nav.storage)
    }
  } catch { /* ignore */ }
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

async function persistStorage() {
  try {
    const nav = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } }
    if (nav.storage?.persist) {
      storagePersisted.value = await nav.storage.persist()
      if (storagePersisted.value) toast.success(t('tools.satelliteDownloader.persistGranted'))
      else toast.info(t('tools.satelliteDownloader.persistDenied'))
    }
  } catch { /* ignore */ }
}

async function startDownload() {
  if (!canDownload.value) return
  progressVisible.value = true
  await tiles.prefetchRegion(
    { north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west },
    zoomRange.min,
    zoomRange.max,
  )
  lastRunFetched = tiles.prefetchFetched.value
  lastRunSkipped = tiles.prefetchSkipped.value
  lastRunErrors = tiles.prefetchErrors.value
  const reason = tiles.prefetchAbortReason.value

  if (reason === 'aborted') {
    toast.info(t('tools.satelliteDownloader.cancelled'))
  } else if (reason === 'auth') {
    toast.error(t('tools.satelliteDownloader.authFailed'))
  } else if (reason === 'quota') {
    toast.error(t('tools.satelliteDownloader.storageFull'))
  } else if (reason === 'cap') {
    toast.error(t('tools.satelliteDownloader.tooLarge', { max: MAX_TILE_COUNT }))
  } else if (lastRunErrors === 0) {
    toast.success(t('tools.satelliteDownloader.done', { count: lastRunFetched }))
  } else {
    // Failed tiles stay uncached — download again to resume only the gaps.
    toast.info(t('tools.satelliteDownloader.doneWithErrors', { failed: lastRunErrors }))
  }

  void tiles.getStats()
  void refreshStorageEstimate()
  // Keep the final numbers visible briefly, then clear the block.
  window.setTimeout(() => {
    if (!tiles.isPrefetching.value) progressVisible.value = false
  }, 4000)
}

function cancelDownload() {
  tiles.cancelPrefetch('aborted')
}

async function clearCache() {
  const ok = window.confirm(t('tools.satelliteDownloader.confirmClear'))
  if (!ok) return
  await tiles.clearCache()
  toast.success(t('tools.satelliteDownloader.cacheCleared'))
  void refreshStorageEstimate()
}

onMounted(() => {
  void tiles.init().then(() => {
    void tiles.getStats()
    void refreshStorageEstimate()
  })
  useCurrentView()
})

onUnmounted(() => {
  // Never leave a headless download running with no Cancel control.
  if (tiles.isPrefetching.value) tiles.cancelPrefetch('aborted')
})
</script>
