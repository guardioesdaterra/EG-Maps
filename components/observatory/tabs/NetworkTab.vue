<template>
  <div class="ree-tab">
    <p class="ree-tab__hint">{{ t('observatory.network.clickHint') }}</p>
    <ul class="ree-network-list" role="list">
      <li
        v-for="n in NETWORK_NOTES"
        :key="n.titleKey"
        class="ree-network"
        :style="{ borderLeftColor: n.color }"
      >
        <h4 class="ree-network__title" :style="{ color: n.color }">{{ t(n.titleKey) }}</h4>
        <p class="ree-network__body">{{ t(n.bodyKey) }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { NETWORK_NOTES } from '@/lib/observatory-tabs'
const { t } = useI18n()
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; gap: 8px; }
.ree-tab__hint {
  margin: 0;
  font-size: 9px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
.ree-network-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ree-network {
  border-left: 3px solid;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 4px 4px 0;
}
.ree-network__title {
  margin: 0 0 3px;
  font-size: 11px;
  font-weight: 700;
}
.ree-network__body {
  margin: 0;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}
</style>
