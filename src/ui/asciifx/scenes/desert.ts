import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { sprite, type Sprite } from '../sprite';
import { tone, type Scene } from './types';

/** 大きなサグアロ (7 行) と小さなサボテン (5 行) */
const CACTUS_BIG = sprite(['     _', '    | |', ' _  | |  _', '| |_| |_| |', ' \\__   __/', '    | |', '    | |']);
const CACTUS_SMALL = sprite(['  _', ' | |_', '_| | |', ' | |/', ' | |']);
/** 転がる回転草の 3 コマ */
const WEED: readonly Sprite[] = [
  sprite([' ,@@,', '@(  )@', " '@@'"]),
  sprite([' .%@,', '%(  )@', " '@%'"]),
  sprite([' ,@%.', '@(  )%', " '%@'"]),
];
const WEED_FRAME = 0.12;
const DUST_LIFE = 0.6;

type Cactus = { x: number; s: Sprite; trunk: number };
type Grain = { x: number; speed: number; hop: number };
type Dust = { alive: boolean; x: number; y: number; age: number; ch: string };

/** 稜線の高さ 0..2 (最下行の底 = 0) を 1 行内の位置で文字に */
function ridgeChar(frac: number, slope: number): string {
  if (frac >= 0.8) return "'";
  if (frac >= 0.45) return Math.abs(slope) < 0.05 ? '~' : '-';
  if (frac >= 0.25) return '.';
  return '_';
}

