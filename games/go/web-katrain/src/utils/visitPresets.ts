import { ENGINE_MAX_VISITS } from '../engine/katago/limits';

export const ANALYSIS_VISIT_PRESETS = [16, 250, 1000, 5000] as const;
export const ANALYSIS_MIN_VISITS = 16;
export const ANALYSIS_VISIT_SLIDER_MIN = Math.log10(ANALYSIS_MIN_VISITS);
export const ANALYSIS_VISIT_SLIDER_MAX = Math.log10(ENGINE_MAX_VISITS);

export function clampAnalysisVisits(visits: number): number {
  if (!Number.isFinite(visits)) return ANALYSIS_MIN_VISITS;
  return Math.max(ANALYSIS_MIN_VISITS, Math.min(ENGINE_MAX_VISITS, Math.floor(visits)));
}

export function snapVisitCount(visits: number): number {
  const clamped = clampAnalysisVisits(visits);
  if (clamped < 100) return clamped;
  if (clamped < 1000) return clampAnalysisVisits(Math.round(clamped / 10) * 10);
  if (clamped < 10000) return clampAnalysisVisits(Math.round(clamped / 100) * 100);
  return clampAnalysisVisits(Math.round(clamped / 500) * 500);
}

export function visitCountToSliderValue(visits: number): number {
  return Math.log10(clampAnalysisVisits(visits));
}

export function sliderValueToVisitCount(value: number): number {
  if (!Number.isFinite(value)) return ANALYSIS_MIN_VISITS;
  return snapVisitCount(10 ** Math.max(ANALYSIS_VISIT_SLIDER_MIN, Math.min(ANALYSIS_VISIT_SLIDER_MAX, value)));
}

export function visitSliderFillPercent(visits: number): number {
  const value = visitCountToSliderValue(visits);
  return ((value - ANALYSIS_VISIT_SLIDER_MIN) / (ANALYSIS_VISIT_SLIDER_MAX - ANALYSIS_VISIT_SLIDER_MIN)) * 100;
}

export function mergeVisitPresets(...values: Array<readonly number[] | number>): number[] {
  const normalized = values.flatMap((value) => (Array.isArray(value) ? value : [value]));
  return Array.from(new Set(normalized.map(clampAnalysisVisits))).sort((a, b) => a - b);
}

export function nextVisitPreset(currentVisits: number, presets: readonly number[] = ANALYSIS_VISIT_PRESETS): number {
  const current = clampAnalysisVisits(currentVisits);
  const options = mergeVisitPresets(presets, current);
  return options.find((preset) => preset > current) ?? options[0] ?? ANALYSIS_MIN_VISITS;
}

export function formatVisitCount(visits: number): string {
  const clamped = clampAnalysisVisits(visits);
  if (clamped < 1000) return String(clamped);

  const thousands = clamped / 1000;
  if (clamped < 10000 && clamped % 1000 !== 0) {
    return `${thousands.toFixed(1).replace(/\.0$/, '')}k`;
  }

  return `${Math.round(thousands)}k`;
}

export function visitPresetLabel(visits: number, defaultVisits?: number): string {
  if (defaultVisits !== undefined && visits === clampAnalysisVisits(defaultVisits)) return 'Default';
  if (visits <= 16) return 'Fast';
  if (visits <= 250) return 'Balanced';
  if (visits <= 1000) return 'Deep';
  return 'Thorough';
}

export function visitPresetDescription(visits: number): string {
  const clamped = clampAnalysisVisits(visits);
  if (clamped <= 16) return 'Quick shape checks with minimal waiting.';
  if (clamped <= 250) return 'Everyday review depth for steady feedback.';
  if (clamped <= 1000) return 'Deeper reading for fights and close choices.';
  return 'Maximum confidence; slower on large positions.';
}
