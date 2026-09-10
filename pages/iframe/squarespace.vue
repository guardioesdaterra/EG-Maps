/**
 * pages/iframe/squarespace.vue
 * @why Squarespace integration hub — four tiers for embedding Earth Guardians
 *       into any Squarespace (or third-party) site:
 *
 *       Tier 1 — iframe:   Works everywhere, cross-origin safe, transparent ocean.
 *       Tier 2 — inline:   Same-origin, loads assets directly, same-origin iframe.
 *       Tier 3 — widget:   Lightweight data cards (stats, counters) — no map needed.
 *       Tier 4 — component: eg-map Custom Element for encapsulated embedding.
 *
 *       All tiers render land only (ocean transparent), no controls, no UI chrome.
 * @component iframe-squarespace
 */
<template>
  <main id="main-content" tabindex="-1" class="bg-white dark:bg-[var(--bg-primary)] text-black dark:text-[var(--text-primary)] min-h-screen">
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

      <header class="mb-8">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          Squarespace Integration
        </h1>
        <p class="mt-2 text-lg text-black/70 dark:text-[var(--text-secondary)]">
          Embed Earth Guardians maps and data into your Squarespace site. Four integration tiers — from drop-in to advanced.
        </p>
        <p class="mt-1 text-sm text-black/50 dark:text-[var(--text-secondary)]">
          All embeds render <strong>land only</strong> with transparent ocean — your Squarespace section background shows through.
        </p>
      </header>

      <nav class="mb-8 flex flex-wrap gap-2">
        <a
          v-for="tier in tiers"
          :key="tier.id"
          :href="'#' + tier.id"
          class="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          :class="activeTier === tier.id
            ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
            : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10'"
          @click.prevent="activeTier = tier.id"
        >
          {{ tier.icon }} {{ tier.label }}
        </a>
      </nav>

      <section
        v-for="tier in tiers"
        :key="tier.id"
        :id="tier.id"
        class="mb-12 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden"
      >
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ tier.icon }}</span>
            <div>
              <h2 class="text-lg font-bold">{{ tier.label }}</h2>
              <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
                {{ tier.description }}
              </p>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-2 text-xs">
            <span
              v-for="tag in tier.tags"
              :key="tag"
              class="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-black/60 dark:text-[var(--text-secondary)]"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="p-4 space-y-6">
          <div class="relative">
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ tier.code }}</pre>
            </div>
            <button
              @click="copyToClipboard(tier.code, tier.id)"
              class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
              :aria-label="copyLabel(tier.id)"
            >
              {{ copiedId === tier.id ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <div v-if="tier.subcodes && tier.subcodes.length" class="space-y-3">
            <div v-for="(sub, i) in tier.subcodes" :key="i">
              <p class="text-xs font-medium text-black/50 dark:text-[var(--text-secondary)] mb-1">{{ sub.label }}</p>
              <div class="relative">
                <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ sub.code }}</pre>
                </div>
                <button
                  @click="copyToClipboard(sub.code, tier.id + '-' + i)"
                  class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  :aria-label="copyLabel(tier.id + '-' + i)"
                >
                  {{ copiedId === tier.id + '-' + i ? 'Copied!' : 'Copy' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-12 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">All Available Datasets</h2>
          <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
            Use these route keys with <code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-eg-map</code> or <code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-path</code>.
          </p>
        </div>
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-black/10 dark:border-white/10">
                <th class="text-left py-2 pr-4 font-medium">Dataset</th>
                <th class="text-left py-2 pr-4 font-medium">Route</th>
                <th class="text-left py-2 pr-4 font-medium">2D</th>
                <th class="text-left py-2 font-medium">3D</th>
              </tr>
            </thead>
            <tbody class="text-black/70 dark:text-[var(--text-secondary)]">
              <tr v-for="ds in datasets" :key="ds.key" class="border-b border-black/5 dark:border-white/5">
                <td class="py-2 pr-4 font-medium">{{ ds.label }}</td>
                <td class="py-2 pr-4"><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{{ ds.key }}</code></td>
                <td class="py-2 pr-4"><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{{ ds.route }}</code></td>
                <td class="py-2"><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{{ ds.route3d }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mb-12 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">Theming & Customization</h2>
        </div>
        <div class="p-4 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 class="font-bold mb-2">CSS Custom Properties</h3>
              <ul class="list-disc list-inside text-sm text-black/70 dark:text-[var(--text-secondary)] space-y-1">
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">--embed-land-stroke</code> — Border color (light)</li>
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">--embed-land-stroke-dark</code> — Border color (dark)</li>
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">--embed-accent</code> — Marker accent color</li>
              </ul>
            </div>
            <div>
              <h3 class="font-bold mb-2">data-* Attributes</h3>
              <ul class="list-disc list-inside text-sm text-black/70 dark:text-[var(--text-secondary)] space-y-1">
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-theme</code> — <code>auto</code>, <code>light</code>, <code>dark</code></li>
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-min-height</code> — Min height (px)</li>
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-accent</code> — Marker color (CSS)</li>
                <li><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">data-mode</code> — <code>iframe</code> or <code>inline</code></li>
              </ul>
            </div>
          </div>
          <div class="relative">
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ themeOverrideCode }}</pre>
            </div>
            <button
              @click="copyToClipboard(themeOverrideCode, 'theme')"
              class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
              :aria-label="copyLabel('theme')"
            >
              {{ copiedId === 'theme' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </section>

      <section class="mb-12 rounded-xl border-2 border-black/20 dark:border-[var(--border-color)] overflow-hidden">
        <div class="border-b-2 border-black/20 dark:border-[var(--border-color)] px-4 py-3 bg-black/5 dark:bg-[var(--card)]">
          <h2 class="text-lg font-bold">postMessage Protocol</h2>
          <p class="text-sm text-black/60 dark:text-[var(--text-secondary)]">
            Full host ↔ embed communication for programmatic control.
          </p>
        </div>
        <div class="p-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-black/10 dark:border-white/10">
                <th class="text-left py-2 pr-4 font-medium">Direction</th>
                <th class="text-left py-2 pr-4 font-medium">Message</th>
                <th class="text-left py-2 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody class="text-black/70 dark:text-[var(--text-secondary)]">
              <tr v-for="msg in protocolMessages" :key="msg.type" class="border-b border-black/5 dark:border-white/5">
                <td class="py-2 pr-4">
                  <span
                    class="px-1.5 py-0.5 rounded text-xs font-medium"
                    :class="msg.dir === 'host→embed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'"
                  >
                    {{ msg.dir }}
                  </span>
                </td>
                <td class="py-2 pr-4"><code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{{ msg.type }}</code></td>
                <td class="py-2">{{ msg.effect }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="p-4 border-t border-black/10 dark:border-white/10">
          <p class="text-xs text-black/50 dark:text-[var(--text-secondary)] mb-2">Listening example:</p>
          <div class="relative">
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-sm text-gray-100 font-mono whitespace-pre-wrap break-words">{{ eventListenerCode }}</pre>
            </div>
            <button
              @click="copyToClipboard(eventListenerCode, 'events')"
              class="absolute top-2 right-2 px-3 py-1.5 rounded-md bg-black/20 hover:bg-black/30 dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs font-medium transition-colors"
              :aria-label="copyLabel('events')"
            >
              {{ copiedId === 'events' ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </div>
      </section>

    </div>
  </main>
</template>

<script setup lang="ts">
import { embedCodes } from '~/lib/squarespace-codes'

useHead({
  title: 'Squarespace Integration — Earth Guardians',
  meta: [
    { name: 'description', content: 'Embed Earth Guardians maps into Squarespace. Four tiers: iframe, inline, widget, web component.' },
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

definePageMeta({ layout: false })

const baseURL = useRuntimeConfig().app.baseURL || '/'
const embedBaseURL = import.meta.client ? new URL(baseURL, window.location.origin).toString() : baseURL

const activeTier = ref('iframe')
const copiedId = ref<string | null>(null)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedId.value = id
    if (copyTimeout) clearTimeout(copyTimeout)
    copyTimeout = setTimeout(() => { copiedId.value = null }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function copyLabel(id: string) {
  return copiedId.value === id ? 'Copied!' : 'Copy code'
}

const tiers = [
  {
    id: 'iframe',
    icon: 'iframe',
    label: 'Tier 1 — iframe Embed',
    description: 'Works everywhere. Cross-origin safe. Drop a container + script tag.',
    tags: ['Cross-origin', 'Zero dependencies', 'Transparent ocean'],
    code: embedCodes.iframe.code,
    subcodes: embedCodes.iframe.subcodes,
  },
  {
    id: 'inline',
    icon: 'inline',
    label: 'Tier 2 — Inline Embed',
    description: 'Same-origin only. Loads MapLibre assets directly. Renders in-page without cross-origin isolation.',
    tags: ['Same-origin', 'Faster load', 'Direct DOM'],
    code: embedCodes.inline.code,
    subcodes: embedCodes.inline.subcodes,
  },
  {
    id: 'widget',
    icon: 'widget',
    label: 'Tier 3 — Data Widget',
    description: 'Lightweight stat cards and counters. No map, no MapLibre. Pure data fetch.',
    tags: ['No map', 'Instant load', 'Stats & counters'],
    code: embedCodes.widget.code,
    subcodes: embedCodes.widget.subcodes,
  },
  {
    id: 'component',
    icon: 'component',
    label: 'Tier 4 — Web Component',
    description: 'eg-map Custom Element. Shadow DOM encapsulation. Attribute-driven API.',
    tags: ['Custom Element', 'Shadow DOM', 'Framework-agnostic'],
    code: embedCodes.component.code,
    subcodes: embedCodes.component.subcodes,
  },
]

const datasets = [
  { key: 'active-crews', label: 'Active Crews', route: '/active-crews', route3d: '/active-crews/3d' },
  { key: 'project-grants', label: 'Project Grants', route: '/project-grants', route3d: '/project-grants/3d' },
  { key: 'endangered-species', label: 'Endangered Species', route: '/endangered-species', route3d: '/endangered-species/3d' },
]

const protocolMessages = [
  { dir: 'host→embed', type: 'host:ready', effect: 'Bootstrap handshake, passes theme' },
  { dir: 'host→embed', type: 'host:resize', effect: 'Container height changed' },
  { dir: 'host→embed', type: 'host:theme', effect: 'Light/dark mode changed' },
  { dir: 'host→embed', type: 'host:focus', effect: 'Fly map to coordinates' },
  { dir: 'host→embed', type: 'host:open', effect: 'Open a specific data point' },
  { dir: 'host→embed', type: 'host:data', effect: 'Replace embed data' },
  { dir: 'embed→host', type: 'embed:ready', effect: 'Embed booted, listening' },
  { dir: 'embed→host', type: 'embed:height', effect: 'Current content height' },
  { dir: 'embed→host', type: 'embed:click', effect: 'Marker was clicked' },
  { dir: 'embed→host', type: 'embed:error', effect: 'Runtime error occurred' },
]

const themeOverrideCode = embedCodes.themeOverride

const eventListenerCode = embedCodes.eventListener

</script>
