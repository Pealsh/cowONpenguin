import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { pickChar, spacedColumns, tone, type Scene } from './types';

type Vine = { x: number; y0: number; len: number; ph: number; dew: number; dewDur: number; dewY: number; dewV: number };
type Leaf = { x0: number; y: number; vy: number; ph: number; alive: boolean; color: string };

export function createForest(cols: number, rows: number, seed: number, palette = DECOR.forest.palette, accents = DECOR.forest.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const dewColor = accents[2] ?? '#4aa3ff';
  const leafColors = [palette[1] ?? '#57a14a', accents[0] ?? '#b5d13a', accents[1] ?? '#c98a2b'];

  // 樹冠: 1 行目は全面、2 行目はこんもり垂れた所だけ
  const canopyCh: string[] = [];
  const canopyTone: number[] = [];
  const lowCh: string[] = [];
  const flickPh: number[] = [];
  const o1 = rnd() * 10;
  const o2 = rnd() * 10;
  for (let x = 0; x < cols; x++) {
    const bulge = Math.sin(x * 0.38 + o1) * 0.6 + Math.sin(x * 0.13 + o2) * 0.5 + (rnd() - 0.5) * 0.4;
    canopyCh.push(pickChar('@%#&', rnd()));
    canopyTone.push(0.25 + rnd() * 0.5);
    lowCh.push(bulge > 0.35 ? pickChar('%&#@', rnd()) : bulge > 0.1 ? pickChar("~'", rnd()) : ' ');
    flickPh.push(rnd() * 6.28);
  }
  const canopyBottom = (x: number): number => (lowCh[x] === ' ' ? 1 : 2);

  const vines: Vine[] = spacedColumns(cols, rnd, 4, 9).map((x) => {
    const y0 = canopyBottom(x);
    const dewDur = 2 + rnd() * 4;
    return { x, y0, len: Math.max(1, Math.min(rows - y0 - 1, 1 + Math.floor(rnd() * 3))), ph: rnd() * 6.28, dew: rnd() * dewDur, dewDur, dewY: -1, dewV: 0 };
  });

  const leaves: Leaf[] = [];
  for (let i = 0; i < Math.max(2, Math.floor(cols / 10)); i++) {
    leaves.push({ x0: 0, y: 0, vy: 0, ph: 0, alive: false, color: '' });
  }

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
    for (const l of leaves) {
      if (l.alive) {
        l.y += l.vy * dt;
        if (l.y >= rows) l.alive = false;
      } else if (cols > 0 && rnd() < 0.012 * dt * 12 * (cols / 40)) {
        l.alive = true;
        l.x0 = rnd() * cols;
        l.y = 1.5;
        l.vy = 0.6 + rnd() * 0.5;
        l.ph = rnd() * 6.28;
        l.color = leafColors[Math.floor(rnd() * leafColors.length)] ?? '#57a14a';
      }
    }
    for (const v of vines) {
      if (v.dewY >= 0) {
        v.dewV = Math.min(10, v.dewV + 30 * dt);
        v.dewY += v.dewV * dt;
        if (v.dewY >= rows) v.dewY = -1;
      } else {
        v.dew += dt;
        if (v.dew >= v.dewDur) {
          v.dew = 0;
          v.dewDur = 2 + rnd() * 4;
          v.dewY = v.y0 + v.len;
          v.dewV = 1;
        }
      }
    }
  };

  const draw = (grid: CharGrid): void => {
    for (const l of leaves) {
      if (!l.alive) continue;
      const x = l.x0 + Math.sin(t * 2.1 + l.ph) * 1.6;
      const ch = pickChar(",'~'", ((t * 1.7 + l.ph) % 1 + 1) % 1);
      grid.put(x, l.y, ch, l.color, Math.max(0.15, 1 - l.y / rows));
    }
    for (const v of vines) {
      for (let k = 0; k < v.len; k++) {
        const s = Math.sin(t * 1.3 + v.ph + k * 0.7);
        const ch = s > 0.35 ? ')' : s < -0.35 ? '(' : '|';
        const dx = k >= 2 ? Math.round(s * 0.6) : 0;
        grid.put(v.x + dx, v.y0 + k, ch, tone(palette, 0.55 + (k / v.len) * 0.2), 1);
      }
      const endY = v.y0 + v.len;
      if (v.dewY >= 0) grid.put(v.x, v.dewY, '.', dewColor, 0.9);
      else if (v.dew / v.dewDur > 0.8) grid.put(v.x, endY, '.', dewColor, 0.7);
    }
    for (let x = 0; x < cols; x++) {
      // ゆっくり揺れる木漏れ日: たまに明るい緑がちらつく
      const flick = Math.sin(t * 1.9 + (flickPh[x] ?? 0)) > 0.92;
      grid.put(x, 0, canopyCh[x] ?? '@', flick ? tone(palette, 0) : tone(palette, canopyTone[x] ?? 0.5), 1);
      const low = lowCh[x] ?? ' ';
      if (low !== ' ') grid.put(x, 1, low, tone(palette, 0.7), 1);
    }
  };

  return { step, draw };
}
