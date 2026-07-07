<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/90 p-4 overflow-y-auto registry-modal-overlay" role="dialog" aria-modal="true" :aria-label="t('grantsPortal.approvedGrants')">
      <div class="mx-auto max-w-6xl w-full">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white">{{ t('grantsPortal.approvedGrants') }}</h2>
          <button class="text-white/70 hover:text-white" :aria-label="t('grantsPortal.close')" @click="$emit('close')">{{ t('grantsPortal.close') }}</button>
        </div>
        <div v-if="loading" class="text-white/70">{{ t('grantsPortal.loadingRegistry') }}</div>
        <div v-else-if="!grants.length" class="text-white/70">{{ t('grantsPortal.noApprovedGrants') }}</div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="grant in grants" :key="String(grant.id)" class="rounded border border-white/10 bg-white/5 p-3 text-white">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold leading-snug">{{ grant.title }}</h3>
              <span v-if="grant.relevante" class="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">{{ t('grantsPortal.public') }}</span>
            </div>
            <p class="mt-2 text-xs text-white/70 line-clamp-3">{{ grant.description }}</p>
            <div class="mt-3 flex items-center justify-between text-[11px] text-white/60">
              <span>{{ grant.location_name }}</span>
              <span>{{ new Date(grant.created_at).toLocaleDateString() }}</span>
            </div>
            <button class="mt-3 w-full rounded bg-white/10 py-2 text-xs font-semibold text-white hover:bg-white/20" @click="$emit('view-detail', grant)">{{ t('grantsPortal.viewDetails') }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { GrantRecord } from '~/composables/useGrants'

defineProps<{
  show: boolean
  loading: boolean
  grants: Array<GrantRecord & { relevante?: boolean }>
}>()

defineEmits<{
  close: []
  'view-detail': [grant: GrantRecord]
}>()

const { t } = useI18n()
</script>

<style scoped>
.registry-modal-overlay {
  position: fixed !important;
  z-index: 9000 !important;
  isolation: isolate;
  pointer-events: auto;
}
</style>
