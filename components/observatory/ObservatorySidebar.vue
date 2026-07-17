/**
 * components/observatory/ObservatorySidebar.vue
 * @why Sidebar for vulcan observatory — search, filters, phase selection, results list
 * @component ObservatorySidebar
 * @props activeTab: string | null
  dangerItems
 * @emits 'update:activeTab': [tab: ObservatoryTab['key']]
  'update:showAll': [v: boolean]
  'fly-to-enterprise': [name: string]
  'fly-to-coord': [coord: [number, number]]
 * @deps vue (computed, onMounted, ref, watch); @/lib/observatory-tabs (OBSERVATORY_TABS, type ObservatoryTab); @/composables/useUrlState (useUrlState); @/composables/useFocusTrap (useFocusTrap); @/composables/useObservatorySelection (useObservatorySelection)
 */
<template>
  <section
    class="obs-sidebar"
    :class="['obs-sidebar--' + (activeTab ?? 'none'), collapsed ? 'is-collapsed' : '']"
    role="region"
    :aria-label="t('observatory.sidebarLabel')"
  >
    
    <Transition name="obs-strip">
      <nav v-if="collapsed" class="obs-tabstrip" :aria-label="t('observatory.sidebarLabel')">
        <button
          v-for="tb in tabs"
          :key="tb.key"
          type="button"
          class="obs-tabstrip__btn"
          :title="t(tb.labelKey)"
          :aria-label="t(tb.labelKey)"
          :aria-pressed="activeTab === tb.key"
          @click="onTabClick(tb.key)"
        >
          <span class="obs-tabstrip__icon" aria-hidden="true">{{ tb.icon }}</span>
        </button>
        <button
          type="button"
          class="obs-tabstrip__btn obs-tabstrip__btn--expand"
          :aria-label="t('observatory.sidebarExpand')"
          @click="collapsed = false"
        >
          <span aria-hidden="true">»</span>
        </button>
      </nav>
    </Transition>

    
    <Transition name="obs-panel">
      <div v-if="!collapsed" class="obs-panel" ref="panelEl" :aria-hidden="false">
        <header class="obs-panel__head">
          <div class="obs-panel__tabs" role="tablist" :aria-label="t('observatory.sidebarLabel')">
            <button
              v-for="tb in tabs"
              :key="tb.key"
              type="button"
              role="tab"
              class="obs-panel__tab"
              :class="{ 'is-active': activeTab === tb.key }"
              :aria-selected="activeTab === tb.key"
              :tabindex="activeTab === tb.key ? 0 : -1"
              @click="onTabClick(tb.key)"
              @keydown="onTabKeydown($event, tb.key)"
            >
              <span class="obs-panel__tab-icon" aria-hidden="true">{{ tb.icon }}</span>
              <span class="obs-panel__tab-label">{{ t(tb.labelKey) }}</span>
            </button>
          </div>
          <button
            type="button"
            class="obs-panel__collapse"
            :aria-label="t('observatory.sidebarCollapse')"
            @click="collapsed = true"
          >
            «
          </button>
        </header>

        <div class="obs-panel__body" :key="activeTab ?? 'none'">
          <DangerTab
            v-if="activeTab === 'danger'"
            :items="dangerItems"
            :show-all="showAll"
            :highlight="tabHighlight"
            @fly-to-enterprise="onFlyToEnterprise"
            @update:highlight="onHighlight"
            @report-enterprise="onReportEnterprise"
          />
          <MilitaryTab
            v-else-if="activeTab === 'military'"
            :highlight="tabHighlight"
            @update:highlight="onHighlight"
          />
          <IllegalTab
            v-else-if="activeTab === 'illegal'"
            :highlight="tabHighlight"
            @update:highlight="onHighlight"
            @report-pattern="onReportPattern"
          />
          <EnvironmentTab
            v-else-if="activeTab === 'env'"
            :highlight="tabHighlight"
            @fly-to-coord="onFlyToCoord"
            @update:highlight="onHighlight"
            @add-observation="onAddObservation"
          />
          <NetworkTab
            v-else-if="activeTab === 'network'"
            :highlight="tabHighlight"
            @update:highlight="onHighlight"
          />
          <TimelineTab v-else-if="activeTab === 'timeline'" />
          <div v-else class="obs-panel__empty">
            {{ t('observatory.selectTab') }}
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { OBSERVATORY_TABS, type ObservatoryTab } from '@/lib/observatory-tabs'
import type { SpeculatorIndexEntry } from '@/lib/observatory-analysis'
import { useUrlState } from '@/composables/useUrlState'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useObservatorySelection } from '@/composables/useObservatorySelection'

