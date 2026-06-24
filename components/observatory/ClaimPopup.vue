<template>
  <div class="ree-popup-wrapper" style="word-wrap:break-word;white-space:normal;overflow:hidden;min-width:250px;position:relative">
    <div class="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2 pointer-events-none z-[1]"
      :style="{ borderColor: cat.color + '60' }" />
    <div class="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2 pointer-events-none z-[1]"
      :style="{ borderColor: cat.color + '60' }" />

    <div class="px-3.5 pt-3.5 pb-2.5 relative">
      <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span class="inline-flex items-center gap-1 text-[8px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider"
          :style="{ background: cat.color }">{{ cat.label }}</span>
        <span class="inline-flex items-center gap-0.5 text-[8px] font-bold px-2 py-0.5 rounded text-white"
          :style="{ background: dangerColor }">{{ dangerScore.toFixed(1) }} Danger</span>
        <span v-if="props.net" class="text-[7px] px-1.5 py-0.5 rounded font-semibold bg-blue-900/30 text-blue-400 tracking-wide">
          {{ props.net }}
        </span>
        <span v-if="milFlag" class="text-[7px] px-1.5 py-0.5 rounded font-bold bg-red-900/20 text-red-400">MIL</span>
        <span v-if="envFlag" class="text-[7px] px-1.5 py-0.5 rounded font-bold bg-green-900/20 text-green-400">ENV</span>
        <span v-if="susFlag" class="text-[7px] px-1.5 py-0.5 rounded font-bold bg-purple-900/20 text-purple-400">SUS</span>
      </div>
      <h3 class="m-0 text-[13px] font-bold text-zinc-100 leading-snug tracking-wide break-words">{{ props.n || 'Unknown' }}</h3>
      <div class="text-[10px] text-zinc-500 mt-0.5 italic">{{ props.s || '—' }}</div>
    </div>

    <div class="h-px mx-3" :style="{ background: `linear-gradient(90deg, transparent, ${cat.color}30, transparent)` }" />

    <div class="px-3.5 py-2.5">
      <div class="grid grid-cols-2 gap-x-3.5 gap-y-1.25">
        <div>
          <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold">Process</div>
          <div class="text-[10.5px] text-zinc-300 font-medium break-words">{{ props.p || '—' }}</div>
        </div>
        <div>
          <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold">Phase</div>
          <div class="text-[10.5px] text-zinc-300 font-medium">{{ props.f || '—' }}</div>
        </div>
        <div>
          <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold">UF</div>
          <div class="text-[10.5px] text-zinc-300 font-medium">{{ props.u || '—' }}</div>
        </div>
        <div>
          <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold">Area</div>
          <div class="text-[10.5px] text-zinc-300 font-medium">{{ formattedArea }}</div>
        </div>
      </div>

      <div class="mt-1.5 pt-1.5 border-t border-zinc-800/50">
        <div class="flex items-center gap-1.5">
          <span class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold">Danger Level</span>
          <div class="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div class="h-full rounded-full" :style="{ width: `${Math.min(100, dangerScore * 10)}%`, background: dangerColor, boxShadow: `0 0 4px ${dangerColor}` }" />
          </div>
          <span class="text-[10px] font-bold min-w-6 text-right" :style="{ color: dangerColor }">{{ dangerScore.toFixed(1) }}</span>
        </div>
      </div>

      <div v-if="lastEvent" class="mt-1.5 pt-1.5 border-t border-zinc-800/50">
        <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold mb-0.5">Last event</div>
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[9.5px] text-zinc-300 leading-snug flex-1 break-words">{{ lastEvent }}</span>
          <span class="text-[7.5px] px-1.5 py-0.5 rounded font-bold" :style="{ background: ageColor + '22', color: ageColor }">{{ ageLabel }}</span>
        </div>
      </div>

      <div v-if="overlaps.length" class="mt-1.5 pt-1.5 border-t border-zinc-800/50">
        <div class="text-[7.5px] text-zinc-600 uppercase tracking-widest font-semibold mb-0.5">Overlaps</div>
        <div class="flex items-center flex-wrap gap-0">
          <span v-for="(o, i) in displayedOverlaps" :key="i"
            class="inline-flex items-center gap-0.5 text-[8px] px-1 py-0.5 rounded bg-red-900/18 text-red-400 font-semibold mr-0.5 mb-0.5">
            ⚠ {{ o.name }}<span v-if="o.distance_km" class="opacity-70 font-normal"> · {{ o.distance_km }}km</span>
          </span>
          <span v-if="overlaps.length > 3" class="text-[8px] text-zinc-500 ml-1">+{{ overlaps.length - 3 }} more</span>
        </div>
      </div>
    </div>

    <div class="flex gap-1.5 px-3.5 py-2 border-t border-zinc-800/40">
      <a v-if="anmUrl" :href="anmUrl" target="_blank" rel="noopener"
        class="flex-1 inline-flex items-center justify-center gap-1 text-[9px] font-bold py-1.5 px-2 rounded no-underline border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
        ↗ Verify on ANM
      </a>
      <a :href="mailtoUrl"
        class="flex-1 inline-flex items-center justify-center gap-1 text-[9px] font-bold py-1.5 px-2 rounded no-underline border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-colors">
        ⚑ Report issue
      </a>
    </div>

    <div class="h-0.5" :style="{ background: `linear-gradient(90deg, transparent 0%, ${cat.color} 50%, transparent 100%)`, opacity: 0.5, boxShadow: `0 0 6px ${cat.color}40` }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RARE_EARTH_CATEGORIES } from '@/lib/map-utils'
