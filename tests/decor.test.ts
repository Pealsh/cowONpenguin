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

  it('heights: within 4..10, sprite biomes taller', () => {
    for (const id of BIOME_IDS) {
      expect(DECOR[id].rows).toBeGreaterThanOrEqual(4);
      expect(DECOR[id].rows).toBeLessThanOrEqual(10);
    }
    expect(DECOR.snow.rows).toBe(10);
    expect(DECOR.volcano.rows).toBe(6);
    expect(DECOR.meadow.rows).toBe(8);
    expect(DECOR.desert.rows).toBe(9);
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
    for (const c of ['#bc8a00', '#d27d00', '#fd5800', '#c2300c']) {
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

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
}
function contrastOnWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

describe('DECOR contrast on white panels', () => {
  it('every palette / accent / corner colour is >= 3:1 against #ffffff (faint colours excluded)', () => {
    for (const id of BIOME_IDS) {
      const d = DECOR[id];
      const colours = [...d.palette, ...(d.accents ?? []), ...(d.corner?.palette ?? [])];
      for (const c of colours) {
        expect(contrastOnWhite(c), `${id} ${c}`).toBeGreaterThanOrEqual(3);
      }
      for (const c of d.faint ?? []) expect(c).toMatch(HEX);
    }
  });

  it('palettes stay ordered light -> dark', () => {
    for (const id of BIOME_IDS) {
      const p = DECOR[id].palette;
      for (let i = 1; i < p.length; i++) {
        expect(luminance(p[i] ?? '#000000')).toBeLessThanOrEqual(luminance(p[i - 1] ?? '#ffffff'));
      }
    }
  });
});
