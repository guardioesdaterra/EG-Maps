<template>
  <section class="map-runtime-error" role="region" aria-labelledby="map-runtime-error-title" tabindex="-1">
    <div class="map-runtime-error__icon" aria-hidden="true">!</div>
    <h1 id="map-runtime-error-title">{{ t('globe.unableToLoad') }}</h1>
    <p id="map-runtime-error-message" role="alert" aria-live="assertive">{{ message || t('globe.connectionError') }}</p>
    <div class="map-runtime-error__actions">
      <button type="button" @click="$emit('retry')">{{ t('globe.tryAgain') }}</button>
      <button type="button" class="secondary" @click="reload">{{ t('globe.reloadPage') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

function reload() {
  if (typeof window !== 'undefined') window.location.reload()
}
</script>

<style scoped>
.map-runtime-error { display: flex; min-height: 100svh; align-items: center; justify-content: center; flex-direction: column; gap: .75rem; padding: 2rem; background: #07110d; color: #f4faf5; text-align: center; outline: none; }
.map-runtime-error__icon { display: grid; width: 3rem; height: 3rem; place-items: center; border: 1px solid rgba(255,255,255,.35); border-radius: 50%; color: #f8c45c; font-size: 1.5rem; font-weight: 900; }
.map-runtime-error h1 { margin: 0; font-size: 1.4rem; }
.map-runtime-error p { max-width: 34rem; margin: 0; color: rgba(244,250,245,.7); line-height: 1.5; }
.map-runtime-error__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem; margin-top: .5rem; }
.map-runtime-error button { min-height: 2.75rem; padding: .65rem 1rem; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; background: #f4faf5; color: #07110d; font-weight: 800; cursor: pointer; }
.map-runtime-error button.secondary { background: transparent; color: #f4faf5; }
.map-runtime-error button:focus-visible { outline: 3px solid #7dd3fc; outline-offset: 3px; }
</style>
