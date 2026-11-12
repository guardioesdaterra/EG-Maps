/**
 * components/tools/satellite/OfflineSatelliteTool.vue
 * @why Tools-section satellite area downloader — picks a region (current map
 *      view or manual bounds), shows the tile cost, caches satellite imagery
 *      in IndexedDB for offline field use, and reports/clears the cache.
 * @component OfflineSatelliteTool
 * @emits close: []
 * @deps vue (computed, onMounted, ref); @/composables/useI18n; @/composables/useToast;
 *       @/composables/useOfflineTileCache; @/lib/hexbin (unprojectXLng/unprojectYLat);
 *       @/components/Icon.vue, @/components/ui/Button.vue
 * @connections lib/tools.ts, composables/useOfflineTiles.ts
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

          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label v-for="field in boundFields" :key="field.key" class="flex flex-col gap-1 text-[11px] text-[var(--text-muted)]">
              {{ t(field.labelKey) }}
              <input
                v-model.number="bounds[field.key]"
                type="number"
                :step="0.01"
                :min="field.min"
                :max="field.max"
                class="rounded-md border border-[var(--glass-border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                @input="source = 'manual'; boundsTouched = true"
              />
            </label>
          </div>
          <p v-if="boundsTouched && !boundsValid" class="text-xs text-red-400">{{ t('tools.satelliteDownloader.invalidBounds') }}</p>
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
          <p class="text-xs text-[var(--text-secondary)]">
            {{ t('tools.satelliteDownloader.estimate', { tiles: tileEstimate }) }}
            <span v-if="approxBytes" class="text-[var(--text-muted)]">· ≈ {{ approxBytes }}</span>
          </p>
          <p v-if="tileEstimate > WARN_TILE_COUNT" class="text-xs text-amber-400">{{ t('tools.satelliteDownloader.largeAreaWarning') }}</p>
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

        <div v-if="tiles.isPrefetching.value || progress > 0" class="space-y-1">
          <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div class="h-full bg-cyan-500 transition-[width] duration-200" :style="{ width: `${progress}%` }" />
          </div>
          <p class="text-xs text-[var(--text-secondary)]" role="status" aria-live="polite">
            {{ t('tools.satelliteDownloader.progress', { done: tiles.prefetchProgress.value, total: tiles.prefetchTotal.value }) }}
            <span v-if="tiles.prefetchErrors.value" class="text-amber-400"> · {{ t('tools.satelliteDownloader.failed', { count: tiles.prefetchErrors.value }) }}</span>
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
        <p class="text-[11px] leading-relaxed text-[var(--text-muted)]">{{ t('tools.satelliteDownloader.cacheNote') }}</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useAppRuntime, type MapViewportBounds } from '@/composables/useAppRuntime'
import { useOfflineTileCache } from '@/composables/useOfflineTileCache'
import Icon from '@/components/Icon.vue'
import UiButton from '@/components/ui/Button.vue'

/** Above this the download is field-impractical; the UI warns. */
const WARN_TILE_COUNT = 4000
/** Largest area (degrees) the downloader accepts — one side of a world view is 180°. */
const MAX_DOWNLOAD_SPAN = 60

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
let controller: AbortController | null = null

const boundsValid = computed(() =>
  Number.isFinite(bounds.north) && Number.isFinite(bounds.south)
  && Number.isFinite(bounds.east) && Number.isFinite(bounds.west)
  && bounds.north > bounds.south && bounds.east > bounds.west
  && Math.abs(bounds.north - bounds.south) <= MAX_DOWNLOAD_SPAN && Math.abs(bounds.east - bounds.west) <= MAX_DOWNLOAD_SPAN,
)
const zoomValid = computed(() => zoomRange.min <= zoomRange.max && zoomRange.max <= 20)
const canDownload = computed(() => boundsValid.value && zoomValid.value && Boolean(tiles.isOnline.value))
const tileEstimate = computed(() => {
  if (!boundsValid.value || !zoomValid.value) return 0
  return tiles.countRegionTiles({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }, zoomRange.min, zoomRange.max)
})
// Satellite jpg tiles average ~60 KB; the estimate is deliberately rough.
const approxBytes = computed(() => {
  if (!tileEstimate.value) return ''
  const bytes = tileEstimate.value * 60 * 1024
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes / Math.pow(1024, i + 1) >= 1 && i < units.length - 1) i++
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
})
const progress = computed(() => {
  const total = tiles.prefetchTotal.value
  return total > 0 ? Math.round((tiles.prefetchProgress.value / total) * 100) : 0
})

/**
 * Area to cache, taken from the live viewport the map publishes. Tile pyramids
 * grow ~4x per level, so the cache budget drives the download ceiling more than
 * the zoom labels do: two levels above the current view, three below it.
 */
function applyBounds(view: MapViewportBounds) {
  // The map can show more than a cacheable area (a world view is 180° tall);
  // keep the centre and clamp to the largest area the download accepts, so the
  // panel always starts from something actionable and the size warning informs.
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

async function startDownload() {
  if (!canDownload.value) return
  controller = new AbortController()
  const area = tiles.countRegionTiles({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }, zoomRange.min, zoomRange.max)
  await tiles.prefetchRegion({ north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west }, zoomRange.min, zoomRange.max, controller.signal)
  controller = null
  if (tiles.prefetchErrors.value === 0) {
    toast.success(t('tools.satelliteDownloader.done', { count: area }))
  } else {
    toast.info(t('tools.satelliteDownloader.doneWithErrors', { failed: tiles.prefetchErrors.value }))
  }
}

function cancelDownload() {
  controller?.abort()
  controller = null
  toast.info(t('tools.satelliteDownloader.cancelled'))
}

async function clearCache() {
  await tiles.clearCache()
  toast.success(t('tools.satelliteDownloader.cacheCleared'))
}

onMounted(() => {
  void tiles.init()
  void tiles.getStats()
  useCurrentView()
})
</script>
