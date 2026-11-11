import { describe, it, expect } from 'vitest';
import { DECOR, tileRow, decorRows } from '../src/content/decor';
import { buildSections } from '../src/content/sections';

const BIOME_IDS = Array.from(new Set(buildSections(1).map((s) => s.biome)));

describe('tileRow', () => {
  it('repeats the pattern and cuts to exactly width chars', () => {
    expect(tileRow('ab', 5)).toBe('ababa');
  });
  it('returns empty string for width <= 0', () => {
    expect(tileRow('ab', 0)).toBe('');
    expect(tileRow('ab', -3)).toBe('');
  });
  it('fills with spaces when pattern is empty', () => {
    expect(tileRow('', 3)).toBe('   ');
  });
});

describe('DECOR', () => {
  it('has an entry for each BiomeId', () => {
    for (const id of BIOME_IDS) {
      expect(DECOR[id]).toBeDefined();
    }
  });

  it('snow and volcano decorate the top edge; meadow and desert decorate the bottom edge', () => {
    expect(DECOR.snow.edge).toBe('top');
    expect(DECOR.volcano.edge).toBe('top');
    expect(DECOR.meadow.edge).toBe('bottom');
    expect(DECOR.desert.edge).toBe('bottom');
  });

  it('every entry has rows of equal length, printable ASCII only', () => {
    for (const id of BIOME_IDS) {
      const decor = DECOR[id];
      const len = decor.rows[0]?.length ?? 0;
      expect(decor.rows.length).toBeGreaterThan(0);
      for (const row of decor.rows) {
        expect(row.length).toBe(len);
        for (const ch of row) {
          const code = ch.charCodeAt(0);
          expect(code).toBeGreaterThanOrEqual(0x20);
          expect(code).toBeLessThanOrEqual(0x7e);
        }
      }
      if (decor.corner) {
        const cornerLen = decor.corner.rows[0]?.length ?? 0;
        for (const row of decor.corner.rows) {
          expect(row.length).toBe(cornerLen);
          for (const ch of row) {
            const code = ch.charCodeAt(0);
            expect(code).toBeGreaterThanOrEqual(0x20);
            expect(code).toBeLessThanOrEqual(0x7e);
          }
        }
      }
    }
  });

  it('desert has a top-right corner decoration', () => {
    expect(DECOR.desert.corner).toBeDefined();
  });

  it('decorRows renders rows of exactly the requested width', () => {
    for (const id of BIOME_IDS) {
      const rows = decorRows(DECOR[id], 37);
      expect(rows.length).toBe(DECOR[id].rows.length);
      for (const row of rows) expect(row.length).toBe(37);
    }
  });
});
