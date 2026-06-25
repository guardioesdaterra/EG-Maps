<template>
  <div id="main-content">
    <ClientOnly>
      <UnifiedMap
        :default-dataset="'observatory-of-vulcan'"
        :rare-earth-points="pointsData"
        :rare-earth-polygons="polygonsData"
        :rare-earth-protected="protectedData"
        :layer-visibility="layerVis"
        :fly-to-target="flyToTarget"
        @map-init="onMapInit"
      >
        <template #overlays>
          <!-- Stats panel top-left -->
          <div class="absolute top-3 left-3 z-[500] bg-black/70 backdrop-blur border border-white/10 rounded-xl px-3 py-2.5 shadow-lg max-w-[320px]">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <h1 class="text-sm font-black text-red-400 uppercase tracking-tight">Terras Raras Brasil</h1>
            </div>
            <p class="text-[9px] text-zinc-400 leading-tight">
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#e74c3c;color:#fff">{{ t('observatory.badges.mil') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#27ae60;color:#fff">{{ t('observatory.badges.amb') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#8e44ad;color:#fff">{{ t('observatory.badges.ill') }}</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#2980b9;color:#fff">{{ t('observatory.badges.for') }}</span>
              {{ t('home.observatoryDesc') }}
            </p>
          </div>

          <!-- Stats counts -->
          <div class="absolute top-3 left-1/2 -translate-x-1/2 z-[500] hidden md:flex gap-1.5 bg-black/70 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-lg">
            <div v-for="s in categoryStats" :key="s.key" class="flex items-center gap-1 text-[9px]">
              <span class="w-2 h-2 rounded-full" :style="{ background: s.color }" />
              <span class="font-semibold text-zinc-300">{{ s.count }}</span>
              <span class="text-zinc-500">{{ s.label }}</span>
            </div>
            <div class="w-px bg-zinc-700 mx-1" />
            <span class="text-[9px] font-bold text-zinc-300" aria-live="polite" aria-atomic="true">{{ totalCount }} total</span>
          </div>

          <!-- Sync + Secrecy -->
          <div v-if="deepAnalysis" class="absolute top-3 right-3 z-[500] hidden lg:flex flex-col gap-1 bg-black/70 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-lg max-w-[200px]">
            <div class="flex items-center gap-1.5 text-[8.5px]" :title="t('observatory.sync.syncNote')">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span class="text-zinc-500 uppercase tracking-wider font-bold">{{ t('observatory.sync.lastSync') }}</span>
              <span class="text-zinc-300 font-mono ml-auto">{{ formatSyncDate(deepAnalysis.last_sync) }}</span>
            </div>
            <div v-if="deepAnalysis.sigilo_stats" class="flex items-center gap-1.5 text-[8.5px] pt-1 border-t border-zinc-800">
              <span class="text-zinc-500 uppercase tracking-wider font-bold">🔒</span>
              <span class="text-zinc-500">{{ t('observatory.sync.secrecyClaims') }}:</span>
              <span class="text-amber-400 font-bold">{{ deepAnalysis.sigilo_stats.total }}</span>
              <span class="text-zinc-400 font-mono ml-auto">{{ formatHa(deepAnalysis.sigilo_stats.total_area_ha) }} {{ t('observatory.sync.secrecyArea') }}</span>
            </div>
          </div>

          <!-- Action Buttons Row -->
          <div class="absolute top-20 left-3 z-[500] flex flex-wrap gap-1.5 max-w-[320px]">
            <button
@click="showTimeline = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(231,76,60,0.15);border-color:rgba(231,76,60,0.3);color:#e74c3c">
              <span>📖</span> Geopolitical Timeline
            </button>
            <button
@click="showRedeCorporativa = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(52,152,219,0.15);border-color:rgba(52,152,219,0.3);color:#5dade2">
              <span>🔗</span> Rede Corporativa
            </button>
            <button
