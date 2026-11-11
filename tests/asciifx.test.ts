import { describe, it, expect } from 'vitest';
import { RAMP, shade } from '../src/ui/asciifx/ramp';
import { CharGrid } from '../src/ui/asciifx/grid';
import { mulberry32, seedFor } from '../src/ui/asciifx/rng';

describe('ramp.shade', () => {
  it('maps 0 to space and 1 to @', () => {
    expect(shade(0)).toBe(' ');
    expect(shade(1)).toBe('@');
  });

  it('clamps values outside 0..1', () => {
    expect(shade(-5)).toBe(' ');
    expect(shade(7)).toBe('@');
    expect(shade(Number.NaN)).toBe(' ');
  });

  it('is monotonic (ramp index never decreases as v increases)', () => {
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const idx = RAMP.indexOf(shade(i / 200));
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
    expect(prev).toBe(RAMP.length - 1);
  });
});

describe('CharGrid', () => {
  it('toLines returns rows lines of exactly cols chars', () => {
    const g = new CharGrid(7, 3);
    const lines = g.toLines();
    expect(lines.length).toBe(3);
    for (const l of lines) expect(l.length).toBe(7);
    expect(lines[0]).toBe('       ');
  });

  it('put writes a cell and ignores out-of-bounds writes', () => {
    const g = new CharGrid(4, 2);
    g.put(1, 1, '#', '#ff0000', 0.5);
    g.put(-1, 0, 'x', '#000', 1);
    g.put(4, 0, 'x', '#000', 1);
    g.put(0, 2, 'x', '#000', 1);
    g.put(0, -1, 'x', '#000', 1);
    g.put(Number.NaN, 0, 'x', '#000', 1);
    expect(g.toLines()).toEqual(['    ', ' #  ']);
    expect(g.colorAt(1, 1)).toBe('#ff0000');
    expect(g.alphaAt(1, 1)).toBeCloseTo(0.5);
    expect(g.chAt(9, 9)).toBe(' ');
  });

  it('floors fractional coordinates', () => {
    const g = new CharGrid(3, 2);
    g.put(1.7, 0.9, '*', '#000', 1);
    expect(g.toLines()).toEqual([' * ', '   ']);
  });

  it('clear resets every cell to space', () => {
    const g = new CharGrid(3, 1);
    g.put(0, 0, '@', '#000', 1);
    g.clear();
    expect(g.toLines()).toEqual(['   ']);
  });

  it('handles a zero-sized grid', () => {
    const g = new CharGrid(0, 2);
    expect(g.toLines()).toEqual(['', '']);
  });
});

describe('rng', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds give different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('seedFor differs per biome and per index', () => {
    expect(seedFor('snow', 0)).toBe(seedFor('snow', 0));
    expect(seedFor('snow', 0)).not.toBe(seedFor('snow', 1));
    expect(seedFor('snow', 0)).not.toBe(seedFor('meadow', 0));
  });
});
