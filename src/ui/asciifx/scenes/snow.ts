import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { sprite, stamp, type Sprite } from '../sprite';
import { tone, type Scene } from './types';

/** 氷柱: 大 / 中 / 小 / 細 (根元は雪冠のすぐ下の行 2 から垂れる) */
const ICICLES: readonly Sprite[] = [
  sprite(['\\#####/', ' \\###/', '  \\#/', '   V']),
  sprite(['\\###/', ' \\#/', '  V']),
  sprite(['\\#/', ' V']),
  sprite(['|', "'"]),
  sprite(['|']),
];
/** 大:中:小:細 の出やすさ */
const WEIGHTS = [0.22, 0.33, 0.28, 0.1, 0.07];

type Icicle = { x: number; s: Sprite; tipX: number; tipY: number; period: number; wait: number; grow: number };
type Drop = { alive: boolean; x: number; y: number; v: number; splash: number };
type Flake = { x: number; y: number; vy: number; ph: number; ch: string };

const CAP_ROWS = 2;
const GROW = 0.6; // 雫が膨らむ秒数
const SPLASH = 0.35;
const GRAVITY = 26; // rows/s²

function pickSize(r: number): number {
  let acc = 0;
  for (let i = 0; i < WEIGHTS.length; i++) {
    acc += WEIGHTS[i] ?? 0;
    if (r < acc) return i;
  }
  return WEIGHTS.length - 1;
}

export function createSnow(cols: number, rows: number, seed: number, palette = DECOR.snow.palette, accents = DECOR.snow.accents ?? []): Scene {
  const rnd = mulberry32(seed);
  const sparkleColor = accents[0] ?? '#1f8bff';
  const dropColor = accents[2] ?? '#218ce7';
  const iceDark = tone(palette, 1); // '#' 氷の芯
  const iceMid = tone(palette, 0.8); // '\' '/' の縁
  const iceTip = tone(palette, 0); // 'V' 先端
  const bottom = rows - 1;

  // 雪冠: 0 行目はふわっとした ~ . / 1 行目は押し固まった @%# の陰影
  const capTop: string[] = [];
  const capLow: string[] = [];
  const n1 = rnd() * 10;
  const n2 = rnd() * 10;
  for (let x = 0; x < cols; x++) {
    const v = Math.sin(x * 0.5 + n1) * 0.6 + Math.sin(x * 0.19 + n2) * 0.4 + (rnd() - 0.5) * 0.5;
    capTop.push(v > 0.05 ? '~' : '.');
    capLow.push(v > 0.35 ? '@' : v > -0.25 ? '%' : '#');
  }

  // 氷柱を隙間 1–4 列で敷き詰める
  const icicles: Icicle[] = [];
  for (let x = Math.floor(rnd() * 3); x < cols; ) {
    let size = pickSize(rnd());
    // 行が足りない時は小さいものに落とす (雫の落ちる余白を 2 行残す)
    while (size < ICICLES.length - 1 && CAP_ROWS + (ICICLES[size]?.h ?? 1) > rows - 2) size++;
    const s = ICICLES[size] ?? ICICLES[ICICLES.length - 1]!;
    const tipLine = s.lines[s.h - 1] ?? '';
    const tipX = x + Math.max(0, tipLine.search(/\S/));
    const period = 1.5 + rnd() * 3;
    icicles.push({ x, s, tipX, tipY: CAP_ROWS + s.h - 1, period, wait: rnd() * period, grow: -1 });
    x += s.w + 1 + Math.floor(rnd() * 4);
  }

  const drops: Drop[] = [];
  for (let i = 0; i < Math.max(2, icicles.length); i++) drops.push({ alive: false, x: 0, y: 0, v: 0, splash: -1 });

  const flakes: Flake[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(cols / 10)); i++) {
    flakes.push({ x: rnd() * cols, y: CAP_ROWS + rnd() * (rows - CAP_ROWS), vy: 0.35 + rnd() * 0.4, ph: rnd() * 6.28, ch: rnd() < 0.6 ? '.' : '*' });
  }

  let t = 0;
  let sparkX = -1;
  let sparkLeft = 0;

  const release = (ic: Icicle): void => {
    for (const d of drops) {
      if (d.alive) continue;
      d.alive = true;
      d.x = ic.tipX;
      d.y = ic.tipY + 1;
      d.v = 0;
      d.splash = -1;
      return;
    }
  };

  const step = (dt: number): void => {
    t += dt;
    for (const ic of icicles) {
      if (ic.grow >= 0) {
        ic.grow += dt;
        if (ic.grow >= GROW) {
          ic.grow = -1;
          ic.wait = ic.period;
          release(ic);
        }
      } else {
        ic.wait -= dt;
        if (ic.wait <= 0 && ic.tipY + 1 < bottom) ic.grow = 0;
      }
    }
    for (const d of drops) {
      if (!d.alive) continue;
      if (d.splash >= 0) {
        d.splash += dt;
        if (d.splash >= SPLASH) d.alive = false;
      } else {
        d.v += GRAVITY * dt;
        d.y += d.v * dt;
        if (d.y >= bottom) {
          d.y = bottom;
          d.splash = 0;
        }
      }
    }
    for (const f of flakes) {
      f.y += f.vy * dt;
      if (f.y >= rows) {
        f.y = CAP_ROWS;
        f.x = rnd() * cols;
      }
    }
    if (sparkLeft > 0) sparkLeft--;
    else if (cols > 0 && rnd() < 0.2) {
      sparkX = Math.floor(rnd() * cols);
      sparkLeft = 2;
    }
  };

  const iceColor = (ch: string): string => (ch === '#' ? iceDark : ch === 'V' || ch === "'" ? iceTip : iceMid);

  const draw = (grid: CharGrid): void => {
    for (const f of flakes) {
      grid.put(f.x + Math.sin(t * 1.3 + f.ph) * 1.2, f.y, f.ch, tone(palette, 0.3), 0.45);
    }
    for (let x = 0; x < cols; x++) {
      grid.put(x, 0, capTop[x] ?? '~', tone(palette, 0.15), 0.9);
      const c = capLow[x] ?? '%';
      grid.put(x, 1, c, tone(palette, c === '@' ? 1 : c === '%' ? 0.8 : 0.6), 1);
    }
    for (const ic of icicles) {
      stamp(grid, ic.s, ic.x, CAP_ROWS, iceColor);
      if (ic.grow >= 0) grid.put(ic.tipX, ic.tipY + 1, ic.grow < GROW / 2 ? '.' : 'o', dropColor, 0.6 + (ic.grow / GROW) * 0.4);
    }
    for (const d of drops) {
      if (!d.alive) continue;
      if (d.splash < 0) {
        grid.put(d.x, d.y, 'o', dropColor, 1);
        // 速く落ちている間は 1 行上に薄い軌跡
        if (d.v > 7 && d.y - 1 > CAP_ROWS) grid.put(d.x, d.y - 1, "'", dropColor, 0.4);
      } else if (d.splash < SPLASH / 2) {
        grid.put(d.x - 2, bottom, "'", dropColor, 0.9);
        grid.put(d.x, bottom, '.', dropColor, 1);
        grid.put(d.x + 2, bottom, "'", dropColor, 0.9);
      } else {
        grid.put(d.x - 2, bottom, '.', dropColor, 0.6);
        grid.put(d.x + 2, bottom, '.', dropColor, 0.6);
      }
    }
    if (sparkLeft > 0 && sparkX >= 0) grid.put(sparkX, 0, '*', sparkleColor, 1);
  };

  return { step, draw };
}