@click="showDownload = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(39,174,96,0.15);border-color:rgba(39,174,96,0.3);color:#27ae60">
              <span>⬇️</span> Download Data
            </button>
            <button
@click="showExport = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(155,89,182,0.15);border-color:rgba(155,89,182,0.3);color:#af7ac5">
              <span>📄</span> Export
            </button>
            <button
@click="toggleEnterpriseLayer"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              :style="enterpriseLayerVisible
                ? 'background:rgba(155,89,182,0.2);border-color:rgba(155,89,182,0.4);color:#af7ac5'
                : 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#666'">
              <span>🏢</span> {{ t('observatory.layers.enterpriseHq') }}
            </button>
          </div>

          <!-- Tab navigation -->
          <ObservatorySidebar
            :active-tab="activeTab"
            :danger-items="speculatorIndex"
            :show-all="showAll"
            class="absolute"
            style="top: clamp(5.5rem, 14vh, 8rem); right: 0.75rem;"
            @update:active-tab="(tab) => activeTab = tab"
            @update:show-all="(v) => showAll = v"
            @fly-to-enterprise="zoomToDanger"
            @fly-to-coord="flyToCoord"
          />

          <!-- My Territory Pin -->
          <div
v-if="userPin" class="absolute z-[500] bg-black/85 backdrop-blur border border-emerald-700/40 rounded-xl px-3 py-2.5 shadow-lg max-w-[280px]"
            style="bottom: 7.5rem; right: 0.75rem;">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="flex items-center gap-1.5">
                <span class="text-sm">📍</span>
                <h3 class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{{ t('observatory.myTerritory.title') }}</h3>
              </div>
              <button type="button" class="text-zinc-500 hover:text-red-400 text-[12px] leading-none" :aria-label="t('observatory.myTerritory.clear')" @click="clearPin">×</button>
            </div>
            <div class="text-[9px] text-zinc-300 leading-snug mb-1 break-words">
              <span v-if="userPinShared" class="inline-block text-[7px] font-bold uppercase text-amber-400 mr-1">{{ t('observatory.myTerritory.sharedBadge') }}</span>
              <strong>{{ userPin.label }}</strong>
            </div>
            <div class="text-[8px] text-zinc-500 font-mono mb-2">
              {{ userPin.lng.toFixed(4) }}, {{ userPin.lat.toFixed(4) }}
            </div>
            <div class="flex gap-1.5">
              <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/30 transition-colors" @click="flyToUserPin">
                {{ t('observatory.myTerritory.flyTo') }}
              </button>
              <button type="button" class="flex-1 px-2 py-1 text-[9px] font-bold rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors" @click="copyPinUrl" :aria-label="t('observatory.myTerritory.share')">
                {{ shareCopied ? t('observatory.myTerritory.copied') : t('observatory.myTerritory.share') }}
              </button>
            </div>
          </div>

          <!-- Drop Pin Floating Button -->
          <button
type="button"
            class="absolute z-[500] bg-black/85 backdrop-blur border border-emerald-700/40 rounded-full px-3 py-2 text-[10px] font-bold text-emerald-300 hover:bg-emerald-900/30 hover:border-emerald-500 transition-all flex items-center gap-1.5 shadow-lg"
            :style="pinPickerMode ? 'bottom: 5.5rem; right: 0.75rem; background: rgba(16, 185, 129, 0.25); border-color: #10b981; color: #fff;' : 'bottom: 5.5rem; right: 0.75rem;'"
            @click="togglePinPicker">
            <span>📍</span>
            {{ pinPickerMode ? t('observatory.myTerritory.cancel') : t('observatory.myTerritory.dropPin') }}
          </button>

          <!-- Layer toggles + Year Slider + Phase Filter -->
          <div class="absolute bottom-6 left-3 z-[500] bg-black/70 backdrop-blur border border-zinc-800 rounded-xl px-3 py-2.5 shadow-lg max-w-[220px]">
            <YearSlider
              :year-min="yearMin"
              :year-max="yearMax"
              :filtered-count="filteredCount"
              @update:year-min="(v) => { yearMin = v; debouncedFilter() }"
              @update:year-max="(v) => { yearMax = v; debouncedFilter() }"
            />

            <hr class="border-zinc-800 my-2" />

            <PhaseFilter
              :selected="selectedPhases"
              @update:selected="(v) => { selectedPhases = v; debouncedFilter() }"
            />

            <hr class="border-zinc-800 my-2" />

            <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">{{ t('observatory.layers.title') }}</h3>
            <div
