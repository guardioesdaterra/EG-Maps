<template>
  <div>
    <div v-if="pageLoading" class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
      <div class="relative mb-5">
        <div class="w-16 h-16 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
        <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-white/10 border-b-white/50 animate-spin" style="animation-delay: 0.5s; animation-direction: reverse" />
      </div>
      <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
    </div>
    <ClientOnly v-else>
      <UnifiedMap
        :default-dataset="'observatory-of-vulcan'"
        :rare-earth-points="pointsData"
        :rare-earth-polygons="polygonsData"
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
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#e74c3c;color:#fff">MIL</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#27ae60;color:#fff">AMB</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#8e44ad;color:#fff">ILL</span>
              <span class="inline-block text-[7px] px-1 py-0.5 rounded font-bold mr-0.5" style="background:#2980b9;color:#fff">FOR</span>
              Mining claims, corporate networks & socio-environmental impact
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
            <span class="text-[9px] font-bold text-zinc-300">{{ totalCount }} total</span>
          </div>

          <!-- Action Buttons Row -->
          <div class="absolute top-20 left-3 z-[500] flex flex-wrap gap-1.5 max-w-[320px]">
            <button @click="showTimeline = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(231,76,60,0.15);border-color:rgba(231,76,60,0.3);color:#e74c3c">
              <span>📖</span> Geopolitical Timeline
            </button>
            <button @click="showRedeCorporativa = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(52,152,219,0.15);border-color:rgba(52,152,219,0.3);color:#5dade2">
              <span>🔗</span> Rede Corporativa
            </button>
            <button @click="showDownload = true"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              style="background:rgba(39,174,96,0.15);border-color:rgba(39,174,96,0.3);color:#27ae60">
              <span>⬇️</span> Download Data
            </button>
            <button @click="toggleEnterpriseLayer"
              class="px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all flex items-center gap-1.5"
              :style="enterpriseLayerVisible
                ? 'background:rgba(155,89,182,0.2);border-color:rgba(155,89,182,0.4);color:#af7ac5'
                : 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#666'">
              <span>🏢</span> Enterprise HQs
            </button>
          </div>

          <!-- Tab navigation -->
          <div class="absolute" style="top: clamp(5.5rem, 14vh, 8rem); right: 0.75rem; z-index: 500;">
            <div class="flex flex-wrap gap-1 justify-end max-w-[420px]">
              <button v-for="t in tabs" :key="t.key" @click="activeTab = t.key"
                :class="['px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all',
                  activeTab === t.key
                    ? 'bg-red-600 text-white border-red-600 shadow-md'
                    : 'bg-black/60 text-zinc-400 border-zinc-700 hover:bg-black/80 hover:text-zinc-200'
                ]">
                {{ t.label }}
              </button>
            </div>

            <!-- Side panel (with higher z-index, positioned below tabs) -->
            <div v-if="activeTab"
              class="mt-1 w-[340px] max-h-[calc(100vh-12rem)] overflow-y-auto bg-black/85 backdrop-blur border border-zinc-800 rounded-xl shadow-xl">
              <div class="sticky top-0 bg-black/90 z-10 px-3 py-2 border-b border-zinc-800 rounded-t-xl">
                <h3 class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{{ activeTabLabel }}</h3>
              </div>
              <div class="p-2 text-[11px] text-zinc-400" v-html="panelContent" />
            </div>
          </div>

          <!-- Layer toggles -->
          <div class="absolute bottom-6 left-3 z-[500] bg-black/70 backdrop-blur border border-zinc-800 rounded-xl px-3 py-2.5 shadow-lg max-w-[160px]">
            <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Layers</h3>
            <div v-for="c in categories" :key="c.key" class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer(c.key)">
              <div :class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis[c.key] ? '' : 'opacity-30']"
                :style="{ borderColor: c.color, color: c.color }">
                <div v-if="layerVis[c.key]" class="w-1.5 h-1.5 rounded-sm" :style="{ background: c.color }" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ c.label }}</span>
            </div>
            <hr class="border-zinc-800 my-1.5" />
            <div v-for="e in extraLayers" :key="e.key" class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer(e.key)">
              <div :class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis[e.key] ? '' : 'opacity-30']"
                :style="{ borderColor: e.color, color: e.color }">
                <div v-if="layerVis[e.key]" class="w-1.5 h-1.5 rounded-sm" :style="{ background: e.color }" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">{{ e.label }}</span>
            </div>
            <hr class="border-zinc-800 my-1.5" />
            <div class="flex items-center gap-2 py-1 cursor-pointer select-none"
              @click="toggleLayer('enterprise_hq')">
              <div :class="['w-3 h-3 rounded border-2 flex items-center justify-center transition-all',
                layerVis['enterprise_hq'] !== false ? '' : 'opacity-30']"
                style="border-color:#9b59b6;color:#9b59b6">
                <div v-if="layerVis['enterprise_hq'] !== false" class="w-1.5 h-1.5 rounded-sm" style="background:#9b59b6" />
              </div>
              <span class="text-[10px] text-zinc-400 font-medium">Enterprise HQs</span>
            </div>
          </div>

          <!-- Search -->
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] hidden sm:block">
            <input v-model="searchTerm" @input="debouncedFilter" placeholder="Search enterprise, substance, UF..."
              class="w-[240px] px-3 py-2 text-xs bg-black/70 border border-zinc-700 rounded-lg text-zinc-300 placeholder-zinc-500 outline-none focus:border-red-500/50 shadow-lg" />
          </div>

          <!-- Water legend -->
          <div class="absolute bottom-6 right-3 z-[500] bg-black/70 backdrop-blur border border-zinc-800 rounded-xl px-3 py-2 shadow-lg">
            <h3 class="text-[8px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Hydrography</h3>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded" style="background:#3498db" />Basins</div>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded" style="background:#9b59b6" />Aquifers</div>
            <div class="flex items-center gap-2 text-[9px] text-zinc-500"><div class="w-3 h-0.5 rounded border border-dashed" style="background:#e74c3c;border-color:#c0392b" />Conflict zones</div>
          </div>
        </template>
      </UnifiedMap>

      <!-- Timeline Modal -->
      <GeoPoliticalTimeline :visible="showTimeline" @close="showTimeline = false" />

      <!-- Rede Corporativa Panel -->
      <RedeCorporativa :visible="showRedeCorporativa" @close="showRedeCorporativa = false" @fly-to-enterprise="flyToEnterprise" />

      <!-- Download Panel -->
      <DataDownloadPanel :visible="showDownload" @close="showDownload = false" />

      <template #fallback>
        <div class="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
          <LoadingSpinner :message="t('loading.observatoryOfVulcan')" :inline="true" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type maplibregl from 'maplibre-gl'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import type { EnterpriseHQ } from '@/lib/enterprise-data'
