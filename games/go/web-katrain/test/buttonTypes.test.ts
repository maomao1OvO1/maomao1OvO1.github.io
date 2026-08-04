import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const collectTsxFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...collectTsxFiles(path));
    } else if (path.endsWith('.tsx')) {
      files.push(path);
    }
  }

  return files;
};

describe('component button semantics', () => {
  it('uses explicit button types for component buttons', () => {
    const offenders = collectTsxFiles('src/components').flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return (source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) ?? []).map((tag) => ({ path, tag }));
    });

    expect(offenders).toEqual([]);
  });
});
