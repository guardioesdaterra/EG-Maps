/**
 * lib/colors.ts
 * @why Color palette — category-to-color mappings, species status colors, theme color tokens
 * @consts COLOR_MAMMAL, getProjectColorByBeneficiaries, getProjectColor, getProjectMapColor, MAP_COLORS
 * @connections components/map/ProjectPopup.vue, composables/useGeoJSONMarkers.ts, composables/useMapMarker.ts
 */
import type { ProjectData } from "./types";

const COLOR_BLUE = "var(--info)";
const COLOR_GREEN = "var(--success)";
const COLOR_YELLOW = "var(--warning)";
const COLOR_RED = "var(--danger)";
const COLOR_DEFAULT = "var(--purple)";
export const COLOR_MAMMAL = "var(--danger)";

export const MAP_COLORS = {
  info: '#5dade2',
  success: '#27ae60',
  warning: '#f39c12',
  danger: '#e74c3c',
  purple: '#8e44ad',
  mammal: '#e74c3c',
} as const

function hexForCssVar(cssVar: string): string {
  if (cssVar === COLOR_BLUE) return MAP_COLORS.info
  if (cssVar === COLOR_GREEN) return MAP_COLORS.success
  if (cssVar === COLOR_YELLOW) return MAP_COLORS.warning
  if (cssVar === COLOR_RED) return MAP_COLORS.danger
  if (cssVar === COLOR_DEFAULT) return MAP_COLORS.purple
  return MAP_COLORS.purple
}

export const getProjectColorByBeneficiaries = (
  directBeneficiaries: number,
  indirectBeneficiaries: number
): string => {
  if (
    typeof directBeneficiaries !== 'number' ||
    typeof indirectBeneficiaries !== 'number'
  ) {
    return COLOR_DEFAULT;
  }

  const totalBeneficiaries = directBeneficiaries + indirectBeneficiaries;

  if (totalBeneficiaries <= 0) {
    return COLOR_DEFAULT;
  }
  if (totalBeneficiaries <= 100) {
    return COLOR_BLUE;
  }
  if (totalBeneficiaries <= 500) {
    return COLOR_GREEN;
  }
  if (totalBeneficiaries <= 1000) {
    return COLOR_YELLOW;
  }
  return COLOR_RED;
};

export const getProjectMapColor = (
  directBeneficiaries: number,
  indirectBeneficiaries: number
): string => {
  const cssVar = getProjectColorByBeneficiaries(directBeneficiaries, indirectBeneficiaries)
  return hexForCssVar(cssVar)
};

export const getProjectColor = (project: ProjectData): string => {
  return getProjectColorByBeneficiaries(
    project.direct_beneficiaries,
    project.indirect_beneficiaries,
  )
};

export const getProjectMapColorFromProject = (project: ProjectData): string => {
  return getProjectMapColor(
    project.direct_beneficiaries,
    project.indirect_beneficiaries,
  )
};
