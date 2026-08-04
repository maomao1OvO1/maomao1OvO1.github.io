import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ResignConfirmModal } from '../src/components/ResignConfirmModal';

const noop = () => undefined;

describe('ResignConfirmModal', () => {
  it('labels the destructive confirmation and focuses Cancel by default', () => {
    const html = renderToStaticMarkup(
      <ResignConfirmModal player="black" onCancel={noop} onConfirm={noop} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="resign-confirm-title"');
    expect(html).toContain('aria-describedby="resign-confirm-description"');
    expect(html).toContain('Black resigns. White wins by resignation.');
    expect(html).toContain('Result: W+R');
    expect(html).toContain('Resign as Black');
    expect(html).toContain('autofocus=""');
  });

  it('keeps backdrop clicks as cancel while preserving dialog clicks', () => {
    const source = readFileSync('src/components/ResignConfirmModal.tsx', 'utf8');

    expect(source).toContain('onClick={onCancel}');
    expect(source).toContain('onClick={(event) => event.stopPropagation()}');
  });

  it('only intercepts Escape so focused buttons keep normal keyboard behavior', () => {
    const source = readFileSync('src/components/ResignConfirmModal.tsx', 'utf8');

    expect(source).not.toContain("event.stopPropagation();\n      if (event.key === 'Escape')");
    expect(source).toContain(
      "if (event.key === 'Escape') {\n        event.preventDefault();\n        event.stopPropagation();"
    );
  });
});
