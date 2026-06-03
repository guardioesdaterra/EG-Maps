<template>
  <div class="ree-claim-actions">
    <a v-if="anmUrl" :href="anmUrl" target="_blank" rel="noopener" class="ree-claim-action ree-claim-action--primary">
      <span class="ree-claim-action-icon">↗</span>
      <span>{{ t('observatory.actions.verify') }}</span>
    </a>
    <a :href="mailtoUrl" class="ree-claim-action ree-claim-action--report">
      <span class="ree-claim-action-icon">⚑</span>
      <span>{{ t('observatory.actions.report') }}</span>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildAnmVerifyUrl } from '@/lib/observatory-analysis'

const props = defineProps<{
  processo: string | null | undefined
  ano: number | null | undefined
  nome: string | null | undefined
  lat: number | null | undefined
  lng: number | null | undefined
  uf?: string | null
  subs?: string | null
}>()

const { t } = useI18n()

const anmUrl = computed(() => buildAnmVerifyUrl(props.processo, props.ano))

const mailtoUrl = computed(() => {
  const subject = `Claim report - ${props.processo ?? 'unknown'}`
  const lines = [
    `Process: ${props.processo ?? 'unknown'}`,
    `Company: ${props.nome ?? 'unknown'}`,
    `Lat/Lng: ${props.lat?.toFixed(5) ?? '?'}, ${props.lng?.toFixed(5) ?? '?'}`,
    `UF: ${props.uf ?? '?'}`,
    `Substance: ${props.subs ?? '?'}`,
    '',
    'Issue type: [new claim | dispute | correction | field report]',
    '',
    'Notes:',
    '',
  ]
  return `mailto:observatory@earthguardians.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
})
</script>

<style scoped>
.ree-claim-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.ree-claim-action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  padding: 5px 8px;
  border-radius: 4px;
  text-decoration: none;
  letter-spacing: 0.04em;
  border: 1px solid;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
.ree-claim-action--primary {
  background: rgba(52,152,219,0.10);
  color: #5dade2;
  border-color: rgba(52,152,219,0.3);
}
.ree-claim-action--primary:hover {
  background: rgba(52,152,219,0.2);
  border-color: #5dade2;
}
.ree-claim-action--report {
  background: rgba(231,76,60,0.08);
  color: #e74c3c;
  border-color: rgba(231,76,60,0.25);
}
.ree-claim-action--report:hover {
  background: rgba(231,76,60,0.15);
  border-color: #e74c3c;
}
.ree-claim-action-icon {
  font-size: 10px;
}
</style>