export function createDesert(cols: number, rows: number, seed: number, palette = DECOR.desert.palette, accents = DECOR.desert.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const cactusMid = accents[0] ?? '#4a8a32';
  const cactusDark = accents[1] ?? '#2f6624';
  const bottom = rows - 1;

  // 砂丘: 最下 2 行に収まるうねり
  const a1 = rnd() * 6.28;
  const a2 = rnd() * 6.28;
  const f1 = 0.13 + rnd() * 0.05;
  const f2 = 0.33 + rnd() * 0.08;
  const h: number[] = [];
  for (let x = 0; x <= cols; x++) {
    const v = 0.5 + 0.42 * Math.sin(x * f1 + a1) + 0.1 * Math.sin(x * f2 + a2);
    h.push(Math.max(0.05, Math.min(1.95, v * 2)));
  }
  const ridgeRow = (x: number): number => bottom - Math.floor(h[Math.max(0, Math.min(cols, Math.floor(x)))] ?? 0);
  const shadeTex: string[] = [];
  for (let x = 0; x < cols; x++) {
    const r = rnd();
    shadeTex.push(r < 0.5 ? '.' : r < 0.68 ? "'" : ' ');
  }

  // サボテン: 右端の月の下は避けて、重ならないように 1–3 本
  const cacti: Cactus[] = [];
  const usable = cols - 14;
  const want = cols >= 60 ? 3 : cols >= 32 ? 2 : cols >= 10 ? 1 : 0;
  for (let i = 0; i < want; i++) {
    const s = i === 0 && cols >= 24 && rows >= CACTUS_BIG.h + 1 ? CACTUS_BIG : CACTUS_SMALL;
    const lo = Math.floor((usable * i) / want);
    const hi = Math.floor((usable * (i + 1)) / want) - s.w - 1;
    if (hi < lo) continue;
    const x = lo + Math.floor(rnd() * (hi - lo + 1));
    cacti.push({ x, s, trunk: s === CACTUS_BIG ? 4 : 1 });
  }
  // 大きいサボテンが常に左端にならないよう、位置をランダムに入れ替える
  if (cacti.length >= 2 && rnd() < 0.5) {
    const a = cacti[0]!;
    const b = cacti[cacti.length - 1]!;
    const ax = a.x;
    a.x = Math.min(b.x, Math.max(0, usable - a.s.w));
    b.x = ax;
  }

  const grains: Grain[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(cols / 7)); i++) grains.push({ x: rnd() * cols, speed: 2.5 + rnd() * 4, hop: rnd() * 6.28 });

  const dust: Dust[] = [];
  for (let i = 0; i < 10; i++) dust.push({ alive: false, x: 0, y: 0, age: 0, ch: '.' });
  let dustCursor = 0;

  // 回転草: 6–10 s 毎に左から右へ
  let weedX = -99;
  let weedSpeed = 0;
  let weedWait = 0.5 + rnd() * 3;
  let weedPh = 0;
  let dustTimer = 0;

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
    for (const g of grains) {
      g.x += g.speed * dt;
      if (g.x >= cols) g.x -= cols;
    }
    if (weedX > -99) {
      weedX += weedSpeed * dt;
      weedPh += dt;
      dustTimer -= dt;
      if (dustTimer <= 0) {
        dustTimer = 0.1;
        const d = dust[dustCursor]!;
        dustCursor = (dustCursor + 1) % dust.length;
        d.alive = true;
        d.x = weedX - 1 - rnd() * 1.5;
        d.y = bottom - 1 - Math.floor(rnd() * 2);
        d.age = 0;
        d.ch = rnd() < 0.4 ? '.' : rnd() < 0.5 ? ',' : "'";
      }
      if (weedX > cols + 1) {
        weedX = -99;
        weedWait = 6 + rnd() * 4;
      }
    } else {
      weedWait -= dt;
      if (weedWait <= 0 && cols > 0) {
        weedX = -6;
        weedSpeed = 6 + rnd() * 3;
        weedPh = 0;
      }
    }
    for (const d of dust) {
      if (!d.alive) continue;
      d.age += dt;
      if (d.age >= DUST_LIFE) d.alive = false;
    }
  };

  const sandTop = tone(palette, 0.55);
  const sandLee = tone(palette, 0.85);
  const sandShade = tone(palette, 0.3);
  const weedColor = tone(palette, 1);
  const cactusColor = (ch: string): string => (ch === '_' || ch === '/' || ch === '\\' ? cactusDark : cactusMid);

  const drawCactus = (grid: CharGrid, c: Cactus): void => {
    const footY = ridgeRow(c.x + c.trunk + 1);
    const top = footY - c.s.h + 1;
    for (let cy = 0; cy < c.s.h; cy++) {
      const line = c.s.lines[cy] ?? '';
      let first = 0;
      while (first < line.length && line.charAt(first) === ' ') first++;
      let last = line.length - 1;
      while (last > 0 && line.charAt(last) === ' ') last--;
      for (let cx = Math.max(0, first); cx <= last; cx++) {
        const ch = line.charAt(cx);
        // 輪郭の内側の空白も不透明にして、後ろを通る回転草を隠す
        grid.put(c.x + cx, top + cy, ch, ch === ' ' ? '' : cactusColor(ch), ch === ' ' ? 0 : 1);
      }
    }
    // 根元の砂
    grid.put(c.x + c.trunk - 1, footY, '.', sandTop, 1);
    grid.put(c.x + c.trunk + 3, footY, '.', sandTop, 1);
  };

  const draw = (grid: CharGrid): void => {
    for (let x = 0; x < cols; x++) {
      const hx = h[x] ?? 0;
      const ry = ridgeRow(x);
      const slope = (h[x + 1] ?? hx) - hx;
      grid.put(x, ry, ridgeChar(hx - Math.floor(hx), slope), slope < -0.03 ? sandLee : sandTop, 1);
      if (ry < bottom) {
        const s = shadeTex[x] ?? ' ';
        if (s !== ' ') grid.put(x, bottom, s, sandShade, 0.75);
      }
    }
    for (const g of grains) {
      const x = Math.floor(g.x);
      const lift = Math.sin(t * 6 + g.hop) > 0.8 ? 1 : 0;
      grid.put(x, ridgeRow(x) - 1 - lift, '.', sandLee, 0.85);
    }
    if (weedX > -99) {
      const frame = WEED[Math.floor(weedPh / WEED_FRAME) % WEED.length] ?? WEED[0]!;
      const bounce = Math.round(1.6 * Math.abs(Math.sin(weedPh * 4.2)));
      const wy = Math.min(bottom - 1, ridgeRow(weedX + 3)) - frame.h + 1 - bounce;
      for (let cy = 0; cy < frame.h; cy++) {
        const line = frame.lines[cy] ?? '';
        for (let cx = 0; cx < line.length; cx++) {
          const ch = line.charAt(cx);
          if (ch !== ' ') grid.put(Math.floor(weedX) + cx, wy + cy, ch, weedColor, 1);
        }
      }
    }
    for (const d of dust) {
      if (d.alive) grid.put(d.x, d.y, d.ch, sandShade, 0.6 * (1 - d.age / DUST_LIFE));
    }
    for (const c of cacti) drawCactus(grid, c);
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
