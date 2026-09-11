<template>
  <nav class="pt" aria-label="Primary navigation">
    <div class="pt-inner">
      <NuxtLink to="/" class="pt-brand" aria-label="EG-Maps home">
        <img :src="`${baseURL}eg-logo.png`" alt="" class="pt-brand-img" />
        <span class="pt-brand-text">EG–Maps</span>
      </NuxtLink>
      <div class="pt-actions">
        <NuxtLink v-if="showBack" to="/" class="pt-link">
          <Icon name="lucide:arrow-left" class="h-3.5 w-3.5" />
          {{ t('nav.home') }}
        </NuxtLink>
        <NuxtLink to="/info" class="pt-link">
          <Icon name="lucide:info" class="h-3.5 w-3.5" />
          {{ t('nav.info') }}
        </NuxtLink>
        <button
          type="button"
          class="pt-icon-btn"
          :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
          @click="toggleDarkMode"
        >
          <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="h-4 w-4" />
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  showBack?: boolean
}>()

const { t } = useI18n()
const { isDark, toggle: toggleDarkMode } = useDarkMode()
const baseURL = useRuntimeConfig().app.baseURL
</script>

<style scoped>
.pt { border-bottom: 1px solid var(--border-color); }
.pt-inner {
  width: min(100% - 2rem, 80rem);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
}
.pt-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-primary);
  text-decoration: none;
}
.pt-brand-img { width: 1.75rem; height: 1.75rem; object-fit: contain; border-radius: 4px; }
.pt-brand-text {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.pt-actions { display: flex; align-items: center; gap: 0.5rem; }
.pt-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.7rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.pt-link:hover { background: var(--bg-secondary); color: var(--text-primary); }
.pt-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.pt-icon-btn:hover { background: var(--text-primary); color: var(--bg-primary); }

@media (max-width: 480px) {
  .pt-inner { padding: 0.65rem 0; }
  .pt-brand-text { display: none; }
}
</style>
