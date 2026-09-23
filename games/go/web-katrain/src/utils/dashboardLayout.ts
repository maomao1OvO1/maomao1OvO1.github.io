export type DashboardLayoutMode = 'wide' | 'compact' | 'narrow';

export function getDashboardLayoutMode(width: number): DashboardLayoutMode {
  if (width >= 1200) return 'wide';
  if (width >= 820) return 'compact';
  return 'narrow';
}
