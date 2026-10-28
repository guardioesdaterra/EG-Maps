<template>
  <section
    id="nearby-panel"
    ref="panelRef"
    class="nearby-panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="nearby-title"
    tabindex="-1"
    @keydown.esc="$emit('close')"
  >
    <header class="nearby-header">
      <div>
        <p class="nearby-eyebrow">{{ t('mapControls.nearbyPanel.eyebrow') }}</p>
        <h2 id="nearby-title">{{ t('mapControls.nearbyPanel.title') }}</h2>
      </div>
      <button type="button" class="nearby-close" :aria-label="t('general.close')" @click="$emit('close')">×</button>
    </header>

    <div v-if="!hasLocation" class="nearby-consent">
      <span class="nearby-icon" aria-hidden="true">⌖</span>
      <h3>{{ t('mapControls.nearbyPanel.consentTitle') }}</h3>
      <p>{{ t('mapControls.nearbyPanel.consentDescription') }}</p>
      <label class="nearby-check">
        <input v-model="consent" type="checkbox" />
        <span>{{ t('mapControls.nearbyPanel.consentLabel') }}</span>
      </label>
      <button type="button" class="nearby-primary" :disabled="!consent || loading" @click="requestLocation">
        {{ loading ? t('mapControls.nearbyPanel.locating') : t('mapControls.nearbyPanel.findAction') }}
      </button>
      <p v-if="errorMessage" class="nearby-error" role="alert" aria-live="assertive">{{ errorMessage }}</p>
    </div>

    <template v-else>
      <div class="nearby-location">
        <span class="nearby-status-dot" aria-hidden="true" />
        <span role="status" aria-live="polite">{{ t('mapControls.nearbyPanel.locationActive') }}</span>
        <button type="button" :aria-label="t('mapControls.nearbyPanel.clearLocation')" @click="clearLocation">
          {{ t('mapControls.nearbyPanel.clearLocation') }}
        </button>
      </div>
      <div class="nearby-tabs" role="tablist" :aria-label="t('mapControls.nearbyPanel.categories')">
        <button
          v-for="tab in tabs"
          :id="`nearby-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :class="{ active: activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="activeTab === tab.id ? `nearby-panel-${tab.id}` : undefined"
          :tabindex="activeTab === tab.id ? 0 : -1"
          @click="activeTab = tab.id"
          @keydown="handleTabKeydown($event, tab.id)"
        >
          {{ tab.label }} <span aria-hidden="true">{{ tab.count }}</span>
        </button>
      </div>
      <div :id="`nearby-panel-${activeTab}`" class="nearby-list" role="tabpanel" :aria-labelledby="`nearby-tab-${activeTab}`" tabindex="0">
        <template v-if="activeTab === 'crews'">
          <button v-for="item in nearbyCrews" :key="item.id" type="button" class="nearby-item" @click="$emit('navigate', item.lat, item.lng)">
            <span class="nearby-item-icon" aria-hidden="true">♧</span>
            <span><strong>{{ item.name }}</strong><small>{{ item.location }} · {{ formatDistance(item.distance) }}</small></span>
            <span aria-hidden="true">→</span>
          </button>
          <p v-if="!nearbyCrews.length" class="nearby-empty" role="status" aria-live="polite">{{ t('mapControls.nearbyPanel.noCrews') }}</p>
        </template>
        <template v-else-if="activeTab === 'projects'">
          <button v-for="item in nearbyProjects" :key="item.id" type="button" class="nearby-item" @click="$emit('navigate', item.lat, item.lng)">
            <span class="nearby-item-icon" aria-hidden="true">✦</span>
            <span><strong>{{ item.name }}</strong><small>{{ item.location }} · {{ formatDistance(item.distance) }}</small></span>
            <span aria-hidden="true">→</span>
          </button>
          <p v-if="!nearbyProjects.length" class="nearby-empty" role="status" aria-live="polite">{{ t('mapControls.nearbyPanel.noProjects') }}</p>
        </template>
        <template v-else>
          <div v-for="campaign in campaigns" :key="campaign.id" class="nearby-item nearby-campaign">
            <span class="nearby-item-icon" aria-hidden="true">✺</span>
            <span><strong>{{ campaign.name }}</strong><small>{{ campaign.description }}</small></span>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGeolocation, useSessionStorage } from '@vueuse/core'
