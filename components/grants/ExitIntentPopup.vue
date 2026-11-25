/**
 * components/grants/ExitIntentPopup.vue
 * @why Exit-intent popup shown when a visitor is about to leave the EG grants
 * portal. Prompts them to explore more grants, follow Earth Guardians, or
 * share the grants portal before they go.
 * @component ExitIntentPopup
 * @emits dismiss
 * @deps vue (ref, watch, onMounted, onBeforeUnmount), ~/composables/useExitIntent (useExitIntent)
 */
<template>
  <teleport to="body">
    <transition
      name="eip"
      enter-active-class="duration-300 ease-out"
      leave-active-class="duration-200 ease-in"
    >
      <div
        v-if="localOpen"
        class="eip-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Before you go"
        @click.self="dismiss"
        @keydown.esc="dismiss"
      >
        <div
          ref="panelRef"
          class="eip-panel relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[#111] shadow-2xl p-6 text-left animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:slide-in-from-left-0"
          tabindex="-1"
          @click.stop
        >
          <!-- close button -->
          <button
            class="eip-close absolute top-4 right-4 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
            aria-label="Close"
            @click="dismiss"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <!-- header -->
          <div class="eip-header mb-4 flex items-center gap-3">
            <div class="eip-icon w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h3 class="eip-title text-white font-bold text-lg tracking-tight">Before you go</h3>
              <p class="eip-sub text-zinc-400 text-sm">
                Keep exploring Earth Guardians grants
              </p>
            </div>
          </div>

          <!-- action row -->
          <div class="eip-actions mb-5 grid grid-cols-2 gap-3">
            <a
              href="/eg-grants"
              class="eip-action flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-[#1a1a1e] hover:border-green-500/40 hover:bg-green-500/5 transition-all group"
            >
              <div class="eip-action-icon w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 group-hover:bg-green-500 transition-colors">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2Z" />
                </svg>
              </div>
              <div class="eip-action-text flex flex-col min-w-0">
                <span class="eip-action-user text-sm font-semibold text-white">Browse more grants</span>
                <span class="eip-action-label text-xs text-zinc-400">Open grants portal</span>
              </div>
              <svg class="eip-action-arrow w-4 h-4 text-zinc-500 group-hover:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="9" y1="18" x2="15" y2="12" />
                <line x1="15" y1="12" x2="9" y2="6" />
              </svg>
            </a>

            <button
              class="eip-action flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-[#1a1a1e] hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group"
              @click="shareGrants"
            >
              <div class="eip-action-icon w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-600 transition-colors">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 3.69a8.96 8.96 0 00-4.31 1.23l-2.36 2.17a2.26 2.26 0 01-3.42 0l-2.36-2.17a8.96 8.96 0 00-4.31-1.23C4.84 3.69 2 6.55 2 9.88c0 4.17 3.48 7.65 8 7.95v-5.19a2.27 2.27 0 011.13-2 2.27 2.27 0 012.22 0v2.14h5.32a2.27 2.27 0 012.22-2v-5.48C18.52 6.55 22 3.69 22 9.88c0 3.33-2.84 6.19-6 6.19" />
                  <path d="M16 11a3 3 0 11-6 0 3 3 0 016 0Z" />
                </svg>
              </div>
              <div class="eip-action-text flex flex-col min-w-0">
                <span class="eip-action-user text-sm font-semibold text-white">Share grants</span>
                <span class="eip-action-label text-xs text-zinc-400">With your crew</span>
              </div>
              <svg class="eip-action-arrow w-4 h-4 text-zinc-500 group-hover:text-green-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="9" y1="18" x2="15" y2="12" />
                <line x1="15" y1="12" x2="9" y2="6" />
              </svg>
            </button>
          </div>

          <!-- newsletter -->
          <div class="eip-newsletter p-3 rounded-xl border border-green-500/20 bg-green-500/5">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-green-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <p class="eip-news-title text-sm font-semibold text-white">Join the newsletter</p>
                <p class="eip-news-desc text-xs text-green-200/80 mt-0.5">
                  Monthly updates on climate action, grants, and Earth Guardians campaigns.
                </p>
              </div>
            </div>
          </div>

          <!-- footer -->
          <div class="eip-footer mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <button
              class="eip-skip text-xs font-medium text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              @click="dismiss"
            >
              Maybe later
            </button>
            <div class="eip-footer-note text-[10px] text-zinc-500">
              You won't see this again this session
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useExitIntent } from '~/composables/useExitIntent'

const props = defineProps<{
  /** When true the popup is suppressed (e.g. staff/admin pages). */
  disabled?: boolean
}>()

const disabled = props.disabled ?? false

const { open, dismiss } = useExitIntent({
  threshold: 60,
  delay: 700,
  storageKey: 'eg_grants_exit_intent_dismissed',
})

// Local reactive so the <transition> drives enter/leave classes.
const localOpen = ref(false)

watch(
  () => open.value,
  (val) => {
    localOpen.value = disabled ? false : val
  },
  { immediate: true }
)

const panelRef = ref<HTMLElement | null>(null)

function shareGrants() {
  if (typeof navigator.share === 'function') {
    navigator.share({
      title: 'Earth Guardians Grants Portal',
      text: 'Discover worldwide grants for climate action and community projects.',
      url: window.location.href,
    }).catch(() => { /* share cancelled or unavailable */ })
  } else {
    try {
      navigator.clipboard.writeText(window.location.href)
    } catch { /* clipboard unavailable */ }
  }
  dismiss()
}

onMounted(() => {
  watch(localOpen, (val) => {
    if (val && panelRef.value) {
      panelRef.value.focus({ preventScroll: true })
    }
  })
})

onBeforeUnmount(() => {
  dismiss()
})
</script>

<style scoped>
/* entrance / exit animation */
.eip-enter-active,
.eip-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.eip-enter-from {
  opacity: 0;
}
.eip-leave-to {
  opacity: 0;
}

/* overlay backdrop */
.eip-overlay {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(4, 6, 8, 0.6);
}

/* panel text overrides for dark theme */
.eip-panel {
  color: var(--text-primary, #f0f0f0);
}

.eip-title {
  margin: 0;
  letter-spacing: -0.01em;
}

.eip-sub {
  margin: 0.15rem 0 0;
}

.eip-action-user {
  display: block;
}
.eip-action-label {
  display: block;
}

.eip-close svg {
  width: 16px;
  height: 16px;
}

.eip-footer-note {
  display: none;
}
@media (min-width: 640px) {
  .eip-footer-note {
    display: block;
  }
}
</style>