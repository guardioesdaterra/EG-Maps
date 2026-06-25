<template>
  <div class="obs-minimap" :class="{ 'obs-minimap--collapsed': collapsed }">
    <button
      type="button"
      class="obs-minimap__toggle"
      :aria-label="collapsed ? 'Expand minimap' : 'Collapse minimap'"
      @click="collapsed = !collapsed"
    >
      <span class="obs-minimap__toggle-icon">{{ collapsed ? '◱' : '◻' }}</span>
    </button>
    <div v-show="!collapsed" class="obs-minimap__map" ref="minimapContainer" />
    <div v-if="!collapsed && !minimapReady" class="obs-minimap__loading">
      <span class="obs-minimap__spinner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type maplibregl from 'maplibre-gl'

const props = defineProps<{
  map: maplibregl.Map | null
  center?: [number, number]
  zoom?: number
}>()

const minimapContainer = ref<HTMLElement | null>(null)
const collapsed = ref(false)
const minimapReady = ref(false)

let minimap: maplibregl.Map | null = null
let minimapMarker: maplibregl.Marker | null = null

const BRAZIL_CENTER: [number, number] = [-52, -14]
const BRAZIL_ZOOM = 4

function initMinimap() {
  if (!minimapContainer.value || minimap) return

  import('maplibre-gl').then(({ default: maplibregl }) => {
    minimap = new maplibregl.Map({
      container: minimapContainer.value!,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 18 }],
      },
      center: props.center ?? BRAZIL_CENTER,
      zoom: props.zoom ?? BRAZIL_ZOOM,
      attributionControl: false,
      interactive: false,
    })

    minimap.on('load', () => {
      minimapReady.value = true
    })

    // Add viewport indicator marker
    const el = document.createElement('div')
    el.style.cssText = 'width:12px;height:12px;border:2px solid #e74c3c;border-radius:50%;background:rgba(231,76,60,0.2);box-shadow:0 0 8px rgba(231,76,60,0.4);pointer-events:none;'
    minimapMarker = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(props.center ?? BRAZIL_CENTER)
      .addTo(minimap)
  })
}

function updateMinimapPosition() {
  if (!minimap || !minimapMarker) return
  const center = props.map?.getCenter()
  if (center) {
    minimapMarker.setLngLat([center.lng, center.lat])
  }
}

watch(() => props.map?.getCenter(), () => {
  updateMinimapPosition()
})

watch(() => props.center, (newCenter) => {
  if (newCenter && minimapMarker) {
    minimapMarker.setLngLat(newCenter)
  }
}, { deep: true })

onMounted(() => {
  initMinimap()
})

onUnmounted(() => {
  if (minimap) {
    minimap.remove()
    minimap = null
  }
  minimapMarker = null
})
</script>
