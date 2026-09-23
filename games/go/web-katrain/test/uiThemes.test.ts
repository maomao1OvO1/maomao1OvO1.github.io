import { describe, expect, it } from 'vitest';
import { UI_THEME_OPTIONS, resolveUiTheme } from '../src/utils/uiThemes';

describe('ui themes', () => {
  it('offers System as the first theme choice', () => {
    expect(UI_THEME_OPTIONS[0]?.value).toBe('system');
  });

  it('resolves system against the device color scheme', () => {
    expect(resolveUiTheme('system', true)).toBe('noir');
    expect(resolveUiTheme('system', false)).toBe('light');
  });

  it('leaves explicit themes untouched regardless of device scheme', () => {
    expect(resolveUiTheme('kaya', true)).toBe('kaya');
    expect(resolveUiTheme('studio', false)).toBe('studio');
    expect(resolveUiTheme('light', true)).toBe('light');
    expect(resolveUiTheme('noir', false)).toBe('noir');
  });
});
