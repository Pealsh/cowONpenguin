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

// ---- biome scenes -------------------------------------------------------
import { createSnow } from '../src/ui/asciifx/scenes/snow';
import { createMeadow } from '../src/ui/asciifx/scenes/meadow';
import { createForest } from '../src/ui/asciifx/scenes/forest';
import { createDesert, createDesertCorner } from '../src/ui/asciifx/scenes/desert';
import { createVolcano } from '../src/ui/asciifx/scenes/volcano';
import type { Scene } from '../src/ui/asciifx/scenes/types';
import { DECOR } from '../src/content/decor';

const STEP = 1 / 12;
type Factory = (cols: number, rows: number, seed: number) => Scene;
const SCENES: Array<[string, Factory, number]> = [
  ['snow', createSnow, DECOR.snow.rows],
  ['meadow', createMeadow, DECOR.meadow.rows],
  ['forest', createForest, DECOR.forest.rows],
  ['desert', createDesert, DECOR.desert.rows],
  ['desert-corner', createDesertCorner, 4],
  ['volcano', createVolcano, DECOR.volcano.rows],
];

function run(f: Factory, cols: number, rows: number, seed: number, seconds: number): CharGrid {
  const scene = f(cols, rows, seed);
  const grid = new CharGrid(cols, rows);
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) scene.step(STEP);
  grid.clear();
  scene.draw(grid);
  return grid;
}

describe.each(SCENES)('scene %s', (_name, factory, rows) => {
  const cols = 48;

  it('draws in-bounds and non-empty after 5 s', () => {
    const grid = run(factory, cols, rows, 7, 5);
    const lines = grid.toLines();
    expect(lines.length).toBe(rows);
    for (const l of lines) expect(l.length).toBe(cols);
    expect(lines.join('').trim().length).toBeGreaterThan(0);
  });

  it('is deterministic per seed and differs across seeds', () => {
    const a = run(factory, cols, rows, 11, 5).toLines();
    const b = run(factory, cols, rows, 11, 5).toLines();
    const c = run(factory, cols, rows, 12, 5).toLines();
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('survives tiny and zero-width grids', () => {
    expect(() => run(factory, 0, rows, 1, 1)).not.toThrow();
    expect(() => run(factory, 3, rows, 1, 1)).not.toThrow();
  });
});

describe('snow specifics', () => {
  it('a drop reaches the bottom row within 6 s', () => {
    const rows = DECOR.snow.rows;
    const scene = createSnow(60, rows, 3);
    const grid = new CharGrid(60, rows);
    let hit = false;
    for (let i = 0; i < 72 && !hit; i++) {
      scene.step(STEP);
      grid.clear();
      scene.draw(grid);
      const last = grid.toLines()[rows - 1] ?? '';
      if (/[*.]/.test(last)) hit = true;
    }
    expect(hit).toBe(true);
  });
});

describe('volcano specifics', () => {
  it('uses a palette colour other than the crust colour (glowing drips)', () => {
    const rows = DECOR.volcano.rows;
    const grid = run(createVolcano, 60, rows, 5, 3);
    const crust = grid.colorAt(0, 0);
    const lava = new Set(['#ffe08a', '#ffb03a', '#ff6a1a', '#c2300c']);
    let found = false;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < 60; x++) {
        const c = grid.colorAt(x, y);
        if (grid.chAt(x, y) !== ' ' && c !== crust && lava.has(c)) found = true;
      }
    }
    expect(found).toBe(true);
  });
});

describe('meadow specifics', () => {
  it('the blade in a fixed column changes between t=0 and t=1 s (wind)', () => {
    const rows = DECOR.meadow.rows;
    const g0 = run(createMeadow, 60, rows, 9, 0);
    const g1 = run(createMeadow, 60, rows, 9, 1);
    const blade = /[/|\\]/;
    // どこかのセルで、両時刻とも blade 文字なのに向きが変わっていること
    let changed = false;
    for (let x = 0; x < 60; x++) {
      for (let y = 0; y < rows; y++) {
        const a = g0.chAt(x, y);
        const b = g1.chAt(x, y);
        if (blade.test(a) && blade.test(b) && a !== b) changed = true;
      }
    }
    expect(changed).toBe(true);
  });
});

// ---- sprite helper ------------------------------------------------------
import { sprite, stamp } from '../src/ui/asciifx/sprite';

describe('sprite / stamp', () => {
  it('sprite width is the longest line and height the line count', () => {
    const s = sprite([' /\\', '/  \\', 'x']);
    expect(s.w).toBe(4);
    expect(s.h).toBe(3);
    expect(s.lines).toEqual([' /\\', '/  \\', 'x']);
  });

  it('stamp skips spaces so the cell behind stays', () => {
    const g = new CharGrid(4, 2);
    g.put(1, 0, '#', '#111111', 1);
    stamp(g, sprite(['a b', ' c ']), 0, 0, '#222222');
    expect(g.toLines()).toEqual(['a#b ', ' c  ']);
    expect(g.colorAt(1, 0)).toBe('#111111');
    expect(g.colorAt(0, 0)).toBe('#222222');
  });

  it('stamp clips at all four edges without throwing', () => {
    const g = new CharGrid(3, 3);
    const s = sprite(['abc', 'def', 'ghi']);
    expect(() => {
      stamp(g, s, -2, 0, '#000000');
      stamp(g, s, 2, 0, '#000000');
      stamp(g, s, 0, -2, '#000000');
      stamp(g, s, 0, 2, '#000000');
      stamp(g, s, 99, 99, '#000000');
      stamp(new CharGrid(0, 0), s, 0, 0, '#000000');
    }).not.toThrow();
    const g2 = new CharGrid(3, 3);
    stamp(g2, s, -1, -1, '#000000');
    expect(g2.toLines()).toEqual(['ef ', 'hi ', '   ']);
    const g3 = new CharGrid(3, 3);
    stamp(g3, s, 2, 2, '#000000');
    expect(g3.toLines()).toEqual(['   ', '   ', '  a']);
  });

  it('colour callback receives the char and local coords, alpha applies', () => {
    const g = new CharGrid(5, 3);
    const seen: string[] = [];
    stamp(g, sprite(['ab', ' c']), 2, 1, (ch, cx, cy) => {
      seen.push(`${ch}${cx}${cy}`);
      return ch === 'c' ? '#00ff00' : '#ff0000';
    }, 0.5);
    expect(seen).toEqual(['a00', 'b10', 'c11']);
    expect(g.colorAt(3, 2)).toBe('#00ff00');
    expect(g.colorAt(2, 1)).toBe('#ff0000');
    expect(g.alphaAt(2, 1)).toBeCloseTo(0.5);
  });
});
