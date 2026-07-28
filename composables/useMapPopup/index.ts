/**
 * composables/useMapPopup/index.ts
 * @why Popup registry — maps entity types to their popup builders, resolves at runtime
 */
export { useSpeciesPopup } from './speciesPopup'
export { useProjectPopup } from './projectPopup'
export { useCrewPopup } from './crewPopup'
export { usePreviewCard } from './previewCard'
export type { PreviewCardCallbacks, PreviewItem } from './previewCard'
