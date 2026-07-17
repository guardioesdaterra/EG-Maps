/**
 * components/ImportButton.vue
 * @why Floating action button (+) in the bottom-right corner that emits an open event to trigger the import modal. Styled with accent color and hover scale animation.
 */
<template>
  <button
    aria-label="Import custom data"
    class="fixed bottom-6 right-6 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
    @click="$emit('open')"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>
</template>