import { setupEnterpriseLayer, cleanupEnterpriseLayer } from '@/composables/useEnterpriseMarkers'
import { ENTERPRISES } from '@/lib/enterprise-data'
declare global { interface Window { __flyToDanger?: (_name: string) => void; __flyToCoord?: (_lng: number, _lat: number) => void } }

const { t } = useI18n()
const baseURL = useRuntimeConfig().app.baseURL

useHead({
  title: 'Observatory of Vulcan | Earth Guardians',
  meta: [{ name: 'description', content: 'Brazil rare earth mining claims — capital invasion, corporate networks, military interests & socio-environmental impact.' }],
})

const pageLoading = ref(true)
const pointsData = ref<GeoJSON.FeatureCollection | undefined>(undefined)
const polygonsData = ref<GeoJSON.FeatureCollection | undefined>(undefined)
const searchTerm = ref('')
const flyToTarget = ref<{ lng: number; lat: number; zoom?: number } | null>(null)
let allFeatures: Record<string, any>[] = []
let mapRef: maplibregl.Map | null = null

// Popups
const showTimeline = ref(false)
const showRedeCorporativa = ref(false)
const showDownload = ref(false)
const enterpriseLayerVisible = ref(false)

const catEntries = Object.entries(RARE_EARTH_CATEGORIES) as [string, { label: string; color: string }][]
const categories = catEntries.map(([key, val]) => ({
  key,
  label: val.label,
  color: val.color,
}))

