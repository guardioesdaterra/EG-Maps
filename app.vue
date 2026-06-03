<template>
  <div>
    <a href="#main-content" class="skip-link">{{ skipLabel }}</a>
    <NuxtLayout>
      <Transition name="page" mode="out-in">
        <NuxtPage />
      </Transition>
    </NuxtLayout>
    <ToastHost position="bottom-right" />
    <CommandPalette />
    <KeyboardShortcuts />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const skipLabel = computed(() => t('a11y.skipToContent'))

const config = useRuntimeConfig()
const plausibleDomain = config.public.plausibleDomain as string | undefined
const route = useRoute()

// Track page views on client-side route changes. The static <script> tag in
// app.head is the primary mechanism — this is a fallback for SPA-style
// navigation between pages.
function trackPageview(url: string) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { plausible?: (e: string, o?: { u: string }) => void }
  if (typeof w.plausible === 'function') {
    w.plausible('pageview', { u: url })
  }
}

onMounted(() => {
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

// Inject Plausible analytics script if a domain is configured. Privacy-friendly
// and lightweight (no cookies, no personal data).
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

/* Page transition */
.page-enter-active,
.page-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
