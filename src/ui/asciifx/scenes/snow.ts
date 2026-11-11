import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { clamp01, spacedColumns, tone, type Scene } from './types';

type Icicle = {
  x: number;
  y0: number; // 根元の行 (雪冠のすぐ下)
  len: number;
  growDur: number;
  grow: number; // 雫の成長 (秒)
  dropY: number; // 落下中の雫の行 (<0 なら成長中)
  dropV: number;
  splash: number; // 着地後のフレーム数 (<0 なら無し)
};

type Flake = { x: number; y: number; vy: number; ph: number; ch: string };

const GRAVITY = 40; // rows/s²
const MAX_FALL = 12.5; // 1 row ≈ 0.08 s

export function createSnow(cols: number, rows: number, seed: number, palette = DECOR.snow.palette, accents = DECOR.snow.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const sparkleColor = accents[0] ?? '#1f8bff';
  const iceColor = accents[1] ?? '#6fb6e8';
  const dropColor = accents[2] ?? '#3d9bea';

  // 雪冠: 1 行目は常に積もり、2 行目は滑らかなノイズで盛り上がった所だけ
  const capTop: string[] = [];
  const capLow: number[] = []; // 2 行目の濃さ (0 なら無し)
  const n1 = rnd() * 10;
  const n2 = rnd() * 10;
  for (let x = 0; x < cols; x++) {
    const lump = 0.5 + 0.35 * Math.sin(x * 0.45 + n1) + 0.25 * Math.sin(x * 0.17 + n2) + (rnd() - 0.5) * 0.3;
    capTop.push(lump > 0.75 ? '@' : lump > 0.35 ? '#' : '%');
    capLow.push(lump > 0.55 ? clamp01(lump) : 0);
  }
  const capHeight = (x: number): number => ((capLow[x] ?? 0) > 0 ? 2 : 1);

  const icicles: Icicle[] = spacedColumns(cols, rnd, 2, 5).map((x) => {
    const y0 = capHeight(x);
    const len = Math.max(1, Math.min(4, rows - y0 - 1, 1 + Math.floor(rnd() * 4)));
    const growDur = 1.5 + rnd() * 2.5;
    return { x, y0, len, growDur, grow: rnd() * growDur, dropY: -1, dropV: 0, splash: -1 };
  });

  const flakes: Flake[] = [];
  const flakeCount = Math.max(1, Math.floor(cols / 12));
  for (let i = 0; i < flakeCount; i++) {
    flakes.push({ x: rnd() * cols, y: 1 + rnd() * (rows - 1), vy: 0.5 + rnd() * 0.6, ph: rnd() * 6.28, ch: rnd() < 0.5 ? '.' : "'" });
  }

  let t = 0;
  let sparkX = -1;
  let sparkLeft = 0;

  const step = (dt: number): void => {
    t += dt;
    for (const ic of icicles) {
      if (ic.splash >= 0) {
        ic.splash++;
        if (ic.splash > 3) {
          ic.splash = -1;
          ic.grow = 0;
          ic.growDur = 1.5 + rnd() * 2.5;
        }
      } else if (ic.dropY >= 0) {
        ic.dropV = Math.min(MAX_FALL, ic.dropV + GRAVITY * dt);
        ic.dropY += ic.dropV * dt;
        if (ic.dropY >= rows - 1) {
          ic.dropY = -1;
          ic.splash = 0;
        }
      } else {
        ic.grow += dt;
        if (ic.grow >= ic.growDur) {
          ic.dropY = ic.y0 + ic.len;
          ic.dropV = 2;
        }
      }
    }
    for (const f of flakes) {
      f.y += f.vy * dt;
      if (f.y >= rows) {
        f.y = 1;
        f.x = rnd() * cols;
      }
    }
    if (sparkLeft > 0) sparkLeft--;
    else if (cols > 0 && rnd() < 0.18) {
      sparkX = Math.floor(rnd() * cols);
      sparkLeft = 2;
    }
  };

  const draw = (grid: CharGrid): void => {
    for (const f of flakes) {
      grid.put(f.x + Math.sin(t * 1.4 + f.ph) * 1.2, f.y, f.ch, palette[2] ?? iceColor, 0.45);
    }
    for (let x = 0; x < cols; x++) {
      grid.put(x, 0, capTop[x] ?? '#', tone(palette, 0.35), 1);
      const low = capLow[x] ?? 0;
      if (low > 0) grid.put(x, 1, low > 0.85 ? '*' : low > 0.7 ? '+' : '=', tone(palette, 0.75), 0.9);
    }
    for (const ic of icicles) {
      for (let k = 0; k < ic.len; k++) {
        const last = k === ic.len - 1;
        const ch = last ? (ic.len >= 3 ? '!' : "'") : k === 0 && ic.len >= 3 ? '#' : '|';
        // 根元は影の濃い青、先端ほど氷の淡い青
        const color = k === 0 ? tone(palette, 0.9) : last ? iceColor : tone(palette, 0.65);
        grid.put(ic.x, ic.y0 + k, ch, color, last ? 0.85 : 1);
      }
      const tipY = ic.y0 + ic.len;
      if (ic.dropY < 0 && ic.splash < 0) {
        const g = ic.grow / ic.growDur;
        if (g > 0.25) grid.put(ic.x, tipY, g > 0.7 ? 'o' : '.', dropColor, 0.5 + g * 0.5);
      } else if (ic.dropY >= 0) {
        grid.put(ic.x, ic.dropY, ic.dropV > 8 ? ':' : 'o', dropColor, 0.95);
      } else if (ic.splash >= 0) {
        const a = 1 - ic.splash / 4;
        grid.put(ic.x, rows - 1, ic.splash === 0 ? '*' : '.', dropColor, a);
        if (ic.splash <= 1) {
          grid.put(ic.x - 1, rows - 1, '.', dropColor, a * 0.7);
          grid.put(ic.x + 1, rows - 1, '.', dropColor, a * 0.7);
        }
      }
    }
    if (sparkLeft > 0 && sparkX >= 0) grid.put(sparkX, 0, '*', sparkleColor, 1);
  };

  return { step, draw };
}