import { isMilitaryInterest, isHighEnvRisk, buildAnmVerifyUrl, buildClaimReportMailtoUrl } from '@/lib/observatory-analysis'
import { isSuspicious } from '@/lib/map-utils'
import type { SpeculatorIndexEntry } from '@/lib/observatory-analysis'

const props = defineProps<{
  p?: string
  n?: string
  s?: string
  c?: string
  f?: string
  u?: string
  a?: number
  ds?: number
  net?: string
  y?: number
  lo?: number
  la?: number
  ev?: string
  ov?: Array<{ name: string; kind: string; distance_km: number }>
  speculator?: SpeculatorIndexEntry | null
}>()

const cat = computed(() => RARE_EARTH_CATEGORIES[props.c ?? ''] ?? { label: props.c || 'Unknown', color: '#666' })
const dangerScore = computed(() => props.ds ?? 5)
const dangerColor = computed(() => dangerScore.value >= 8 ? '#e74c3c' : dangerScore.value >= 6 ? '#f39c12' : '#27ae60')

const milFlag = computed(() => isMilitaryInterest(props.u || ''))
const envFlag = computed(() => isHighEnvRisk(props))
const susFlag = computed(() => isSuspicious(props, props.speculator ?? null))

const areaHa = computed(() => Number(props.a ?? 0))
const formattedArea = computed(() => {
  if (areaHa.value >= 10000) return `${(areaHa.value / 1000).toFixed(0)}K ha`
  return `${areaHa.value.toLocaleString()} ha`
})

const lastEvent = computed(() => props.ev)
const ageColor = computed(() => {
  const refYear = Number(props.y ?? 0)
  const currentYear = new Date().getFullYear()
  const ageYears = refYear ? Math.max(0, currentYear - refYear) : 99
  return ageYears < 1 ? '#27ae60' : ageYears <= 3 ? '#f39c12' : '#e74c3c'
})
const ageLabel = computed(() => {
  const refYear = Number(props.y ?? 0)
  const currentYear = new Date().getFullYear()
  const ageYears = refYear ? Math.max(0, currentYear - refYear) : 99
  return ageYears < 1 ? 'Recent' : ageYears <= 3 ? 'Active' : 'Stale'
})

const overlaps = computed(() => Array.isArray(props.ov) ? props.ov : [])
const displayedOverlaps = computed(() => overlaps.value.slice(0, 3))

const anmUrl = computed(() => buildAnmVerifyUrl(props.p, props.y))
const mailtoUrl = computed(() => buildClaimReportMailtoUrl({
  processo: props.p,
  nome: props.n,
  lat: props.la,
  lng: props.lo,
  uf: props.u,
  subs: props.s,
}))
</script>
