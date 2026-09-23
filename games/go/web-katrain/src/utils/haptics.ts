export type HapticPattern = number | number[];

function getNavigator(target?: Navigator | null): Navigator | null {
  if (target !== undefined) return target;
  try {
    return typeof globalThis.navigator === 'undefined' ? null : globalThis.navigator;
  } catch {
    return null;
  }
}

export function vibrateSafe(pattern: HapticPattern, target?: Navigator | null): boolean {
  const source = getNavigator(target);
  if (!source) return false;

  try {
    const vibrate = (source as { vibrate?: (pattern: HapticPattern) => boolean }).vibrate;
    if (typeof vibrate !== 'function') return false;
    return vibrate.call(source, pattern);
  } catch {
    return false;
  }
}

export function playStoneHaptic(target?: Navigator | null): boolean {
  return vibrateSafe(12, target);
}

export function playNavigationHaptic(target?: Navigator | null): boolean {
  return vibrateSafe(8, target);
}