v-for="c in categories" :key="c.key" class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer(c.key)">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis[c.key] ? '' : 'opacity-30']"
                :style="{ borderColor: c.color, color: c.color }">
                <div v-if="layerVis[c.key]" class="w-1.5 h-1.5 rounded-sm" :style="{ background: c.color }" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ c.label }}</span>
            </div>
            <hr class="border-zinc-800 my-1.5" />
            <div
v-for="e in extraLayers" :key="e.key" class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer(e.key)">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis[e.key] ? '' : 'opacity-30']"
                :style="{ borderColor: e.color, color: e.color }">
                <div v-if="layerVis[e.key]" class="w-1.5 h-1.5 rounded-sm" :style="{ background: e.color }" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ t(e.labelKey) }}</span>
            </div>
            <hr class="border-zinc-800 my-1.5" />
            <div
class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer('protected_ti')">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis['protected_ti'] !== false ? '' : 'opacity-30']"
                style="border-color:#c0392b;color:#c0392b">
                <div v-if="layerVis['protected_ti'] !== false" class="w-1.5 h-1.5 rounded-sm" style="background:#c0392b" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ t('observatory.layers.indigenousLands') }}</span>
            </div>
            <div
class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer('protected_quilombo')">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis['protected_quilombo'] !== false ? '' : 'opacity-30']"
                style="border-color:#f39c12;color:#f39c12">
                <div v-if="layerVis['protected_quilombo'] !== false" class="w-1.5 h-1.5 rounded-sm" style="background:#f39c12" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ t('observatory.layers.quilombolaTerritories') }}</span>
            </div>
            <div
class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer('overlaps')">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis['overlaps'] !== false ? '' : 'opacity-30']"
                style="border-color:#ff00ff;color:#ff00ff">
                <div v-if="layerVis['overlaps'] !== false" class="w-1.5 h-1.5 rounded-sm" style="background:#ff00ff" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ t('observatory.layers.overlaps') }}</span>
            </div>
            <div
class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer('enterprise_hq')">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis['enterprise_hq'] !== false ? '' : 'opacity-30']"
                style="border-color:#9b59b6;color:#9b59b6">
                <div v-if="layerVis['enterprise_hq'] !== false" class="w-1.5 h-1.5 rounded-sm" style="background:#9b59b6" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ t('observatory.layers.enterpriseHq') }}</span>
            </div>

            <hr class="border-zinc-800 my-1.5" />

            <label
class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click.stop="sobDemandaOnly = !sobDemandaOnly; debouncedFilter()">
              <div
:class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                sobDemandaOnly ? '' : 'opacity-30']"
                style="border-color:#7B2FBE;color:#7B2FBE">
                <div v-if="sobDemandaOnly" class="w-1.5 h-1.5 rounded-sm" style="background:#7B2FBE" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">Sob Demanda</span>
            </label>
          </div>

          <!-- Search -->
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
            <input
