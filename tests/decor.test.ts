import { describe, it, expect } from 'vitest';
import { DECOR } from '../src/content/decor';
import { buildSections } from '../src/content/sections';

const BIOME_IDS = Array.from(new Set(buildSections(1).map((s) => s.biome)));
const HEX = /^#[0-9a-f]{6}$/i;

describe('DECOR config', () => {
  it('has an entry for each BiomeId', () => {
    for (const id of BIOME_IDS) expect(DECOR[id]).toBeDefined();
  });

  it('snow, forest and volcano decorate the top edge; meadow and desert the bottom edge', () => {
    expect(DECOR.snow.edge).toBe('top');
    expect(DECOR.forest.edge).toBe('top');
    expect(DECOR.volcano.edge).toBe('top');
    expect(DECOR.meadow.edge).toBe('bottom');
    expect(DECOR.desert.edge).toBe('bottom');
  });

  it('heights: 5 rows by default, snow and volcano 6, always within 4..6', () => {
    for (const id of BIOME_IDS) {
      expect(DECOR[id].rows).toBeGreaterThanOrEqual(4);
      expect(DECOR[id].rows).toBeLessThanOrEqual(6);
    }
    expect(DECOR.snow.rows).toBe(6);
    expect(DECOR.volcano.rows).toBe(6);
    expect(DECOR.meadow.rows).toBe(5);
  });

  it('palettes are non-empty lists of #rrggbb colours (accents too)', () => {
    for (const id of BIOME_IDS) {
      const d = DECOR[id];
      expect(d.palette.length).toBeGreaterThanOrEqual(3);
      for (const c of d.palette) expect(c).toMatch(HEX);
      for (const c of d.accents ?? []) expect(c).toMatch(HEX);
    }
  });

  it('volcano drip palette contains the glowing lava colours', () => {
    for (const c of ['#ffe08a', '#ffb03a', '#ff6a1a', '#c2300c']) {
      expect(DECOR.volcano.palette).toContain(c);
    }
  });

  it('desert has a 3–4 row top-right corner (moon + stars)', () => {
    const corner = DECOR.desert.corner;
    expect(corner).toBeDefined();
    if (!corner) return;
    expect(corner.rows).toBeGreaterThanOrEqual(3);
    expect(corner.rows).toBeLessThanOrEqual(4);
    expect(corner.cols).toBeGreaterThan(4);
    for (const c of corner.palette) expect(c).toMatch(HEX);
  });
});
