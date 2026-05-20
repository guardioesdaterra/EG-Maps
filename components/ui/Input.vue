<template>
  <input
    ref="inputRef"
    :type="type"
    :class="inputClasses"
    :disabled="disabled"
    :value="modelValue"
    @input="handleInput"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  type?: string
  disabled?: boolean
  class?: string
  modelValue?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

const inputClasses = computed(() => {
  return cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    props.class
  )
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  if (props.type === 'number') {
    emit('update:modelValue', target.value === '' ? '' : Number(target.value))
  } else {
    emit('update:modelValue', target.value)
  }
}
</script>
