<template>
  <section
    v-show="!collapsed"
    class="obs-sidebar"
    :class="['obs-sidebar--' + (activeTab ?? 'none'), collapsed ? 'is-collapsed' : '']"
    role="region"
    :aria-label="t('observatory.sidebarLabel')"
  >
    <!-- Collapsed tab strip -->
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

    <!-- Expanded panel -->
    <div v-else class="obs-panel" :aria-hidden="false">
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
          @fly-to-enterprise="onFlyToEnterprise"
        />
        <MilitaryTab v-else-if="activeTab === 'military'" />
        <IllegalTab v-else-if="activeTab === 'illegal'" />
        <EnvironmentTab
          v-else-if="activeTab === 'env'"
          @fly-to-coord="onFlyToCoord"
        />
        <NetworkTab v-else-if="activeTab === 'network'" />
        <TimelineTab v-else-if="activeTab === 'timeline'" />
        <div v-else class="obs-panel__empty">
          {{ t('observatory.selectTab') }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { OBSERVATORY_TABS, type ObservatoryTab } from '@/lib/observatory-tabs'
import type { SpeculatorIndexEntry } from '@/lib/observatory-analysis'
import { useUrlState } from '@/composables/useUrlState'
import { useFocusTrap } from '@/composables/useFocusTrap'

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
const collapsed = ref(false)

// URL state sync for active tab + selected feature
const urlState = useUrlState<{ tab: string; feature: string | null; showAll: string | null }>('obs', {
  tab: '',
  feature: null,
  showAll: null,
})

onMounted(() => {
  // If URL has a tab, sync to parent
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

function onTabClick(key: ObservatoryTab['key']) {
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

// Focus trap when expanded
const panelEl = ref<HTMLElement | null>(null)
// useFocusTrap is registered on the panel
const _trap = useFocusTrap(panelEl, { active: computed(() => !collapsed.value && !!props.activeTab) })
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
  gap: 4px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}
.obs-tabstrip__btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s, color 0.1s;
}
.obs-tabstrip__btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fafafa;
}
.obs-tabstrip__btn[aria-pressed="true"] {
  background: rgba(231, 76, 60, 0.2);
  border-color: rgba(231, 76, 60, 0.4);
  color: #fff;
}
.obs-tabstrip__btn--expand {
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.obs-panel {
  display: flex;
  flex-direction: column;
  width: 340px;
  max-height: calc(100vh - 12rem);
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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
  gap: 4px;
  padding: 10px 10px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: color 0.1s, border-color 0.1s, background 0.1s;
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
.obs-panel__tab-icon { font-size: 12px; }
.obs-panel__tab-label { font-size: 10px; }

.obs-panel__collapse {
  padding: 0 12px;
  background: transparent;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  height: 100%;
  align-self: stretch;
}
.obs-panel__collapse:hover { color: #fafafa; background: rgba(255, 255, 255, 0.04); }

.obs-panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.obs-panel__empty {
  padding: 24px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .obs-panel__tab, .obs-tabstrip__btn, .obs-panel__collapse { transition: none; }
}
</style>
