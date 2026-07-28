/**
 * lib/colors.ts
 * @why Color palette — category-to-color mappings, species status colors, theme color tokens
 * @consts COLOR_MAMMAL, getProjectColorByBeneficiaries, getProjectColor
 * @connections components/map/ProjectPopup.vue, composables/useGeoJSONMarkers.ts, composables/useMapMarker.ts
 */
import type { ProjectData } from "./types";

const COLOR_BLUE = "var(--info)";
const COLOR_GREEN = "var(--success)";
const COLOR_YELLOW = "var(--warning)";
const COLOR_RED = "var(--danger)";
const COLOR_DEFAULT = "var(--purple)";
export const COLOR_MAMMAL = "var(--danger)";

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

export const getProjectColor = (project: ProjectData): string => {
  return getProjectColorByBeneficiaries(
    project.direct_beneficiaries,
    project.indirect_beneficiaries
  );
};
