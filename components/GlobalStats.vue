<template>
  <div
    v-if="isVisible"
    :class="`bg-gradient-to-br from-black via-gray-900/95 to-black backdrop-blur-md rounded-lg border-2 border-pink-500/70 shadow-[0_0_35px_5px_rgba(219,39,119,0.35)] transition-all duration-300 ${
      isExpanded ? 'p-3.5 md:p-5' : 'p-2.5'
    }`"
    style="font-family: 'Consolas', 'Monaco', monospace"
  >
    <div class="flex justify-between items-center mb-1">
      <h2
        :class="`whitespace-nowrap font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-500 to-cyan-300 uppercase tracking-wider [text-shadow:_0_0_8px_theme(colors.purple.500),_0_0_12px_theme(colors.pink.500)] ${
          isExpanded ? (isMobile ? 'text-base' : 'text-lg') : 'text-sm'
        }`"
      >
        &gt;&gt; 2024 Project Grants Impact &lt;&lt;
      </h2>
      <div class="flex items-center gap-1">
        <UiButton
          variant="ghost"
          size="icon"
          :class="`${isMobile ? 'h-8 w-8' : 'h-7 w-7'} text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 rounded-md transition-colors duration-150`"
          @click="isExpanded = !isExpanded"
          :title="isExpanded ? 'Collapse' : 'Expand'"
        >
          <iconify-icon v-if="isExpanded" icon="lucide:chevron-down" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
          <iconify-icon v-else icon="lucide:chevron-up" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon"
          :class="`${isMobile ? 'h-8 w-8' : 'h-7 w-7'} text-gray-400 hover:text-white hover:bg-gray-500/20 rounded-md transition-colors duration-150`"
          @click="closePanel"
          title="Close"
        >
          <iconify-icon icon="lucide:x" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
        </UiButton>
      </div>
    </div>

    <div v-if="isExpanded" :class="`grid ${isMobile ? 'grid-cols-2 gap-3.5' : 'grid-cols-4 gap-3'} mt-3`">
      <StatCard
        icon="zap"
        :value="formatNumber(stats.activeInitiatives)"
        label="Project Grantees"
        accent-color="text-green-400"
        :glow-color-r-g-b="[74, 222, 128]"
        :is-mobile="isMobile"
      />
      <StatCard
        icon="globe"
        :value="formatNumber(stats.countriesCount)"
        label="Countries"
        accent-color="text-cyan-300"
        :glow-color-r-g-b="[56, 189, 248]"
        :is-mobile="isMobile"
      />
      <StatCard
        icon="users"
        :value="formatNumber(stats.totalDirectBeneficiaries)"
        label="Direct Beneficiaries"
        accent-color="text-purple-400"
        :glow-color-r-g-b="[192, 132, 252]"
        :is-mobile="isMobile"
      />
      <StatCard
        icon="bar-chart-2"
        :value="formatNumber(stats.totalIndirectBeneficiaries)"
        label="Indirect Beneficiaries"
        accent-color="text-orange-400"
        :glow-color-r-g-b="[251, 146, 60]"
        :is-mobile="isMobile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import type { ProjectData } from '@/lib/types'

const props = defineProps<{ projects: ProjectData[] }>()
const emit = defineEmits<{ close: [] }>()

const isMobile = useMediaQuery('(max-width: 768px)')
const isExpanded = ref(true)
const isVisible = ref(true)

function closePanel() {
  isVisible.value = false
  emit('close')
}

const stats = computed(() => {
  const activeInitiatives = props.projects.length
  // Compute unique countries from project data
  const uniqueCountries = new Set(props.projects.map(p => p.country_province).filter(Boolean))
  const countriesCount = uniqueCountries.size
  const totalDirectBeneficiaries = props.projects.reduce((sum, p) => sum + p.direct_beneficiaries, 0)
  const totalIndirectBeneficiaries = props.projects.reduce((sum, p) => sum + p.indirect_beneficiaries, 0)

  return {
    activeInitiatives,
    countriesCount,
    totalDirectBeneficiaries,
    totalIndirectBeneficiaries,
  }
})

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace('.0', '') + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1).replace('.0', '') + 'K'
  return num.toString()
}
</script>

<script lang="ts">
// StatCard sub-component
import { defineComponent, h } from 'vue'

const StatCard = defineComponent({
  props: {
    icon: { type: String, required: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    accentColor: { type: String, required: true },
    glowColorRGB: { type: Array as () => number[], required: true },
    isMobile: { type: Boolean, required: true },
  },
  setup(props) {
    const iconContainerSize = props.isMobile ? 'w-10 h-10' : 'w-9 h-9'
    const valueTextSize = props.isMobile ? 'text-lg' : 'text-xl'
    const labelTextSize = props.isMobile ? 'text-xs' : 'text-[11px]'
    const rgb = props.glowColorRGB.join(',')

    return () => h('div', {
      class: 'flex flex-col items-center p-2 bg-gray-900/60 rounded-lg hover:bg-gray-800/70 transition-all duration-200 group shadow-[inset_0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]'
    }, [
      h('div', {
        class: `flex items-center justify-center ${iconContainerSize} rounded-lg bg-gray-800/75 border border-gray-600/60 mb-1.5 shadow-[0_0_12px_2px_rgba(${rgb},0.4)] group-hover:shadow-[0_0_18px_3px_rgba(${rgb},0.55)] transition-all duration-200`
      }, [
        h('span', {
          class: `${props.accentColor} group-hover:scale-110 transition-transform duration-200 [filter:drop-shadow(0_0_3px_rgba(${rgb},0.6))]`
        }, [h('iconify-icon', { icon: props.icon, class: 'w-4 h-4' })])
      ]),
      h('span', {
        class: `${valueTextSize} font-bold ${props.accentColor} [text-shadow:_0_0_6px_rgba(${rgb},0.6),_0_0_9px_rgba(${rgb},0.4)]`
      }, props.value),
      h('span', {
        class: `${labelTextSize} leading-tight text-gray-300/90 uppercase tracking-tighter text-center whitespace-nowrap group-hover:text-gray-200 transition-colors duration-200 [text-shadow:_0_0_2px_rgba(0,0,0,0.5)]`
      }, props.label)
    ])
  }
})
</script>
