/**
 * components/grants/GrantDetailModal.vue
 * @why Full grant detail view in a modal — shows all fields, comments, votes
 * @component GrantDetailModal
 * @emits close, vote, save
 * @deps vue (ref, reactive, watch)
 */
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="grant" class="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6 grant-detail-overlay" role="dialog" aria-modal="true" aria-label="Grant detail">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="handleBackdropClick" />
        <div class="relative w-full max-w-[85vw] sm:max-w-[85vw] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[var(--bg-secondary)] shadow-2xl grant-detail-scroll">
          <div class="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6 md:p-8 border-b border-white/5 bg-[var(--bg-secondary)]/95 backdrop-blur-sm">
            <div class="min-w-0 flex-1">
              <template v-if="editing">
                <input
                  v-model="editForm.title"
                  class="w-full bg-transparent text-base sm:text-lg md:text-xl font-bold text-white leading-snug outline-none border-b border-green-400/40 pb-0.5"
                  :placeholder="t('grantsPortal.editFormTitle')"
                />
              </template>
              <template v-else>
                <h2 class="text-base sm:text-lg md:text-xl font-bold text-white leading-snug">{{ grant.title }}</h2>
              </template>
              <p class="text-xs sm:text-sm text-white/50 mt-1 truncate">{{ grant.funder || grant.location_name || grant.country }} &bull; {{ new Date(grant.created_at || '').toLocaleDateString() }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="isManager && !editing"
                class="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                aria-label="Edit grant"
                @click="startEditing"
              >{{ t('grantsPortal.edit') }}</button>
              <button class="shrink-0 rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close" @click="handleClose">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div v-if="editing" class="p-4 sm:p-6 md:p-8 space-y-3">
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormFunder') }}</span>
              <input v-model="editForm.funder" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormDescription') }}</span>
              <textarea v-model="editForm.description" rows="4" class="form-input" />
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormAmountMax') }}</span>
                <input v-model="editForm.amount_max" class="form-input" />
              </label>
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormAmountMin') }}</span>
                <input v-model="editForm.amount_min" class="form-input" />
              </label>
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormCurrency') }}</span>
                <input v-model="editForm.currency" :placeholder="t('grantsPortal.editFormCurrencyPlaceholder')" class="form-input" />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormCountry') }}</span>
                <input v-model="editForm.country" class="form-input" />
              </label>
              <label class="edit-field">
                <span>{{ t('grantsPortal.editFormDeadline') }}</span>
                <input v-model="editForm.deadline" :placeholder="t('grantsPortal.editFormDeadlinePlaceholder')" class="form-input" />
              </label>
            </div>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormUrl') }}</span>
              <input v-model="editForm.url" class="form-input" />
            </label>
            <label class="edit-field">
              <span>{{ t('grantsPortal.editFormCategories') }}</span>
              <input v-model="editForm.categories" :placeholder="t('grantsPortal.editFormCategoriesPlaceholder')" class="form-input" />
            </label>
            <div v-if="editError" class="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{{ editError }}</div>
            <div class="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button class="px-4 py-2 rounded-lg bg-white/5 text-xs sm:text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors" @click="cancelEditing">{{ t('grantsPortal.cancel') }}</button>
              <button class="px-4 py-2 rounded-lg bg-green-500/15 text-green-400 text-xs sm:text-sm font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-40" :disabled="saving" @click="handleSave">
                <template v-if="saving">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-green-400 inline-block mr-1.5 align-middle" viewBox="0 0 24 24">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
                      <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                    </path>
                  </svg>
                  {{ t('grantsPortal.saving') }}
                </template>
                <template v-else>{{ t('grantsPortal.saveChanges') }}</template>
              </button>
            </div>
          </div>

          <div v-else class="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div class="md:col-span-2 space-y-4">
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descDescription') }}</h3>
                  <p class="mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed text-white/80">{{ grant.description }}</p>
                </div>
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descStatus') }}</h3>
                  <span class="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium capitalize" :class="statusClass(grant.status)">{{ t(`grantsPortal.${grant.status || 'open'}`) }}</span>
                </div>
                <div v-if="grant.location_name || (grant.latitude != null)" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descLocation') }}</h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/70">{{ grant.location_name || '' }}{{ grant.latitude != null ? ` (${grant.latitude}, ${grant.longitude})` : '' }}</p>
                </div>
                <div v-if="grant.source_type === 'scraped' && grant.url" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descApply') }}</h3>
                  <a :href="grant.url" target="_blank" rel="noopener" class="mt-2 inline-flex items-center gap-2 text-xs sm:text-sm text-green-400 hover:text-green-300">{{ t('grantsPortal.visitSource') }} ↗</a>
                </div>
              </div>
              <div class="space-y-4">
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <div class="flex items-center justify-between">
                    <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descPriority') }}</h3>
                    <span v-if="grant.priority_score != null" class="priority-score text-sm" :class="priorityClass(grant.priority_score)">{{ grant.priority_score }}</span>
                  </div>
                  <div v-if="grant.grant_type" class="mt-2">
                    <span class="grant-type-badge text-xs" :class="grant.grant_type">{{ typeEmoji(grant.grant_type) }} {{ grant.grant_type }}</span>
                  </div>
                  <div v-if="grant.relevance != null" class="mt-1 text-[11px] text-white/40">{{ t('grantsPortal.relevance', { score: grant.relevance }) }}</div>
                </div>

                <div v-if="grant.highlights?.length" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descHighlights') }}</h3>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="hl in grant.highlights" :key="hl" class="highlight-badge" :class="hl.toLowerCase().replace(/\s+/g, '_')">{{ hl }}</span>
                  </div>
                </div>

                <div v-if="grant.urgency && grant.urgency !== 'unknown'" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descDeadline') }}</h3>
                  <div v-if="grant.urgency === 'urgent'" class="mt-2 text-xs text-red-400 font-semibold">⚠️ {{ t('grantsPortal.urgencyUrgent') }}</div>
                  <div v-else-if="grant.urgency === 'soon'" class="mt-2 text-xs text-yellow-400">⏰ {{ t('grantsPortal.urgencySoon') }}</div>
                  <div v-else-if="grant.urgency === 'expired'" class="mt-2 text-xs text-red-600">🔴 {{ t('grantsPortal.urgencyExpired') }}</div>
                  <div v-if="grant.deadline_days != null" class="mt-1 text-[11px] text-white/40">{{ grant.deadline_days >= 0 ? t('grantsPortal.daysRemaining', { count: grant.deadline_days }) : t('grantsPortal.daysAgo', { count: Math.abs(grant.deadline_days) }) }}</div>
                </div>

                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descFunding') }}</h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/70">{{ grant.amount_max ? `${grant.amount_max} ${grant.currency || ''}` : t('grantsPortal.notSpecified') }}</p>
                  <p v-if="grant.amount_usd != null" class="mt-1 text-[11px] text-green-400/70">≈ ${{ formatAmount(grant.amount_usd) }} USD</p>
                  <p v-if="grant.deadline" class="mt-1 text-xs text-white/50">{{ t('grantsPortal.deadlineLabel') }} {{ grant.deadline }}</p>
                </div>

                <div v-if="grant.funder || grant.source" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.descSource') }}</h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/70">{{ grant.funder || grant.source }}</p>
                </div>
                <div v-if="grant.submitted_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.submittedBy') }}</h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/70">{{ grant.submitted_by }}</p>
                </div>
                <div v-if="grant.reviewed_by" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.review') }}</h3>
                  <p class="mt-2 text-xs sm:text-sm text-white/70">{{ grant.reviewed_by }}</p>
                  <p class="text-xs text-white/40">{{ grant.reviewed_at ? new Date(grant.reviewed_at).toLocaleString() : '' }}</p>
                </div>
                <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.voteLabel') }}</h3>
                  <div class="mt-3 flex gap-1">
                    <button v-for="n in 8" :key="n" @click="$emit('vote', n)" class="star-btn text-lg sm:text-xl" :class="n <= userVote ? 'active' : ''" :title="n + ' ' + t('grantsPortal.stars')">★</button>
                  </div>
                  <p class="mt-2 text-[11px] text-white/40">{{ userVote ? t('grantsPortal.yourVote', { count: userVote }) : t('grantsPortal.noVotes') }}</p>
                </div>
                <div v-if="grant.categories?.length" class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
                  <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40">{{ t('grantsPortal.categories') }}</h3>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    <span v-for="cat in grant.categories" :key="cat" class="text-[10px] sm:text-xs px-2 py-1 rounded-md bg-white/5 text-white/60">{{ cat }}</span>
                  </div>
                </div>
              </div>
            </div>

            
            <div class="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
              <h3 class="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                {{ t('grantsPortal.comments') }}
                <span v-if="comments.length" class="text-white/30 text-[10px]">({{ comments.length }})</span>
              </h3>
              <div v-if="commentsLoading" class="mt-3 text-xs text-white/30">{{ t('grantsPortal.loading') }}</div>
              <div v-else-if="comments.length === 0" class="mt-3 text-xs text-white/30">{{ t('grantsPortal.noComments') }}</div>
              <div v-else class="mt-3 space-y-3 max-h-60 overflow-y-auto thin-scroll">
                <div v-for="c in comments" :key="c.id" class="flex gap-2 items-start p-2 rounded-lg bg-white/[0.02]">
                  <div class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 shrink-0 mt-0.5">
                    {{ (c.author_name || c.email)[0].toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-semibold text-white/60 truncate">{{ c.author_name || c.email.split('@')[0] }}</span>
                      <span class="text-[9px] text-white/20 shrink-0">{{ c.created_at ? new Date(c.created_at).toLocaleDateString() : '' }}</span>
                    </div>
                    <p class="mt-0.5 text-xs text-white/70 leading-relaxed">{{ c.content }}</p>
                  </div>
                  <button
                    v-if="user?.email === c.email"
                    class="shrink-0 text-white/20 hover:text-red-400 transition-colors p-0.5"
                    :title="t('grantsPortal.deleteComment')"
                    @click="handleDeleteComment(c.id)"
                  >✕</button>
                </div>
              </div>
              <div v-if="commentError" class="mt-2 text-xs text-red-400">{{ commentError }}</div>
              <form v-if="user" class="mt-3 flex gap-2" @submit.prevent="handleAddComment">
                <input
                  v-model="commentInput"
                  :placeholder="t('grantsPortal.commentPlaceholder')"
                  class="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/20 outline-none focus:border-green-400/30 transition-colors"
                  maxlength="2000"
                />
                <button
                  type="submit"
                  class="px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-30"
                  :disabled="!commentInput.trim() || commentSending"
                >{{ t('grantsPortal.send') }}</button>
              </form>
              <p v-else class="mt-3 text-[11px] text-white/30">{{ t('grantsPortal.signInToComment') }}</p>
            </div>

            <div class="flex justify-end pt-2 border-t border-white/5">
              <button class="px-4 py-2 rounded-lg bg-white/5 text-xs sm:text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors" @click="$emit('close')">{{ t('grantsPortal.close') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { ref, reactive, watch } from 'vue'
import type { DetailGrantData } from '~/lib/types'
import type { GrantComment } from '~/composables/useGrants'

const props = defineProps<{
  grant: DetailGrantData | null
  userVote: number
  user: { email?: string } | null
  isManager?: boolean
  saving?: boolean
  editError?: string
}>()

const emit = defineEmits<{
  close: []
  vote: [stars: number]
  save: [grantId: string, form: Record<string, string>]
}>()

const { t } = useI18n()
const { getComments, addComment, deleteComment } = useGrants()

const editing = ref(false)
const editForm = reactive({
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
const comments = ref<GrantComment[]>([])
const commentsLoading = ref(false)
const commentInput = ref('')
const commentSending = ref(false)
const commentError = ref('')

watch(() => props.grant?.id, async (id) => {
  editing.value = false
  if (id) {
    commentsLoading.value = true
    commentError.value = ''
    try {
      const result = await getComments(id)
      comments.value = result.comments ?? []
    } catch {
      comments.value = []
    } finally {
      commentsLoading.value = false
    }
  } else {
    comments.value = []
  }
}, { immediate: true })

function startEditing() {
  if (!props.grant) return
  editing.value = true
  editForm.title = props.grant.title || ''
  editForm.funder = props.grant.funder || ''
  editForm.description = props.grant.description || ''
  editForm.deadline = props.grant.deadline || ''
  editForm.amount_max = props.grant.amount_max || ''
  editForm.amount_min = ''
  editForm.currency = props.grant.currency || ''
  editForm.country = props.grant.country || ''
  editForm.url = props.grant.url || ''
  editForm.categories = (props.grant.categories || []).join(', ')
}

function cancelEditing() {
  editing.value = false
}

function handleSave() {
  if (!props.grant) return
  emit('save', props.grant.id, { ...editForm })
}

function handleClose() {
  if (editing.value) {
    editing.value = false
    return
  }
  emit('close')
}

function handleBackdropClick() {
  if (editing.value) return
  emit('close')
}

async function handleAddComment() {
  const content = commentInput.value.trim()
  if (!content || !props.grant) return
  commentSending.value = true
  commentError.value = ''
  try {
    const result = await addComment(props.grant.id, content)
    if ('error' in result) {
      if (result.error) commentError.value = result.error
      return
    }
    comments.value.push(result.comment)
    commentInput.value = ''
  } catch {
    commentError.value = t('grantsPortal.commentError')
  } finally {
    commentSending.value = false
  }
}

async function handleDeleteComment(commentId: string) {
  try {
    await deleteComment(commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
  } catch {
    commentError.value = t('grantsPortal.commentDeleteError')
  }
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    approved: 'text-green-400 bg-green-400/10',
    rejected: 'text-red-400 bg-red-400/10',
    hidden: 'text-gray-400 bg-gray-400/10',
  }
  return map[status as keyof typeof map] || 'text-white/50 bg-white/5'
}

function typeEmoji(type?: string): string {
  const map: Record<string, string> = {
    artivism: '🎨',
    climate_justice: '🌍',
    conservation: '🌿',
    human_rights: '⚖️',
    indigenous_rights: '🏹',
    youth: '🌟',
  }
  return map[type || ''] || '📋'
}

function priorityClass(score: number): string {
  if (score >= 60) return 'high'
  if (score >= 30) return 'mid'
  return 'low'
}

function formatAmount(val: number): string {
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K'
  return val.toFixed(0)
}

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

.grant-detail-overlay {
  position: fixed !important;
  z-index: 9100 !important;
  isolation: isolate;
  pointer-events: auto;
}

.grant-detail-scroll {
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.grant-detail-scroll::-webkit-scrollbar {
  width: 5px;
}
.grant-detail-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.grant-detail-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}
.grant-detail-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.thin-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}
.thin-scroll::-webkit-scrollbar {
  width: 4px;
}
.thin-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.thin-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.15);
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}
.star-btn:hover {
  color: rgba(250, 204, 21, 0.6);
  transform: scale(1.15);
}
.star-btn.active {
  color: var(--warning);
  text-shadow: 0 0 8px rgba(250, 204, 21, 0.4);
}

.priority-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-weight: 700;
  font-size: 0.7rem;
  padding: 0 6px;
}
.priority-score.high { background: rgba(34, 197, 94, 0.2); color: var(--success); }
.priority-score.mid  { background: rgba(234, 179, 8, 0.2); color: var(--warning); }
.priority-score.low  { background: var(--glass-border); color: var(--text-muted); }

.grant-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 1px 8px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.grant-type-badge.artivism        { background: var(--purple-bg); color: var(--purple); }
.grant-type-badge.climate_justice  { background: var(--success-bg); color: var(--success); }
.grant-type-badge.conservation     { background: var(--success-bg); color: var(--success); }
.grant-type-badge.human_rights     { background: var(--info-bg); color: var(--info); }
.grant-type-badge.indigenous_rights { background: var(--warning-bg); color: var(--warning); }
.grant-type-badge.youth            { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.grant-type-badge.general          { background: var(--glass-border); color: var(--text-secondary); }

.highlight-badge {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.highlight-badge.eg_core       { background: var(--success-bg); color: var(--success); }
.highlight-badge.urgent        { background: var(--danger-bg);  color: var(--danger); }
.highlight-badge.soon          { background: var(--warning-bg);  color: var(--warning); }
.highlight-badge.expired       { background: var(--danger-bg);  color: var(--danger); opacity: 0.6; }
.highlight-badge.high_value    { background: var(--success-bg);  color: var(--success); }
.highlight-badge.good_value    { background: var(--success-bg); color: var(--success); }
.highlight-badge.has_amount    { background: var(--success-bg); color: var(--success); }
.highlight-badge.artivism      { background: var(--purple-bg); color: var(--purple); }
.highlight-badge.climate       { background: var(--success-bg); color: var(--success); }
.highlight-badge.indigenous    { background: var(--warning-bg); color: var(--warning); }
.highlight-badge.scholarship   { background: var(--info-bg); color: var(--info); }
.highlight-badge.open          { background: var(--success-bg);  color: var(--success); }
.highlight-badge.closed        { background: var(--glass-border-light); color: var(--text-muted); }

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
  background: var(--glass-border-light);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  color: var(--text-primary);
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
