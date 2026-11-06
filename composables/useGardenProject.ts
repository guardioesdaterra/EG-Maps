/**
 * composables/useGardenProject.ts
 * @why Pinia store for Agroecological Garden Tool project state — localStorage persistence.
 * Manages layers, features, active project, drawing state.
 * @connections lib/garden-types.ts, lib/garden-constants.ts, lib/garden-plants.ts, lib/garden-utils.ts
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { GardenProject, GardenLayer, GardenFeature, GardenLocation, GardenLayerType, LayerStyle, DrawingMode, MeasurementResult } from '~/lib/garden-types'
import { GARDEN_STORAGE_KEY, GARDEN_PROJECT_VERSION, LAYER_DEFAULTS, DEFAULT_LAYERS, DEFAULT_LOCATION, DEFAULT_HEMISPHERE, DEFAULT_LOCALE, DEFAULT_GARDEN_NAME } from '~/lib/garden-constants'
import { generateId, validateProject, cloneProject, getHemisphere, defaultLocationForHemisphere } from '~/lib/garden-utils'

export const useGardenProject = defineStore('garden-project', () => {
  // ── State ──────────────────────────────────────────────────────────────────

  const projects = ref<Record<string, GardenProject>>({})
  const activeProjectId = ref<string | null>(null)
  const activeLayerId = ref<string | null>(null)
  const drawingMode = ref<DrawingMode>('select')
  const selectedFeatureId = ref<string | null>(null)
  const measurement = ref<MeasurementResult | null>(null)
  const plantLibraryOpen = ref(false)
  const selectedPlantId = ref<string | null>(null)
  const unitSystem = ref<'metric' | 'imperial'>('metric')
  const isDirty = ref(false)
  const lastSaved = ref<number | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────

  const activeProject = computed(() => (activeProjectId.value ? projects.value[activeProjectId.value] : null))

  const activeLayer = computed(() => {
    if (!activeProject.value || !activeLayerId.value) return null
    return activeProject.value.layers.find(l => l.id === activeLayerId.value) || null
  })

  const allFeatures = computed(() => {
    if (!activeProject.value) return []
    return activeProject.value.layers.flatMap(l => l.features.map(f => ({ ...f, layerId: l.id })))
  })

  const visibleFeatures = computed(() => {
    if (!activeProject.value) return []
    return activeProject.value.layers
      .filter(l => l.visible)
      .flatMap(l => l.features.map(f => ({ ...f, layerId: l.id, layerColor: l.style.color })))
  })

  const selectedFeature = computed(() => {
    if (!selectedFeatureId.value) return null
    return allFeatures.value.find(f => f.id === selectedFeatureId.value) || null
  })

  const selectedPlant = computed(() => {
    if (!selectedPlantId.value) return null
    return selectedPlantId.value // plant lookup happens in component via garden-plants
  })

  const isSaving = ref(false)

  // ── Undo / redo ─────────────────────────────────────────────────────────────
  // Snapshots of the active project's editable state. Only what the tools can
  // change is stored (layers incl. features, name, description) — camera and
  // metadata stay out of the history so panning never pollutes it.
  const HISTORY_LIMIT = 50
  /** Mutations inside this window collapse into one undo step (map drags). */
  const COALESCE_MS = 500
  const history = ref<string[]>([])
  const future = ref<string[]>([])
  let lastSnapshotAt = 0

  function snapshotOf(project: GardenProject | null): string {
    if (!project) return ''
    return JSON.stringify({ layers: project.layers, name: project.name, description: project.description })
  }

  /** Call before every user-driven mutation. */
  function snapshot(coalesceKey?: string) {
    const serialized = snapshotOf(activeProject.value)
    if (!serialized) return
    const coalesce = coalesceKey !== undefined
      && coalesceKey === lastCoalesceKey
      && Date.now() - lastSnapshotAt < COALESCE_MS
    lastCoalesceKey = coalesceKey
    if (coalesce) return
    lastSnapshotAt = Date.now()
    history.value.push(serialized)
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    future.value = []
  }
  let lastCoalesceKey: string | undefined

  function applySnapshot(serialized: string) {
    const project = activeProject.value
    if (!project || !serialized) return
    try {
      const parsed = JSON.parse(serialized) as { layers: GardenLayer[]; name: string; description: string }
      project.layers = parsed.layers
      project.name = parsed.name
      project.description = parsed.description
      if (!project.layers.some(l => l.id === activeLayerId.value)) {
        activeLayerId.value = project.layers[0]?.id || null
      }
      if (!project.layers.flatMap(l => l.features).some(f => f.id === selectedFeatureId.value)) {
        selectedFeatureId.value = null
      }
      touchProject()
    } catch (e) {
      console.error('[Garden] Failed to apply history snapshot:', e)
    }
  }

  function undo() {
    const previous = history.value.pop()
    if (previous === undefined) return false
    future.value.push(snapshotOf(activeProject.value))
    applySnapshot(previous)
    lastCoalesceKey = undefined
    return true
  }

  function redo() {
    const next = future.value.pop()
    if (next === undefined) return false
    history.value.push(snapshotOf(activeProject.value))
    applySnapshot(next)
    lastCoalesceKey = undefined
    return true
  }

  function resetHistory() {
    history.value = []
    future.value = []
    lastCoalesceKey = undefined
  }

  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  // ── Actions: Project Management ────────────────────────────────────────────

  function createProject(name = DEFAULT_GARDEN_NAME, location?: GardenLocation): GardenProject {
    const id = generateId('project')
    const loc = location || DEFAULT_LOCATION
    const now = Date.now()
    const project: GardenProject = {
      id,
      name,
      description: '',
      location: { ...loc },
      bounds: [[loc.lng - 0.01, loc.lat - 0.01], [loc.lng + 0.01, loc.lat + 0.01]],
      layers: DEFAULT_LAYERS.map(type => createLayer(type)),
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: GARDEN_PROJECT_VERSION,
        author: 'user',
        locale: DEFAULT_LOCALE,
        hemisphere: getHemisphere(loc.lat),
      },
    }
    projects.value[id] = project
    activeProjectId.value = id
    activeLayerId.value = project.layers[0]?.id || null
    resetHistory()
    isDirty.value = true
    return project
  }

  function createLayer(type: GardenLayerType): GardenLayer {
    const defaults = LAYER_DEFAULTS[type]
    return {
      id: generateId('layer'),
      name: defaults.name,
      type,
      visible: true,
      locked: false,
      opacity: 1,
      features: [],
      style: { ...defaults.style },
    }
  }

  function addLayer(type: GardenLayerType): GardenLayer {
    if (!activeProject.value) return createProject().layers[0]
    snapshot()
    const layer = createLayer(type)
    activeProject.value.layers.push(layer)
    activeLayerId.value = layer.id
    touchProject()
    return layer
  }

  function deleteLayer(layerId: string) {
    if (!activeProject.value) return
    const idx = activeProject.value.layers.findIndex(l => l.id === layerId)
    if (idx >= 0) {
      snapshot()
      activeProject.value.layers.splice(idx, 1)
      if (activeLayerId.value === layerId) {
        activeLayerId.value = activeProject.value.layers[0]?.id || null
      }
      touchProject()
    }
  }

  function setLayerVisibility(layerId: string, visible: boolean) {
    const layer = activeProject.value?.layers.find(l => l.id === layerId)
    if (layer) {
      snapshot()
      layer.visible = visible
      touchProject()
    }
  }

  function setLayerOpacity(layerId: string, opacity: number) {
    const layer = activeProject.value?.layers.find(l => l.id === layerId)
    if (layer) {
      snapshot('opacity:' + layerId)
      layer.opacity = Math.max(0, Math.min(1, opacity))
      touchProject()
    }
  }

  function setLayerLocked(layerId: string, locked: boolean) {
    const layer = activeProject.value?.layers.find(l => l.id === layerId)
    if (layer) {
      snapshot()
      layer.locked = locked
      touchProject()
    }
  }

  function reorderLayers(fromIndex: number, toIndex: number) {
    if (!activeProject.value) return
    snapshot()
    const layers = activeProject.value.layers
    const [removed] = layers.splice(fromIndex, 1)
    layers.splice(toIndex, 0, removed)
    touchProject()
  }

  function setActiveLayer(layerId: string) {
    activeLayerId.value = layerId
  }

  // ── Actions: Feature Management ────────────────────────────────────────────

  function addFeature(feature: GardenFeature, layerId?: string) {
    if (!activeProject.value) return
    const targetLayerId = layerId || activeLayerId.value
    if (!targetLayerId) return
    const layer = activeProject.value.layers.find(l => l.id === targetLayerId)
    if (!layer || layer.locked) return
    snapshot()
    layer.features.push(feature)
    updateBounds()
    touchProject()
  }

  function deleteFeature(featureId: string) {
    if (!activeProject.value) return
    for (const layer of activeProject.value.layers) {
      const idx = layer.features.findIndex(f => f.id === featureId)
      if (idx >= 0) {
        snapshot()
        layer.features.splice(idx, 1)
        if (selectedFeatureId.value === featureId) selectedFeatureId.value = null
        updateBounds()
        touchProject()
        return
      }
    }
  }

  function updateFeature(featureId: string, updates: Partial<GardenFeature>) {
    if (!activeProject.value) return
    for (const layer of activeProject.value.layers) {
      const feature = layer.features.find(f => f.id === featureId)
      if (feature) {
        snapshot('feature:' + featureId)
        Object.assign(feature, updates)
        updateBounds()
        touchProject()
        return
      }
    }
  }

  function updateFeatureProperties(featureId: string, properties: Partial<GardenFeature['properties']>) {
    if (!activeProject.value) return
    for (const layer of activeProject.value.layers) {
      const feature = layer.features.find(f => f.id === featureId)
      if (feature) {
        snapshot('properties:' + featureId)
        feature.properties = { ...feature.properties, ...properties }
        touchProject()
        return
      }
    }
  }

  function moveFeature(featureId: string, geometry: GardenFeature['geometry']) {
    if (!activeProject.value) return
    for (const layer of activeProject.value.layers) {
      const feature = layer.features.find(f => f.id === featureId)
      if (feature) {
        snapshot('move:' + featureId)
        feature.geometry = geometry
        updateBounds()
        touchProject()
        return
      }
    }
  }

  function selectFeature(featureId: string | null) {
    selectedFeatureId.value = featureId
  }

  function clearSelection() {
    selectedFeatureId.value = null
  }

  function updateBounds() {
    if (!activeProject.value) return
    const features = activeProject.value.layers.flatMap(l => l.features)
    if (features.length === 0) return
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
    for (const f of features) {
      const coords = extractCoords(f.geometry)
      for (const [lng, lat] of coords) {
        if (lng < minLng) minLng = lng
        if (lat < minLat) minLat = lat
        if (lng > maxLng) maxLng = lng
        if (lat > maxLat) maxLat = lat
      }
    }
    if (minLng !== Infinity) {
      activeProject.value.bounds = [[minLng, minLat], [maxLng, maxLat]]
    }
  }

  function extractCoords(geom: GardenFeature['geometry']): [number, number][] {
    if (geom.type === 'Point') return [geom.coordinates as [number, number]]
    if (geom.type === 'LineString') return geom.coordinates as [number, number][]
    if (geom.type === 'Polygon') return geom.coordinates[0] as [number, number][]
    return []
  }

  // ── Actions: Drawing State ─────────────────────────────────────────────────

  function setDrawingMode(mode: DrawingMode) {
    drawingMode.value = mode
    clearSelection()
    measurement.value = null
  }

  function setMeasurement(m: MeasurementResult | null) {
    measurement.value = m
  }

  // ── Actions: UI State ──────────────────────────────────────────────────────

  function setPlantLibraryOpen(open: boolean) {
    plantLibraryOpen.value = open
  }

  function setSelectedPlant(plantId: string | null) {
    selectedPlantId.value = plantId
  }

  function setUnitSystem(system: 'metric' | 'imperial') {
    unitSystem.value = system
  }

  // ── Actions: Persistence ───────────────────────────────────────────────────

  function loadFromStorage() {
    try {
      const stored = localStorage.getItem(GARDEN_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.projects && typeof parsed.projects === 'object') {
          for (const [id, proj] of Object.entries(parsed.projects)) {
            if (validateProject(proj)) {
              projects.value[id] = proj as GardenProject
            }
          }
        }
        if (parsed.activeProjectId && projects.value[parsed.activeProjectId]) {
          activeProjectId.value = parsed.activeProjectId
          activeLayerId.value = parsed.activeLayerId || activeProject.value?.layers[0]?.id || null
        }
        if (parsed.unitSystem) unitSystem.value = parsed.unitSystem
        lastSaved.value = parsed.lastSaved || null
      }
    } catch (e) {
      console.error('[Garden] Failed to load from localStorage:', e)
    }
  }

  function saveToStorage() {
    if (!activeProject.value) return
    try {
      const data = {
        projects: projects.value,
        activeProjectId: activeProjectId.value,
        activeLayerId: activeLayerId.value,
        unitSystem: unitSystem.value,
        lastSaved: Date.now(),
      }
      localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(data))
      lastSaved.value = Date.now()
      isDirty.value = false
    } catch (e) {
      console.error('[Garden] Failed to save to localStorage:', e)
    }
  }

  function touchProject() {
    if (activeProject.value) {
      activeProject.value.metadata.updatedAt = Date.now()
      isDirty.value = true
    }
  }

  function deleteProject(projectId: string) {
    const { [projectId]: _removed, ...rest } = projects.value
    projects.value = rest
    if (activeProjectId.value === projectId) {
      const remaining = Object.keys(projects.value)
      activeProjectId.value = remaining[0] || null
      activeLayerId.value = activeProject.value?.layers[0]?.id || null
    }
    isDirty.value = true
    saveToStorage()
  }

  function duplicateProject(projectId: string) {
    const project = projects.value[projectId]
    if (!project) return null
    const newProject = cloneProject(project)
    newProject.id = generateId('project')
    newProject.name = `${project.name} (copy)`
    newProject.metadata.createdAt = Date.now()
    newProject.metadata.updatedAt = Date.now()
    projects.value[newProject.id] = newProject
    activeProjectId.value = newProject.id
    activeLayerId.value = newProject.layers[0]?.id || null
    isDirty.value = true
    return newProject
  }

  function exportProject(projectId: string): string {
    const project = projects.value[projectId] || activeProject.value
    if (!project) return ''
    return JSON.stringify(project, null, 2)
  }

  function importProject(json: string): GardenProject | null {
    try {
      const project = JSON.parse(json)
      if (!validateProject(project)) return null
      project.id = generateId('project')
      project.name = `${project.name} (imported)`
      project.metadata.createdAt = Date.now()
      project.metadata.updatedAt = Date.now()
      projects.value[project.id] = project
      activeProjectId.value = project.id
      activeLayerId.value = project.layers[0]?.id || null
      resetHistory()
      isDirty.value = true
      return project
    } catch {
      return null
    }
  }

  // ── Auto-save ──────────────────────────────────────────────────────────────

  watch(activeProjectId, () => resetHistory())

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      if (isDirty.value) saveToStorage()
    }, 5000)
  }

  // Watch for changes to auto-save
  // Note: In Pinia, we can't easily watch nested reactive state.
  // Components should call scheduleAutoSave() after mutations.

  // ── Initialize ─────────────────────────────────────────────────────────────

  if (import.meta.client) {
    loadFromStorage()
    if (!activeProject.value) {
      createProject()
    }
  }

  return {
    // State
    projects,
    activeProjectId,
    activeLayerId,
    drawingMode,
    selectedFeatureId,
    measurement,
    plantLibraryOpen,
    selectedPlantId,
    unitSystem,
    isDirty,
    lastSaved,
    isSaving,
    canUndo,
    canRedo,

    // Getters
    activeProject,
    activeLayer,
    allFeatures,
    visibleFeatures,
    selectedFeature,
    selectedPlant,

    // Actions
    createProject,
    addLayer,
    deleteLayer,
    setLayerVisibility,
    setLayerOpacity,
    setLayerLocked,
    reorderLayers,
    setActiveLayer,
    addFeature,
    deleteFeature,
    updateFeature,
    updateFeatureProperties,
    moveFeature,
    selectFeature,
    clearSelection,
    setDrawingMode,
    setMeasurement,
    undo,
    redo,
    resetHistory,
    setPlantLibraryOpen,
    setSelectedPlant,
    setUnitSystem,
    saveToStorage,
    loadFromStorage,
    deleteProject,
    duplicateProject,
    exportProject,
    importProject,
    scheduleAutoSave,
    touchProject,
  }
})