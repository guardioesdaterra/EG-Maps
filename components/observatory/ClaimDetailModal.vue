/**
 * components/observatory/ClaimDetailModal.vue
 * @why Full detail view for an observatory claim in a modal. Beyond the
 *      standard claim popup HTML it renders holder-intelligence context
 *      (speculator suspicion score/flags/volume) and the territory overlaps
 *      so the socio-military picture is visible without opening the sidebar.
 * @component ClaimDetailModal
 * @props visible: boolean
 *   claim
 *   context?: { suspicionScore, suspicionFlags, holderClaims, holderAreaHa } | null
 * @emits close: []
 * @deps vue (ref, watch, computed); @/lib/map-utils (buildRareEarthPopupHTML)
 */
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" ref="overlayRef" class="claim-overlay-fixed" role="dialog" aria-modal="true" aria-label="Claim details" tabindex="-1" @click.self="close" @keydown.escape="close">
        <button ref="closeBtnRef" class="claim-overlay-close-btn" @click="close" aria-label="Close claim details">
          <Icon name="lucide:x" class="h-5 w-5" />
        </button>
        <div class="claim-overlay-content">
          <div v-html="html" />
          <!-- ── Holder intelligence ─────────────────────────── -->
          <div v-if="context" class="claim-intel">
            <div class="claim-intel__head">
              <span
                class="claim-intel__score"
                :style="{ background: scoreColor(context.suspicionScore) }"
              >{{ context.suspicionScore.toFixed(1) }}</span>
              <div class="claim-intel__title">
                <strong>{{ t('observatory.claimIntel.holderTitle') }}</strong>
                <span>{{ context.holderClaims }} {{ t('observatory.claimIntel.claims') }} · {{ formatHa(context.holderAreaHa) }} ha</span>
              </div>
            </div>
            <div v-if="context.suspicionFlags?.length" class="claim-intel__flags">
              <span v-for="flag in context.suspicionFlags.slice(0, 4)" :key="flag" class="claim-intel__flag">{{ flag }}</span>
            </div>
          </div>
          <!-- ── Territory overlaps ──────────────────────────── -->
          <div v-if="overlaps.length" class="claim-intel claim-intel--territory">
            <div class="claim-intel__head">
              <strong class="claim-intel__title">{{ t('observatory.claimIntel.territoryTitle') }}</strong>
            </div>
            <ul class="claim-intel__overlaps">
              <li v-for="o in overlaps.slice(0, 5)" :key="o.name" class="claim-intel__overlap">
                <span class="claim-intel__kind" :style="{ background: kindColor(o.kind) }">{{ kindLabel(o.kind) }}</span>
                <span class="claim-intel__name">{{ o.name }}</span>
                <span v-if="o.distance_km" class="claim-intel__dist">{{ o.distance_km }}km</span>
              </li>
            </ul>
            <span v-if="overlaps.length > 5" class="claim-intel__more">+{{ overlaps.length - 5 }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { buildRareEarthPopupHTML } from '@/lib/map-utils'
import { useFocusTrap } from '@/composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
  claim: Record<string, unknown> | null
  context?: {
    suspicionScore: number
    suspicionFlags: string[]
    holderClaims: number
    holderAreaHa: number
  } | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const closeBtnRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const isActive = computed(() => props.visible)
useFocusTrap(overlayRef, { active: isActive })

const html = computed(() => {
  if (!props.claim) return ''
  return buildRareEarthPopupHTML(props.claim as { c?: string; ds?: number; a?: number; [key: string]: unknown })
})

const overlaps = computed(() => {
  const ov = props.claim?.ov
  if (!Array.isArray(ov)) return []
  return (ov as Array<Record<string, unknown>>)
    .filter(o => typeof o === 'object' && o !== null)
    .map(o => ({
      name: String(o.name ?? 'Unnamed territory'),
      kind: String(o.kind ?? 'unknown'),
      distance_km: Number(o.distance_km ?? 0),
    }))
})

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--danger)'
  if (score >= 6) return 'var(--warning)'
  return 'var(--success)'
}

function formatHa(ha: number): string {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${Math.round(ha)}`
}

function kindColor(kind: string): string {
  const k = kind.toLowerCase()
  if (k === 'ti' || k.includes('indigen')) return 'var(--danger)'
  if (k === 'quilombo' || k.includes('quilomb')) return 'var(--warning)'
  return 'var(--info)'
}

function kindLabel(kind: string): string {
  const k = kind.toLowerCase()
  if (k === 'ti' || k.includes('indigen')) return 'TI'
  if (k === 'quilombo' || k.includes('quilomb')) return 'QUILOMBO'
  return kind.toUpperCase().slice(0, 8)
}

function close() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) close()
}

watch(() => props.visible, (v) => {
  if (v) {
    nextTick(() => closeBtnRef.value?.focus() ?? overlayRef.value?.focus())
  }
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

</script>

<style scoped>
.claim-overlay-fixed {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow-y: auto;
}
.claim-overlay-close-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1001;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}
.claim-overlay-close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.claim-overlay-content {
  max-width: 34rem;
  width: 100%;
  max-height: min(90vh, 40rem);
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}
.claim-overlay-content :deep(.ree-popup-wrapper) {
  min-width: auto !important;
}
.claim-intel {
  margin: 0 14px 12px;
  padding: 10px 12px;
  background: rgba(231, 76, 60, 0.05);
  border: 1px solid rgba(231, 76, 60, 0.15);
  border-radius: 8px;
}
.claim-intel--territory {
  background: rgba(243, 156, 18, 0.05);
  border-color: rgba(243, 156, 18, 0.15);
}
.claim-intel__head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.claim-intel__score {
  display: inline-block;
  font-size: 12px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  color: #fff;
  font-family: ui-monospace, monospace;
  flex-shrink: 0;
}
.claim-intel__title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 11px;
  color: var(--text-primary);
}
.claim-intel__title strong {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--obs-red);
}
.claim-intel--territory .claim-intel__title strong { color: var(--obs-amber); }
.claim-intel__title span {
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}
.claim-intel__flags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.claim-intel__flag {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 3px;
  background: rgba(142, 68, 173, 0.15);
  color: var(--purple);
  letter-spacing: 0.03em;
}
.claim-intel__overlaps {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.claim-intel__overlap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-primary);
}
.claim-intel__kind {
  font-size: 8px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  color: #fff;
  flex-shrink: 0;
}
.claim-intel__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.claim-intel__dist { color: var(--text-muted); font-family: ui-monospace, monospace; font-size: 10px; }
.claim-intel__more { font-size: 10px; color: var(--text-muted); }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
