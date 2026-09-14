/**
 * components/grants/CrewSignupModal.vue
 * @why Modal for crew member signup form — collects personal info, preferences, inspiration
 * @component CrewSignupModal
 * @props show: boolean
  userEmail?
 * @emits close: []
  registered: [memberId: string]
 * @deps vue (reactive, ref)
 */
<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm py-8 px-4" @click.self="$emit('close')">
        <div class="w-full max-w-xl glass rounded-2xl p-5 sm:p-8 my-auto" @click.stop>
          
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-bold text-[var(--text-primary)]">{{ t('grantsPortal.crewSignupTitle') }}</h2>
              <p class="text-xs text-[var(--text-muted)] mt-1 max-w-md">{{ t('grantsPortal.crewSignupSubtitle') }}</p>
            </div>
            <button class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1" aria-label="Close" @click="$emit('close')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <p class="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">{{ t('grantsPortal.crewSignupAnyAge') }} {{ t('grantsPortal.crewSignupDirector') }}</p>

          
          <div v-if="error" class="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{{ error }}</div>
          <div v-if="success" class="text-center py-8">
            <div class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-500/15 flex items-center justify-center">
              <svg class="w-6 h-6 sm:w-8 sm:h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 class="text-[var(--text-primary)] font-bold text-base mb-2">{{ t('grantsPortal.crewSignupSuccess') }}</h3>
            <p class="text-[var(--text-muted)] text-xs mb-6">{{ t('grantsPortal.crewSignupSuccessDesc') }}</p>
            <button class="px-5 py-2 text-xs font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all" @click="$emit('close')">{{ t('grantsPortal.crewSignupBackToPortal') }}</button>
          </div>

          
          <form v-else @submit.prevent="handleSubmit" class="space-y-5">
            
            <fieldset>
              <legend class="text-xs font-semibold text-[var(--text-secondary)] mb-3">{{ t('grantsPortal.crewSignupRole') }} <span class="text-red-400">*</span></legend>
              <div class="space-y-2">
                <label v-for="opt in roleOptions" :key="opt.value" class="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors" :class="form.crew_type === opt.value ? 'bg-green-500/10 border border-green-500/25' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'">
                  <input type="radio" name="crew_type" :value="opt.value" v-model="form.crew_type" class="mt-0.5 accent-green-400" required />
                  <span class="text-xs text-[var(--text-secondary)] leading-relaxed">{{ t(opt.label) }}</span>
                </label>
              </div>
            </fieldset>

            
            <div class="grid grid-cols-2 gap-3">
              <FormField :label="t('grantsPortal.crewSignupFirstName')" required>
                <input v-model="form.first_name" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
              </FormField>
              <FormField :label="t('grantsPortal.crewSignupLastName')" required>
                <input v-model="form.last_name" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
              </FormField>
            </div>

            
            <FormField :label="t('grantsPortal.crewSignupLanguage')" required>
              <select v-model="form.preferred_language" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] outline-none focus:border-green-500/40 transition-colors appearance-none cursor-pointer">
                <option value="en">{{ t('grantsPortal.crewSignupLanguageEn') }}</option>
                <option value="es">{{ t('grantsPortal.crewSignupLanguageEs') }}</option>
                <option value="fr">{{ t('grantsPortal.crewSignupLanguageFr') }}</option>
                <option value="pt">{{ t('grantsPortal.crewSignupLanguagePt') }}</option>
              </select>
            </FormField>

            
            <FormField :label="t('grantsPortal.crewSignupAge')" :hint="t('grantsPortal.crewSignupAgeHint')" required>
              <input v-model.number="form.age" type="number" min="0" max="150" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
            </FormField>

            
            <div class="grid grid-cols-[min(25vw,100px)_1fr] gap-3">
              <FormField :label="t('grantsPortal.crewSignupCountry')">
                <input v-model="form.phone_country" type="text" placeholder="US" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
              </FormField>
              <FormField :label="t('grantsPortal.crewSignupPhone')">
                <input v-model="form.phone_number" type="tel" placeholder="+1 (555) 000-0000" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
              </FormField>
            </div>

            
            <FormField :label="t('grantsPortal.crewSignupEmail')" required>
              <input v-model="form.email" type="email" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" :placeholder="userEmail || 'you@example.com'" />
            </FormField>

            
            <fieldset>
              <legend class="text-xs font-semibold text-[var(--text-muted)] mb-2">{{ t('grantsPortal.crewSignupAddress') }}</legend>
              <div class="space-y-2">
                <FormField :label="t('grantsPortal.crewSignupCountry')">
                  <input v-model="form.address_country" type="text" placeholder="United States" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                </FormField>
                <FormField :label="t('grantsPortal.crewSignupAddressLine1')" required>
                  <input v-model="form.address_line1" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                </FormField>
                <FormField :label="t('grantsPortal.crewSignupAddressLine2')">
                  <input v-model="form.address_line2" type="text" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                </FormField>
                <div class="grid grid-cols-3 gap-2">
                  <FormField :label="t('grantsPortal.crewSignupCity')" required>
                    <input v-model="form.city" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                  </FormField>
                  <FormField :label="t('grantsPortal.crewSignupState')" required>
                    <input v-model="form.state" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                  </FormField>
                  <FormField :label="t('grantsPortal.crewSignupZip')" required>
                    <input v-model="form.zip_code" type="text" required class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
                  </FormField>
                </div>
              </div>
            </fieldset>

            
            <FormField :label="t('grantsPortal.crewSignupInspiration')" :hint="t('grantsPortal.crewSignupInspirationHint')">
              <textarea v-model="form.inspiration" rows="3" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors resize-none" />
            </FormField>

            
            <fieldset>
              <legend class="text-xs font-semibold text-[var(--text-secondary)] mb-3">{{ t('grantsPortal.crewSignupTraining') }} <span class="text-red-400">*</span></legend>
              <div class="space-y-1.5">
              <label v-for="opt in trainingOptions" :key="opt.value" class="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors" :class="form.training_interest === opt.value ? 'bg-green-500/10 border border-green-500/25' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'">
                  <input type="radio" name="training_interest" :value="opt.value" v-model="form.training_interest" class="accent-green-400" required />
                  <span class="text-xs text-[var(--text-secondary)]">{{ t(opt.label) }}</span>
                </label>
              </div>
            </fieldset>

            
            <FormField :label="t('grantsPortal.crewSignupExperience')" :hint="t('grantsPortal.crewSignupExperienceHint')">
              <textarea v-model="form.climate_experience" rows="3" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors resize-none" />
            </FormField>

            
            <FormField :label="t('grantsPortal.crewSignupIndigenous')" :hint="t('grantsPortal.crewSignupIndigenousHint')">
              <input v-model="form.indigenous_status" type="text" placeholder="N/A" class="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-green-500/40 transition-colors" />
            </FormField>

            
            <button type="submit" :disabled="submitting" class="w-full py-3 rounded-lg font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2" :class="submitting ? 'bg-green-500/10 text-green-400/50 cursor-wait' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25 hover:shadow-[0_0_30px_rgba(0,255,133,0.15)]'">
              <svg v-if="submitting" class="w-4 h-4 text-green-400" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="currentColor" d="M20.27,4.74a4.93,4.93,0,0,1,1.52,4.61,5.32,5.32,0,0,1-4.1,4.51,5.12,5.12,0,0,1-5.2-1.5,5.53,5.53,0,0,0,6.13-1.48A5.66,5.66,0,0,0,20.27,4.74ZM12.32,11.53a5.49,5.49,0,0,0-1.47-6.2A5.57,5.57,0,0,0,4.71,3.72,5.17,5.17,0,0,1,9.53,2.2,5.52,5.52,0,0,1,13.9,6.45,5.28,5.28,0,0,1,12.32,11.53ZM19.2,20.29a4.92,4.92,0,0,1-4.72,1.49,5.32,5.32,0,0,1-4.34-4.05A5.2,5.2,0,0,1,11.6,12.5a5.6,5.6,0,0,0,1.51,6.13A5.63,5.63,0,0,0,19.2,20.29ZM3.79,19.38A5.18,5.18,0,0,1,2.32,14a5.3,5.3,0,0,1,4.59-4,5,5,0,0,1,4.58,1.61,5.55,5.55,0,0,0-6.32,1.69A5.46,5.46,0,0,0,3.79,19.38ZM12.23,12a5.11,5.11,0,0,0,3.66-5,5.75,5.75,0,0,0-3.18-6,5,5,0,0,1,4.42,2.3,5.21,5.21,0,0,1,.24,5.92A5.4,5.4,0,0,1,12.23,12ZM11.76,12a5.18,5.18,0,0,0-3.68,5.09,5.58,5.58,0,0,0,3.19,5.79c-1,.35-2.9-.46-4-1.68A5.51,5.51,0,0,1,11.76,12ZM23,12.63a5.07,5.07,0,0,1-2.35,4.52,5.23,5.23,0,0,1-5.91.2,5.24,5.24,0,0,1-2.67-4.77,5.51,5.51,0,0,0,5.45,3.33A5.52,5.52,0,0,0,23,12.63ZM1,11.23a5,5,0,0,1,2.49-4.5,5.23,5.23,0,0,1,5.81-.06,5.3,5.3,0,0,1,2.61,4.74A5.56,5.56,0,0,0,6.56,8.06,5.71,5.71,0,0,0,1,11.23Z">
                  <animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12" />
                </path>
              </svg>
              {{ submitting ? 'Submitting...' : t('grantsPortal.crewSignupSubmit') }}
            </button>
          </form>

          
          <div class="mt-6 text-center">
            <p class="text-xs text-[var(--text-muted)]">
              {{ t('grantsPortal.crewSignupContactCrews') }}
              <a href="mailto:crews@earthguardians.org" class="text-green-400/70 hover:text-green-400 underline underline-offset-2">{{ t('grantsPortal.crewSignupContactEmail') }}</a>
            </p>
            <a href="https://www.earthguardians.org/privacy-policy" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline underline-offset-2">{{ t('grantsPortal.crewSignupPrivacyPolicy') }}</a>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">

