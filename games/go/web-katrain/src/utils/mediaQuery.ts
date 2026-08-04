type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export function getMediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  try {
    return window.matchMedia(query);
  } catch {
    return null;
  }
}

export function mediaQueryMatches(query: string, fallback = false): boolean {
  return getMediaQueryList(query)?.matches ?? fallback;
}

export function subscribeMediaQueryList(
  mediaQueryList: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void
): () => void {
  const legacyMediaQueryList = mediaQueryList as LegacyMediaQueryList;

  try {
    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', listener);
      return () => mediaQueryList.removeEventListener('change', listener);
    }

    if (typeof legacyMediaQueryList.addListener === 'function') {
      legacyMediaQueryList.addListener(listener);
      return () => legacyMediaQueryList.removeListener?.(listener);
    }
  } catch {
    return () => {};
  }

  return () => {};
}
