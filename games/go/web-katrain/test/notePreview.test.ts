import { describe, expect, it } from 'vitest';
import { isNoteBulletLine, parseNoteBlockLine, parseNoteBlocks, parseNoteInlinePreview } from '../src/utils/notePreview';

describe('note preview helpers', () => {
  it('parses compact markdown-style inline note segments', () => {
    expect(parseNoteInlinePreview('Try **urgent** at `D4`: https://example.com.')).toEqual([
      { type: 'text', text: 'Try ' },
      { type: 'strong', text: 'urgent' },
      { type: 'text', text: ' at ' },
      { type: 'code', text: 'D4' },
      { type: 'text', text: ': ' },
      { type: 'link', text: 'https://example.com', href: 'https://example.com' },
      { type: 'text', text: '.' },
    ]);
  });

  it('parses labeled https links and bullet lines', () => {
    expect(parseNoteInlinePreview('Review [shape](https://example.com/shape) next')).toEqual([
      { type: 'text', text: 'Review ' },
      { type: 'link', text: 'shape', href: 'https://example.com/shape' },
      { type: 'text', text: ' next' },
    ]);

    expect(isNoteBulletLine('- sente')).toEqual({ text: 'sente' });
    expect(isNoteBulletLine('plain note')).toBeNull();
  });

  it('parses markdown-style block notes', () => {
    expect(parseNoteBlockLine('# Attack shape')).toEqual({ type: 'heading', level: 1, text: 'Attack shape' });
    expect(parseNoteBlockLine('> White is thin')).toEqual({ type: 'quote', text: 'White is thin' });
    expect(parseNoteBlockLine('2. Hane first')).toEqual({ type: 'ordered', number: '2', text: 'Hane first' });
    expect(parseNoteBlockLine('- [x] Sente threat')).toEqual({ type: 'task', checked: true, text: 'Sente threat' });
    expect(parseNoteBlockLine('- [ ] Follow-up')).toEqual({ type: 'task', checked: false, text: 'Follow-up' });
  });

  it('preserves blank note blocks for preview spacing', () => {
    expect(parseNoteBlocks('First\n\n- second')).toEqual([
      { type: 'paragraph', text: 'First' },
      { type: 'blank' },
      { type: 'bullet', text: 'second' },
    ]);
  });

  it('groups fenced code blocks without parsing their contents as markdown', () => {
    expect(parseNoteBlocks('Before\n```sgf\n(;B[pd];W[dd])\n# not a heading\n```\nAfter')).toEqual([
      { type: 'paragraph', text: 'Before' },
      { type: 'code', language: 'sgf', text: '(;B[pd];W[dd])\n# not a heading' },
      { type: 'paragraph', text: 'After' },
    ]);
  });

  it('parses compact GFM-style tables', () => {
    expect(parseNoteBlocks('| Plan | Follow-up | Winrate |\n| :--- | :---: | ---: |\n| Attach | hane | **52%** |\n| Tenuki | clamp | 48% |')).toEqual([
      {
        type: 'table',
        headers: ['Plan', 'Follow-up', 'Winrate'],
        alignments: ['left', 'center', 'right'],
        rows: [
          ['Attach', 'hane', '**52%**'],
          ['Tenuki', 'clamp', '48%'],
        ],
      },
    ]);
  });
});
