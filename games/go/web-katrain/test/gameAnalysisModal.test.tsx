import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameAnalysisModal } from '../src/components/GameAnalysisModal';

describe('GameAnalysisModal', () => {
  it('uses explicit labels for re-analysis form controls', () => {
    const html = renderToStaticMarkup(<GameAnalysisModal onClose={() => undefined} />);

    for (const id of [
      'game-analysis-max-visits',
      'game-analysis-limit-moves',
      'game-analysis-start-move',
      'game-analysis-end-move',
      'game-analysis-mistakes-only',
    ]) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }

    expect(html).not.toContain('<label class="text-[var(--ui-text-muted)] block text-sm">Status</label>');
    expect(html).toContain('id="game-analysis-status-label"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-labelledby="game-analysis-status-label"');
    expect(html).not.toContain('<label class="text-[var(--ui-text-muted)] text-sm">MCTS depth presets</label>');
    expect(html).toContain('id="game-analysis-depth-presets-label"');
    expect(html).toContain('aria-labelledby="game-analysis-depth-presets-label"');
  });
});
