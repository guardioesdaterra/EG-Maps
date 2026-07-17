/**
 * composables/useCustomData.ts
 * @why Custom dataset state management — stores imported datasets in a shared reactive array, provides add/remove/toggle/rename/color methods, and maintains selected feature state for popup display.
 */
import { ref } from 'vue'
import { parseFile, detectFormat, type ImportResult, type ImportFormat } from '~/lib/parsers/index'

export interface CustomDataset {
  id: string
  name: string
  format: ImportFormat
  features: GeoJSON.Feature[]
  visible: boolean
  color: string
  count: number
  properties: string[]
  importTime: number
  errors: string[]
}

const datasets = ref<CustomDataset[]>([])
const idCounter = ref(0)
const selectedCustomFeature = ref<GeoJSON.Feature | null>(null)
const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export function useCustomData() {
  async function importFile(file: File): Promise<ImportResult> {
    const fmt = detectFormat(file.name)
    if (fmt === 'kmz') {
      const data = await file.arrayBuffer()
      return parseFile('', data, file.name)
    }
    const text = await file.text()
    return parseFile(text, null, file.name)
  }

  function addDataset(result: ImportResult, format: ImportFormat): CustomDataset {
    idCounter.value++
    const ds: CustomDataset = {
      id: `custom_${idCounter.value}`,
      name: result.name || `Import ${idCounter.value}`,
      format,
      features: result.features,
      visible: true,
      color: COLORS[(idCounter.value - 1) % COLORS.length],
      count: result.count,
      properties: result.properties,
      importTime: Date.now(),
      errors: result.errors,
    }
    datasets.value.push(ds)
    return ds
  }

  function removeDataset(id: string) {
    datasets.value = datasets.value.filter(d => d.id !== id)
  }

  function toggleVisibility(id: string) {
    const ds = datasets.value.find(d => d.id === id)
    if (ds) ds.visible = !ds.visible
  }

  function setColor(id: string, color: string) {
    const ds = datasets.value.find(d => d.id === id)
    if (ds) ds.color = color
  }

  function renameDataset(id: string, name: string) {
    const ds = datasets.value.find(d => d.id === id)
    if (ds) ds.name = name
  }

  function clearAll() {
    datasets.value = []
  }

  function getGeoJSON(id: string): GeoJSON.FeatureCollection | null {
    const ds = datasets.value.find(d => d.id === id)
    if (!ds || !ds.visible) return null
    return { type: 'FeatureCollection', features: ds.features }
  }

  function selectFeature(feature: GeoJSON.Feature | null) {
    selectedCustomFeature.value = feature
  }

  return {
    datasets,
    selectedCustomFeature,
    selectFeature,
    importFile,
    addDataset,
    removeDataset,
    toggleVisibility,
    setColor,
    renameDataset,
    clearAll,
    getGeoJSON,
    detectFormat,
  }
}
