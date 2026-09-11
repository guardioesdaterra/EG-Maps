/**
 * app.vue
 * @why Root Vue app component — mounts the Nuxt layout and global providers
 * @component app
 * @deps vue (computed, onMounted, watch); @/composables/useI18n (useI18n); vue-router (useRoute)
 */
<template>
  <div>
    <a href="#main-content" class="skip-link">{{ skipLabel }}</a>
    <NuxtLayout>
      <NuxtPage />
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
import { useRoute } from 'vue-router'

const { t } = useI18n()
const skipLabel = computed(() => t('a11y.skipToContent'))

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
