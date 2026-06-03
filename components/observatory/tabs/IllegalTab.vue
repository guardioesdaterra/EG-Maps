<template>
  <div class="ree-tab">
    <ul class="ree-pattern-list" role="list">
      <li
        v-for="p in ILLEGAL_PATTERNS"
        :key="p.titleKey"
        class="ree-pattern"
        :style="{ borderLeftColor: p.color }"
      >
        <h4 class="ree-pattern__title" :style="{ color: p.color }">{{ t(p.titleKey) }}</h4>
        <p class="ree-pattern__body">{{ t(p.descKey) }}</p>
        <ul v-if="p.examples.length" class="ree-pattern__examples" role="list">
          <li v-for="(e, i) in p.examples" :key="i" class="ree-pattern__example">
            {{ t(e.key) }}
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ILLEGAL_PATTERNS } from '@/lib/observatory-tabs'
const { t } = useI18n()
</script>

<style scoped>
.ree-tab { display: flex; flex-direction: column; }
.ree-pattern-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ree-pattern {
  border-left: 3px solid;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 4px 4px 0;
}
.ree-pattern__title {
  margin: 0 0 3px;
  font-size: 11px;
  font-weight: 700;
}
.ree-pattern__body {
  margin: 0 0 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
}
.ree-pattern__examples {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ree-pattern__example {
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.45;
  padding-left: 10px;
  border-left: 2px solid rgba(255, 255, 255, 0.06);
  margin-top: 2px;
}
</style>
