import { describe, expect, it } from 'vitest';
import { getScoreWinrateGraphTheme } from '../src/utils/scoreWinrateGraphTheme';

describe('score winrate graph theme', () => {
  it('uses a light grid and tokenized overlays in the light UI theme', () => {
    const theme = getScoreWinrateGraphTheme('light');

    expect(theme.boxStyle.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(String(theme.boxStyle.backgroundImage)).toContain('linear-gradient');
    expect(String(theme.boxStyle.backgroundImage)).not.toContain('graph_bg.png');
    expect(theme.emptyBadgeClass).toContain('text-[var(--ui-text-muted)]');
    expect(theme.emptyBadgeClass).not.toContain('text-white');
    expect(theme.emptyOverlayClass).toContain('bg-[rgb(248,250,252)]');
    expect(theme.tooltipClass).toContain('text-[var(--ui-text)]');
    expect(theme.qualityMarkerStroke).toBe('rgba(15, 23, 42, 0.35)');
  });

  it('keeps the KaTrain graph texture for dark UI themes', () => {
    const theme = getScoreWinrateGraphTheme('noir');

    expect(String(theme.boxStyle.backgroundImage)).toContain('graph_bg.png');
    expect(theme.emptyBadgeClass).toContain('text-[var(--ui-text-muted)]');
    expect(theme.emptyOverlayClass).toContain('bg-[var(--ui-surface)]');
    expect(theme.tooltipClass).toContain('text-white');
    expect(theme.qualityMarkerStroke).toBe('rgba(255,255,255,0.72)');
  });
});
