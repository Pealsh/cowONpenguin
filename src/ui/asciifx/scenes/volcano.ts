import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { pickChar, spacedColumns, type Scene } from './types';

type Drip = {
  x: number;
  len: number;
  period: number;
  ph: number;
  grow: number;
  growDur: number;
  blobY: number; // <0 なら成長中
  blobV: number;
  splat: number; // <0 なら無し
};
type Ember = { x: number; y: number; vy: number; ph: number; alive: boolean };
type Bubble = { x: number; age: number }; // age<0 なら非活性

export function createVolcano(cols: number, rows: number, seed: number, palette = DECOR.volcano.palette, accents = DECOR.volcano.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const lava = palette.slice(0, 4); // 明→暗の溶岩色
  const crustA = palette[4] ?? '#6b1a0a';
  const crustB = palette[5] ?? '#2a0d08';
  const smokeColor = accents[0] ?? '#8a7f7a';
  const lavaAt = (v: number): string => lava[Math.max(0, Math.min(lava.length - 1, Math.round(v * (lava.length - 1))))] ?? '#ff6a1a';

  const crustCh: string[] = [];
  const crustDark: boolean[] = [];
  for (let x = 0; x < cols; x++) {
    crustCh.push(pickChar('vVwW', rnd()));
    crustDark.push(rnd() < 0.45);
  }

  const drips: Drip[] = spacedColumns(cols, rnd, 2, 5).map((x) => {
    const growDur = 1.5 + rnd() * 3;
    return {
      x,
      len: Math.max(1, Math.min(4, rows - 2, 1 + Math.floor(rnd() * 4))),
      period: 1.2 + rnd() * 0.8,
      ph: rnd() * 6.28,
      grow: rnd() * growDur,
      growDur,
      blobY: -1,
      blobV: 0,
      splat: -1,
    };
  });

  const embers: Ember[] = [];
  for (let i = 0; i < Math.max(2, Math.floor(cols / 8)); i++) embers.push({ x: 0, y: 0, vy: 0, ph: 0, alive: false });
  const bubbles: Bubble[] = [{ x: 0, age: -1 }, { x: 0, age: -1 }];
  const smokePh = rnd() * 6.28;

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
    for (const d of drips) {
      if (d.splat >= 0) {
        d.splat++;
        if (d.splat > 3) {
          d.splat = -1;
          d.grow = 0;
          d.growDur = 1.5 + rnd() * 3;
        }
      } else if (d.blobY >= 0) {
        d.blobV = Math.min(10, d.blobV + 30 * dt);
        d.blobY += d.blobV * dt;
        if (d.blobY >= rows - 1) {
          d.blobY = -1;
          d.splat = 0;
        }
      } else {
        d.grow += dt;
        if (d.grow >= d.growDur) {
          d.blobY = 1 + d.len;
          d.blobV = 1.5;
        }
      }
    }
    for (const e of embers) {
      if (e.alive) {
        e.y -= e.vy * dt;
        if (e.y < 1) e.alive = false;
      } else if (cols > 0 && rnd() < 0.06) {
        e.alive = true;
        e.x = rnd() * cols;
        e.y = rows - 1;
        e.vy = 1.2 + rnd() * 1.6;
        e.ph = rnd() * 6.28;
      }
    }
    for (const b of bubbles) {
      if (b.age >= 0) {
        b.age += dt;
        if (b.age > 0.75) b.age = -1;
      } else if (cols > 0 && rnd() < 0.04) {
        b.age = 0;
        b.x = Math.floor(rnd() * cols);
      }
    }
  };

  const draw = (grid: CharGrid): void => {
    // 薄い煙の帯 (最背面, 低 alpha) が横へ流れる
    for (let x = 0; x < cols; x++) {
      const s = Math.sin(x * 0.22 + t * 0.9 + smokePh) + Math.sin(x * 0.07 - t * 0.4);
      if (s > 1.1) grid.put(x, Math.min(rows - 1, 2), '~', smokeColor, 0.18 + (s - 1.1) * 0.12);
    }
    for (const e of embers) {
      if (!e.alive) continue;
      const fade = (e.y - 1) / (rows - 2);
      grid.put(e.x + Math.sin(t * 3 + e.ph) * 0.8, e.y, fade > 0.5 ? "'" : '.', lavaAt(fade > 0.5 ? 1 : 2), Math.max(0.15, fade));
    }
    for (const d of drips) {
      const pulse = 0.5 + 0.5 * Math.sin((t / d.period) * 6.283 + d.ph);
      for (let k = 0; k < d.len; k++) {
        const last = k === d.len - 1;
        const ch = last ? (d.len >= 3 ? '!' : "'") : k === 0 && d.len >= 3 ? '#' : '|';
        // 根元ほど冷えて暗く、脈動で明るさが揺れる
        const v = 0.15 + (1 - pulse) * 0.5 + (1 - (k + 1) / (d.len + 1)) * 0.35;
        grid.put(d.x, 1 + k, ch, lavaAt(v), 1);
      }
      const tipY = 1 + d.len;
      if (d.blobY < 0 && d.splat < 0) {
        const g = d.grow / d.growDur;
        if (g > 0.3) grid.put(d.x, tipY, g > 0.75 ? 'o' : '.', lavaAt(0.2), 0.6 + g * 0.4);
      } else if (d.blobY >= 0) {
        grid.put(d.x, d.blobY, 'o', lavaAt(0.1), 1);
      } else {
        const a = 1 - d.splat / 4;
        grid.put(d.x, rows - 1, d.splat === 0 ? '*' : '.', lavaAt(d.splat === 0 ? 0 : 0.5), a);
        if (d.splat <= 1) {
          grid.put(d.x - 1, rows - 1, '.', lavaAt(0.5), a * 0.7);
          grid.put(d.x + 1, rows - 1, '.', lavaAt(0.5), a * 0.7);
        }
      }
    }
    for (let x = 0; x < cols; x++) grid.put(x, 0, crustCh[x] ?? 'v', crustDark[x] ? crustB : crustA, 1);
    for (const b of bubbles) {
      if (b.age < 0) continue;
      const ch = b.age < 0.3 ? 'o' : b.age < 0.55 ? 'O' : '*';
      grid.put(b.x, 0, ch, lavaAt(b.age < 0.55 ? 0.3 : 0), 1);
    }
  };

  return { step, draw };
}
