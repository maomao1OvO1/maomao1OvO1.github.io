import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AutoSaveRecoveryModal } from '../src/components/AutoSaveRecoveryModal';

const noop = () => undefined;

describe('AutoSaveRecoveryModal', () => {
  it('labels the recovery prompt and focuses the safer current-game action', () => {
    const html = renderToStaticMarkup(
      <AutoSaveRecoveryModal
        snapshot={{ version: 1, savedAt: Date.UTC(2026, 5, 4, 12), sgf: '(;GM[1]SZ[19])' }}
        onRestore={noop}
        onDismiss={noop}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="auto-save-recovery-title"');
    expect(html).toContain('aria-describedby="auto-save-recovery-description"');
    expect(html).toContain('id="auto-save-recovery-description"');
    expect(html).toContain('An unsaved game from');
    expect(html).toContain('Keep Current');
    expect(html).toContain('autofocus=""');
  });
});
