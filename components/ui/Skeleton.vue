<script setup lang="ts">
interface Props {
  /** Width as a CSS unit (e.g. '100%', '8rem', '4.5rem') */
  width?: string
  /** Height as a CSS unit */
  height?: string
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  /** Optional accessible label (defaults to "Loading") */
  label?: string
}

withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '1rem',
  rounded: 'md',
  label: 'Loading…',
})
</script>

<template>
  <span
    :class="['skeleton', `skeleton--${rounded}`]"
    :style="{ width, height }"
    role="status"
    :aria-label="label"
  />
</template>

<style scoped>
.skeleton {
  display: inline-block;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.12) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  vertical-align: middle;
}
.skeleton--none { border-radius: 0; }
.skeleton--sm { border-radius: 4px; }
.skeleton--md { border-radius: 6px; }
.skeleton--lg { border-radius: 12px; }
.skeleton--full { border-radius: 9999px; }

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; background: rgba(255, 255, 255, 0.08); }
}
</style>
