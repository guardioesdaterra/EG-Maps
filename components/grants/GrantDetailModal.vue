/**
 * components/grants/GrantDetailModal.vue
 * @why Full grant detail view in a modal — shows all fields, comments, votes
 * @component GrantDetailModal
 * @emits close: []
  vote: [stars: number]
  save: [grantId: string, form: Record<string, string>]
 * @deps vue (ref, reactive, watch)
 */
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="grant" class="fixed inset-0 flex items-center justify-center p-2 sm:p-4 md:p-6 grant-detail-overlay" role="dialog" aria-modal="true" aria-label="Grant detail">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="handleBackdropClick" />
        <div class="relative w-full max-w-[85vw] sm:max-w-[85vw] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0e] shadow-2xl grant-detail-scroll">
          <div class="sticky top-0 z-10 flex items-start justify-between gap-4 p-4 sm:p-6 md:p-8 border-b border-white/5 bg-[#0c0c0e]/95 backdrop-blur-sm">
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
                  <span class="inline-block w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin mr-1.5 align-middle" />
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
                  <span class="mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium capitalize" :class="statusClass(grant.status)">{{ t(`grantsPortal.${grant.status === 'pending' ? 'open' : grant.status}`) }}</span>
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
  color: #facc15;
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
.priority-score.high { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.priority-score.mid  { background: rgba(234, 179, 8, 0.2); color: #facc15; }
.priority-score.low  { background: rgba(255, 255, 255, 0.06); color: rgba(255,255,255,0.5); }

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
.grant-type-badge.artivism        { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.grant-type-badge.climate_justice  { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.grant-type-badge.conservation     { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.grant-type-badge.human_rights     { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.grant-type-badge.indigenous_rights { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.grant-type-badge.youth            { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
.grant-type-badge.general          { background: rgba(255, 255, 255, 0.08); color: rgba(255,255,255,0.6); }

.highlight-badge {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.highlight-badge.eg_core       { background: rgba(0, 255, 133, 0.15); color: #00ff85; }
.highlight-badge.urgent        { background: rgba(239, 68, 68, 0.2);  color: #f87171; }
.highlight-badge.soon          { background: rgba(234, 179, 8, 0.2);  color: #facc15; }
.highlight-badge.expired       { background: rgba(239, 68, 68, 0.1);  color: #ef4444; opacity: 0.6; }
.highlight-badge.high_value    { background: rgba(34, 197, 94, 0.2);  color: #4ade80; }
.highlight-badge.good_value    { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.highlight-badge.has_amount    { background: rgba(34, 197, 94, 0.08); color: #86efac; }
.highlight-badge.artivism      { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.highlight-badge.climate       { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.highlight-badge.indigenous    { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.highlight-badge.scholarship   { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.highlight-badge.open          { background: rgba(34, 197, 94, 0.1);  color: #4ade80; }
.highlight-badge.closed        { background: rgba(255, 255, 255, 0.05); color: rgba(255,255,255,0.4); }

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
