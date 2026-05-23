import { ref, computed } from 'vue'
import type { ProjectData, Species } from '@/lib/types'
import { buildProjectPopupHTML, buildSpeciesPopupHTML, GROUP_COLORS } from '@/lib/map-utils'
import { useI18n } from '@/composables/useI18n'

export function useMapPopup(baseURL?: string) {
  const { t, locale } = useI18n()
  const showSpeciesOverlay = ref(false)
  const speciesOverlayHTML = ref('')
  const showProjectOverlay = ref(false)
  const projectOverlayHTML = ref('')

  function taxonomicGroupLabel(group: string) {
    return t(`taxonomy.${group}`)
  }

  function getTaxonomicGroupLabels() {
    return Object.keys(GROUP_COLORS).reduce<Record<string, string>>((labels, group) => {
      labels[group] = taxonomicGroupLabel(group)
      return labels
    }, {})
  }

  function getLocalizedSpecies(species: Species): Species {
    const content = species.content?.[locale.value] ?? species.content?.en
    if (!content) return species
    return {
      ...species,
      description: content.description ?? species.description,
      endangerment: content.endangerment ?? species.endangerment,
      ecosystemNeeds: content.ecosystemNeeds ?? species.ecosystemNeeds,
      actions: content.actions ?? species.actions,
      region: content.region ?? species.region,
    }
  }

  function openSpeciesOverlay(species: Species) {
    const localized = getLocalizedSpecies(species)
    speciesOverlayHTML.value = buildSpeciesPopupHTML(localized, {
      scientificName: t('species.scientificName'),
      threatTypes: t('species.threatTypes'),
      population: t('species.population'),
      habitat: t('species.habitat'),
      region: t('filter.region'),
      ecosystem: t('filter.ecosystem'),
      groupLabels: getTaxonomicGroupLabels(),
    }, baseURL)
    showSpeciesOverlay.value = true
  }

  function closeSpeciesOverlay() {
    showSpeciesOverlay.value = false
    speciesOverlayHTML.value = ''
  }

  function openProjectOverlay(project: ProjectData) {
    projectOverlayHTML.value = buildProjectPopupHTML(project, {
      projectGrantee: t('stats.projectGrantees'),
      directBeneficiaries: t('stats.directBeneficiaries'),
      indirectBeneficiaries: t('stats.indirectBeneficiaries'),
      location: t('project.location'),
      status: t('project.status'),
      unknownLocation: t('project.unknownLocation'),
    })
    showProjectOverlay.value = true
  }

  function closeProjectOverlay() {
    showProjectOverlay.value = false
    projectOverlayHTML.value = ''
  }

  return {
    showSpeciesOverlay,
    speciesOverlayHTML,
    showProjectOverlay,
    projectOverlayHTML,
    openSpeciesOverlay,
    closeSpeciesOverlay,
    openProjectOverlay,
    closeProjectOverlay,
  }
}
