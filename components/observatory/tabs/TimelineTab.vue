/**
 * components/observatory/tabs/TimelineTab.vue
 * @why Chronological timeline tab — ordered events with date filtering
 * @component TimelineTab
 * @deps vue (computed, ref); @/lib/observatory-tabs (TIMELINE_HIGHLIGHTS)
 */
<template>
  <div class="obs-tab">
    <h3 class="obs-tab__title">
      <Icon name="lucide:bar-chart-3" class="obs-tab__title-icon" />
      {{ t('observatory.timelinePanel.title') }}
    </h3>

    
    <div class="obs-expand">
      <button
        type="button"
        class="obs-expand__btn"
        :aria-expanded="narrativeOpen"
        @click="narrativeOpen = !narrativeOpen"
      >
        <Icon :name="narrativeOpen ? 'lucide:chevron-down' : 'lucide:book-open'" class="obs-expand__icon" />
        {{ narrativeOpen ? t('observatory.timelinePanel.hideStory') : t('observatory.timelinePanel.readStory') }}
      </button>
      <Transition name="obs-fade">
        <div v-if="narrativeOpen" class="obs-expand__body obs-expand__body--narrative">
          <p><strong>{{ TIMELINE_HIGHLIGHTS[0].year }}</strong> — {{ t('observatory.timelinePanel.narrativeStart') }}</p>
          <p><strong>2010</strong> — {{ t('observatory.timelinePanel.narrative2010') }}</p>
          <p><strong>2017–2019</strong> — {{ t('observatory.timelinePanel.narrative2017') }}</p>
          <p><strong>2021–2023</strong> — {{ t('observatory.timelinePanel.narrative2021') }}</p>
          <p><strong>2024–2026</strong> — {{ t('observatory.timelinePanel.narrative2024') }}</p>
        </div>
      </Transition>
    </div>

    <ol class="obs-timeline" role="list">
      <li
        v-for="entry in TIMELINE_HIGHLIGHTS"
        :key="entry.year"
        class="obs-timeline__event"
        :class="{
          'obs-timeline__event--milestone': !!entry.event,
          'obs-timeline__event--peak': entry.count > 2000,
        }"
      >
        <span class="obs-timeline__year">{{ entry.year }}</span>
        <div class="obs-timeline__content">
          <div class="obs-timeline__bar-track" :aria-hidden="true">
            <div
              class="obs-timeline__bar-fill"
              :style="{
                width: `${(entry.count / maxCount) * 100}%`,
                background: barColor(entry.count),
              }"
            />
          </div>
          <div class="obs-timeline__meta">
            <span class="obs-timeline__count" :style="{ color: barColor(entry.count) }">
              {{ entry.count.toLocaleString() }}
              <span class="obs-timeline__count-label">{{ t('observatory.timelinePanel.claims') }}</span>
            </span>
            <span class="obs-timeline__cumulative">
              <Icon name="lucide:trending-up" class="obs-timeline__cumulative-icon" />
              {{ cumulative(entry.year).toLocaleString() }}
              <span class="obs-timeline__cumulative-label">{{ t('observatory.timelinePanel.total') }}</span>
            </span>
          </div>
          <div v-if="entry.event" class="obs-timeline__event-badge">
            <Icon name="lucide:sparkles" class="obs-timeline__event-icon" />
            <span>{{ entry.event }}</span>
          </div>
        </div>
      </li>
    </ol>

    <div class="obs-timeline__footer">
      <Icon name="lucide:info" class="obs-timeline__footer-icon" />
      {{ t('observatory.timelinePanel.footer') }}
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue'
import { TIMELINE_HIGHLIGHTS } from '@/lib/observatory-tabs'

const { t } = useI18n()

const narrativeOpen = ref(false)

const maxCount = computed(() => Math.max(...TIMELINE_HIGHLIGHTS.map(e => e.count), 1))

const cumMap = computed(() => {
  const m: Record<number, number> = {}
  let cum = 0
  for (const e of TIMELINE_HIGHLIGHTS) {
    cum += e.count
    m[e.year] = cum
  }
  return m
})

function cumulative(year: number) { return cumMap.value[year] ?? 0 }

function barColor(count: number) {
  if (count > 2000) return 'var(--danger)'
  if (count > 800) return 'var(--warning)'
  return 'var(--success)'
}

