/**
 * composables/useMapPopup/previewCard.ts
 * @why Preview card HTML builder — compact popup variant for clustered/unclustered states
 * @functions usePreviewCard
 * @interfaces PreviewCardCallbacks
 * @types PreviewItem
 * @deps vue (ref, nextTick); @/lib/map-utils (buildProjectPreviewHTML, buildSpeciesPreviewHTML, buildCrewPreviewHTML); @/composables/useI18n (useI18n)
 */
import { ref, nextTick } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import maplibregl from 'maplibre-gl'
import type { ProjectData } from '@/lib/types'
import type { CrewRegionData, CrewLocation } from '@/lib/crew-data'
import type { Species } from '@/lib/map-utils'
import type { SpeciesIndexItem } from '@/composables/useGeoJSONMarkers'
import { buildProjectPreviewHTML, buildSpeciesPreviewHTML, buildCrewPreviewHTML } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

export type PreviewItem = ProjectData | Species | SpeciesIndexItem | CrewRegionData | CrewLocation

export interface PreviewCardCallbacks {
  expandProject: (_project: ProjectData) => void
  expandSpecies: (_species: Species | SpeciesIndexItem) => void
  expandCrew: (_crew: CrewRegionData | CrewLocation) => void
}

export function usePreviewCard(baseURL?: string) {
  const { t } = useI18n()

  const isOpen = ref(false)
  const currentItem = ref<PreviewItem | null>(null)
  const currentType = ref<'project' | 'species' | 'crew' | null>(null)

  let popup: maplibregl.Popup | null = null
  let currentMap: MapLibreMap | null = null
  let callbacks: PreviewCardCallbacks | null = null

  function getTranslations() {
    return {
      expand: t('preview.expand') || 'View details',
      beneficiaries: t('stats.directBeneficiaries') || 'Beneficiaries',
      location: t('project.location') || 'Location',
      activeCrews: t('crews.activeCrews') || 'Active Crews',
      totalMembers: t('crews.totalMembers') || 'Total Members',
    }
  }

  function close() {
    if (popup) {
      popup.remove()
      popup = null
    }
    isOpen.value = false
    currentItem.value = null
    currentType.value = null
    currentMap = null
  }

  function openProject(project: ProjectData, map: MapLibreMap, cbs: PreviewCardCallbacks) {
    close()
    currentMap = map
    callbacks = cbs
    currentItem.value = project
    currentType.value = 'project'

    const html = buildProjectPreviewHTML(project, baseURL, getTranslations())
    createPopup(html, [project.longitude, project.latitude], map, () => {
      cbs.expandProject(project)
    })
  }

  function openSpecies(species: Species | SpeciesIndexItem, map: MapLibreMap, cbs: PreviewCardCallbacks) {
    close()
    currentMap = map
    callbacks = cbs
    currentItem.value = species
    currentType.value = 'species'

    const lat = 'lat' in species ? species.lat : 0
    const lng = 'lng' in species ? species.lng : 0
    const html = buildSpeciesPreviewHTML(species as Species, baseURL, getTranslations())
    createPopup(html, [lng, lat], map, () => {
      cbs.expandSpecies(species)
    })
  }

  function openCrew(crew: CrewRegionData | CrewLocation, map: MapLibreMap, cbs: PreviewCardCallbacks) {
    close()
    currentMap = map
    callbacks = cbs
    currentItem.value = crew
    currentType.value = 'crew'

    const lat = 'lat' in crew ? crew.lat : (crew as CrewRegionData).latitude
    const lng = 'lng' in crew ? crew.lng : (crew as CrewRegionData).longitude
    const html = buildCrewPreviewHTML(crew as CrewRegionData, getTranslations())
    createPopup(html, [lng, lat], map, () => {
      cbs.expandCrew(crew)
    })
  }

  function createPopup(
    html: string,
    lngLat: [number, number],
    map: MapLibreMap,
    onExpand: () => void,
  ) {
    popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true,
      closeOnMove: true,
      offset: 16,
      maxWidth: '320px',
      anchor: 'bottom',
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map)

    isOpen.value = true

    popup.on('close', () => {
      isOpen.value = false
      currentItem.value = null
      currentType.value = null
      popup = null
    })

    nextTick(() => {
      const popupEl = popup?.getElement()
      if (!popupEl) return

      popupEl.classList.add('preview-card-popup')

      const expandBtn = popupEl.querySelector('[data-action="expand"]') as HTMLElement | null
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          close()
          onExpand()
        })
      }

      const cardBody = popupEl.querySelector('.preview-card__body') as HTMLElement | null
      if (cardBody) {
        cardBody.style.cursor = 'pointer'
        cardBody.addEventListener('click', (e) => {
          e.stopPropagation()
          close()
          onExpand()
        })
      }
    })
  }

  return {
    isOpen,
    currentItem,
    currentType,
    openProject,
    openSpecies,
    openCrew,
    close,
  }
}