import { reactive, ref } from 'vue'
import FormField from './FormField.vue'

const props = defineProps<{
  show: boolean
  userEmail?: string
}>()

const emit = defineEmits<{
  close: []
  registered: [memberId: string]
}>()

const { t } = useI18n()
const { client } = useSupabase()

const submitting = ref(false)
const error = ref('')
const success = ref(false)

const form = reactive({
  crew_type: '',
  first_name: '',
  last_name: '',
  preferred_language: 'en',
  age: null as number | null,
  phone_country: '',
  phone_number: '',
  email: '',
  address_country: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  inspiration: '',
  training_interest: '',
  climate_experience: '',
  indigenous_status: 'N/A',
})

const roleOptions = [
  { value: 'leader', label: 'grantsPortal.crewSignupRoleLeader' },
  { value: 'leader_with_group', label: 'grantsPortal.crewSignupRoleLeaderGroup' },
  { value: 'member', label: 'grantsPortal.crewSignupRoleMember' },
]

const trainingOptions = [
  { value: 'yes', label: 'grantsPortal.crewSignupTrainingYes' },
  { value: 'when_capacity', label: 'grantsPortal.crewSignupTrainingCapacity' },
  { value: 'when_resources', label: 'grantsPortal.crewSignupTrainingResources' },
  { value: 'no_capacity', label: 'grantsPortal.crewSignupTrainingNoCapacity' },
  { value: 'no_resources', label: 'grantsPortal.crewSignupTrainingNoResources' },
]

async function handleSubmit() {
  submitting.value = true
  error.value = ''

  try {
    const { data, error: fnError } = await client.functions.invoke('crew-sync?action=register', {
      method: 'POST',
      body: {
        email: form.email || props.userEmail,
        first_name: form.first_name,
        last_name: form.last_name,
        crew_type: form.crew_type,
        preferred_language: form.preferred_language,
        age: form.age,
        phone_country: form.phone_country,
        phone_number: form.phone_number,
        address_country: form.address_country,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        inspiration: form.inspiration,
        training_interest: form.training_interest,
        climate_experience: form.climate_experience,
        indigenous_status: form.indigenous_status,
      },
    })

    if (fnError || data?.error) {
      error.value = data?.error || t('grantsPortal.crewSignupError')
      return
    }

    success.value = true
    if (data?.member?.id) {
      emit('registered', data.member.id)
    }
  } catch (e) {
    error.value = t('grantsPortal.crewSignupError')
    console.error('Crew signup failed:', e)
  } finally {
    submitting.value = false
  }
}

</script>

<style scoped>
.glass {
  background: rgba(18, 18, 22, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.5), 0 0 120px rgba(0, 255, 133, 0.03);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  opacity: 0.3;
}
</style>
