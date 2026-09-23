import type { ResolvedUiThemeId, UiThemeId } from '../types';
import { mediaQueryMatches } from './mediaQuery';

export const UI_THEME_OPTIONS: Array<{ value: UiThemeId; label: string; description: string }> = [
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device light/dark preference.',
  },
  {
    value: 'noir',
    label: 'Dark',
    description: 'Deep slate with emerald accents.',
  },
  {
    value: 'kaya',
    label: 'Kaya',
    description: 'Warm wood tones with amber accents.',
  },
  {
    value: 'studio',
    label: 'Studio',
    description: 'Cool graphite with sky accents.',
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Clean paper tones with ocean accents.',
  },
];

export const PREFERS_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function resolveUiTheme(theme: UiThemeId, prefersDark: boolean): ResolvedUiThemeId {
  if (theme !== 'system') return theme;
  return prefersDark ? 'noir' : 'light';
}

/** Resolve 'system' against the current media query state (dark when unknown,
    matching the app's default theme). */
export function getResolvedUiTheme(theme: UiThemeId): ResolvedUiThemeId {
  return resolveUiTheme(theme, mediaQueryMatches(PREFERS_DARK_MEDIA_QUERY, true));
}
