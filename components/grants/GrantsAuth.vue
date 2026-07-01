<template>
  <div class="top-right-auth">
    <div v-if="user" class="relative">
      <button class="auth-avatar" :class="isManager ? 'manager' : ''" @click="showDropdown = !showDropdown" :title="isManager ? t('grantsPortal.manager') + ' — ' + t('grantsPortal.viewDashboard') : t('grantsPortal.crewMember') + ' — ' + t('grantsPortal.viewDashboard')">
        <span class="auth-avatar-letter">{{ isManager ? 'M' : 'C' }}</span>
        <span class="auth-avatar-email">{{ user.email?.split('@')[0] }}</span>
      </button>
      <Transition name="modal-fade">
        <div v-if="showDropdown" class="auth-dropdown" @click.stop>
          <div class="auth-dropdown-header">
            <span class="auth-dropdown-role">{{ isManager ? t('grantsPortal.manager') : t('grantsPortal.crewMember') }}</span>
            <span class="auth-dropdown-email">{{ user.email }}</span>
          </div>
          <hr class="border-white/10 my-1" />
          <button class="auth-dropdown-item auth-dropdown-item--danger" @click="$emit('signOut')">
            {{ t('grantsPortal.signOut') }}
          </button>
        </div>
      </Transition>
    </div>
    <button v-else class="auth-signin" @click="$emit('signIn')">
      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      {{ t('grantsPortal.signInBtn') }}
    </button>
  </div>

  <Transition name="modal-fade">
    <div v-if="showDropdown" class="fixed inset-0" :style="{ zIndex: 'var(--z-dropdown-backdrop)' }" @click="showDropdown = false" />
  </Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  user: { email?: string } | null
  isManager: boolean
}>()

defineEmits<{
  signIn: []
  signOut: []
}>()

const { t } = useI18n()
const showDropdown = ref(false)
</script>

<style scoped>
.top-right-auth {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: var(--z-dropdown);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auth-avatar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-avatar:hover {
  background: rgba(255, 255, 255, 0.1);
}

.auth-avatar.manager {
  border-color: rgba(0, 255, 133, 0.3);
}

.auth-avatar-letter {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
}

.auth-avatar.manager .auth-avatar-letter {
  background: rgba(0, 255, 133, 0.2);
  color: #00ff85;
}

.auth-avatar-email {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.7;
}

.auth-signin {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;
}

.auth-signin:hover {
  background: rgba(255, 255, 255, 0.1);
}

.auth-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: rgba(17, 17, 17, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: var(--z-dropdown);
}

.auth-dropdown-header {
  padding: 8px 10px;
}

.auth-dropdown-role {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
}

.auth-dropdown-email {
  display: block;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.auth-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: white;
}

.auth-dropdown-item--danger {
  color: #ef4444;
}

.auth-dropdown-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .top-right-auth {
    top: 0.5rem;
    right: 0.5rem;
  }
  .auth-avatar-email {
    display: none;
  }
  .auth-signin span {
    display: none;
  }
}
</style>
