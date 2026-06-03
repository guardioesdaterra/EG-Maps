<template>
  <div class="ree-tab">
    <h3 class="ree-tab__title">{{ t('observatory.timelinePanel.title') }}</h3>
    <ol class="ree-timeline" role="list">
      <li
        v-for="entry in TIMELINE_HIGHLIGHTS"
        :key="entry.year"
        class="ree-event"
        :class="{ 'ree-event--has-event': !!entry.event }"
      >
        <span class="ree-event__year">{{ entry.year }}</span>
        <div class="ree-event__content">
          <div class="ree-event__bar" :aria-hidden="true">
            <div
              class="ree-event__bar-fill"
              :style="{
                width: `${(entry.count / maxCount) * 100}%`,
                background: barColor(entry.count),
              }"
            />
          </div>
          <div class="ree-event__count">
            {{ t('observatory.timelinePanel.claims', { count: entry.count.toLocaleString() }) }}
            <span class="ree-event__cumulative">
              · {{ t('observatory.timelinePanel.cumulative', { count: cumulative(entry.year).toLocaleString() }) }}
            </span>
          </div>
          <p v-if="entry.event" class="ree-event__note">← {{ entry.event }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TIMELINE_HIGHLIGHTS } from '@/lib/observatory-tabs'

const { t } = useI18n()

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
  if (count > 2000) return '#c0392b'
  if (count > 800) return '#f39c12'
  return '#27ae60'
}
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; gap: 4px; }
.ree-tab__title {
  margin: 4px 0 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}
.ree-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ree-event {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 3px 0;
  font-size: 9px;
}
.ree-event--has-event { color: #e74c3c; }
.ree-event__year {
  width: 32px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}
.ree-event__content { flex: 1; min-width: 0; }
.ree-event__bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}
.ree-event__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.2s;
}
.ree-event__count {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 1px;
  font-variant-numeric: tabular-nums;
}
.ree-event__cumulative { color: rgba(255, 255, 255, 0.4); }
.ree-event__note {
  margin: 1px 0 0;
  font-size: 8.5px;
  color: #e74c3c;
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .ree-event__bar-fill { transition: none; }
}
</style>