const extraLayers = [
  { key: 'polygons', label: 'Polygons', color: '#e74c3c' },
  { key: 'water', label: 'Hydrography', color: '#3498db' },
  { key: 'sites', label: 'Conflict Zones', color: '#c0392b' },
  { key: 'network', label: 'Corp Network', color: '#5dade2' },
]

const layerVis = ref<Record<string, boolean>>({})
categories.forEach(c => { layerVis.value[c.key] = true })
extraLayers.forEach(e => { layerVis.value[e.key] = true })
layerVis.value['enterprise_hq'] = false

const tabs = [
  { key: 'danger', label: 'Danger' },
  { key: 'military', label: 'Military' },
  { key: 'illegal', label: 'Illegal' },
  { key: 'env', label: 'Env Risk' },
  { key: 'network', label: 'Network' },
  { key: 'timeline', label: 'Timeline' },
]
const activeTab = ref('danger')

const activeTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '')

const panelContent = computed(() => {
  switch (activeTab.value) {
    case 'danger': return buildDangerHTML()
    case 'military': return buildMilitaryHTML()
    case 'illegal': return buildIllegalHTML()
    case 'env': return buildEnvHTML()
    case 'network': return buildNetworkHTML()
    case 'timeline': return buildTimelineHTML()
    default: return ''
  }
})

const categoryStats = computed(() => {
  const counts: Record<string, number> = {}
  categories.forEach(c => counts[c.key] = 0)
  allFeatures.forEach((d: any) => { if (counts[d.c] !== undefined) counts[d.c]++ })
  return categories.map(c => ({ key: c.key, label: c.label.split(' ')[0], color: c.color, count: counts[c.key] || 0 }))
})

const totalCount = computed(() => allFeatures.length)

