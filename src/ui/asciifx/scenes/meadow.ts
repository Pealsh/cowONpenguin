import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { sprite, stamp, type Sprite } from '../sprite';
import { tone, type Scene } from './types';

/** 2 行の草の房。'\' '|' '/' は風でしなる葉、それ以外は静的な飾り */
const TUFTS: readonly Sprite[] = [
  sprite([' \\|/ ', '\\\\|//']),
  sprite([' \\|/', '\\\\|/']),
  sprite(['  ,  ', ' \\|/ ']),
  sprite([' \\ / ', '\\\\|//']),
  sprite(['\\|/', '\\|/']),
];

/** 蝶: 開いた羽 / 閉じた羽 (2 行 × 4 列, 胴は中央 2 列) */
const FLY_OPEN = sprite(['(\\/)', '(/\\)']);
const FLY_SHUT = sprite([' \\/ ', ' }{ ']);

const HEADS: readonly Sprite[] = [sprite(['(@)']), sprite(['*']), sprite(['o'])];

type Tuft = { x: number; s: Sprite };
type Flower = { x: number; stem: number; head: Sprite; color: string };
type Fly = {
  color: string;
  pathT: number;
  speed: number;
  ax: number;
  ay: number;
  p1: number;
  p2: number;
  p3: number;
  // 0 飛行, 1 花へ降下, 2 とまる, 3 飛び立つ
  state: number;
  timer: number;
  dur: number;
  flower: number;
  x: number;
  y: number;
};

const APPROACH = 0.9;

function leanOf(ch: string): number {
  return ch === '/' ? 1 : ch === '\\' ? -1 : ch === '|' ? 0 : Number.NaN;
}

function ease(v: number): number {
  const c = v < 0 ? 0 : v > 1 ? 1 : v;
  return c * c * (3 - 2 * c);
}

