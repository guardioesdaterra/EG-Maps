<template>
  <div class="ree-tab">
    <div class="ree-tab__head">
      <h3 class="ree-tab__title">{{ t('observatory.dangerPanel.title') }}</h3>
      <button
        v-if="items.length > 20"
        type="button"
        class="ree-tab__toggle"
        @click="$emit('update:showAll', !showAll)"
      >
        {{ showAll
          ? t('observatory.dangerPanel.showLess')
          : t('observatory.dangerPanel.showAll', { count: items.length })
        }}
      </button>
    </div>

    <div v-if="items.length === 0" class="ree-tab__empty">
      {{ t('observatory.dangerPanel.empty') }}
    </div>

    <ol v-else class="ree-tab__list" role="list">
      <li
        v-for="d in pagedItems"
        :key="d.normalizedName"
        class="ree-card"
      >
        <button
          type="button"
          class="ree-card__btn"
          :aria-label="t('observatory.dangerPanel.flyTo', { name: d.displayName })"
          @click="$emit('fly-to-enterprise', d.displayName)"
        >
          <div class="ree-card__head">
            <span class="ree-card__rank">#{{ d.count }}</span>
            <span
              class="ree-card__score"
              :style="{ background: dangerColor(d.suspicionScore) }"
            >{{ d.suspicionScore.toFixed(1) }}</span>
            <span class="ree-card__name" :title="d.displayName">{{ d.displayName }}</span>
            <span
              v-if="d.suspicionFlags?.length"
              class="ree-card__flags"
              :title="d.suspicionFlags.join(', ')"
            >{{ d.suspicionFlags.length }}!</span>
          </div>
          <div class="ree-card__bar" :aria-hidden="true">
            <div
              class="ree-card__bar-fill"
              :style="{
                width: `${d.suspicionScore * 10}%`,
                background: dangerColor(d.suspicionScore),
              }"
            />
          </div>
          <div class="ree-card__meta">
            <span><strong>{{ d.count }}</strong> {{ t('observatory.dangerPanel.processes') }}</span>
            <span>{{ formatArea(d.totalAreaHa) }} ha</span>
            <span v-if="d.ufs.length" class="ree-card__ufs">{{ d.ufs.slice(0, 4).join(' · ') }}</span>
          </div>
          <div v-if="d.subs?.length" class="ree-card__subs">
            {{ d.subs.slice(0, 4).join(' · ') }}
          </div>
        </button>
      </li>
    </ol>

    <nav v-if="showAll && totalPages > 1" class="ree-pager" :aria-label="t('observatory.dangerPanel.pager')">
      <button
        type="button"
        class="ree-pager__btn"
        :disabled="page === 1"
        :aria-label="t('observatory.dangerPanel.prevPage')"
        @click="page--"
      >←</button>
      <span class="ree-pager__info">{{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="ree-pager__btn"
        :disabled="page >= totalPages"
        :aria-label="t('observatory.dangerPanel.nextPage')"
        @click="page++"
      >→</button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SpeculatorIndexEntry } from '@/lib/observatory-analysis'

const { t } = useI18n()

const props = defineProps<{
  items: SpeculatorIndexEntry[]
  showAll: boolean
}>()

defineEmits<{
  'fly-to-enterprise': [name: string]
  'update:showAll': [v: boolean]
}>()

const page = ref(1)
const pageSize = 20

watch(() => props.showAll, () => { page.value = 1 })
watch(() => props.items, () => { page.value = 1 })

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    if (b.suspicionScore !== a.suspicionScore) return b.suspicionScore - a.suspicionScore
    return b.totalAreaHa - a.totalAreaHa
  })
})

const pagedItems = computed(() => {
  if (!props.showAll) return sortedItems.value.slice(0, 20)
  const start = (page.value - 1) * pageSize
  return sortedItems.value.slice(start, start + pageSize)
})

const totalPages = computed(() => Math.max(1, Math.ceil(sortedItems.value.length / pageSize)))

function dangerColor(score: number) {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}

function formatArea(ha: number) {
  if (ha >= 1_000_000) return `${(ha / 1_000_000).toFixed(1)}M`
  if (ha >= 1000) return `${Math.round(ha / 1000)}K`
  return `${ha}`
}
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; gap: 6px; }
.ree-tab__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 6px;
}
.ree-tab__title {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}
.ree-tab__toggle {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
}
.ree-tab__toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.ree-tab__empty {
  padding: 24px 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.ree-tab__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ree-card__btn {
  display: block;
  width: 100%;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 7px 9px;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: background 0.1s, border-color 0.1s;
}
.ree-card__btn:hover {
  background: rgba(231, 76, 60, 0.06);
  border-color: rgba(231, 76, 60, 0.25);
}
.ree-card__btn:focus-visible {
  outline: 2px solid #5dade2;
  outline-offset: 2px;
}

.ree-card__head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ree-card__rank {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 700;
  text-transform: uppercase;
}
.ree-card__score {
  display: inline-block;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  color: #fff;
}
.ree-card__name {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: #e8e8e8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.ree-card__flags {
  font-size: 8px;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(93, 173, 226, 0.18);
  color: #5dade2;
}

.ree-card__bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
  margin: 5px 0;
}
.ree-card__bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s;
}

.ree-card__meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}
.ree-card__ufs { color: rgba(255, 255, 255, 0.4); }

.ree-card__subs {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 3px;
  line-height: 1.35;
}

.ree-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0 0;
}
.ree-pager__btn {
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.ree-pager__btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.15);
  border-color: #e74c3c;
}
.ree-pager__btn:disabled { opacity: 0.3; cursor: not-allowed; }
.ree-pager__info {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

@media (prefers-reduced-motion: reduce) {
  .ree-card__btn, .ree-card__bar-fill, .ree-pager__btn { transition: none; }
}
</style>