import { useI18n } from '@/composables/useI18n'
import type { ProjectData } from '@/lib/types'
import type { CrewLocation } from '@/lib/crew-data'

type TabId = 'crews' | 'projects' | 'campaigns'
const props = defineProps<{ projects?: ProjectData[]; crewLocations?: CrewLocation[] }>()
defineEmits<{ close: []; navigate: [lat: number, lng: number] }>()
const { t } = useI18n()
const { coords, error, resume, pause } = useGeolocation({ immediate: false, enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
const consent = useSessionStorage('eg-location-consent', false)
const panelRef = ref<HTMLElement | null>(null)
const returnFocusTarget = ref<HTMLElement | null>(null)
const activeTab = ref<TabId>('crews')
const requesting = ref(false)
const loading = computed(() => requesting.value)
const hasLocation = computed(() => Number.isFinite(coords.value.latitude) && Number.isFinite(coords.value.longitude) && (coords.value.latitude !== 0 || coords.value.longitude !== 0))
const errorMessage = computed(() => error.value ? t('mapControls.nearbyPanel.locationError') : '')
const campaigns = computed(() => [
  { id: 'biodiversity', name: t('mapControls.nearbyPanel.biodiversity'), description: t('mapControls.nearbyPanel.biodiversityDesc') },
  { id: 'can', name: t('mapControls.nearbyPanel.chooseAction'), description: t('mapControls.nearbyPanel.chooseActionDesc') },
  { id: 'solutions', name: t('mapControls.nearbyPanel.solutions'), description: t('mapControls.nearbyPanel.solutionsDesc') },
])
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
const tabs = computed(() => [
  { id: 'crews' as const, label: t('mapControls.nearbyPanel.crews'), count: nearbyCrews.value.length },
  { id: 'projects' as const, label: t('mapControls.nearbyPanel.projects'), count: nearbyProjects.value.length },
  { id: 'campaigns' as const, label: t('mapControls.nearbyPanel.campaigns'), count: campaigns.value.length },
])
const tabOrder: TabId[] = ['crews', 'projects', 'campaigns']
function handleTabKeydown(event: KeyboardEvent, current: TabId) {
  const currentIndex = tabOrder.indexOf(current)
  let nextIndex = currentIndex
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabOrder.length
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + tabOrder.length - 1) % tabOrder.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabOrder.length - 1
  else return
  event.preventDefault()
  activeTab.value = tabOrder[nextIndex]
  nextTick(() => document.getElementById(`nearby-tab-${tabOrder[nextIndex]}`)?.focus())
}
watch([hasLocation, error], ([located, locationError]) => {
  if (located || locationError) requesting.value = false
})
onMounted(() => {
  returnFocusTarget.value = document.activeElement instanceof HTMLElement ? document.activeElement : null
  panelRef.value?.focus()
})
onUnmounted(() => {
  nextTick(() => {
    if (returnFocusTarget.value?.isConnected) returnFocusTarget.value.focus()
  })
})
function requestLocation() { if (!consent.value) return; requesting.value = true; resume() }
function clearLocation() { pause(); requesting.value = false; consent.value = false }
function formatDistance(km: number) { return km < 1 ? '<1 km' : km < 100 ? `${Math.round(km)} km` : `${Math.round(km / 10) * 10} km` }
</script>

<style scoped>
.nearby-panel { position: absolute; top: 1rem; right: 1rem; z-index: 140; width: min(370px, calc(100vw - 2rem)); max-height: min(78svh, 620px); overflow: hidden; border: 1px solid var(--glass-border); border-radius: 1rem; background: var(--glass-bg); color: var(--text-primary); box-shadow: 0 20px 70px rgba(0,0,0,.42); backdrop-filter: blur(22px); }
.nearby-header { display:flex; justify-content:space-between; gap:1rem; padding:1.15rem 1.15rem .9rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-eyebrow { margin:0 0 .3rem; color:var(--primary); font:700 .65rem ui-monospace,monospace; letter-spacing:.12em; text-transform:uppercase; }.nearby-header h2 { margin:0; font-size:1.25rem; letter-spacing:-.03em; }.nearby-close { min-width:44px; min-height:44px; border:1px solid rgba(148,163,184,.24); border-radius:999px; background:transparent; color:inherit; font-size:1.4rem; cursor:pointer; }.nearby-consent { padding:1.4rem; }.nearby-icon { display:grid; place-items:center; width:42px; height:42px; margin-bottom:.8rem; border-radius:12px; background:color-mix(in srgb, var(--primary) 12%, transparent); color:var(--primary); font-size:1.6rem; }.nearby-consent h3 { margin:0 0 .5rem; font-size:1.1rem; }.nearby-consent p { margin:0 0 1rem; color:var(--text-secondary); font-size:.82rem; line-height:1.5; }.nearby-check { display:flex; gap:.6rem; align-items:flex-start; margin-bottom:1rem; color:var(--text-secondary); font-size:.78rem; line-height:1.4; }.nearby-check input { margin-top:.15rem; accent-color:#22d3ee; }.nearby-primary { width:100%; min-height:44px; border:0; border-radius:.65rem; background:#22d3ee; color:#071018; font-weight:800; cursor:pointer; }.nearby-primary:disabled { cursor:not-allowed; opacity:.45; }.nearby-error { margin-top:1rem!important; color:var(--warning)!important; }.nearby-location { display:flex; align-items:center; gap:.45rem; padding:.7rem 1rem; color:var(--text-muted); font-size:.7rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-location button { margin-left:auto; border:0; background:transparent; color:var(--primary); cursor:pointer; text-decoration:underline; }.nearby-status-dot { width:7px; height:7px; border-radius:50%; background:#34d399; }.nearby-tabs { display:grid; grid-template-columns:repeat(3,1fr); padding:.55rem; gap:.35rem; border-bottom:1px solid rgba(148,163,184,.15); }.nearby-tabs button { min-height:40px; border:0; border-radius:.55rem; background:transparent; color:var(--text-secondary); cursor:pointer; font-size:.75rem; }.nearby-tabs button.active { background:color-mix(in srgb, var(--primary) 13%, transparent); color:var(--primary); }.nearby-tabs span { margin-left:.2rem; opacity:.7; }.nearby-list { max-height:390px; overflow:auto; padding:.5rem; }.nearby-item { width:100%; display:flex; align-items:center; gap:.7rem; min-height:58px; padding:.65rem .7rem; border:0; border-radius:.65rem; background:transparent; color:inherit; text-align:left; cursor:pointer; }.nearby-item:hover,.nearby-item:focus-visible { outline:none; background:rgba(148,163,184,.12); }.nearby-item > span:nth-child(2) { min-width:0; flex:1; display:flex; flex-direction:column; gap:.2rem; }.nearby-item strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.8rem; }.nearby-item small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-muted); font-size:.7rem; }.nearby-item-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:color-mix(in srgb, var(--primary) 10%, transparent); color:var(--primary); }.nearby-campaign { cursor:default; }.nearby-empty { padding:1rem; color:var(--text-secondary); font-size:.8rem; }
@media (max-width:640px) { .nearby-panel { top:auto; right:.6rem; bottom:calc(env(safe-area-inset-bottom) + 4.75rem); left:.6rem; width:auto; max-height:62svh; } }
.nearby-panel:focus, .nearby-close:focus-visible, .nearby-primary:focus-visible, .nearby-location button:focus-visible, .nearby-tabs button:focus-visible, .nearby-item:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .nearby-panel { scroll-behavior: auto; } }
</style>
