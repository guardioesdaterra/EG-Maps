<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="claim-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
        <div class="claim-modal">
          <div class="claim-modal-header">
            <div>
              <h3 class="claim-modal-title">{{ t('grantsPortal.claimModalTitle') }}</h3>
              <p class="claim-modal-subtitle">{{ t('grantsPortal.claimModalSubtitle') }}</p>
            </div>
            <button class="claim-close-btn" @click="$emit('close')" aria-label="Close">✕</button>
          </div>

          <div class="claim-modal-body">
            <div v-if="project" class="claim-project-card">
              <div class="claim-project-header">
                <span class="claim-project-badge">Project Grant</span>
                <span v-if="project.status" class="claim-project-status" :class="project.status">{{ project.status }}</span>
              </div>
              <h4 class="claim-project-title">{{ project.title }}</h4>
              <div class="claim-project-meta">
                <span v-if="project.country">{{ project.country }}</span>
                <span v-if="project.direct_beneficiaries" class="claim-meta-sep">·</span>
                <span v-if="project.direct_beneficiaries">{{ formatCompact(project.direct_beneficiaries + project.indirect_beneficiaries) }} beneficiaries</span>
              </div>
              <p v-if="project.description" class="claim-project-desc">{{ project.description }}</p>
            </div>

            <div v-if="error" class="claim-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="claim-error-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{{ error }}</span>
            </div>

            <div class="claim-form">
              <label class="claim-label">{{ t('grantsPortal.claimNoteLabel') }} <span class="claim-required">*</span></label>
              <textarea
                v-model="claimNote"
                class="claim-textarea"
                rows="4"
                :placeholder="t('grantsPortal.claimNotePlaceholder')"
                maxlength="1000"
              />
              <div class="claim-char-count">{{ claimNote.length }}/1000</div>

              <p class="claim-info-text">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="claim-info-icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                {{ t('grantsPortal.claimReviewInfo') }}
              </p>
            </div>
          </div>

          <div class="claim-modal-footer">
            <button class="claim-cancel-btn" @click="$emit('close')">{{ t('grantsPortal.cancel') }}</button>
            <button
              class="claim-submit-btn"
              :disabled="!claimNote.trim() || submitting"
              @click="handleSubmit"
            >
              <span v-if="submitting" class="claim-spinner" />
              {{ submitting ? t('grantsPortal.submitting') : t('grantsPortal.submitClaim') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { EGProjectGrant } from '~/composables/useGrants'
import { useGrants } from '~/composables/useGrants'
import { useToast } from '~/composables/useToast'
import { useI18n } from '~/composables/useI18n'

const props = defineProps<{
  show: boolean
  project: EGProjectGrant | null
}>()

const emit = defineEmits<{
  close: []
  claimed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { claimEGProject } = useGrants()

const claimNote = ref('')
const submitting = ref(false)
const error = ref('')

watch(() => props.show, (val) => {
  if (val) {
    claimNote.value = ''
    error.value = ''
  }
})

function formatCompact(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(0) + 'K'
  return String(val)
}

async function handleSubmit() {
  if (!props.project || !claimNote.value.trim()) return
  submitting.value = true
  error.value = ''

  try {
    const result = await claimEGProject(props.project.id, claimNote.value.trim())
    if ('error' in result && result.error) {
      error.value = result.error
      return
    }
    toast.success(
      t('grantsPortal.claimSubmittedTitle'),
      t('grantsPortal.claimSubmittedDesc')
    )
    emit('claimed')
    emit('close')
  } catch {
    error.value = t('grantsPortal.claimError')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.claim-overlay {
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

.claim-modal {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.claim-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
}

.claim-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.claim-modal-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.claim-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.claim-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.claim-modal-body {
  padding: 20px 24px;
}

.claim-project-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 20px;
}

.claim-project-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.claim-project-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent, #00ff85);
  background: rgba(0, 255, 133, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.claim-project-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
}

.claim-project-status.granted {
  background: rgba(0, 255, 133, 0.1);
  color: #00ff85;
}

.claim-project-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 6px;
  line-height: 1.4;
}

.claim-project-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
}

.claim-meta-sep {
  margin: 0 4px;
  opacity: 0.4;
}

.claim-project-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.claim-error {
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

.claim-error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.claim-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.claim-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.claim-required {
  color: #f87171;
}

.claim-textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

.claim-textarea:focus {
  border-color: var(--accent, #00ff85);
}

.claim-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.claim-char-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: right;
}

.claim-info-text {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
  margin-top: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 6px;
}

.claim-info-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.claim-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.claim-cancel-btn {
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

.claim-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.claim-submit-btn {
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

.claim-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 255, 133, 0.3);
}

.claim-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.claim-spinner {
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
</style>
