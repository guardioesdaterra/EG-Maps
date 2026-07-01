<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="grant" class="fixed inset-0 flex items-center justify-center p-4" :style="{ zIndex: 'var(--z-modal-edit)' }" role="dialog" aria-modal="true" aria-label="Edit grant">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="$emit('close')" />
        <div class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl">
          <div class="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/5 bg-[#0c0c0e]/95 backdrop-blur-sm">
            <div class="min-w-0 flex-1 mr-3">
              <h2 class="text-sm font-bold text-white truncate">{{ form.title || t('grantsPortal.editGrant') }}</h2>
              <p class="text-[10px] text-white/40 truncate mt-0.5">{{ grant?.source || grant?.id }}</p>
            </div>
            <button class="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close" @click="$emit('close')">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="p-4 space-y-3">
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormTitle') }}</span>
              <input v-model="form.title" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormFunder') }}</span>
              <input v-model="form.funder" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormDescription') }}</span>
              <textarea v-model="form.description" rows="3" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormDeadline') }}</span>
              <input v-model="form.deadline" :placeholder="t('grantsPortal.editFormDeadlinePlaceholder')" class="form-input" />
            </label>
            <div class="grid grid-cols-3 gap-2">
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormAmountMax') }}</span>
                <input v-model="form.amount_max" class="form-input" />
              </label>
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormAmountMin') }}</span>
                <input v-model="form.amount_min" class="form-input" />
              </label>
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormCurrency') }}</span>
                <input v-model="form.currency" :placeholder="t('grantsPortal.editFormCurrencyPlaceholder')" class="form-input" />
              </label>
            </div>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormCountry') }}</span>
              <input v-model="form.country" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormUrl') }}</span>
              <input v-model="form.url" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormCategories') }}</span>
              <input v-model="form.categories" :placeholder="t('grantsPortal.editFormCategoriesPlaceholder')" class="form-input" />
            </label>
            <div v-if="error" class="text-[11px] text-red-400">{{ error }}</div>
            <div class="flex justify-end gap-2 pt-2">
              <button class="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/70 hover:bg-white/10 transition-colors" @click="$emit('close')">{{ t('grantsPortal.cancel') }}</button>
              <button class="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors" :disabled="saving" @click="$emit('save', form)">
                {{ saving ? t('grantsPortal.saving') : t('grantsPortal.saveChanges') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ScrapedGrant } from '~/composables/useGrants'

const props = defineProps<{
  grant: ScrapedGrant | null
  saving: boolean
  error: string
}>()

defineEmits<{
  close: []
  save: [form: Record<string, string>]
}>()

const { t } = useI18n()

const form = reactive({
  title: '',
  funder: '',
  description: '',
  deadline: '',
  amount_max: '',
  amount_min: '',
  currency: '',
  country: '',
  url: '',
  categories: '',
})

watch(() => props.grant, (g) => {
  if (!g) return
  form.title = g.title || ''
  form.funder = g.funder || ''
  form.description = g.description || ''
  form.deadline = g.deadline || ''
  form.amount_max = g.amount_max || ''
  form.amount_min = g.amount_min || ''
  form.currency = g.currency || ''
  form.country = g.country || ''
  form.url = g.url || ''
  form.categories = (g.categories || []).join(', ')
}, { immediate: true })
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.edit-field > span {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.4);
}

.form-input {
  width: 100%;
  padding: 0.7rem 1rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #f0f0f0;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}
.form-input:focus {
  border-color: rgba(0,255,133,0.4);
}
.form-input::placeholder {
  color: rgba(255,255,255,0.2);
}
textarea.form-input {
  resize: vertical;
  font-family: inherit;
}
</style>
