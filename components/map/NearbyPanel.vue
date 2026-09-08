<template>
  <section class="nearby-panel" aria-labelledby="nearby-title">
    <header class="nearby-header">
      <div>
        <p class="nearby-eyebrow">Explore nearby</p>
        <h2 id="nearby-title">Find action near you</h2>
      </div>
      <button type="button" class="nearby-close" aria-label="Close nearby panel" @click="$emit('close')">×</button>
    </header>

    <div v-if="!hasLocation" class="nearby-consent">
      <span class="nearby-icon" aria-hidden="true">⌖</span>
      <h3>Use your location?</h3>
      <p>We use your location only in this browser to sort nearby crews and projects. It is not sent to Earth Guardians or stored by this app.</p>
      <label class="nearby-check"><input v-model="consent" type="checkbox" /> <span>I agree to share my approximate location with this map for this session.</span></label>
      <button type="button" class="nearby-primary" :disabled="!consent || loading" @click="requestLocation">{{ loading ? 'Locating…' : 'Find nearby action' }}</button>
      <p v-if="errorMessage" class="nearby-error" role="alert">{{ errorMessage }}</p>
    </div>

    <template v-else>
      <div class="nearby-location" role="status"><span class="nearby-status-dot" /> Location active · approximate only <button type="button" @click="clearLocation">Clear</button></div>
      <nav class="nearby-tabs" aria-label="Nearby categories">
        <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" :aria-selected="activeTab === tab.id" role="tab" @click="activeTab = tab.id">{{ tab.label }} <span>{{ tab.count }}</span></button>
      </nav>
      <div class="nearby-list" role="tabpanel">
        <template v-if="activeTab === 'crews'">
          <button v-for="item in nearbyCrews" :key="item.id" type="button" class="nearby-item" @click="$emit('navigate', item.lat, item.lng)"><span class="nearby-item-icon">♧</span><span><strong>{{ item.name }}</strong><small>{{ item.location }} · {{ formatDistance(item.distance) }}</small></span><span>→</span></button>
          <p v-if="!nearbyCrews.length" class="nearby-empty">No crew locations with coordinates are available yet.</p>
        </template>
        <template v-else-if="activeTab === 'projects'">
          <button v-for="item in nearbyProjects" :key="item.id" type="button" class="nearby-item" @click="$emit('navigate', item.lat, item.lng)"><span class="nearby-item-icon">✦</span><span><strong>{{ item.name }}</strong><small>{{ item.location }} · {{ formatDistance(item.distance) }}</small></span><span>→</span></button>
          <p v-if="!nearbyProjects.length" class="nearby-empty">No project locations are available yet.</p>
        </template>
        <template v-else>
          <div v-for="campaign in campaigns" :key="campaign.id" class="nearby-item nearby-campaign"><span class="nearby-item-icon">✺</span><span><strong>{{ campaign.name }}</strong><small>{{ campaign.description }}</small></span></div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGeolocation, useSessionStorage } from '@vueuse/core'
import type { ProjectData } from '@/lib/types'
import type { CrewLocation } from '@/lib/crew-data'

type TabId = 'crews' | 'projects' | 'campaigns'
const props = defineProps<{ projects?: ProjectData[]; crewLocations?: CrewLocation[] }>()
defineEmits<{ close: []; navigate: [lat: number, lng: number] }>()
const { coords, error, resume, pause } = useGeolocation({ immediate: false, enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
const consent = useSessionStorage('eg-location-consent', false)
const activeTab = ref<TabId>('crews')
const requesting = ref(false)
const loading = computed(() => requesting.value)
const hasLocation = computed(() => Number.isFinite(coords.value.latitude) && Number.isFinite(coords.value.longitude) && (coords.value.latitude !== 0 || coords.value.longitude !== 0))
const errorMessage = computed(() => error.value ? 'Location permission was not granted. You can enable it in your browser settings and try again.' : '')
const campaigns = [
  { id: 'biodiversity', name: 'Endangered species', description: 'Global biodiversity and habitat action.' },
  { id: 'can', name: 'Choose Action Now', description: 'Youth-led climate justice and direct action.' },
  { id: 'solutions', name: 'Sustainable solutions', description: 'Community-scale waste and resilience solutions.' },
]
const distance = (lat: number, lng: number) => {
  const φ1 = coords.value.latitude * Math.PI / 180
  const φ2 = lat * Math.PI / 180
  const Δφ = (lat - coords.value.latitude) * Math.PI / 180
  const Δλ = (lng - coords.value.longitude) * Math.PI / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
const nearbyCrews = computed(() => (props.crewLocations ?? []).filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng)).map(c => ({ id: `${c.name}-${c.lat}`, name: c.name, location: [c.city, c.country].filter(Boolean).join(', '), lat: c.lat, lng: c.lng, distance: distance(c.lat, c.lng) })).sort((a, b) => a.distance - b.distance).slice(0, 8))
const nearbyProjects = computed(() => (props.projects ?? []).filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).map(p => ({ id: p.project_title, name: p.project_title, location: p.country_province, lat: p.latitude, lng: p.longitude, distance: distance(p.latitude, p.longitude) })).sort((a, b) => a.distance - b.distance).slice(0, 8))
const tabs = computed(() => [{ id: 'crews' as const, label: 'Crews', count: nearbyCrews.value.length }, { id: 'projects' as const, label: 'Projects', count: nearbyProjects.value.length }, { id: 'campaigns' as const, label: 'Campaigns', count: campaigns.length }])
watch([hasLocation, error], ([located, locationError]) => {
  if (located || locationError) requesting.value = false
})
function requestLocation() { if (!consent.value) return; requesting.value = true; resume() }
function clearLocation() { pause(); requesting.value = false; consent.value = false }
function formatDistance(km: number) { return km < 1 ? '<1 km' : km < 100 ? `${Math.round(km)} km` : `${Math.round(km / 10) * 10} km` }
</script>