v-model="searchTerm" @input="debouncedFilter" :placeholder="t('observatory.search')"
              class="w-[240px] px-3 py-2 text-xs bg-black/70 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 outline-none focus:border-red-500/50 shadow-lg" />
          </div>

          <!-- Water legend -->
          <div class="absolute bottom-6 right-3 z-[500] bg-black/70 backdrop-blur border border-zinc-800 rounded-xl px-3 py-2 shadow-lg">
            <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{{ t('observatory.legend.hydrography') }}</h3>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded" style="background:#3498db" />{{ t('observatory.legend.basins') }}</div>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded" style="background:#9b59b6" />{{ t('observatory.legend.aquifers') }}</div>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded border border-dashed" style="background:#e74c3c;border-color:#c0392b" />{{ t('observatory.legend.conflictZones') }}</div>
          </div>
        </template>
      </UnifiedMap>

      <!-- Timeline Modal -->
      <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />

      <!-- Rede Corporativa Panel -->
      <RedeCorporativa :visible="showRedeCorporativa" @close="showRedeCorporativa = false" @fly-to-enterprise="flyToEnterprise" />

      <!-- Download Panel -->
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />

      <!-- Claim Report Modal -->
      <ClaimReportModal :visible="showClaimReport" :claim="reportClaim" @close="showClaimReport = false" />

      <!-- Export Modal -->
      <ExportModal :visible="showExport" :map-container="mapContainerRef" :filter-summary="activeFilterSummary" @close="showExport = false" />

      <template #fallback>
        <div class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type maplibregl from 'maplibre-gl'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import { ENTERPRISES } from '@/lib/enterprise-data'
import { setupEnterpriseLayer, cleanupEnterpriseLayer } from '@/composables/useEnterpriseMarkers'
import ObservatorySidebar from '@/components/observatory/ObservatorySidebar.vue'
import YearSlider from '@/components/observatory/YearSlider.vue'
import PhaseFilter from '@/components/observatory/PhaseFilter.vue'
import ClaimReportModal from '@/components/observatory/ClaimReportModal.vue'
import ExportModal from '@/components/observatory/ExportModal.vue'
import { useRareEarthData } from '@/composables/useRareEarthData'

type ObservatoryTabKey = 'danger' | 'military' | 'illegal' | 'env' | 'network' | 'timeline'

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

// Command palette registrations
if (import.meta.client) {
  const { register, openPalette } = useCommandPalette()
  register({
    id: 'obs:open-palette',
    group: t('nav.observatoryOfVulcan'),
    label: t('palette.title'),
    icon: 'mdi:command-key',
    shortcut: 'Ctrl+K',
    keywords: ['palette', 'search', 'command', 'keyboard'],
    onSelect: () => openPalette(),
  })
  register({
    id: 'obs:toggle-layers',
    group: t('nav.observatoryOfVulcan'),
    label: t('observatory.layers.title'),
    icon: 'mdi:layers',
    keywords: ['layers', 'filters', 'toggle'],
    onSelect: () => {
      const { success } = useToast()
      success(t('observatory.layers.title'), t('observatory.layers.title'))
    },
  })
}

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

const { pointsData, polygonsData, protectedData, features: allFeatures, speculatorIndex, deepAnalysis, load: loadRareEarthData } = useRareEarthData(baseURL)
const searchTerm = ref('')
const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
let mapRef: maplibregl.Map | null = null

// Popups
const showTimeline = ref(false)
const showRedeCorporativa = ref(false)
const showDownload = ref(false)
const showExport = ref(false)
const showClaimReport = ref(false)
interface ClaimReportData { p?: string; n?: string; u?: string; s?: string; la?: number; lo?: number; [key: string]: unknown }
const reportClaim = ref<ClaimReportData | null>(null)
const enterpriseLayerVisible = ref(false)
const mapContainerRef = ref<HTMLElement | null>(null)

// Year & Phase filters
const yearMin = ref(1935)
const yearMax = ref(2026)
const selectedPhases = ref(new Set<string>([
  'REQUERIMENTO', 'REQUERIMENTO DE PESQUISA', 'AUTORIZAÇÃO DE PESQUISA',
  'DISPONIBILIDADE', 'LICENCIAMENTO', 'CONCESSÃO', 'LAVRA',
]))
const sobDemandaOnly = ref(false)
const filteredCount = ref(0)

