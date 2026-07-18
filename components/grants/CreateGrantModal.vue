<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="create-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
        <div class="create-modal">
          <div class="create-modal-header">
            <div>
              <h3 class="create-modal-title">{{ t('grantsPortal.createGrantTitle') }}</h3>
              <p class="create-modal-subtitle">{{ t('grantsPortal.createGrantSubtitle') }}</p>
            </div>
            <button class="create-close-btn" @click="$emit('close')" aria-label="Close">✕</button>
          </div>

          <div class="create-modal-body">
            <div v-if="error" class="create-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="create-error-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{{ error }}</span>
            </div>

            <div class="create-form">
              <div class="create-field">
                <label class="create-label">{{ t('grantsPortal.grantFormTitle') }} <span class="create-required">*</span></label>
                <input v-model="form.title" class="create-input" :placeholder="t('grantsPortal.grantFormTitlePlaceholder')" maxlength="500" />
              </div>

              <div class="create-field">
                <label class="create-label">{{ t('grantsPortal.grantFormDescription') }} <span class="create-required">*</span></label>
                <textarea v-model="form.description" class="create-textarea" rows="3" :placeholder="t('grantsPortal.grantFormDescPlaceholder')" maxlength="5000" />
              </div>

              <div class="create-row">
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormFunder') }}</label>
                  <input v-model="form.funder" class="create-input" :placeholder="t('grantsPortal.grantFormFunderPlaceholder')" />
                </div>
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormCountry') }}</label>
                  <input v-model="form.country" class="create-input" :placeholder="t('grantsPortal.grantFormCountryPlaceholder')" />
                </div>
              </div>

              <div class="create-row">
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormAmountMax') }}</label>
                  <input v-model="form.amount_max" class="create-input" type="number" :placeholder="t('grantsPortal.grantFormAmountPlaceholder')" />
                </div>
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormCurrency') }}</label>
                  <input v-model="form.currency" class="create-input" placeholder="USD" maxlength="10" />
                </div>
              </div>

              <div class="create-row">
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormCategory') }}</label>
                  <select v-model="form.category" class="create-select">
                    <option value="environment">Environment</option>
                    <option value="social">Social</option>
                    <option value="education">Education</option>
                    <option value="health">Health</option>
                    <option value="community">Community</option>
                    <option value="art">Art</option>
                  </select>
                </div>
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormDeadline') }}</label>
                  <input v-model="form.deadline" class="create-input" type="date" />
                </div>
              </div>

              <div class="create-field">
                <label class="create-label">{{ t('grantsPortal.grantFormUrl') }}</label>
                <input v-model="form.url" class="create-input" type="url" placeholder="https://..." />
              </div>

              <div class="create-row">
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormLocation') }}</label>
                  <input v-model="form.location_name" class="create-input" :placeholder="t('grantsPortal.grantFormLocationPlaceholder')" />
                </div>
                <div class="create-field">
                  <label class="create-label">{{ t('grantsPortal.grantFormType') }}</label>
                  <select v-model="form.grant_type" class="create-select">
                    <option value="general">General</option>
                    <option value="conservation">Conservation</option>
                    <option value="climate_justice">Climate Justice</option>
                    <option value="youth">Youth</option>
                    <option value="indigenous_rights">Indigenous Rights</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="create-modal-footer">
            <button class="create-cancel-btn" @click="$emit('close')">{{ t('grantsPortal.cancel') }}</button>
            <button
              class="create-submit-btn"
              :disabled="!form.title.trim() || !form.description.trim() || submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="create-spinner" />
              {{ submitting ? t('grantsPortal.submitting') : t('grantsPortal.createGrant') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useGrants } from '~/composables/useGrants'
import { useToast } from '~/composables/useToast'
import { useI18n } from '~/composables/useI18n'

defineProps<{ show: boolean }>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const { t } = useI18n()
const toast = useToast()
const { createGrant } = useGrants()

const form = reactive({
  title: '',
  description: '',
  funder: '',
  country: '',
  amount_max: '',
  currency: '',
  category: 'environment',
  deadline: '',
  url: '',
  location_name: '',
  grant_type: 'general',
})

const submitting = ref(false)
const error = ref('')

watch(() => form.title, () => { error.value = '' })

async function handleSubmit() {
  if (!form.title.trim() || !form.description.trim()) return
  submitting.value = true
  error.value = ''

  try {
    const result = await createGrant({
      title: form.title.trim(),
      description: form.description.trim(),
      location_name: form.location_name.trim(),
      latitude: null,
      longitude: null,
      category: form.category,
      funder: form.funder.trim() || undefined,
      url: form.url.trim() || undefined,
      amount_max: form.amount_max || undefined,
      currency: form.currency.trim() || undefined,
      country: form.country.trim() || undefined,
      grant_type: form.grant_type || undefined,
      deadline: form.deadline || undefined,
    })

    if ('error' in result && result.error) {
      error.value = result.error
      return
    }

    toast.success(t('grantsPortal.grantCreatedTitle'), t('grantsPortal.grantCreatedDesc'))
    emit('created')
    emit('close')
    Object.assign(form, { title: '', description: '', funder: '', country: '', amount_max: '', currency: '', category: 'environment', deadline: '', url: '', location_name: '', grant_type: 'general' })
  } catch {
    error.value = t('grantsPortal.createGrantError')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
}

.create-modal {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
}

.create-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
  position: sticky;
  top: 0;
  background: #111;
  z-index: 1;
}

.create-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.create-modal-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.create-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.create-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.create-modal-body {
  padding: 20px 24px;
}

.create-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
  color: #f87171;
  font-size: 13px;
}

.create-error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.create-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.create-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.create-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.create-required {
  color: #f87171;
}

.create-input,
.create-textarea,
.create-select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.create-input:focus,
.create-textarea:focus,
.create-select:focus {
  border-color: var(--accent, #00ff85);
}

.create-input::placeholder,
.create-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.create-textarea {
  resize: vertical;
}

.create-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
}

.create-select option {
  background: #1a1a1a;
  color: #fff;
}

.create-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  bottom: 0;
  background: #111;
}

.create-cancel-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.create-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.create-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--accent, #00ff85);
  border: none;
  border-radius: 8px;
  color: #000;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.create-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 255, 133, 0.3);
}

.create-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.create-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .create-row {
    grid-template-columns: 1fr;
  }
}
</style>
