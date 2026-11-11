import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { tone, type Scene } from './types';
import { shade } from '../ramp';

type Grain = { x: number; speed: number; hop: number; ch: string };

export function createDesert(cols: number, rows: number, seed: number, palette = DECOR.desert.palette): Scene {
  const rnd = mulberry32(seed);
  const duneRows = Math.min(rows, 3);
  const a1 = rnd() * 6.28;
  const a2 = rnd() * 6.28;
  const f1 = 0.07 + rnd() * 0.04;
  const f2 = 0.17 + rnd() * 0.06;
  // 砂丘の高さ (0..duneRows) を列ごとに。小数部で稜線文字 _ - ~ を選ぶ
  const h: number[] = [];
  for (let x = 0; x <= cols; x++) {
    const v = 0.55 + 0.32 * Math.sin(x * f1 + a1) + 0.13 * Math.sin(x * f2 + a2);
    h.push(Math.max(0.2, Math.min(duneRows - 0.01, v * duneRows)));
  }
  const tex: number[] = [];
  for (let i = 0; i < cols * duneRows; i++) tex.push(rnd());

  const grains: Grain[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(cols / 6)); i++) {
    grains.push({ x: rnd() * cols, speed: 3 + rnd() * 5, hop: rnd() * 6.28, ch: rnd() < 0.5 ? '.' : ',' });
  }
  const ridgeY = (x: number): number => rows - 1 - Math.floor(h[x] ?? 0);

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
    for (const g of grains) {
      g.x += g.speed * dt;
      if (g.x >= cols) g.x -= cols;
    }
  };

  const draw = (grid: CharGrid): void => {
    for (let x = 0; x < cols; x++) {
      const hx = h[x] ?? 0;
      const top = ridgeY(x);
      const frac = hx - Math.floor(hx);
      // 光は左上から: 右下がりの斜面 (風下) は影で濃く
      const slope = (h[x + 1] ?? hx) - hx;
      const lee = slope < -0.05;
      const ridge = frac < 0.33 ? '_' : frac < 0.66 ? '-' : '~';
      grid.put(x, top, ridge, tone(palette, lee ? 0.75 : 0.5), 1);
      for (let y = top + 1; y < rows; y++) {
        const depth = (y - top) / duneRows;
        const n = tex[(y - (rows - duneRows)) * cols + x] ?? 0.5;
        const ch = shade(Math.min(0.41, 0.1 + depth * 0.2 + (lee ? 0.08 : 0) + n * 0.1));
        if (ch !== ' ') grid.put(x, y, ch, tone(palette, 0.45 + depth * 0.3 + (lee ? 0.2 : 0)), 0.85);
      }
    }
    for (const g of grains) {
      const x = Math.floor(g.x);
      const lift = Math.sin(t * 6 + g.hop) > 0.85 ? 1 : 0;
      grid.put(x, ridgeY(x) - 1 - lift, g.ch, tone(palette, 0.8), 0.9);
    }
  };

  return { step, draw };
}

type Star = { x: number; y: number; ph: number; speed: number };

/** 右上の飾り: 影付きの三日月と瞬く星 */
export function createDesertCorner(cols: number, rows: number, seed: number, palette = DECOR.desert.corner?.palette ?? []): Scene {
  const rnd = mulberry32(seed);
  const ASPECT = 0.55; // 文字セル 幅/高さ
  const r = Math.min(rows / 2, 2) - 0.05;
  const cx = cols - 1 - r / ASPECT - 0.5;
  const cy = rows / 2;
  const cover = (px: number, py: number): number => {
    let hit = 0;
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 4; sx++) {
        const dx = (px + (sx + 0.5) / 4 - cx) * ASPECT;
        const dy = py + (sy + 0.5) / 4 - cy;
        const inA = dx * dx + dy * dy <= r * r;
        const bx = dx - r * 0.5;
        const by = dy;
        const inB = bx * bx + by * by <= r * r * 0.8;
        if (inA && !inB) hit++;
      }
    }
    return hit / 16;
  };
  const moon: number[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) moon.push(cols > 0 ? cover(x, y) : 0);

  const stars: Star[] = [];
  const want = 4 + Math.floor(rnd() * 3);
  for (let tries = 0; tries < 60 && stars.length < want && cols > 0; tries++) {
    const x = Math.floor(rnd() * cols);
    const y = Math.floor(rnd() * rows);
    if ((moon[y * cols + x] ?? 0) > 0 || (x - cx) * ASPECT * (x - cx) * ASPECT + (y - cy) * (y - cy) < (r + 0.6) * (r + 0.6)) continue;
    if (stars.some((s) => Math.abs(s.x - x) + Math.abs(s.y - y) < 2)) continue;
    stars.push({ x, y, ph: rnd() * 6.28, speed: 1.2 + rnd() * 2 });
  }
  const starColor = palette[3] ?? '#8a7a4a';

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
  };
  const draw = (grid: CharGrid): void => {
    const glow = 0.85 + 0.15 * Math.sin(t * 0.8);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = moon[y * cols + x] ?? 0;
        if (c <= 0.05) continue;
        // 左の縁は ( で輪郭、厚い所は @ %, 薄い所は .
        const left = (moon[y * cols + x - 1] ?? 0) <= 0.05 || x === 0;
        const ch = c > 0.7 ? (left ? '(' : '@') : c > 0.4 ? (left ? '(' : '%') : '.';
        grid.put(x, y, ch, tone(palette.slice(0, 3), 1 - c), glow);
      }
    }
    for (const s of stars) {
      const v = Math.sin(t * s.speed + s.ph);
      grid.put(s.x, s.y, v > 0.6 ? '*' : v > -0.1 ? '+' : '.', starColor, v > 0.6 ? 1 : 0.7);
    }
  };
  return { step, draw };
}