<style scoped>
.nearby-panel { position: absolute; top: 1rem; right: 1rem; z-index: 140; width: min(370px, calc(100vw - 2rem)); max-height: min(78svh, 620px); overflow: hidden; border: 1px solid rgba(148,163,184,.26); border-radius: 1rem; background: rgba(8,12,20,.95); color: #f8fafc; box-shadow: 0 20px 70px rgba(0,0,0,.42); backdrop-filter: blur(22px); }
.nearby-header { display:flex; justify-content:space-between; gap:1rem; padding:1.15rem 1.15rem .9rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-eyebrow { margin:0 0 .3rem; color:#67e8f9; font:700 .65rem ui-monospace,monospace; letter-spacing:.12em; text-transform:uppercase; }.nearby-header h2 { margin:0; font-size:1.25rem; letter-spacing:-.03em; }.nearby-close { min-width:44px; min-height:44px; border:1px solid rgba(148,163,184,.24); border-radius:999px; background:transparent; color:inherit; font-size:1.4rem; cursor:pointer; }.nearby-consent { padding:1.4rem; }.nearby-icon { display:grid; place-items:center; width:42px; height:42px; margin-bottom:.8rem; border-radius:12px; background:rgba(34,211,238,.12); color:#67e8f9; font-size:1.6rem; }.nearby-consent h3 { margin:0 0 .5rem; font-size:1.1rem; }.nearby-consent p { margin:0 0 1rem; color:rgba(226,232,240,.68); font-size:.82rem; line-height:1.5; }.nearby-check { display:flex; gap:.6rem; align-items:flex-start; margin-bottom:1rem; color:rgba(226,232,240,.86); font-size:.78rem; line-height:1.4; }.nearby-check input { margin-top:.15rem; accent-color:#22d3ee; }.nearby-primary { width:100%; min-height:44px; border:0; border-radius:.65rem; background:#22d3ee; color:#071018; font-weight:800; cursor:pointer; }.nearby-primary:disabled { cursor:not-allowed; opacity:.45; }.nearby-error { margin-top:1rem!important; color:#fbbf24!important; }.nearby-location { display:flex; align-items:center; gap:.45rem; padding:.7rem 1rem; color:rgba(226,232,240,.7); font-size:.7rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-location button { margin-left:auto; border:0; background:transparent; color:#67e8f9; cursor:pointer; text-decoration:underline; }.nearby-status-dot { width:7px; height:7px; border-radius:50%; background:#34d399; }.nearby-tabs { display:grid; grid-template-columns:repeat(3,1fr); padding:.55rem; gap:.35rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-tabs button { min-height:40px; border:0; border-radius:.55rem; background:transparent; color:rgba(226,232,240,.64); cursor:pointer; font-size:.75rem; }.nearby-tabs button.active { background:rgba(34,211,238,.13); color:#67e8f9; }.nearby-tabs span { margin-left:.2rem; opacity:.7; }.nearby-list { max-height:390px; overflow:auto; padding:.5rem; }.nearby-item { width:100%; display:flex; align-items:center; gap:.7rem; min-height:58px; padding:.65rem .7rem; border:0; border-radius:.65rem; background:transparent; color:inherit; text-align:left; cursor:pointer; }.nearby-item:hover,.nearby-item:focus-visible { outline:none; background:rgba(148,163,184,.12); }.nearby-item > span:nth-child(2) { min-width:0; flex:1; display:flex; flex-direction:column; gap:.2rem; }.nearby-item strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.8rem; }.nearby-item small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:rgba(226,232,240,.58); font-size:.7rem; }.nearby-item-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:rgba(34,211,238,.1); color:#67e8f9; }.nearby-campaign { cursor:default; }.nearby-empty { padding:1rem; color:rgba(226,232,240,.6); font-size:.8rem; }
@media (max-width:640px) { .nearby-panel { top:auto; right:.6rem; bottom:.7rem; left:.6rem; width:auto; max-height:70svh; } }
</style>
