<template>
  <div
    v-if="isVisible"
    :class="`panel-cyber stats-panel transition-all duration-300 ${
      isExpanded ? 'p-3 md:p-4' : 'p-2.5'
    }`"
  >
    <div class="flex justify-between items-center gap-3 mb-1">
      <div class="flex items-center gap-2">
        <div class="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
        <h2
          :class="`font-semibold text-[var(--tool-btn-text)] uppercase tracking-wider ${
            isExpanded ? (isMobile ? 'text-sm' : 'text-base') : 'text-xs'
          }`"
        >
          {{ t('stats.title') }}
        </h2>
      </div>
      <div class="flex items-center gap-1">
        <UiButton
          variant="ghost"
          size="icon"
          :class="`${isMobile ? 'h-8 w-8' : 'h-7 w-7'} text-[var(--tool-btn-text)] hover:text-[var(--tool-btn-active-text)] hover:bg-[var(--tool-btn-active-bg)] rounded-md transition-colors duration-150`"
          @click="isExpanded = !isExpanded"
          :title="isExpanded ? t('stats.collapse') : t('stats.expand')"
        >
          <iconify-icon v-if="isExpanded" icon="lucide:chevron-down" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
          <iconify-icon v-else icon="lucide:chevron-up" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon"
          :class="`${isMobile ? 'h-8 w-8' : 'h-7 w-7'} text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--search-result-hover-bg)] rounded-md transition-colors duration-150`"
          @click="closePanel"
          :title="t('stats.close')"
        >
          <iconify-icon icon="lucide:x" :class="isMobile ? 'h-5 w-5' : 'h-4 w-4'" />
        </UiButton>
      </div>
    </div>

    <div v-if="isExpanded" :class="`grid ${isMobile ? 'grid-cols-2 gap-2.5' : 'grid-cols-4 gap-3'} mt-3`">
      <UiStatCard
        icon="lucide:zap"
        :value="stats.activeInitiatives"
        :display-value="formatNumber(stats.activeInitiatives)"
        :label="t('stats.projectGrantees')"
        accent-color="text-green-400"
        :glow-color-r-g-b="[74, 222, 128]"
        :is-mobile="isMobile"
      />
      <UiStatCard
        icon="lucide:globe"
        :value="stats.countriesCount"
        :display-value="formatNumber(stats.countriesCount)"
        :label="t('stats.countries')"
        accent-color="text-[var(--text-primary)]"
        :glow-color-r-g-b="[128, 128, 128]"
        :is-mobile="isMobile"
      />
      <UiStatCard
        icon="lucide:users"
        :value="stats.totalDirectBeneficiaries"
        :display-value="formatNumber(stats.totalDirectBeneficiaries)"
        :label="t('stats.directBeneficiaries')"
        accent-color="text-[var(--text-primary)]"
        :glow-color-r-g-b="[128, 128, 128]"
        :is-mobile="isMobile"
      />
      <UiStatCard
        icon="lucide:bar-chart-2"
        :value="stats.totalIndirectBeneficiaries"
        :display-value="formatNumber(stats.totalIndirectBeneficiaries)"
        :label="t('stats.indirectBeneficiaries')"
        accent-color="text-orange-400"
        :glow-color-r-g-b="[251, 146, 60]"
        :is-mobile="isMobile"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useI18n } from '@/composables/useI18n'
import type { ProjectData } from '@/lib/types'

const props = defineProps<{ projects: ProjectData[] }>()
const emit = defineEmits<{ close: [] }>()

const isMobile = useMediaQuery('(max-width: 768px)')
const isExpanded = ref(true)
const isVisible = ref(true)
const { t } = useI18n()

watch(isMobile, (mobile) => {
  isExpanded.value = !mobile
}, { immediate: true })

function closePanel() {
  isVisible.value = false
  emit('close')
}

const stats = computed(() => {
  const activeInitiatives = props.projects.length
  const uniqueCountries = new Set(
    props.projects
      .map(p => {
        if (!p.country_province) return ''
        return p.country_province.includes(',')
          ? p.country_province.split(',').pop()?.trim() || p.country_province
          : p.country_province
      })
      .filter(Boolean)
  )
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

<style scoped>
.stats-panel {
  border-radius: 8px;
  background: var(--panel-bg);
  border-color: var(--panel-border);
  box-shadow: var(--panel-shadow);
}
</style>