// My Territory pin
const { pin: userPin, sharedFromUrl: userPinShared, setPin: setUserPin, clearPin, copyShareUrl } = useUserPin()
const pinPickerMode = ref(false)
const shareCopied = ref(false)
let pinClickHandler: ((_e: maplibregl.MapMouseEvent) => void) | null = null
let pinKeyHandler: ((_e: KeyboardEvent) => void) | null = null

function togglePinPicker() {
  if (pinPickerMode.value) {
    pinPickerMode.value = false
    detachPinClick()
  } else {
    pinPickerMode.value = true
    attachPinClick()
  }
}

function attachPinClick() {
  if (!mapRef) return
  mapRef.getCanvas().style.cursor = 'crosshair'
  pinClickHandler = (e: maplibregl.MapMouseEvent) => {
    if (!pinPickerMode.value) return
    const { lng, lat } = e.lngLat
    setUserPin({ lng, lat }, t('observatory.myTerritory.defaultLabel'))
    pinPickerMode.value = false
    if (mapRef) mapRef.getCanvas().style.cursor = ''
    flyToTarget.value = { lng, lat, zoom: 8 }
  }
  mapRef.on('click', pinClickHandler)
  pinKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pinPickerMode.value) togglePinPicker()
  }
  window.addEventListener('keydown', pinKeyHandler)
}

function detachPinClick() {
  if (mapRef && pinClickHandler) {
    mapRef.off('click', pinClickHandler)
    mapRef.getCanvas().style.cursor = ''
    pinClickHandler = null
  }
  if (pinKeyHandler) {
    window.removeEventListener('keydown', pinKeyHandler)
    pinKeyHandler = null
  }
}

function flyToUserPin() {
  if (userPin.value) {
    flyToTarget.value = { lng: userPin.value.lng, lat: userPin.value.lat, zoom: 8 }
  }
}

async function copyPinUrl() {
  const toast = useToast()
  const ok = await copyShareUrl()
  if (ok) {
    shareCopied.value = true
    setTimeout(() => { shareCopied.value = false }, 2000)
    toast.success(t('observatory.myTerritory.copied'))
  } else {
    toast.error(t('observatory.myTerritory.shareError') || 'Copy failed')
  }
}

onUnmounted(() => {
  detachPinClick()
})

const catEntries = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
const categories = catEntries.map(([key, val]) => ({
  key,
  label: val.label,
  color: val.color,
}))

const extraLayers = [
  { key: 'polygons', labelKey: 'observatory.layers.polygons', color: '#e74c3c' },
  { key: 'water', labelKey: 'observatory.layers.hydrography', color: '#3498db' },
  { key: 'sites', labelKey: 'observatory.layers.conflictZones', color: '#c0392b' },
  { key: 'network', labelKey: 'observatory.layers.corpNetwork', color: '#5dade2' },
]

const layerVis = ref<Record<string, boolean>>({})
categories.forEach(c => { layerVis.value[c.key] = true })
extraLayers.forEach(e => { layerVis.value[e.key] = true })
layerVis.value['enterprise_hq'] = false
layerVis.value['protected_ti'] = true
layerVis.value['protected_quilombo'] = true
layerVis.value['overlaps'] = true

const activeTab = ref<ObservatoryTabKey>('danger')

const showAll = ref(false)

const categoryStats = computed(() => {
  const counts: Record<string, number> = {}
  categories.forEach(c => counts[c.key] = 0)
  allFeatures.value.forEach((d: { c: string }) => { if (counts[d.c] !== undefined) counts[d.c]++ })
  return categories.map(c => ({ key: c.key, label: c.label.split(' ')[0], color: c.color, count: counts[c.key] || 0 }))
})

const totalCount = computed(() => allFeatures.value.length)

function formatSyncDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function formatHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${ha}`
}

function toggleLayer(key: string) {
  layerVis.value[key] = !layerVis.value[key]
  if (key === 'enterprise_hq') {
    enterpriseLayerVisible.value = layerVis.value[key]
    if (mapRef) {
      if (enterpriseLayerVisible.value) {
        setupEnterpriseLayer(mapRef, onEnterpriseClick, speculatorIndex.value)
      } else {
        cleanupEnterpriseLayer(mapRef)
      }
    }
  }
}

function toggleEnterpriseLayer() {
  toggleLayer('enterprise_hq')
}

function onEnterpriseClick(enterprise: EnterpriseHQ) {
  flyToTarget.value = { lng: enterprise.lng, lat: enterprise.lat, zoom: 6 }
}

function flyToEnterprise(name: string) {
  const specEntry = speculatorIndex.value.find(s =>
    s.normalizedName.includes(name.toUpperCase().split(' ')[0]) ||
    name.toUpperCase().includes(s.displayName.split('/')[0].trim().split(' ')[0])
  )
  if (specEntry?.centroid) { flyToTarget.value = { lng: specEntry.centroid.lng, lat: specEntry.centroid.lat, zoom: 6 }; return }
  const ent = ENTERPRISES.find(e => e.name === name || name.includes(e.name))
  if (ent) flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 6 }
}

function onMapInit(map: maplibregl.Map) {
  mapRef = map
}

function flyToCoord(coord: [number, number]) {
  flyToTarget.value = { lng: coord[0], lat: coord[1], zoom: 8 }
}

function zoomToDanger(name: string) {
  const target = speculatorIndex.value.find(s =>
    s.normalizedName === name
    || s.displayName.toLowerCase().split('/')[0].trim() === name.toLowerCase().split('/')[0].trim()
  )
  if (target?.centroid) { flyToTarget.value = { lng: target.centroid.lng, lat: target.centroid.lat, zoom: 9 }; return }
  const ent = ENTERPRISES.find(e => name.includes(e.name.toUpperCase().split(' ')[0]) || e.name.toUpperCase().includes(name.split('/')[0].trim()))
  if (ent) { flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 7 }; return }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedFilter() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(updateFilter, 250)
}

function updateFilter() {
  const term = searchTerm.value.toLowerCase().trim()
  const catKeys = Object.keys(RARE_EARTH_CATEGORIES)
  const visKeys = Object.entries(layerVis.value).filter(([k, v]) => v && catKeys.includes(k)).map(([k]) => k)
  const filtered = allFeatures.value.filter((d: { c: string; n: string; s: string; u: string; p: string; f: string; net: string; y: number; dsprocesso: string }) => {
    if (!visKeys.includes(d.c)) return false
    if (term) return `${d.n} ${d.s} ${d.u} ${d.p} ${d.f} ${d.net||''}`.toLowerCase().includes(term)
    if (d.y < yearMin.value || d.y > yearMax.value) return false
    if (!selectedPhases.value.has(d.f)) return false
    if (sobDemandaOnly.value && !String(d.dsprocesso || '').includes('DEMANDA')) return false
    return true
  })
  filteredCount.value = filtered.length
  pointsData.value = {
    type: 'FeatureCollection',
    features: filtered.map((d: { lo: number; la: number; [key: string]: unknown }, i: number) => ({
      type: 'Feature', id: i,
      properties: { ...d, id: i },
      geometry: { type: 'Point', coordinates: [d.lo, d.la] },
    })),
  }
}

const activeFilterSummary = computed(() => {
  const parts: string[] = []
  if (yearMin.value > 1935 || yearMax.value < 2026) parts.push(`${yearMin.value}-${yearMax.value}`)
  if (selectedPhases.value.size < 7) parts.push(`${selectedPhases.value.size} phases`)
  if (sobDemandaOnly.value) parts.push('Sob Demanda')
  if (searchTerm.value.trim()) parts.push(`"${searchTerm.value.trim()}"`)
  return parts.join(', ') || 'All claims'
})

onMounted(async () => {
  await loadRareEarthData()
  filteredCount.value = allFeatures.value.length
  mapContainerRef.value = document.querySelector('.maplibregl-canvas-container')?.closest('.relative') as HTMLElement | null
})
</script>