</script>

<style scoped>
.obs-tab { display: flex; flex-direction: column; gap: 4px; }

.obs-tab__title {
  margin: 0; display: flex; align-items: center; gap: 6px;
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--obs-text-label);
  padding: 4px 4px 2px;
}

.obs-tab__title-icon { width: 12px; height: 12px; color: var(--obs-blue); }

.obs-expand { margin: 0 2px; }

.obs-expand__btn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: clamp(8px, 1.3vw, 11px); font-weight: 600; color: var(--obs-text-dim);
  background: none; border: none; cursor: pointer; font-family: inherit;
  padding: 3px clamp(4px, 1vw, 8px); border-radius: 3px;
  transition: color 0.12s, background 0.12s;
}

.obs-expand__btn:hover { color: var(--obs-text-body); background: rgba(255,255,255,0.03); }

.obs-expand__icon { width: 10px; height: 10px; }

.obs-expand__body {
  font-size: clamp(9px, 1.4vw, 12px); color: var(--obs-text-body); line-height: 1.5;
  padding: clamp(4px, 1vw, 8px) clamp(6px, 1.2vw, 12px); margin-top: 2px;
  background: rgba(255,255,255,0.02); border-radius: 5px;
  border: 1px solid var(--obs-panel-border);
}

.obs-expand__body--narrative p { margin: 0 0 4px; }
.obs-expand__body--narrative p:last-child { margin: 0; }

.obs-timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }

.obs-timeline__event {
  display: flex; gap: clamp(6px, 1.2vw, 14px); align-items: flex-start;
  padding: 4px 4px; border-radius: 5px;
  transition: background 0.12s;
}

.obs-timeline__event:hover { background: rgba(255,255,255,0.02); }

.obs-timeline__event--milestone {
  background: rgba(231,76,60,0.04);
  border-left: 2px solid rgba(231,76,60,0.25);
  border-radius: 0 5px 5px 0;
}

.obs-timeline__event--peak {  }

.obs-timeline__year {
  width: clamp(28px, 5vw, 40px); flex-shrink: 0;
  font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; font-family: ui-monospace, monospace;
  color: var(--obs-text-muted); padding-top: 1px;
}

.obs-timeline__event--milestone .obs-timeline__year { color: var(--obs-red); }

.obs-timeline__content { flex: 1; min-width: 0; }

.obs-timeline__bar-track { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }

.obs-timeline__bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }

.obs-timeline__meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }

.obs-timeline__count { font-size: clamp(9px, 1.4vw, 12px); font-weight: 700; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }

.obs-timeline__count-label { font-size: clamp(7px, 1.2vw, 10px); font-weight: 600; color: var(--obs-text-dim); margin-left: 2px; }

.obs-timeline__cumulative { display: inline-flex; align-items: center; gap: 3px; font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }

.obs-timeline__cumulative-icon { width: 7px; height: 7px; }

.obs-timeline__cumulative-label { font-size: clamp(7px, 1.2vw, 10px); color: var(--obs-text-dim); margin-left: 1px; }

.obs-timeline__event-badge {
  display: flex; align-items: flex-start; gap: 4px;
  margin-top: 3px; padding: 3px clamp(4px, 1vw, 8px); border-radius: 4px;
  background: rgba(231,76,60,0.07);
  border: 1px solid rgba(231,76,60,0.12);
  font-size: clamp(8px, 1.3vw, 11px); line-height: 1.4; color: var(--obs-red);
}

.obs-timeline__event-icon { width: 8px; height: 8px; margin-top: 1px; flex-shrink: 0; color: var(--obs-amber); }

.obs-timeline__footer {
  display: flex; align-items: center; gap: 4px;
  font-size: clamp(8px, 1.3vw, 11px); color: var(--obs-text-dim); font-style: italic;
  padding: clamp(4px, 1vw, 8px) 4px 2px; text-align: center; justify-content: center;
}

.obs-timeline__footer-icon { width: 9px; height: 9px; }

.obs-fade-enter-active, .obs-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.obs-fade-enter-from, .obs-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@media (prefers-reduced-motion: reduce) {
  .obs-timeline__bar-fill { transition: none; }
  .obs-fade-enter-active, .obs-fade-leave-active { transition: none; }
}
</style>
