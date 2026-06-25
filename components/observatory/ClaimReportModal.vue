<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" :aria-modal="true" :aria-label="t('observatory.claimReport.title')">
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="$emit('close')" />
      <div class="relative bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto z-10" ref="modalRef">
        <div class="p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-zinc-100 uppercase tracking-wider">{{ t('observatory.claimReport.title') }}</h2>
            <button type="button" class="text-zinc-500 hover:text-zinc-300 text-lg leading-none" :aria-label="t('observatory.claimReport.close')" @click="$emit('close')">×</button>
          </div>

          <div v-if="claim" class="mb-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">{{ t('observatory.claimReport.claimInfo') }}</div>
            <div class="text-xs text-zinc-300 font-semibold">{{ claim.n || 'Unknown' }}</div>
            <div class="text-[10px] text-zinc-500 mt-0.5">Processo: {{ claim.p || '—' }} · UF: {{ claim.u || '—' }}</div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">{{ t('observatory.claimReport.reportType') }}</label>
              <select v-model="reportType" class="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 outline-none focus:border-red-500/50">
                <option value="new_activity">{{ t('observatory.claimReport.types.newActivity') }}</option>
                <option value="pollution">{{ t('observatory.claimReport.types.pollution') }}</option>
                <option value="conflict">{{ t('observatory.claimReport.types.conflict') }}</option>
                <option value="correction">{{ t('observatory.claimReport.types.correction') }}</option>
                <option value="field_report">{{ t('observatory.claimReport.types.fieldReport') }}</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">{{ t('observatory.claimReport.description') }}</label>
              <textarea v-model="description" rows="4" maxlength="500"
                class="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 outline-none focus:border-red-500/50 resize-none"
                :placeholder="t('observatory.claimReport.descriptionPlaceholder')" />
              <div class="text-[9px] text-zinc-600 mt-0.5 text-right">{{ description.length }}/500</div>
            </div>

            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="includeLocation" class="rounded" />
                <span class="text-[10px] text-zinc-400">{{ t('observatory.claimReport.includeLocation') }}</span>
              </label>
              <div v-if="includeLocation && !geoLocation" class="text-[9px] text-zinc-600 mt-1">
                {{ t('observatory.claimReport.geoPending') }}
              </div>
              <div v-if="geoLocation" class="text-[9px] text-zinc-500 mt-1 font-mono">
                {{ geoLocation.lat.toFixed(5) }}, {{ geoLocation.lng.toFixed(5) }}
              </div>
            </div>

            <div>
              <label class="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">{{ t('observatory.claimReport.contactOptional') }}</label>
              <input v-model="contact" type="text"
                class="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 outline-none focus:border-red-500/50"
                :placeholder="t('observatory.claimReport.contactPlaceholder')" />
            </div>
          </div>

          <div class="flex gap-2 mt-5">
            <button type="button"
              class="flex-1 px-3 py-2 text-[10px] font-bold rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
              @click="$emit('close')">
              {{ t('observatory.claimReport.cancel') }}
            </button>
            <button type="button"
              class="flex-1 px-3 py-2 text-[10px] font-bold rounded-lg border transition-colors"
              :class="canSubmit
                ? 'border-red-500/40 bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'border-zinc-700 bg-zinc-800 text-zinc-600 cursor-not-allowed'"
              :disabled="!canSubmit"
              @click="submitReport">
              {{ t('observatory.claimReport.submit') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { buildClaimReportMailtoUrl } from '@/lib/observatory-analysis'
import { useFocusTrap } from '@/composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
  claim?: {
    p?: string
    n?: string
    u?: string
    s?: string
    la?: number
    lo?: number
  } | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const modalRef = ref<HTMLElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(modalRef, { active: isActive })

const reportType = ref('new_activity')
const description = ref('')
const includeLocation = ref(false)
const contact = ref('')
const geoLocation = ref<{ lat: number; lng: number } | null>(null)

const canSubmit = computed(() => description.value.trim().length >= 10)

watch(includeLocation, (val) => {
  if (val && !geoLocation.value && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { geoLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => { geoLocation.value = null },
    )
  }
})

function submitReport() {
  if (!canSubmit.value || !props.claim) return
  const url = buildClaimReportMailtoUrl({
    processo: props.claim.p,
    nome: props.claim.n,
    lat: geoLocation.value?.lat ?? props.claim.la,
    lng: geoLocation.value?.lng ?? props.claim.lo,
    uf: props.claim.u,
    subs: props.claim.s,
  })
  window.open(url, '_blank')
  emit('close')
}
</script>
