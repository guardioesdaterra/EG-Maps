import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { ToastMessage } from '../lib/types'

// Mock the Nuxt composables used by useToast (it only uses useState and
// auto-imported `ref`/`computed`).
;(globalThis as unknown as { useState: <T>(_k: string, _init: () => T) => { value: T } }).useState = <T>(_k: string, init: () => T) => {
  return ref(init()) as unknown as { value: T }
}

describe('ToastMessage type contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('supports all 4 kinds', () => {
    const kinds: ToastMessage['kind'][] = ['info', 'success', 'warning', 'error']
    expect(kinds).toHaveLength(4)
  })

  it('does not require body', () => {
    const msg: ToastMessage = { id: '1', kind: 'info', title: 'Hello', createdAt: Date.now() }
    expect(msg.body).toBeUndefined()
    expect(msg.action).toBeUndefined()
  })

  it('supports action with onClick handler', () => {
    const onClick = vi.fn()
    const msg: ToastMessage = {
      id: '2',
      kind: 'success',
      title: 'Done',
      createdAt: Date.now(),
      action: { label: 'Undo', onClick },
    }
    msg.action!.onClick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