function toggleLayer(key: string) {
  layerVis.value[key] = !layerVis.value[key]
  if (key === 'enterprise_hq') {
    enterpriseLayerVisible.value = layerVis.value[key]
    if (mapRef) {
      if (enterpriseLayerVisible.value) {
        setupEnterpriseLayer(mapRef, onEnterpriseClick)
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
  const ent = ENTERPRISES.find(e => e.name === name)
  if (ent) flyToTarget.value = { lng: ent.lng, lat: ent.lat, zoom: 6 }
}

function onMapInit(map: maplibregl.Map) {
  mapRef = map
}

function zoomToPoint(d: any) {
  if (d.lo != null && d.la != null) {
    flyToTarget.value = { lng: d.lo, lat: d.la, zoom: 10 }
  }
}

function zoomToDanger(item: typeof dangerData[0]) {
  const match = allFeatures.find(d => d.net === item.network_id || d.n?.toLowerCase() === item.name.toLowerCase().split('/')[0].trim().toLowerCase())
  if (match) { zoomToPoint(match); return }
  const ent = ENTERPRISES.find(e => item.name.includes(e.name.toUpperCase().split(' ')[0]) || e.name.toUpperCase().includes(item.name.split('/')[0].trim()))
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
  const filtered = allFeatures.filter((d: any) => {
    if (!visKeys.includes(d.c)) return false
    if (term) return `${d.n} ${d.s} ${d.u} ${d.p} ${d.f} ${d.net||''}`.toLowerCase().includes(term)
    return true
  })
  pointsData.value = {
    type: 'FeatureCollection',
    features: filtered.map((d: any, i: number) => ({
      type: 'Feature', id: i,
      properties: { ...d, id: i },
      geometry: { type: 'Point', coordinates: [d.lo, d.la] },
    })),
  }
}

function buildDangerHTML() {
  return dangerData.slice(0, 20).map(d => {
    const color = d.danger_score >= 8 ? '#e74c3c' : d.danger_score >= 6 ? '#f39c12' : '#27ae60'
    const encodedName = encodeURIComponent(d.name)
    const onclick = `window.__flyToDanger && window.__flyToDanger('${encodedName}')`
    return `<div style="margin-bottom:6px;cursor:pointer" onclick="${onclick}"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><span style="color:${color};font-weight:800;font-size:10px">${d.danger_score.toFixed(1)}</span><span style="font-weight:600;font-size:11px;color:#e0e0e0">${d.name}</span>${d.network_id ? `<span style="font-size:7.5px;padding:1px 4px;border-radius:2px;font-weight:700;background:rgba(41,128,185,0.2);color:#5dade2">${d.network_id}</span>` : ''}</div><div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.06);margin:3px 0;overflow:hidden"><div style="height:100%;width:${d.danger_score * 10}%;border-radius:2px;background:${color}"></div></div><div style="font-size:9px;color:#666;display:flex;gap:6px;flex-wrap:wrap"><span>${d.n_claims} proc.</span><span>${(d.total_area_ha / 1000).toFixed(0)}K ha</span><span>${d.ufs.join(', ')}</span></div><div style="font-size:9px;color:#555;margin-top:2px;line-height:1.35">${d.substances.slice(0, 4).join(' · ')}</div></div>`
  }).join('')
}

function buildMilitaryHTML() {
  return [
    '<div style="border-left:3px solid #e74c3c;padding:8px;margin-bottom:6px"><div style="font-weight:700;color:#e74c3c;font-size:12px">The real interest: MILITARY SUPPLY CHAIN</div><div style="font-size:9px;color:#888;line-height:1.4;margin-top:4px">The "Energy Transition" narrative is a facade. The primary driver is US defense supply chain: F-35 (417 kg REE/unit), nuclear submarines (4,175 kg), missiles, radar, drones, electronic warfare.</div></div>',
    '<div style="border-left:3px solid #e74c3c;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">🇺🇸 F-35 Lightning II</div><div style="font-size:9px;color:#888">417 kg REE per aircraft. 3,000+ units planned. Nd, Dy, Sm for magnets & guidance.</div></div>',
    '<div style="border-left:3px solid #e74c3c;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">🇺🇸 Virginia-class Submarine</div><div style="font-size:9px;color:#888">4,175 kg REE per sub. Sonar, propulsion, radar, electronic warfare systems.</div></div>',
    '<div style="border-left:3px solid #e74c3c;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">🇺🇸 Arleigh Burke Destroyer</div><div style="font-size:9px;color:#888">2,358 kg REE per ship. AEGIS combat system, SPY radar, EW suite.</div></div>',
    '<div style="border-left:3px solid #f39c12;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">💰 DoD Investments</div><div style="font-size:9px;color:#888">Pentagon $400M equity in MP Materials + $120M+ Lynas + $12B strategic stockpile. DFC $565M → Serra Verde. USA Rare Earth acquisition $2.8B.</div></div>',
    '<div style="border-left:3px solid #f39c12;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">💰 State Dept & Export Finance</div><div style="font-size:9px;color:#888">State Dept $5M → Aclara Carina GO. Export Finance Australia $100M → Viridis/Meteoric. Ucore MOU → Caldeira MREC → US oxide (military chain).</div></div>',
    '<div style="border-left:3px solid #c0392b;padding:8px;margin-bottom:6px"><div style="font-weight:600;font-size:11px;color:#ddd">🇨🇳 China Export Ban (Oct 2025)</div><div style="font-size:9px;color:#888">China banned export of 12/17 REE elements to US. 78% of US weapons depend on Chinese REE. DFARS 2027 mandate: US defense contractors must source non-China REE.</div></div>',
  ].join('')
}

function buildIllegalHTML() {
  return [
    { title: 'Land Speculation', desc: '437 companies with speculation patterns: 100% claims after 2020, only RESEARCH REQUIREMENT (never authorized), dozens of processes with 1-2 substances.', color: '#8e44ad', examples: ['GR8: R$20K capital, 137 claims, 204,625 ha', 'Nazca Gold: 129 claims, no corporate data', 'Pedra Cinza: 322 claims, 531,844 ha, all recent'] },
    { title: 'Regulatory Capture — Operação Rejeito', desc: 'Sep/2025: ANM Director arrested + 21 others. Billion-dollar license manipulation scheme. 1/3 of ANM directors were former mining sector employees.', color: '#8e44ad', examples: ['Director Caio Mário Seabra arrested', 'Fraudulent claim processes fast-tracked', 'Bribery & money laundering scheme'] },
    { title: 'Mining Information Secrecy', desc: 'ANM allows secrecy on mining process data. 88 claims under secrecy (105,139 ha). Operação Rejeito showed secrecy enabled corruption.', color: '#8e44ad', examples: ['19 Nacional de Grafite claims under secrecy', '4 Mosaic claims under secrecy', 'ANM opened consultation to revise rules in 2025'] },
    { title: 'Foreign Control of Strategic Minerals', desc: '2,142 claims (10.3%) controlled by Australian, American, Canadian and European companies.', color: '#2980b9', examples: ['Australia: 1,146 claims, 1.73M ha', 'USA: 475 claims, 644K ha', 'Canada: 190 claims, 386K ha', 'Zero domestic processing — raw ore exported'] },
    { title: 'Community Exclusion', desc: 'Traditional communities, quilombolas and indigenous peoples excluded from decisions.', color: '#8e44ad', examples: ['Quilombo Kalunga do Mimoso: Federal Court suspended', '40+ quilombo territories threatened in Legal Amazon', 'Brazil-China agreement excludes community safeguards'] },
    { title: 'Water Risk', desc: 'REE mining consumes 400-500L/ton. Poços de Caldas already faces rationing.', color: '#2980b9', examples: ['Poços de Caldas: rationing 2024, Viridis plans to use 4 reservoirs', 'ISR: proven contamination in China by same method', 'São Francisco River: Zn, Cd, Cr contamination'] },
  ].map(item => `<div style="border-left:3px solid ${item.color};padding:8px;margin-bottom:6px"><div style="font-weight:700;color:${item.color};font-size:11px">${item.title}</div><div style="font-size:9px;color:#888;line-height:1.4;margin-top:2px">${item.desc}</div>${item.examples.map(e => `<div style="font-size:9px;color:#666;margin-top:2px;padding-left:8px;border-left:2px solid rgba(255,255,255,0.06)">• ${e}</div>`).join('')}</div>`).join('')
}

function buildEnvHTML() {
  const envCoords: Record<string, [number, number]> = {
    'Poços de Caldas / Caldas MG': [-46.57, -21.55],
    'Minaçu GO (Serra Verde)': [-48.1, -14.25],
    'Aquífero Bambuí (MG/GO)': [-47, -17.5],
    'Araxá MG': [-46.94, -19.59],
    'Jequié BA': [-40.48, -13.85],
    'Piracanjuba GO (Aclara)': [-49.1, -16.7],
  }
  return [
    { region: 'Poços de Caldas / Caldas MG', danger: 9.5, companies: ['Viridis', 'Meteoric', 'Axel REE'], risks: ['Water rationing 2024', 'Viridis plans to use ALL 4 city reservoirs', '20,000+ tons INB radioactive waste on site', 'IAC method uses ammonium sulfate → soil acidification & groundwater contamination'] },
    { region: 'Minaçu GO (Serra Verde)', danger: 9, companies: ['Serra Verde / USA Rare Earth'], risks: ['R$12.5M fine recommended for stream impact', 'Cerrado deforestation at headwaters', '60 years of asbestos mining → mining dependency'] },
    { region: 'Aquífero Bambuí (MG/GO)', danger: 9, companies: ['Axel REE', 'Aclara', 'Various'], risks: ['Major REE projects over the aquifer', 'Contamination already detected at monitoring points', 'IAC mining uses ammonium sulfate leaching → direct aquifer risk'] },
    { region: 'Araxá MG', danger: 8.5, companies: ['CBMM', 'St George Mining', 'Mars GMN'], risks: ['36+ years of barium contamination (>5mg/L) in groundwater', 'Radioactive waste used in construction'] },
    { region: 'Jequié BA', danger: 7.5, companies: ['Palmares/Magnum', 'Mars GMN', 'Foxfire', 'EDEM'], risks: ['Carbonatite corridor with IAC-REE clays', 'Multiple ASX companies with overlapping claims'] },
    { region: 'Piracanjuba GO (Aclara)', danger: 7, companies: ['Aclara Resources'], risks: ['Carina project: $600M over Bambuí Aquifer', '"Circular Mineral Harvesting" method unproven at scale'] },
  ].map(e => {
    const color = e.danger >= 9 ? '#e74c3c' : e.danger >= 7 ? '#f39c12' : '#27ae60'
    const coord = envCoords[e.region]
    const onclick = coord ? `window.__flyToCoord && window.__flyToCoord(${coord[0]},${coord[1]})` : ''
    return `<div style="border-left:3px solid ${color};padding:8px;margin-bottom:6px;cursor:pointer" onclick="${onclick}"><div style="display:flex;align-items:center;gap:4px"><span style="color:${color};font-weight:800;font-size:10px">${e.danger.toFixed(1)}</span><span style="font-weight:600;font-size:11px;color:#e0e0e0">${e.region}</span></div><div style="font-size:9px;color:#888;margin:2px 0">${e.companies.map(c => `<span style="display:inline-block;font-size:7.5px;padding:1px 4px;border-radius:2px;font-weight:700;background:rgba(41,128,185,0.2);color:#5dade2;margin:1px">${c}</span>`).join(' ')}</div>${e.risks.map(r => `<div style="font-size:9px;color:#666;line-height:1.35;margin-top:1px">⚠ ${r}</div>`).join('')}</div>`
  }).join('')
}

function buildNetworkHTML() {
  return [
    '<div style="padding:6px;font-size:10px;color:#888;line-height:1.5"><strong style="color:#e74c3c">Central Hub: Foxfire Metals</strong> — Dr. Paul Woolrich connects Foxfire → Axel REE (ASX:AXL) → Si6 Metals (ASX:SI6) → Spark Energy (CSE:SPRK). 570+ claims via interconnected company network.</div>',
    '<div style="padding:6px;font-size:10px;color:#888;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06)"><strong style="color:#2980b9">Australian Invasion:</strong> 9 ASX companies exploring REE in Brazil. Viridis + Meteoric = Poços de Caldas. MPF sought to suspend BOTH.</div>',
    '<div style="padding:6px;font-size:10px;color:#888;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06)"><strong style="color:#e74c3c">US Military Interest:</strong> DFC $565M → Serra Verde. State Dept $5M → Aclara. Export Finance Australia $100M → Viridis/Meteoric. Ucore MOU → military oxide in US.</div>',
    '<div style="padding:6px;font-size:10px;color:#888;line-height:1.5;border-top:1px solid rgba(255,255,255,0.06)"><strong style="color:#8e44ad">CBMM China:</strong> Baosteel/CITIC/Anshan consortium holds 15% (US$1.95B). REE in niobium tailings — no specific regulation.</div>',
  ].join('')
}

function buildTimelineHTML() {
  const timeline = [
    { year: 2000, count: 53, event: '' },
    { year: 2005, count: 60, event: '' },
    { year: 2010, count: 551, event: 'China bans REE exports to Japan — warning signal' },
    { year: 2015, count: 510, event: '' },
    { year: 2017, count: 566, event: 'EO 13817 — US declares REE "critical mineral"' },
    { year: 2018, count: 662, event: '' },
    { year: 2019, count: 648, event: 'China threatens REE ban on US; Pentagon starts investing' },
    { year: 2020, count: 682, event: '' },
    { year: 2021, count: 860, event: 'REE supercycle; Brazil rush begins' },
    { year: 2022, count: 1505, event: 'Lithium rush; ASX companies invade Brazil (+75% YoY)' },
    { year: 2023, count: 4213, event: 'VIRAL: 4,213 claims — 4.9x 2020 level. DFC funds Serra Verde' },
    { year: 2024, count: 2795, event: 'MPF vs licensing; Operação Rejeito arrests ANM Director' },
    { year: 2025, count: 1370, event: 'China bans 7 REE elements; DFC $565M; State Dept funds Aclara' },
    { year: 2026, count: 581, event: 'Ongoing investigation — current year' },
  ]
  let cum = 0
  const maxCount = Math.max(...timeline.map(t => t.count))
  return timeline.map(t => {
    cum += t.count
    const pct = Math.min(100, (t.count / maxCount) * 100)
    return `<div style="display:flex;gap:6px;align-items:flex-start;padding:3px 0;font-size:9px${t.event ? ';font-weight:700;color:#e74c3c' : ''}"><span style="width:32px;flex-shrink:0;color:#666">${t.year}</span><div style="flex:1"><div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${t.count > 2000 ? '#c0392b' : t.count > 800 ? '#f39c12' : '#27ae60'};border-radius:3px"></div></div><div style="font-size:8px;color:#666;margin-top:1px">${t.count.toLocaleString()} claims (cum. ${cum.toLocaleString()})</div>${t.event ? `<div style="font-size:8px;color:#e74c3c;margin-top:1px">← ${t.event}</div>` : ''}</div></div>`
  }).join('')
}

const dangerData = [
  { name: 'FOXFIRE METALS', danger_score: 10, n_claims: 365, total_area_ha: 590978, ufs: ['BA', 'GO', 'MG'], substances: ['GRAFITA', 'MINÉRIO DE LÍTIO', 'TERRAS RARAS'], network_id: 'foxfire' },
  { name: 'VALE S.A.', danger_score: 10, n_claims: 160, total_area_ha: 473978, ufs: ['BA', 'ES', 'GO', 'MG', 'PA', 'PB', 'PI', 'RJ', 'RN', 'SP'], substances: ['BERÍLIO', 'CROMITA', 'FOSFATO', 'ILMENITA', 'MINÉRIO DE LÍTIO', 'MINÉRIO DE NÍQUEL'], network_id: 'vale' },
  { name: 'BORBOREMA RECURSOS MINERAIS', danger_score: 9.7, n_claims: 246, total_area_ha: 401939, ufs: ['BA', 'MG', 'SP'], substances: ['MINÉRIO DE NÍQUEL', 'MINÉRIO DE TITÂNIO', 'MONAZITA', 'TERRAS RARAS'], network_id: 'borborema' },
  { name: 'RTB GEOLOGIA E MINERAÇÃO', danger_score: 9.3, n_claims: 146, total_area_ha: 222084, ufs: ['BA', 'GO', 'MG', 'PB', 'PI', 'PR', 'RJ', 'RN', 'RS', 'SC', 'SP'], substances: ['FONÓLITO', 'FOSFATO', 'ILMENITA', 'MINÉRIO DE LÍTIO', 'MINÉRIO DE NIÓBIO'], network_id: 'rtb' },
  { name: 'ALPHA MINERALS BRAZIL', danger_score: 8.9, n_claims: 187, total_area_ha: 268678, ufs: ['AL', 'BA', 'CE', 'GO', 'MG', 'PE', 'SP', 'TO'], substances: ['MINÉRIO DE LÍTIO', 'MINÉRIO DE NÍQUEL', 'TERRAS RARAS'], network_id: 'alpha' },
  { name: 'MARS GMN BRAZIL', danger_score: 8.9, n_claims: 110, total_area_ha: 202374, ufs: ['BA', 'CE', 'MG', 'PB', 'RN'], substances: ['TERRAS RARAS'], network_id: 'mars_gmn' },
  { name: 'COMPANHIA BAIANA DE PESQUISA MINERAL', danger_score: 8.9, n_claims: 174, total_area_ha: 208826, ufs: ['BA', 'PI'], substances: ['FOSFATO', 'GRAFITA', 'ILMENITA', 'MINÉRIO DE NÍQUEL', 'MINÉRIO DE TITÂNIO', 'MINÉRIO DE VANÁDIO'], network_id: 'cbpm' },
  { name: 'PEDRA CINZA MINERAÇÃO', danger_score: 8.5, n_claims: 322, total_area_ha: 531844, ufs: ['BA', 'GO', 'MG', 'TO'], substances: ['FOSFATO'], network_id: 'pedra_cinza' },
  { name: 'CBMM', danger_score: 8.5, n_claims: 21, total_area_ha: 43793, ufs: ['MG'], substances: ['NIÓBIO', 'TERRAS RARAS'], network_id: 'cbmm' },
  { name: 'GR8 ENERGETIC', danger_score: 8.3, n_claims: 137, total_area_ha: 204625, ufs: ['BA', 'GO', 'MG', 'TO'], substances: ['FOSFATO', 'MINÉRIO DE LÍTIO'], network_id: 'gr8' },
  { name: 'SERRA VERDE / USA RARE EARTH', danger_score: 8.2, n_claims: 41, total_area_ha: 52400, ufs: ['GO'], substances: ['TERRAS RARAS'], network_id: 'serra_verde' },
  { name: 'VIRIDIS MINERAIS', danger_score: 8.0, n_claims: 85, total_area_ha: 120000, ufs: ['MG'], substances: ['TERRAS RARAS'], network_id: 'viridis' },
  { name: 'METEORIC RESOURCES', danger_score: 7.8, n_claims: 72, total_area_ha: 95000, ufs: ['MG'], substances: ['TERRAS RARAS'], network_id: 'meteoric' },
  { name: 'NAZCA GOLD', danger_score: 7.5, n_claims: 129, total_area_ha: 180000, ufs: ['BA', 'MG', 'GO'], substances: ['TERRAS RARAS'], network_id: 'nazca' },
  { name: 'ACLARA RESOURCES', danger_score: 7.0, n_claims: 45, total_area_ha: 78000, ufs: ['GO'], substances: ['TERRAS RARAS'], network_id: 'aclara' },
]

onMounted(async () => {
  window.__flyToDanger = (encodedName: string) => {
    const name = decodeURIComponent(encodedName)
    const item = dangerData.find(d => d.name === name)
    if (item) zoomToDanger(item)
  }
  window.__flyToCoord = (lng: number, lat: number) => {
    flyToTarget.value = { lng, lat, zoom: 8 }
  }

  try {
    const [pointsRes, polysRes] = await Promise.all([
      fetch(`${baseURL}data/rare-earth/points.geojson`),
      fetch(`${baseURL}data/rare-earth/polygons.geojson`).catch(() => null),
    ])
    if (!pointsRes.ok) throw new Error('Failed to load points')
    const pointsGJ = await pointsRes.json()
    allFeatures = pointsGJ.features.map((f: any) => ({
      p: f.properties.processo, n: f.properties.nome, s: f.properties.subs,
      c: f.properties.category, f: f.properties.fase, u: f.properties.uf,
      a: f.properties.area_ha ?? 0, ds: f.properties.danger_score ?? 0,
      net: f.properties.network_id ?? '',
      y: f.properties.ano ?? 0,
      lo: f.geometry.coordinates[0] ?? 0, la: f.geometry.coordinates[1] ?? 0,
    }))
    pointsData.value = pointsGJ
    if (polysRes && polysRes.ok) {
      polygonsData.value = await polysRes.json()
    }
  } catch (e) {
    console.error('Failed to load rare earth data:', e)
  }
  pageLoading.value = false
})
</script>
