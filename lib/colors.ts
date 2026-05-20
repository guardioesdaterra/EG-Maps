import type { ProjectData } from "./types";

const COLOR_BLUE = "#3b82f6";
const COLOR_GREEN = "#22c55e";
const COLOR_YELLOW = "#eab308";
const COLOR_RED = "#ef4444";
const COLOR_DEFAULT = "#a855f7";

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
