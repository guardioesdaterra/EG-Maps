<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="review-overlay" role="dialog" aria-modal="true" @click.self="$emit('close')">
        <div class="review-modal">
          <div class="review-modal-header">
            <div>
              <h3 class="review-modal-title">{{ t('grantsPortal.reviewClaimTitle') }}</h3>
              <p class="review-modal-subtitle">{{ t('grantsPortal.reviewClaimSubtitle') }}</p>
            </div>
            <button class="review-close-btn" @click="$emit('close')" aria-label="Close">✕</button>
          </div>

          <div class="review-modal-body">
            <div v-if="claim" class="review-claim-details">
              <div class="review-detail-row">
                <span class="review-detail-label">{{ t('grantsPortal.project') }}</span>
                <span class="review-detail-value">{{ claim.project_title || claim.project_id }}</span>
              </div>
              <div class="review-detail-row">
                <span class="review-detail-label">{{ t('grantsPortal.claimedBy') }}</span>
                <span class="review-detail-value">{{ claim.user_email }}</span>
              </div>
              <div class="review-detail-row">
                <span class="review-detail-label">{{ t('grantsPortal.claimDate') }}</span>
                <span class="review-detail-value">{{ formatDate(claim.created_at) }}</span>
              </div>
              <div class="review-detail-row full">
                <span class="review-detail-label">{{ t('grantsPortal.claimNote') }}</span>
                <p class="review-detail-note">{{ claim.claim_note || '—' }}</p>
              </div>
            </div>

            <div v-if="error" class="review-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="review-error-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{{ error }}</span>
            </div>

            <div v-if="!decision" class="review-decision-section">
              <label class="review-label">{{ t('grantsPortal.decision') }}</label>
              <div class="review-decision-btns">
                <button class="review-decision-btn approve" @click="decision = 'approved'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                  {{ t('grantsPortal.approve') }}
                </button>
                <button class="review-decision-btn reject" @click="decision = 'rejected'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  {{ t('grantsPortal.reject') }}
                </button>
              </div>
            </div>

            <div v-if="decision" class="review-note-section">
              <div class="review-decision-badge" :class="decision">
                <svg v-if="decision === 'approved'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {{ decision === 'approved' ? t('grantsPortal.claimApproved') : t('grantsPortal.claimRejected') }}
                <button class="review-change-btn" @click="decision = null">{{ t('grantsPortal.change') }}</button>
              </div>

              <label class="review-label">{{ t('grantsPortal.reviewNoteLabel') }}</label>
              <textarea
                v-model="reviewNote"
                class="review-textarea"
                rows="3"
                :placeholder="decision === 'approved' ? t('grantsPortal.approveNotePlaceholder') : t('grantsPortal.rejectNotePlaceholder')"
                maxlength="2000"
              />
              <div class="review-char-count">{{ reviewNote.length }}/2000</div>
            </div>
          </div>

          <div class="review-modal-footer">
            <button class="review-cancel-btn" @click="$emit('close')">{{ t('grantsPortal.cancel') }}</button>
            <button
              v-if="decision"
              class="review-submit-btn"
              :class="decision"
              :disabled="submitting"
              @click="handleSubmit"
            >
              <svg v-if="submitting" xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-current inline-block" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
                  <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                </path>
              </svg>
              {{ submitting ? t('grantsPortal.submitting') : (decision === 'approved' ? t('grantsPortal.approveClaim') : t('grantsPortal.rejectClaim')) }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ClaimRecord } from '~/lib/types'
import { useGrants } from '~/composables/useGrants'
import { useToast } from '~/composables/useToast'
import { useI18n } from '~/composables/useI18n'

const props = defineProps<{
  show: boolean
  claim: ClaimRecord | null
}>()

const emit = defineEmits<{
  close: []
  reviewed: []
}>()

const { t } = useI18n()
const toast = useToast()
const { reviewClaim } = useGrants()

const decision = ref<'approved' | 'rejected' | null>(null)
const reviewNote = ref('')
const submitting = ref(false)
const error = ref('')

watch(() => props.show, (val) => {
  if (val) {
    decision.value = null
    reviewNote.value = ''
    error.value = ''
  }
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function handleSubmit() {
  if (!props.claim || !decision.value) return
  submitting.value = true
  error.value = ''

  try {
    const result = await reviewClaim(props.claim.id, decision.value, reviewNote.value.trim() || undefined)
    if ('error' in result && result.error) {
      error.value = result.error
      return
    }
    toast.success(
      decision.value === 'approved' ? t('grantsPortal.claimApprovedTitle') : t('grantsPortal.claimRejectedTitle'),
      decision.value === 'approved' ? t('grantsPortal.claimApprovedDesc') : t('grantsPortal.claimRejectedDesc')
    )
    emit('reviewed')
    emit('close')
  } catch {
    error.value = t('grantsPortal.reviewError')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.review-overlay {
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

.review-modal {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.review-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
}

.review-modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px;
}

.review-modal-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin: 0;
}

.review-close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}

.review-close-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.review-modal-body {
  padding: 20px 24px;
}

.review-claim-details {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 20px;
}

.review-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.review-detail-row.full {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.review-detail-row + .review-detail-row {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.review-detail-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-detail-value {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.review-detail-note {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6;
  margin: 0;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 6px;
  width: 100%;
}

.review-error {
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

.review-error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.review-decision-section {
  margin-bottom: 4px;
}

.review-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 10px;
}

.review-decision-btns {
  display: flex;
  gap: 10px;
}

.review-decision-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.review-decision-btn svg {
  width: 18px;
  height: 18px;
}

.review-decision-btn.approve:hover {
  background: rgba(0, 255, 133, 0.1);
  border-color: rgba(0, 255, 133, 0.3);
  color: #00ff85;
}

.review-decision-btn.reject:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.review-note-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-decision-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.review-decision-badge svg {
  width: 16px;
  height: 16px;
}

.review-decision-badge.approve {
  background: rgba(0, 255, 133, 0.1);
  color: #00ff85;
  border: 1px solid rgba(0, 255, 133, 0.2);
}

.review-decision-badge.reject {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.review-change-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.review-change-btn:hover {
  color: #fff;
}

.review-textarea {
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

.review-textarea:focus {
  border-color: var(--accent, #00ff85);
}

.review-textarea::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.review-char-count {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

.review-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.review-cancel-btn {
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

.review-cancel-btn:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
}

.review-submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.review-submit-btn.approve {
  background: #00ff85;
  color: #000;
}

.review-submit-btn.reject {
  background: #f87171;
  color: #fff;
}

.review-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 255, 133, 0.3);
}

.review-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
