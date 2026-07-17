/**
 * components/grants/FormField.vue
 * @why Reusable form field component with label, error state, and help text
 * @component FormField
 * @props label: string
  required?
 */
<template>
  <div class="flex flex-col gap-1">
    <label class="text-[11px] font-semibold text-white/50 flex items-center gap-1">
      {{ label }}
      <span v-if="required" class="text-red-400">*</span>
    </label>
    <slot />
    <p v-if="hint" class="text-[10px] text-white/20 leading-relaxed">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">

defineProps<{
  label: string
  required?: boolean
  hint?: string
}>()

</script>
