/**
 * app.vue
 * @why Root Vue app component — mounts the Nuxt layout and global providers
 * @component app
 * @deps vue (computed, onMounted, watch); @/composables/useI18n (useI18n); vue-router (useRoute)
 */
<template>
  <div>
    <ClientOnly>
      <DarkVeil class="z-0 pointer-events-none" :resolution-scale="0.5" :opacity="veilOpacity" />
    </ClientOnly>
    <a href="#main-content" class="skip-link">{{ skipLabel }}</a>
    <NuxtLayout>
      <div class="relative z-10">
        <NuxtPage />
      </div>
    </NuxtLayout>
    <ClientOnly>
      <ToastHost position="bottom-right" />
      <CommandPalette />
      <KeyboardShortcuts />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">

import { computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const { isDark, init: initDarkMode } = useDarkMode()
const skipLabel = computed(() => t('a11y.skipToContent'))

const veilOpacity = computed(() => {
  const p = route.path
  // The veil shader itself inverts (dark art / white veil), so opacity only
  // varies by route — the backdrop is theme-correct at full strength.
  return (p === '/campaigns' || p === '/masterclasses') ? 0.35 : 1
})

const config = useRuntimeConfig()
const plausibleDomain = config.public.plausibleDomain as string | undefined
const route = useRoute()

function trackPageview(url: string) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { plausible?: (_eventName: string, _options?: { u: string }) => void }
  if (typeof w.plausible === 'function') {
    w.plausible('pageview', { u: url })
  }
}

onMounted(() => {
  initDarkMode()
  if (plausibleDomain) {
    trackPageview(window.location.href)
  }
})

watch(
  () => route.fullPath,
  (path) => {
    if (plausibleDomain && typeof window !== 'undefined') {
      trackPageview(window.location.origin + path)
    }
  },
)

useHead({
  meta: [
    { name: 'theme-color', content: () => (isDark.value ? '#0a0a0a' : '#fafafa') },
  ],
  script: plausibleDomain
    ? [
        {
          defer: true,
          'data-domain': plausibleDomain,
          src: 'https://plausible.io/js/script.js',
        },
      ]
    : [],
})

</script>

<style>
.skip-link {
  position: fixed;
  top: max(0.5rem, env(safe-area-inset-top));
  left: max(0.5rem, env(safe-area-inset-left));
  z-index: 10001;
  transform: translateY(calc(-100% - 0.75rem));
  transition: transform 150ms ease;
  padding: 12px 20px;
  background: #000;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  font-size: 14px;
}
.skip-link:focus,
.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

#main-content:focus {
  outline: 2px solid var(--ring);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .skip-link {
    transition: none;
  }
}
</style>
