/**
 * pages/squarespace/active-crews.vue
 * @why Squarespace (and any third-party host) embed for the active-crews map.
 *
 *       - Transparent body so the host's brand/gradient shows through water.
 *       - Renders country land borders + crew markers + click popups.
 *       - Communicates with the host via postMessage (height, theme, focus).
 *
 *       Mount inside Squarespace with the snippet in /docs/squarespace-embed.md.
 *
 * @component squarespace-active-crews
 * @deps vue (ref, computed, onMounted); maplibre-gl; composables/useSquarespaceEmbed,
 *       composables/useTransparentLandStyle, composables/useCrewEmbedMarkers,
 *       lib/crew-data, components/LoadingSpinner, components/map/CrewPopup.
 */
<template>
  <div
    ref="rootRef"
    class="eg-embed-root"
    :class="themeClass"
    role="region"
    aria-label="Earth Guardians active crews map"
  >
    <div ref="mapRef" class="eg-embed-canvas" />
    <div v-if="!isMapReady" class="eg-embed-loading" role="status" aria-live="polite">
      <LoadingSpinner :message="loadingMessage" size="md" />
    </div>
    <Transition name="eg-popup">
      <div
        v-if="popup"
        class="eg-embed-popup"
        :style="popupStyle"
        role="dialog"
        aria-modal="false"
        :aria-label="popup.kind === 'region' ? `Crew region: ${popup.region?.region}` : `Crew location: ${popup.location?.name}`"
        @click.stop
      >
        <button class="eg-embed-popup-close" :aria-label="closeAria" @click="closePopup">
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
        <CrewPopup :crew="activeCrew" :is-location="popup.kind === 'location'" />
      </div>
    </Transition>
    <div class="eg-embed-stats" aria-hidden="true">
      <span class="eg-embed-stats-dot" />
      <span class="eg-embed-stats-count">{{ formattedCount }}</span>
      <span class="eg-embed-stats-label">{{ statsLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watchEffect, type Ref } from 'vue'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import { allCrewRegionsData, crewOverallStats, type CrewLocation, type CrewRegionData } from '@/lib/crew-data'
import { useEmbedBasemap } from '@/composables/useEmbedBasemap'
import { useCrewEmbedMarkers, type CrewEmbedPopup } from '@/composables/useCrewEmbedMarkers'
import CrewPopup from '@/components/map/CrewPopup.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import Icon from '@/components/Icon.vue'

defineOptions({ name: 'SquarespaceActiveCrews' })

const rootRef = ref<HTMLElement | null>(null)

const mapContainer = ref<HTMLElement | null>(null)
const isMapReady = ref(false)
const loadingMessage = ref('Loading crews…')

const baseURL = useRuntimeConfig().app.baseURL
const regions = allCrewRegionsData
const locations = ref<CrewLocation[]>([])
const popup = ref<CrewEmbedPopup | null>(null)

const embed = useSquarespaceEmbed({
  rootRef,
  channel: 'eg-maps-active-crews',
  initialTheme: 'auto',
})

const themeClass = computed(() =>
  embed.theme.value === 'dark' || (embed.theme.value === 'auto' && isDarkScheme())
    ? 'eg-embed-dark'
    : 'eg-embed-light',
)

function isDarkScheme(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

const formattedCount = computed(() =>
  new Intl.NumberFormat('en-US').format(crewOverallStats.totalActiveCrews),
)

const statsLabel = computed(() => 'active crews')

const activeCrew = computed<CrewRegionData | CrewLocation | null>(() => {
  if (!popup.value) return null
  if (popup.value.kind === 'region') return popup.value.region ?? null
  return popup.value.location ?? null
})

const popupStyle = computed(() => {
  if (!popup.value) return {}
  const { x, y } = popup.value.point
  // Anchor to the click point but keep the popup on-screen (cheap viewport clamp).
  const pad = 16
  const maxX = (rootRef.value?.clientWidth ?? 0) - 280 - pad
  const maxY = (rootRef.value?.clientHeight ?? 0) - 220 - pad
  return {
    left: `${Math.max(pad, Math.min(x, Math.max(pad, maxX)))}px`,
    top: `${Math.max(pad, Math.min(y, Math.max(pad, maxY)))}px`,
  }
})

const closeAria = 'Close popup'

function closePopup() {
  popup.value = null
}

const handleHostOpen = (e: Event) => {
  const detail = (e as CustomEvent<CrewEmbedPopup | null>).detail
  if (detail) popup.value = detail
}

onMounted(async () => {
  // 1. Load crew locations GeoJSON (small, ~50 KB).
  try {
    const res = await fetch(`${baseURL}/data/crews-locations.json`)
    if (res.ok) {
      const geo = (await res.json()) as GeoJSON.FeatureCollection
      locations.value = geo.features.map((f) => ({
        name: (f.properties?.name as string) ?? '',
        country: (f.properties?.country as string) ?? '',
        city: (f.properties?.city as string) ?? '',
        state: (f.properties?.state as string) ?? '',
        region: (f.properties?.region as string) ?? '',
        status:
          ((f.properties?.status as string) === 'inactive' ? 'inactive' : 'active') as
            | 'active'
            | 'inactive',
        lat: (f.geometry as GeoJSON.Point).coordinates[1],
        lng: (f.geometry as GeoJSON.Point).coordinates[0],
      }))
    }
  } catch {
    /* keep empty */
  }

  // 2. Boot MapLibre against an empty bootstrap style; the real basemap is
  //    installed below once `map.loaded()` resolves.
  if (!mapContainer.value) return
  const map = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {},
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': 'rgba(0,0,0,0)' } },
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    } as unknown as maplibregl.StyleSpecification,
    center: [0, 20],
    zoom: 1.4,
    attributionControl: false,
    interactive: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchZoomRotate: true,
  })
  const mapRef = ref<MapLibreMap | null>(null) as Ref<MapLibreMap | null>
  mapRef.value = map as unknown as MapLibreMap

  map.on('error', (e) => embed.emitError({ kind: 'maplibre', error: String(e?.error) }))

  await new Promise<void>((resolve) => {
    if (map.loaded()) return resolve()
    map.once('load', () => resolve())
  })

  // 3. Install basemap — satellite-on-land, alpha-water. Falls back to
  //    borders-only if no MapTiler key is configured at runtime.
  const runtimeConfig = useRuntimeConfig()
  const maptilerKey = runtimeConfig.public?.maptilerApiKey || ''
  const mapTilerStyleUrl = maptilerKey
    ? `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${maptilerKey}`
    : null

  const basemap = useEmbedBasemap({
    mapRef,
    mapTilerStyleUrl,
    landGeoJsonUrl: `${baseURL}data/embed/land-110m.geojson`,
    borderWidth: 1.2,
  })
  await basemap.install()

  // Expose mode for the page (debug/analytics hook).
  if (basemap.mode.value === 'borders') {
    // eslint-disable-next-line no-console
    console.info('[eg-embed] No MAPTILER_API_KEY — falling back to borders-only basemap.')
  }

  // 4. Install crew markers.
  const markers = useCrewEmbedMarkers({
    mapRef,
    regions: ref(regions),
    locations,
    onPopup: (p) => {
      popup.value = p
      embed.emitClick({
        kind: p.kind,
        id: p.kind === 'region' ? p.region?.id : p.location?.region,
      })
    },
  })
  markers.install()
  watchEffect(() => markers.update())

  // 5. Re-sync height on map resize.
  map.on('resize', () => embed.reportHeight())

  isMapReady.value = true
  loadingMessage.value = 'Ready'

  window.addEventListener('eg-embed:host:open', handleHostOpen)
})

