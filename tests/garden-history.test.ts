/**
 * tests/garden-history.test.ts
 * @why The garden tool's undo/redo stack and JSON import are the parts most likely
 *      to silently corrupt a user's design, so they are covered directly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useGardenProject } from '../composables/useGardenProject'
import type { GardenFeature } from '../lib/garden-types'

;(globalThis as unknown as { useState: <T>(_k: string, init: () => T) => { value: T } }).useState = <T>(_k: string, init: () => T) => {
  return ref(init()) as unknown as { value: T }
}

function point(label: string): GardenFeature {
  return {
    id: `feat-${label}`,
    type: 'point',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { label, variety: '' },
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

describe('garden undo/redo history', () => {
  it('starts with an empty stack', () => {
    const garden = useGardenProject()
    garden.createProject('Test plot')
    expect(garden.canUndo).toBe(false)
    expect(garden.canRedo).toBe(false)
  })

  it('undoes and redoes a feature addition', () => {
    const garden = useGardenProject()
    garden.createProject('Test plot')
    const layer = garden.addLayer('bed')
    garden.setActiveLayer(layer.id)
    garden.addFeature(point('A'))
    expect(garden.allFeatures).toHaveLength(1)

    expect(garden.undo()).toBe(true)
    expect(garden.allFeatures).toHaveLength(0)
    expect(garden.canRedo).toBe(true)

    expect(garden.redo()).toBe(true)
    expect(garden.allFeatures).toHaveLength(1)
    expect(garden.allFeatures[0]?.properties.label).toBe('A')
  })

  it('undoes layer creation and feature edits independently', () => {
    const garden = useGardenProject()
    garden.createProject('Test plot')
    // A fresh plot is seeded with the default layer set, so compare against the
    // baseline instead of assuming an empty project.
    const baselineLayers = garden.activeProject?.layers.length ?? 0
    const baselineFeatures = garden.allFeatures.length
    const layer = garden.addLayer('water-way')
    garden.setActiveLayer(layer.id)
    garden.addFeature(point('Spring'))
    garden.updateFeatureProperties('feat-Spring', { label: 'Nascente' })
    expect(garden.allFeatures[0]?.properties.label).toBe('Nascente')

    garden.undo()
    expect(garden.allFeatures[0]?.properties.label).toBe('Spring')

    garden.undo()
    expect(garden.allFeatures).toHaveLength(baselineFeatures)

    garden.undo()
    expect(garden.activeProject?.layers).toHaveLength(baselineLayers)
    expect(garden.activeProject?.layers.some(l => l.id === layer.id)).toBe(false)
  })

  it('coalesces a rapid opacity drag into a single undo step', () => {
    const garden = useGardenProject()
    garden.createProject('Test plot')
    const layer = garden.addLayer('bed')
    for (const value of [0.2, 0.4, 0.6, 0.8]) garden.setLayerOpacity(layer.id, value)

    const opacity = () => garden.activeProject?.layers.find(l => l.id === layer.id)?.opacity
    expect(opacity()).toBe(0.8)
    expect(garden.undo()).toBe(true)
    expect(opacity()).toBe(1)
  })

  it('clears the stack when the project is replaced', () => {
    const garden = useGardenProject()
    const first = garden.createProject('First')
    garden.addFeature(point('A'), garden.addLayer('bed').id)
    expect(garden.canUndo).toBe(true)

    const json = JSON.stringify({ ...first, name: 'Imported' })
    const imported = garden.importProject(json)
    expect(imported?.name).toBe('Imported (imported)')
    expect(garden.canUndo).toBe(false)
    expect(garden.canRedo).toBe(false)
  })

  it('rejects malformed imports without touching the current design', () => {
    const garden = useGardenProject()
    garden.createProject('Keep me')
    const layer = garden.addLayer('bed')
    garden.addFeature(point('A'), layer.id)

    expect(garden.importProject('not json at all')).toBeNull()
    expect(garden.activeProject?.name).toBe('Keep me')
    expect(garden.allFeatures).toHaveLength(1)
  })
})