import DangerTab from '@/components/observatory/tabs/DangerTab.vue'
import MilitaryTab from '@/components/observatory/tabs/MilitaryTab.vue'
import IllegalTab from '@/components/observatory/tabs/IllegalTab.vue'
import EnvironmentTab from '@/components/observatory/tabs/EnvironmentTab.vue'
import NetworkTab from '@/components/observatory/tabs/NetworkTab.vue'
import TimelineTab from '@/components/observatory/tabs/TimelineTab.vue'

const { t } = useI18n()

type DangerItem = SpeculatorIndexEntry

const props = defineProps<{
  activeTab: string | null
  dangerItems: DangerItem[]
  showAll?: boolean
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: ObservatoryTab['key']]
  'update:showAll': [v: boolean]
  'fly-to-enterprise': [name: string]
  'fly-to-coord': [coord: [number, number]]
}>()

const tabs: ObservatoryTab[] = OBSERVATORY_TABS
const collapsed = ref(true)

const urlState = useUrlState<{ tab: string; feature: string | null; showAll: string | null }>('obs', {
  tab: '',
  feature: null,
  showAll: null,
})

onMounted(() => {
  if (urlState.state.value.tab && urlState.state.value.tab !== props.activeTab) {
    emit('update:activeTab', urlState.state.value.tab as ObservatoryTab['key'])
  }
})

watch(() => props.activeTab, (v) => {
  if (v) urlState.set('tab', v)
  else urlState.set('tab', '')
})

watch(() => props.showAll, (v) => {
  urlState.set('showAll', v ? '1' : null)
})

const obsSel = useObservatorySelection()
watch(() => obsSel.selection.value.tab, (tab) => {
  if (tab) {
    collapsed.value = false
    emit('update:activeTab', tab)
  }
})

const tabHighlight = ref<string | null>(null)

function onHighlight(name: string | null) {
  tabHighlight.value = name
  obsSel.highlightedFeature.value = name
}

function onTabClick(key: ObservatoryTab['key']) {
  onHighlight(null)
  emit('update:activeTab', key)
}

function onTabKeydown(e: KeyboardEvent, key: ObservatoryTab['key']) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const idx = tabs.findIndex(tb => tb.key === key)
    if (idx < 0) return
    const next = e.key === 'ArrowRight'
      ? tabs[(idx + 1) % tabs.length]
      : tabs[(idx - 1 + tabs.length) % tabs.length]
    onHighlight(null)
    emit('update:activeTab', next.key)
  }
}

function onFlyToEnterprise(name: string) {
  urlState.set('feature', name)
  emit('fly-to-enterprise', name)
}

function onFlyToCoord(coord: [number, number]) {
  emit('fly-to-coord', coord)
}

function onReportEnterprise(name: string, score: number, flags: string[]) {
  const subject = encodeURIComponent(`[Observatory Report] Suspicious enterprise: ${name}`)
  const body = encodeURIComponent(
    `Enterprise: ${name}\nSuspicion Score: ${score}\nFlags: ${flags.join(', ')}\n\n---\nReported via Earth Guardians Observatory`
  )
  window.open(`mailto:observatory@earthguardians.org?subject=${subject}&body=${body}`, '_blank')
}

function onReportPattern(key: string) {
  const subject = encodeURIComponent(`[Observatory Report] Illegal pattern: ${key}`)
  const body = encodeURIComponent(
    `Pattern: ${key}\n\n---\nReported via Earth Guardians Observatory`
  )
  window.open(`mailto:observatory@earthguardians.org?subject=${subject}&body=${body}`, '_blank')
}

function onAddObservation(region: string) {
  const subject = encodeURIComponent(`[Field Observation] Region: ${region}`)
  const body = encodeURIComponent(
    `Region: ${region}\n\nObservation:\n\n---\nSubmitted via Earth Guardians Observatory`
  )
  window.open(`mailto:observatory@earthguardians.org?subject=${subject}&body=${body}`, '_blank')
}

const panelEl = ref<HTMLElement | null>(null)
useFocusTrap(panelEl, { active: computed(() => !collapsed.value && !!props.activeTab) })

