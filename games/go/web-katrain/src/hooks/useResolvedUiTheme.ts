import { useSyncExternalStore } from 'react';
import type { ResolvedUiThemeId, UiThemeId } from '../types';
import { getMediaQueryList, subscribeMediaQueryList } from '../utils/mediaQuery';
import { PREFERS_DARK_MEDIA_QUERY, resolveUiTheme } from '../utils/uiThemes';

function subscribe(onStoreChange: () => void): () => void {
  const mediaQueryList = getMediaQueryList(PREFERS_DARK_MEDIA_QUERY);
  if (!mediaQueryList) return () => {};
  return subscribeMediaQueryList(mediaQueryList, onStoreChange);
}

function getSnapshot(): boolean {
  // Dark when unknown, matching the app's default theme.
  return getMediaQueryList(PREFERS_DARK_MEDIA_QUERY)?.matches ?? true;
}

/** The user's theme setting with 'system' resolved against the live
    prefers-color-scheme state, re-rendering when the device scheme flips. */
export function useResolvedUiTheme(uiTheme: UiThemeId): ResolvedUiThemeId {
  const prefersDark = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return resolveUiTheme(uiTheme, prefersDark);
}