onBeforeUnmount(() => {
  window.removeEventListener('eg-embed:host:open', handleHostOpen)
})

// Keep the embed height in sync when the host's container changes.
watchEffect(() => {
  if (isMapReady.value) embed.reportHeight()
})
</script>

<style>
/*
 * Global (un-scoped) styles — these are intentionally unscoped because the
 * embed page renders inside a transparent iframe and DOM scoping would
 * inflate the rendered HTML.
 */
.eg-embed-root {
  position: relative;
  width: 100%;
  min-height: 360px;
  background: transparent;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --embed-land-stroke: rgba(15, 23, 42, 0.45);
  --embed-land-stroke-dark: rgba(226, 232, 240, 0.55);
  --embed-accent: #22d3ee;
  color: #0f172a;
}
.eg-embed-dark {
  --embed-land-stroke: rgba(226, 232, 240, 0.55);
  color: #e2e8f0;
}
.eg-embed-canvas {
  position: absolute;
  inset: 0;
}
.eg-embed-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.04);
  z-index: 5;
  pointer-events: none;
}
.eg-embed-root .maplibregl-canvas {
  outline: none;
}
.eg-embed-popup {
  position: absolute;
  width: min(280px, 80vw);
  max-height: 60vh;
  overflow: auto;
  padding: 1rem 1rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 14px 38px rgba(2, 6, 23, 0.18);
  z-index: 10;
  color: inherit;
}
.eg-embed-dark .eg-embed-popup {
  background: rgba(15, 23, 42, 0.92);
  border-color: rgba(226, 232, 240, 0.1);
  color: #e2e8f0;
}
.eg-embed-popup-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.eg-embed-dark .eg-embed-popup-close {
  background: rgba(15, 23, 42, 0.7);
  border-color: rgba(226, 232, 240, 0.18);
  color: #e2e8f0;
}
.eg-embed-stats {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: inherit;
  z-index: 6;
  pointer-events: none;
}
.eg-embed-dark .eg-embed-stats {
  background: rgba(15, 23, 42, 0.7);
  border-color: rgba(226, 232, 240, 0.12);
}
.eg-embed-stats-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--embed-accent);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.25);
  animation: eg-embed-pulse 2.4s ease-in-out infinite;
}
.eg-embed-stats-count {
  font-variant-numeric: tabular-nums;
}
.eg-embed-stats-label {
  opacity: 0.7;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
}
@keyframes eg-embed-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.18); }
  50% { box-shadow: 0 0 0 8px rgba(34, 211, 238, 0.06); }
}
.eg-popup-enter-active,
.eg-popup-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}
.eg-popup-enter-from,
.eg-popup-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
</style>