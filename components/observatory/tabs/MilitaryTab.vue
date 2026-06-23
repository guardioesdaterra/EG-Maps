<template>
  <div class="ree-tab">
    <div class="ree-callout">
      <h3 class="ree-callout__title">{{ t('observatory.military.headline') }}</h3>
      <p class="ree-callout__body">{{ t('observatory.military.headlineBody') }}</p>
    </div>

    <h4 class="ree-section-title">{{ t('observatory.military.dodTitle') }}</h4>
    <ul class="ree-asset-list" role="list">
      <li
        v-for="m in MILITARY_ASSETS"
        :key="m.name"
        class="ree-asset"
        style="border-left-color: #e74c3c"
      >
        <div class="ree-asset__head">
          <span class="ree-asset__flag" aria-hidden="true">{{ m.flag }}</span>
          <span class="ree-asset__name">{{ m.name }}</span>
          <span v-if="m.kgPerUnit" class="ree-asset__kg">
            {{ t('observatory.military.kgPerUnit', { kg: m.kgPerUnit.toLocaleString() }) }}
          </span>
        </div>
        <p class="ree-asset__body">{{ m.description }}</p>
      </li>
    </ul>

    <h4 class="ree-section-title">{{ t('observatory.military.stateDeptTitle') }}</h4>
    <ul class="ree-asset-list" role="list">
      <li
        v-for="(i, idx) in US_INVESTMENTS"
        :key="idx"
        class="ree-asset"
        style="border-left-color: #f39c12"
      >
        <div class="ree-asset__head">
          <span class="ree-asset__name">{{ i.from }} → {{ i.to }}</span>
          <span class="ree-asset__kg">{{ i.amount }}</span>
        </div>
        <p class="ree-asset__body">{{ i.year }}</p>
      </li>
    </ul>

    <div class="ree-callout ree-callout--warn">
      <h3 class="ree-callout__title">{{ t('observatory.military.chinaBanTitle') }}</h3>
      <p class="ree-callout__body">{{ t('observatory.military.chinaBanBody') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MILITARY_ASSETS, US_INVESTMENTS } from '@/lib/observatory-tabs'
const { t } = useI18n()
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; gap: 8px; }

.ree-callout {
  border-left: 3px solid #e74c3c;
  padding: 10px 12px;
  background: rgba(231, 76, 60, 0.06);
  border-radius: 0 6px 6px 0;
}
.ree-callout--warn {
  border-left-color: #f39c12;
  background: rgba(243, 156, 18, 0.06);
}
.ree-callout__title {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  color: #e74c3c;
}
.ree-callout--warn .ree-callout__title { color: #f39c12; }
.ree-callout__body {
  margin: 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}

.ree-section-title {
  margin: 8px 0 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.ree-asset-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ree-asset {
  border-left: 3px solid;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 4px 4px 0;
}
.ree-asset__head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.ree-asset__flag { font-size: 12px; }
.ree-asset__name {
  font-weight: 600;
  font-size: 11px;
  color: #e8e8e8;
  flex: 1;
  min-width: 0;
}
.ree-asset__kg {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 2px;
  background: rgba(231, 76, 60, 0.18);
  color: #e74c3c;
  white-space: nowrap;
}
.ree-asset__body {
  margin: 3px 0 0;
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.45;
}
</style>
