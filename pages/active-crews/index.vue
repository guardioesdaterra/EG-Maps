<template>
  <ClientOnly>
    <MapView2D :default-dataset="'active-crews'" :crews="crewRegions" :crew-locations="crewLocations" />
    <template #fallback>
      <div class="flex flex-col h-[100svh] w-full items-center justify-center bg-black text-white">
        <div class="relative mb-[clamp(1.5rem,4vw,3rem)] flex items-center justify-center loader-ring">
          <iconify-icon icon="svg-spinners:eclipse" class="absolute loader-ring text-white/20" />
          <iconify-icon icon="svg-spinners:eclipse" class="absolute loader-ring-sm text-white/30 animate-[spin_0.8s_linear_infinite]" />
          <iconify-icon icon="svg-spinners:blocks-shuffle-2" class="relative loader-icon text-white" />
        </div>
        <LoadingSpinner
          :message="t('loading.activeCrewsMap')"
          size="sm"
        />
        <p class="text-fluid-sm text-gray-400 mt-2">{{ t('loading.initializingVisualization') }}</p>
        <iconify-icon icon="svg-spinners:3-dots-move" class="w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)] text-white/50 mt-[clamp(0.75rem,2vw,1rem)]" />
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import { allCrewRegionsData, type CrewLocation } from '@/lib/crew-data'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

const crewRegions = allCrewRegionsData
const crewLocations = ref<CrewLocation[]>([])

onMounted(async () => {
  try {
    const res = await fetch(`${baseURL}/data/crews-locations.json`)
    if (res.ok) {
      const geojson = await res.json()
      crewLocations.value = geojson.features.map((f: GeoJSON.Feature) => ({
        name: (f.properties?.name as string) ?? '',
        country: (f.properties?.country as string) ?? '',
        city: (f.properties?.city as string) ?? '',
        state: (f.properties?.state as string) ?? '',
        region: (f.properties?.region as string) ?? '',
        status: ((f.properties?.status as string) === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        lat: (f.geometry as GeoJSON.Point).coordinates[1],
        lng: (f.geometry as GeoJSON.Point).coordinates[0],
      }))
    }
  } catch {
    // Silently handle crew locations fetch failure — map falls back to region-level markers
  }
})

useHead({
  title: 'Active Crews Map (2D) | Earth Guardians',
  meta: [
    { name: 'description', content: 'Interactive 2D map showing Earth Guardians active crews worldwide' },
  ],
})
</script>
