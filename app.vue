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

import { computed, onMounted, watch, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useDarkMode } from '@/composables/useDarkMode'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const { isDark } = useDarkMode()
const skipLabel = computed(() => t('a11y.skipToContent'))

const veilOpacity = computed(() => {
  const p = route.path
  const base = (p === '/campaigns' || p === '/masterclasses') ? 0.35 : 1
  // The veil shader is intrinsically dark — in light mode let the light
  // page background wash through so the whole palette visibly inverts.
  return isDark.value ? base : base * 0.3
})

const config = useRuntimeConfig()
const plausibleDomain = config.public.plausibleDomain as string | undefined
const route = useRoute()

console.log('[DEBUG:app.vue] setup() — route:', route.path, 'isClient:', import.meta.client)

function trackPageview(url: string) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { plausible?: (_eventName: string, _options?: { u: string }) => void }
  if (typeof w.plausible === 'function') {
    w.plausible('pageview', { u: url })
  }
}

if (import.meta.client) {
  requestAnimationFrame(() => {
    const mc = document.getElementById('main-content')
    const body = document.body
    console.log('[DEBUG:app.vue] requestAnimationFrame — body.innerHTML.length:', body.innerHTML.length)
    console.log('[DEBUG:app.vue] requestAnimationFrame — #main-content innerHTML (first 500):', mc?.innerHTML?.substring(0, 500) ?? 'NOT FOUND')
    console.log('[DEBUG:app.vue] requestAnimationFrame — body.firstElementChild tag:', body.firstElementChild?.tagName, 'id:', body.firstElementChild?.id)
    console.log('[DEBUG:app.vue] requestAnimationFrame — all direct body children:')
    Array.from(body.children).forEach((child, i) => {
      const cs = getComputedStyle(child)
      console.log(`  [${i}] <${child.tagName}> id="${child.id}" class="${(child as HTMLElement).className?.substring?.(0, 60)}" display=${cs.display} opacity=${cs.opacity} visibility=${cs.visibility} height=${cs.height}`)
    })
  })
}

onMounted(async () => {
  console.log('[DEBUG:app.vue] onMounted — DOM ready, route:', route.path)
  await nextTick()
  const mainContent = document.getElementById('main-content')
  const html = document.documentElement
  console.log('[DEBUG:app.vue] dark class on <html>:', html.classList.contains('dark'))
  console.log('[DEBUG:app.vue] #main-content exists:', !!mainContent, 'children:', mainContent?.childElementCount)
  console.log('[DEBUG:app.vue] #main-content computed display:', mainContent ? getComputedStyle(mainContent).display : 'N/A')
  console.log('[DEBUG:app.vue] #main-content computed visibility:', mainContent ? getComputedStyle(mainContent).visibility : 'N/A')
  console.log('[DEBUG:app.vue] #main-content computed opacity:', mainContent ? getComputedStyle(mainContent).opacity : 'N/A')
  console.log('[DEBUG:app.vue] #main-content innerHTML length:', mainContent?.innerHTML?.length ?? 0)
  console.log('[DEBUG:app.vue] body children:', document.body.childElementCount)

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
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 9999;
  padding: 12px 20px;
  background: #000;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  border-radius: 0 0 8px 0;
  font-size: 14px;
}
.skip-link:focus {
  left: 0;
  outline: 2px solid #5dade2;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
}
</style>
