import {
  CALENDAR_WINDOWS,
  DEFAULT_PROFILE,
  readFarmProfile,
  type CalendarWindow,
  type FarmProfile,
  type StrategyId,
} from "@/demo/cereja-demo";

export type Profile = FarmProfile;
export const SAMPLE_PROFILE = DEFAULT_PROFILE;

export function annualSegments(window: {
  startMonth: number;
  endMonth: number;
}): [number, number][] {
  const start = ((window.startMonth % 12) + 12) % 12;
  const duration = Math.min(12, window.endMonth - window.startMonth);
  if (duration <= 0) return [];
  return start + duration > 12
    ? [
        [start, 12],
        [0, start + duration - 12],
      ]
    : [[start, start + duration]];
}

export function calendarWindows(strategy: StrategyId, profile: FarmProfile): CalendarWindow[] {
  const preferredCrops = new Set(
    profile.interrowCrops.map((crop) => crop.toLocaleLowerCase("pt-BR")),
  );
  return CALENDAR_WINDOWS.filter((window) => window.strategyIds.includes(strategy)).sort(
    (left: CalendarWindow, right: CalendarWindow) => {
      if (left.role !== "intercrop" || right.role !== "intercrop") return 0;
      return (
        Number(preferredCrops.has(right.culture.toLocaleLowerCase("pt-BR"))) -
        Number(preferredCrops.has(left.culture.toLocaleLowerCase("pt-BR")))
      );
    },
  );
}

export function monthWindows(windows: CalendarWindow[], month: number) {
  return windows.filter((window) =>
    annualSegments(window).some(([start, end]) => start < month + 1 && end > month),
  );
}

export function season(month: number) {
  return month >= 4 && month <= 8 ? "Seco" : "Chuvoso";
}
export function readProfile(value: unknown): FarmProfile {
  return readFarmProfile(value);
}
