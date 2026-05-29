<template>
  <ClientOnly>
    <div class="w-full h-screen relative overflow-hidden bg-black">
      <!-- Same map but with dark satellite style for 3D feel -->
      <div ref="mapContainer" class="absolute inset-0" />
    </div>
    <template #fallback>
      <div class="flex h-screen w-full items-center justify-center bg-black text-white">
        <LoadingSpinner :message="t('loading.observatoryOfVulcanGlobe')" :inline="true" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan (3D) | Earth Guardians',
  meta: [{ name: 'description', content: '3D view of Brazil rare earth mining claims and socio-environmental impact.' }],
})

const mapContainer = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null

onMounted(async () => {
  try {
    const res = await fetch(`${baseURL}data/rare-earth/points.geojson`)
    const gj = await res.json()
    const features = gj.features.map((f: any, i: number) => ({
      type: 'Feature', id: i,
      properties: { category: f.properties.category, enterprise: f.properties.nome, substance: f.properties.subs, process: f.properties.processo, uf: f.properties.uf, area_ha: f.properties.area_ha, id: i },
      geometry: { type: 'Point', coordinates: f.geometry.coordinates }
    }))

    let polyG = null
    try { const r = await fetch(`${baseURL}data/rare-earth/polygons.geojson`); if (r.ok) polyG = await r.json() } catch {}

    if (mapContainer.value) {
      map = new maplibregl.Map({
        container: mapContainer.value,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            'satellite': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', 'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'], tileSize: 256, attribution: '© CARTO © OSM' }
          },
          layers: [{ id: 'base', type: 'raster', source: 'satellite' }]
        },
        center: [-48, -15],
        zoom: 4.2,
        maxZoom: 16,
        minZoom: 2.5,
        pitch: 45,
        bearing: -15,
      })

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')

      map.on('load', () => {
        map!.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features } as any, cluster: true, clusterMaxZoom: 11, clusterRadius: 45 })
        if (polyG) map!.addSource('polygons', { type: 'geojson', data: polyG })

        if (polyG) {
          map!.addLayer({ id: 'pf', type: 'fill', source: 'polygons', paint: { 'fill-color': '#e74c3c', 'fill-opacity': 0.06 } })
          map!.addLayer({ id: 'pl', type: 'line', source: 'polygons', paint: { 'line-color': '#e74c3c', 'line-width': 0.8, 'line-opacity': 0.3 } })
        }

        map!.addLayer({ id: 'cl', type: 'circle', source: 'points', filter: ['has', 'point_count'], paint: { 'circle-color': '#c0392b', 'circle-radius': ['step', ['get', 'point_count'], 4, 5, 8, 20, 12, 50, 18], 'circle-opacity': 0.5, 'circle-stroke-color': 'rgba(255,255,255,0.2)' } })
        map!.addLayer({ id: 'pt', type: 'circle', source: 'points', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#e74c3c', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 8, 3, 12, 4.5], 'circle-opacity': 0.7, 'circle-stroke-width': 0.5, 'circle-stroke-color': 'rgba(255,255,255,0.3)' } })
      })
    }
  } catch (e) {
    console.error('Failed to load 3D map:', e)
  }
})

onUnmounted(() => {
  if (map) { map.remove(); map = null }
})
</script>
