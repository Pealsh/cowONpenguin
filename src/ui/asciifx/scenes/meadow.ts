import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { pickChar, tone, type Scene } from './types';

type Flower = { x: number; ch: string; color: string };
type Butterfly = { x: number; y: number; tx: number; ty: number; speed: number; ph: number };

export function createMeadow(cols: number, rows: number, seed: number, palette = DECOR.meadow.palette, accents = DECOR.meadow.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const grassRows = Math.min(rows, rows >= 5 ? 4 : 3);
  // 各列の草丈 (1..grassRows)。0 は草無し
  const height: number[] = [];
  const phase: number[] = [];
  for (let x = 0; x < cols; x++) {
    const r = rnd();
    height.push(r < 0.08 ? 0 : Math.max(1, Math.min(grassRows, 1 + Math.floor(rnd() * grassRows + 0.4 * Math.sin(x * 0.3)))));
    phase.push((rnd() - 0.5) * 0.8);
  }
  const flowerColors = accents.slice(0, 3);
  const flowers: Flower[] = [];
  for (let x = 1; x < cols - 1; x++) {
    if ((height[x] ?? 0) >= 2 && rnd() < 0.12) {
      flowers.push({ x, ch: pickChar('*@o', rnd()), color: flowerColors[Math.floor(rnd() * flowerColors.length)] ?? '#ff5fa2' });
      x += 2;
    }
  }
  const flyColor = accents[3] ?? '#ff8a1f';
  const skyRows = Math.max(1, rows - 2);
  const flies: Butterfly[] = [];
  const flyCount = cols >= 30 ? 2 : cols >= 6 ? 1 : 0;
  for (let i = 0; i < flyCount; i++) {
    flies.push({ x: rnd() * (cols - 2), y: rnd() * skyRows, tx: rnd() * (cols - 2), ty: rnd() * skyRows, speed: 2 + rnd() * 2, ph: rnd() * 6.28 });
  }
  const gustPh = rnd() * 6.28;
  let t = 0;

  const wind = (x: number): number => {
    const gust = 0.55 + 0.45 * Math.sin(t * 0.45 + gustPh);
    return gust * Math.sin(x * 0.35 - t * 2.2) * 1.1 + (phase[x] ?? 0) * 0.35;
  };

  const step = (dt: number): void => {
    t += dt;
    for (const b of flies) {
      const dx = b.tx - b.x;
      const dy = b.ty - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.6) {
        b.tx = rnd() * Math.max(1, cols - 2);
        b.ty = rnd() * skyRows;
      } else {
        b.x += (dx / d) * b.speed * dt;
        b.y += (dy / d) * b.speed * 0.5 * dt;
      }
    }
  };

  const draw = (grid: CharGrid): void => {
    for (let x = 0; x < cols; x++) {
      const h = height[x] ?? 0;
      const w = wind(x);
      for (let k = 0; k < h; k++) {
        // k=0 が根元。上ほど風で大きくしなる
        const lean = w * ((k + 1) / grassRows);
        const ch = lean > 0.3 ? '/' : lean < -0.3 ? '\\' : '|';
        const y = rows - 1 - k;
        grid.put(x, y, ch, tone(palette, 1 - (k + 1) / (grassRows + 0.5)), 1);
      }
      if (h === 0) grid.put(x, rows - 1, pickChar(".,'", (phase[x] ?? 0) + 0.5), tone(palette, 0.9), 0.8);
    }
    for (const f of flowers) {
      const h = height[f.x] ?? 1;
      const w = wind(f.x);
      const dx = w > 0.55 ? 1 : w < -0.55 ? -1 : 0;
      grid.put(f.x + dx, rows - 1 - h, f.ch, f.color, 1);
    }
    for (const b of flies) {
      const open = Math.floor((t + b.ph) / 0.15) % 2 === 0;
      const y = b.y + Math.sin(t * 5 + b.ph) * 0.4;
      grid.put(b.x, y, open ? '}' : '>', flyColor, 1);
      grid.put(b.x + 1, y, open ? '{' : '<', flyColor, 1);
    }
  };

  return { step, draw };
}
