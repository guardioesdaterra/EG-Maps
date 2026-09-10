<template>
  <section class="map-runtime-error" role="alert" aria-live="assertive">
    <div class="map-runtime-error__icon" aria-hidden="true">!</div>
    <h1>Map unavailable</h1>
    <p>{{ message || 'The map could not finish loading. The rest of the application is still available.' }}</p>
    <div class="map-runtime-error__actions">
      <button type="button" @click="$emit('retry')">Try again</button>
      <button type="button" class="secondary" @click="reload">Reload page</button>
    </div>
    <small>Open the browser console and look for the <code>[EG Maps]</code> diagnostic entries.</small>
  </section>
</template>

<script setup lang="ts">
defineProps<{ message?: string }>()
defineEmits<{ retry: [] }>()

function reload() {
  if (typeof window !== 'undefined') window.location.reload()
}
</script>

<style scoped>
.map-runtime-error { display: flex; min-height: 100svh; align-items: center; justify-content: center; flex-direction: column; gap: .75rem; padding: 2rem; background: #07110d; color: #f4faf5; text-align: center; }
.map-runtime-error__icon { display: grid; width: 3rem; height: 3rem; place-items: center; border: 1px solid rgba(255,255,255,.35); border-radius: 50%; color: #f8c45c; font-size: 1.5rem; font-weight: 900; }
.map-runtime-error h1 { margin: 0; font-size: 1.4rem; }.map-runtime-error p { max-width: 34rem; margin: 0; color: rgba(244,250,245,.7); line-height: 1.5; }.map-runtime-error small { max-width: 36rem; color: rgba(244,250,245,.45); line-height: 1.4; }.map-runtime-error__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem; margin-top: .5rem; }.map-runtime-error button { min-height: 2.75rem; padding: .65rem 1rem; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; background: #f4faf5; color: #07110d; font-weight: 800; cursor: pointer; }.map-runtime-error button.secondary { background: transparent; color: #f4faf5; }
</style>