export function createMeadow(cols: number, rows: number, seed: number, palette = DECOR.meadow.palette, accents = DECOR.meadow.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const groundY = rows - 1;
  const tuftY = rows - 3; // 房の上段 (2 行)

  // 地面: \\|// 系の小さな房を隙間なく並べた密な草 (列ごとの基本の傾き)
  const GROUND_BITS = ['\\\\|//', '\\|/', '\\||//', '\\|//'];
  const ground: number[] = [];
  while (ground.length < cols) {
    const bit = GROUND_BITS[Math.floor(rnd() * GROUND_BITS.length)] ?? '|';
    for (let i = 0; i < bit.length && ground.length < cols; i++) ground.push(leanOf(bit.charAt(i)));
  }

  // 房を seeded な間隔で敷き詰める
  const tufts: Tuft[] = [];
  for (let x = Math.floor(rnd() * 2); x < cols; ) {
    const s = TUFTS[Math.floor(rnd() * TUFTS.length)] ?? TUFTS[0]!;
    tufts.push({ x, s });
    x += s.w + 1 + Math.floor(rnd() * 3);
  }

  // いくつかの房に花 (茎 1–2 行 + 頭)
  const flowerColors = accents.slice(0, 3);
  const flowers: Flower[] = [];
  let lastFlower = -99;
  for (const tf of tufts) {
    const cx = tf.x + Math.floor(tf.s.w / 2);
    if (cx >= cols - 1 || cx - lastFlower < 6 || rnd() > 0.45) continue;
    lastFlower = cx;
    flowers.push({
      x: cx,
      stem: rows >= 7 ? 1 + Math.floor(rnd() * 2) : 1,
      head: HEADS[Math.floor(rnd() * HEADS.length)] ?? HEADS[0]!,
      color: flowerColors[Math.floor(rnd() * flowerColors.length)] ?? '#ff4d98',
    });
  }

  const skyMax = Math.max(0, rows - 5); // 蝶スプライト上端の最大行 (下端は rows-4)
  const flies: Fly[] = [];
  const flyCount = cols >= 40 ? 3 : cols >= 20 ? 2 : cols >= 6 ? 1 : 0;
  for (let i = 0; i < flyCount; i++) {
    flies.push({
      color: accents[(3 + i) % Math.max(1, accents.length)] ?? '#e36c00',
      pathT: rnd() * 50,
      speed: (rnd() < 0.5 ? -1 : 1) * (1.2 + rnd() * 1.2),
      ax: 3 + rnd() * 4,
      ay: 0.3 + rnd() * 0.3,
      p1: rnd() * 6.28,
      p2: rnd() * 6.28,
      p3: rnd() * 6.28,
      state: 0,
      timer: 1.5 + rnd() * 5,
      dur: 0,
      flower: -1,
      x: (i + 0.5) * (cols / Math.max(1, flyCount)),
      y: 0,
    });
  }
  const span = cols + 6;
  const gustPh = rnd() * 6.28;
  let t = 0;

  const gust = (): number => 0.6 + 0.4 * Math.sin(t * 0.5 + gustPh) * Math.sin(t * 0.23 + gustPh * 2);
  const wind = (x: number): number => Math.sin(x * 0.3 - t * 2.0) * gust() * 1.8;
  const headDx = (f: Flower): number => {
    const w = wind(f.x);
    return w > 0.6 ? 1 : w < -0.6 ? -1 : 0;
  };
  const headY = (f: Flower): number => tuftY - 1 - f.stem;

  const pathX = (b: Fly, i: number): number => {
    const base = (i + 0.5) * (cols / Math.max(1, flyCount)) + b.pathT * b.speed;
    const v = base + b.ax * Math.sin(b.pathT * 0.7 + b.p1) + 1.5 * Math.sin(b.pathT * 1.9 + b.p2);
    return (((v + 3) % span) + span) % span - 3;
  };
  const pathY = (b: Fly): number => {
    const mid = skyMax / 2;
    const v = mid + mid * (0.75 * Math.sin(b.pathT * 1.1 + b.p3) + 0.25 * Math.sin(b.pathT * 3.1 + b.p1)) + b.ay * Math.sin(t * 6 + b.p2);
    return v < 0 ? 0 : v > skyMax ? skyMax : v;
  };
  const restX = (f: Flower): number => f.x + headDx(f) - 1.5;
  const restY = (f: Flower): number => headY(f) - 2;

  const step = (dt: number): void => {
    t += dt;
    for (let i = 0; i < flies.length; i++) {
      const b = flies[i]!;
      if (b.state !== 2) b.pathT += dt;
      b.timer -= dt;
      if (b.state === 0 && b.timer <= 0) {
        // 誰もとまっていない花を探してとまりに行く
        const pick = flowers.length > 0 ? Math.floor(rnd() * flowers.length) : -1;
        const f = flowers[pick];
        let taken = false;
        for (const o of flies) if (o !== b && o.flower === pick) taken = true;
        if (f && !taken && restY(f) >= 0) {
          b.state = 1;
          b.flower = pick;
          b.timer = APPROACH;
        } else b.timer = 2 + rnd() * 3;
      } else if (b.state === 1 && b.timer <= 0) {
        b.state = 2;
        b.timer = 1 + rnd();
      } else if (b.state === 2 && b.timer <= 0) {
        b.state = 3;
        b.timer = APPROACH;
      } else if (b.state === 3 && b.timer <= 0) {
        b.state = 0;
        b.flower = -1;
        b.timer = 4 + rnd() * 6;
      }
      const px = pathX(b, i);
      const py = pathY(b);
      const f = flowers[b.flower];
      if (b.state === 0 || !f) {
        b.x = px;
        b.y = py;
      } else {
        const k = b.state === 1 ? ease(1 - b.timer / APPROACH) : b.state === 2 ? 1 : ease(b.timer / APPROACH);
        b.x = px + (restX(f) - px) * k;
        b.y = py + (restY(f) - py) * k;
      }
    }
  };

  const groundColor = tone(palette, 1);
  const draw = (grid: CharGrid): void => {
    // 地面: 濃い緑の密な草。風は少しだけ
    for (let x = 0; x < cols; x++) {
      const v = (ground[x] ?? 0) + wind(x) * 0.35;
      grid.put(x, groundY, v > 0.5 ? '/' : v < -0.5 ? '\\' : '|', groundColor, 1);
    }
    // 房: 下段 (根元) はあまりしならず、上段 (先端) ほど風に流れる
    for (const tf of tufts) {
      for (let cy = 0; cy < tf.s.h; cy++) {
        const line = tf.s.lines[cy] ?? '';
        const tip = cy === 0;
        const amp = tip ? 1.0 : 0.65;
        for (let cx = 0; cx < line.length; cx++) {
          const src = line.charAt(cx);
          if (src === ' ') continue;
          const x = tf.x + cx;
          const y = tuftY + cy;
          const base = leanOf(src);
          let ch = src;
          if (!Number.isNaN(base)) {
            const v = base + wind(x) * amp;
            if (tip && base === 0 && Math.abs(v) > 0.4 && Math.abs(v) <= 0.62) ch = v > 0 ? ')' : '(';
            else ch = v > 0.5 ? '/' : v < -0.5 ? '\\' : '|';
          }
          grid.put(x, y, ch, tone(palette, tip ? 0.45 : 0.75), 1);
        }
      }
    }
    // 花: 茎は風の向きに傾き、頭は ±1 列揺れる
    for (const f of flowers) {
      const dx = headDx(f);
      const hy = headY(f);
      for (let k = 0; k < f.stem; k++) {
        const top = k === f.stem - 1;
        grid.put(f.x, tuftY - 1 - k, top && dx !== 0 ? (dx > 0 ? '/' : '\\') : '|', tone(palette, 0.6), 1);
      }
      stamp(grid, f.head, f.x + dx - Math.floor(f.head.w / 2), hy, f.color);
    }
    // 蝶: 飛行中は 0.2 s 毎に羽ばたき、とまっている間はゆっくり開閉
    for (let i = 0; i < flies.length; i++) {
      const b = flies[i]!;
      const period = b.state === 2 ? 0.7 : 0.2;
      const open = Math.floor((t + b.p1) / period) % 2 === 0;
      stamp(grid, open ? FLY_OPEN : FLY_SHUT, Math.round(b.x), Math.round(b.y), b.color);
    }
  };

  return { step, draw };
}
