<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  useCommandPalette,
  filterPaletteItems,
  groupPaletteItems,
  type CommandPaletteItem,
} from '@/composables/useCommandPalette'

const { t } = useI18n()
const { open, query: stateQuery, items, closePalette, setQuery: setStateQuery } = useCommandPalette()

const inputRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const query = ref('')
const activeIndex = ref(0)

watch(() => stateQuery.value, v => { query.value = v })
watch(query, v => { setStateQuery(v) })

const filteredItems = computed<CommandPaletteItem[]>(() => filterPaletteItems(items.value, query.value))
const groupedItems = computed(() => groupPaletteItems(filteredItems.value))

function isActive(group: string, idx: number): boolean {
  let running = 0
  for (const g of groupedItems.value) {
    if (g.group === group) {
      return running + idx === activeIndex.value
    }
    running += g.items.length
  }
  return false
}

function setActive(group: string, idx: number) {
  let running = 0
  for (const g of groupedItems.value) {
    if (g.group === group) {
      activeIndex.value = running + idx
      return
    }
    running += g.items.length
  }
}

watch(filteredItems, () => { activeIndex.value = 0 })

function focusInput() {
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

watch(open, (isOpen) => {
  if (isOpen) {
    activeIndex.value = 0
    focusInput()
  }
})

async function select(item: CommandPaletteItem) {
  try {
    await Promise.resolve(item.onSelect())
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Command palette action failed', e)
  } finally {
    closePalette()
  }
}

function onKeyDown(e: KeyboardEvent) {
  const max = filteredItems.value.length - 1
  if (max < 0) {
    if (e.key === 'Escape') closePalette()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = activeIndex.value >= max ? 0 : activeIndex.value + 1
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? max : activeIndex.value - 1
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = filteredItems.value[activeIndex.value]
    if (item) select(item)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closePalette()
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = document.querySelector('.cmd-item--active') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  })
}

const isMac = computed(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform))

function onGlobalKeydown(e: KeyboardEvent) {
  const mod = isMac.value ? e.metaKey : e.ctrlKey
  if (mod && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    if (open.value) closePalette()
    else useCommandPalette().openPalette()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeydown)
  }
})
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="cmd-fade">
      <div
        v-if="open"
        class="cmd-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="t('palette.title')"
        @click.self="closePalette"
        @keydown.esc="closePalette"
      >
        <div
          ref="panelRef"
          class="cmd-panel"
          role="combobox"
          :aria-expanded="true"
          :aria-haspopup="'listbox'"
        >
          <div class="cmd-input-wrap">
            <Icon name="lucide:search" class="cmd-input-icon" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="cmd-input"
              :placeholder="t('palette.placeholder')"
              autocomplete="off"
              spellcheck="false"
              :aria-label="t('palette.searchInput')"
              @keydown="onKeyDown"
            />
            <kbd v-if="query" class="cmd-kbd">{{ filteredItems.length }}</kbd>
          </div>

          <div class="cmd-results" role="listbox">
            <div v-if="filteredItems.length === 0" class="cmd-empty">
              {{ t('palette.noResults') }}
            </div>
            <template v-else>
              <div
                v-for="group in groupedItems"
                :key="group.group"
                class="cmd-group"
              >
                <div class="cmd-group__label">{{ group.group }}</div>
                <button
                  v-for="(item, i) in group.items"
                  :key="item.id"
                  type="button"
                  class="cmd-item"
                  :class="{ 'cmd-item--active': isActive(group.group, i) }"
                  role="option"
                  :aria-selected="isActive(group.group, i)"
                  @click="select(item)"
                  @mouseenter="setActive(group.group, i)"
                >
                  <span v-if="item.icon" class="cmd-item__icon" aria-hidden="true">
                    <iconify-icon :icon="item.icon" />
                  </span>
                  <span class="cmd-item__body">
                    <span class="cmd-item__label">{{ item.label }}</span>
                    <span v-if="item.hint" class="cmd-item__hint">{{ item.hint }}</span>
                  </span>
                  <kbd v-if="item.shortcut" class="cmd-item__kbd">{{ item.shortcut }}</kbd>
                </button>
              </div>
            </template>
          </div>

          <div class="cmd-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> {{ t('palette.navigate') }}</span>
            <span><kbd>↵</kbd> {{ t('palette.select') }}</span>
            <span><kbd>esc</kbd> {{ t('palette.close') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cmd-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
}
.cmd-panel {
  width: 100%;
  max-width: 560px;
  background: rgba(15, 15, 18, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  overflow: hidden;
}
.cmd-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.cmd-input-icon {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
}
.cmd-input {
  flex: 1;
  background: transparent;
  border: 0;
  color: #fafafa;
  font-size: 15px;
  outline: none;
  font-family: inherit;
}
.cmd-input::placeholder { color: rgba(255, 255, 255, 0.4); }
.cmd-kbd {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 2px 6px;
}
.cmd-results {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}
.cmd-empty {
  padding: 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}
.cmd-group { padding: 4px 0; }
.cmd-group__label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.4);
  padding: 6px 10px 4px;
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: #e8e8e8;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: background 0.1s;
}
.cmd-item--active,
.cmd-item:hover {
  background: rgba(93, 173, 226, 0.12);
  color: #fff;
}
.cmd-item__icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
}
.cmd-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.cmd-item__label {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cmd-item__hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cmd-item__kbd {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 2px 6px;
  white-space: nowrap;
}
.cmd-footer {
  display: flex;
  gap: 12px;
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}
.cmd-footer kbd {
  font-size: 9px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  padding: 1px 4px;
  margin-right: 2px;
}
.cmd-fade-enter-active, .cmd-fade-leave-active { transition: opacity 150ms; }
.cmd-fade-enter-from, .cmd-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .cmd-fade-enter-active, .cmd-fade-leave-active { transition: none; }
  .cmd-item { transition: none; }
}
</style>
