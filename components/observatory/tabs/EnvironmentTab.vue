<template>
  <div class="ree-tab">
    <h3 class="ree-tab__title">{{ t('observatory.envPanel.title') }}</h3>
    <ul class="ree-region-list" role="list">
      <li
        v-for="r in ENV_REGIONS"
        :key="r.regionKey"
        class="ree-region"
      >
        <button
          type="button"
          class="ree-region__btn"
          :disabled="!r.coord"
          :aria-label="t('observatory.envPanel.flyTo', { name: r.regionLabel })"
          :style="{ borderLeftColor: dangerColor(r.danger) }"
          @click="r.coord && $emit('fly-to-coord', r.coord)"
        >
          <div class="ree-region__head">
            <span class="ree-region__score" :style="{ color: dangerColor(r.danger) }">
              {{ r.danger.toFixed(1) }}
            </span>
            <span class="ree-region__name">{{ r.regionLabel }}</span>
          </div>
          <ul v-if="r.companies.length" class="ree-region__companies" role="list">
            <li v-for="c in r.companies" :key="c" class="ree-region__company">{{ c }}</li>
          </ul>
          <ul v-if="r.risks.length" class="ree-region__risks" role="list">
            <li v-for="(risk, i) in r.risks" :key="i" class="ree-region__risk">⚠ {{ risk }}</li>
          </ul>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ENV_REGIONS } from '@/lib/observatory-tabs'
const { t } = useI18n()

defineEmits<{
  'fly-to-coord': [coord: [number, number]]
}>()

function dangerColor(score: number) {
  if (score >= 8) return '#e74c3c'
  if (score >= 6) return '#f39c12'
  return '#27ae60'
}
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; gap: 6px; }
.ree-tab__title {
  margin: 4px 0 2px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}
.ree-region-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ree-region__btn {
  display: block;
  width: 100%;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left-width: 3px;
  border-radius: 4px;
  padding: 7px 9px;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
}
.ree-region__btn:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.06);
}
.ree-region__btn:focus-visible { outline: 2px solid #5dade2; outline-offset: 2px; }
.ree-region__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.ree-region__head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ree-region__score { font-size: 11px; font-weight: 800; }
.ree-region__name { font-size: 11px; font-weight: 600; color: #e8e8e8; }
.ree-region__companies {
  list-style: none;
  margin: 3px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.ree-region__company {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  background: rgba(93, 173, 226, 0.18);
  color: #5dade2;
}
.ree-region__risks {
  list-style: none;
  margin: 3px 0 0;
  padding: 0;
}
.ree-region__risk {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.4;
  margin-top: 1px;
}
</style>