</script>

<style scoped>
.obs-sidebar {
  position: absolute;
  z-index: 500;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.obs-tabstrip {
  display: flex;
  flex-direction: column;
  gap: clamp(3px, 0.5vw, 4px);
  padding: clamp(3px, 0.5vw, 4px);
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

.obs-tabstrip__btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.obs-tabstrip__btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
  transform: scale(1.08);
}

.obs-tabstrip__btn[aria-pressed="true"] {
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.4);
  color: #fff;
  box-shadow: 0 0 12px rgba(231, 76, 60, 0.15);
}

.obs-tabstrip__btn--expand {
  margin-top: clamp(3px, 0.5vw, 4px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 768px) {
  .obs-tabstrip {
    gap: clamp(1px, 0.5vw, 2px);
    padding: clamp(2px, 0.5vw, 3px);
    border-radius: 8px;
  }
  .obs-tabstrip__btn {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.875rem;
  }
}

.obs-panel {
  display: flex;
  flex-direction: column;
  width: clamp(18rem, 22vw, 21rem);
  max-height: calc(100vh - 10rem);
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
}

@media (max-width: 768px) {
  .obs-panel {
    width: min(280px, calc(100vw - 3rem));
    max-height: calc(100svh - 8rem);
  }
}

.obs-panel__head {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.obs-panel__tabs {
  display: flex;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}
.obs-panel__tabs::-webkit-scrollbar { display: none; }

.obs-panel__tab {
  display: flex;
  align-items: center;
  gap: clamp(3px, 0.5vw, 4px);
  padding: clamp(8px, 1.5vw, 12px) clamp(8px, 1.5vw, 12px);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: clamp(10px, 1.5vw, 13px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s ease;
  position: relative;
}

.obs-panel__tab:hover {
  color: #fafafa;
  background: rgba(255, 255, 255, 0.04);
}

.obs-panel__tab.is-active {
  color: #fff;
  border-bottom-color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
}

.obs-panel__tab.is-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #e74c3c;
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.4);
}

.obs-panel__tab-icon { font-size: clamp(12px, 1.8vw, 15px); }
.obs-panel__tab-label { font-size: clamp(10px, 1.5vw, 13px); }

@media (max-width: 768px) {
  .obs-panel__tab {
    padding: clamp(6px, 1.5vw, 10px) clamp(4px, 1vw, 8px);
    font-size: clamp(9px, 1.4vw, 12px);
    gap: clamp(1px, 0.5vw, 2px);
  }
  .obs-panel__tab-icon {
    font-size: clamp(10px, 1.5vw, 13px);
  }
}

.obs-panel__collapse {
  padding: 0 clamp(8px, 1.5vw, 14px);
  background: transparent;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.45);
  font-size: clamp(14px, 2vw, 18px);
  cursor: pointer;
  font-family: inherit;
  height: 100%;
  align-self: stretch;
  transition: all 0.15s ease;
}

.obs-panel__collapse:hover { color: #fafafa; background: rgba(255, 255, 255, 0.04); }

.obs-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: clamp(4px, 1vw, 8px);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.obs-panel__body::-webkit-scrollbar { width: 4px; }
.obs-panel__body::-webkit-scrollbar-track { background: transparent; }
.obs-panel__body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

@media (max-width: 768px) {
  .obs-panel__body {
    padding: clamp(3px, 0.5vw, 4px);
  }
}

.obs-panel__empty {
  padding: clamp(16px, 2vw, 28px) clamp(12px, 1.5vw, 20px);
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: clamp(12px, 1.8vw, 15px);
}

.obs-strip-enter-active,
.obs-strip-leave-active {
  transition: all 0.2s ease;
}
.obs-strip-enter-from,
.obs-strip-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.obs-panel-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.obs-panel-leave-active {
  transition: all 0.15s ease;
}
.obs-panel-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.98);
}
.obs-panel-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

@media (prefers-reduced-motion: reduce) {
  .obs-panel__tab, .obs-tabstrip__btn, .obs-panel__collapse { transition: none; }
  .obs-panel__tab:hover { transform: none; }
  .obs-tabstrip__btn:hover { transform: none; }
  .obs-strip-enter-active, .obs-strip-leave-active,
  .obs-panel-enter-active, .obs-panel-leave-active { transition: none; }
}
</style>
