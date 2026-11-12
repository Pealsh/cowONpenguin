import { DECOR } from '../../../content/decor';
import type { CharGrid } from '../grid';
import { mulberry32 } from '../rng';
import { sprite, stamp, type Sprite } from '../sprite';
import { pickChar, type Scene } from './types';

/** 地殻 (行 0) の下に垂れる溶岩: 大 / 中 / 細 */
const DRIPS: readonly Sprite[] = [
  sprite(['\\%%%/', ' \\%/', '  V']),
  sprite(['\\%/', ' V']),
  sprite(['|', 'o']),
];
const DRIP_WEIGHTS = [0.35, 0.4, 0.25];
/** 右下の小さな火山 */
const CONE = sprite(['    /\\', '   /  \\', '  /    \\', ' /      \\']);
const CONE_COLS = 12;
const MIN_CONE_COLS = 40;

type Drip = { x: number; s: Sprite; tipX: number; tipY: number; ph: number; period: number; wait: number; grow: number; falls: boolean };
type Blob = { alive: boolean; x: number; y: number; v: number };
type Spark = { alive: boolean; x: number; y: number; vx: number; vy: number; age: number; life: number };
type Ember = { alive: boolean; x: number; y: number; vy: number; ph: number };

const GROW = 0.7;
const ERUPT = 1.5;
const SPARK_G = 16;

export function createVolcano(
  cols: number,
  rows: number,
  seed: number,
  palette = DECOR.volcano.palette,
  faint = DECOR.volcano.faint ?? [],
): Scene {
  const rnd = mulberry32(seed);
  const lava = palette.slice(0, 4); // 黄 → 橙 → 赤
  const crustA = palette[4] ?? '#6b1a0a';
  const crustB = palette[5] ?? '#2a0d08';
  const smokeColor = faint[0] ?? '#8a7f7a';
  const lavaAt = (v: number): string => lava[Math.max(0, Math.min(lava.length - 1, Math.round(v * (lava.length - 1))))] ?? '#fd5800';
  const bottom = rows - 1;

  // 地殻: vVwW の中に光るひび (#, %) が点在
  const crustCh: string[] = [];
  const crustDark: boolean[] = [];
  const crackPh: number[] = []; // <0 ならひび無し
  for (let x = 0; x < cols; x++) {
    const crack = rnd() < 0.16;
    crustCh.push(crack ? pickChar('#%', rnd()) : pickChar('vVwW', rnd()));
    crustDark.push(rnd() < 0.45);
    crackPh.push(crack ? rnd() * 6.28 : -1);
  }

  // 火山 (幅が足りる時だけ)
  const hasCone = cols >= MIN_CONE_COLS && rows >= CONE.h + 3;
  const coneX = cols - CONE_COLS;
  const coneY = rows - CONE.h;
  const craterX = coneX + 4; // '/\' の '/' の列
  let eruptWait = 1.2 + rnd() * 2.3;
  let erupt = -1; // 噴火中の経過秒 (<0 なら休止)
  const trickleRight = rnd() < 0.5;

  // 垂れる溶岩を隙間 1–4 列で並べる
  const drips: Drip[] = [];
  const dripEnd = hasCone ? coneX - 1 : cols;
  for (let x = Math.floor(rnd() * 3); x < cols; ) {
    const r = rnd();
    let size = r < (DRIP_WEIGHTS[0] ?? 0) ? 0 : r < (DRIP_WEIGHTS[0] ?? 0) + (DRIP_WEIGHTS[1] ?? 0) ? 1 : 2;
    while (size < DRIPS.length - 1 && 1 + (DRIPS[size]?.h ?? 1) > rows - 3) size++;
    const s = DRIPS[size] ?? DRIPS[2]!;
    const tip = s.lines[s.h - 1] ?? '';
    const period = 2 + rnd() * 3;
    drips.push({
      x,
      s,
      tipX: x + Math.max(0, tip.search(/\S/)),
      tipY: s.h,
      ph: rnd() * 6.28,
      period: 1.2 + rnd() * 1.2,
      wait: rnd() * period + 0.5,
      grow: -1,
      // 火山の真上の雫は落とさない (噴火の火花と混ざらないよう)
      falls: x + s.w <= dripEnd,
    });
    x += s.w + 1 + Math.floor(rnd() * 4);
  }

  const blobs: Blob[] = [];
  for (let i = 0; i < 4; i++) blobs.push({ alive: false, x: 0, y: 0, v: 0 });
  const sparks: Spark[] = [];
  for (let i = 0; i < 28; i++) sparks.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0 });
  const embers: Ember[] = [];
  for (let i = 0; i < Math.max(2, Math.floor(cols / 7)); i++) embers.push({ alive: false, x: 0, y: 0, vy: 0, ph: 0 });
  const smokePh = rnd() * 6.28;

  const spark = (x: number, y: number, vx: number, vy: number, life: number): void => {
    for (const s of sparks) {
      if (s.alive) continue;
      s.alive = true;
      s.x = x;
      s.y = y;
      s.vx = vx;
      s.vy = vy;
      s.age = 0;
      s.life = life;
      return;
    }
  };

  let t = 0;
  const step = (dt: number): void => {
    t += dt;
    for (const d of drips) {
      if (!d.falls) continue;
      if (d.grow >= 0) {
        d.grow += dt;
        if (d.grow >= GROW) {
          d.grow = -1;
          d.wait = 2.5 + rnd() * 3.5;
          for (const b of blobs) {
            if (b.alive) continue;
            b.alive = true;
            b.x = d.tipX;
            b.y = d.tipY + 1;
            b.v = 0.5;
            break;
          }
        }
      } else {
        d.wait -= dt;
        if (d.wait <= 0 && d.tipY + 2 < bottom) d.grow = 0;
      }
    }
    for (const b of blobs) {
      if (!b.alive) continue;
      b.v += 20 * dt;
      b.y += b.v * dt;
      if (b.y >= bottom) {
        b.alive = false;
        // 弾けて火花が上と横へ
        for (let k = 0; k < 4; k++) spark(b.x, bottom, (rnd() - 0.5) * 9, -(3 + rnd() * 4), 0.45 + rnd() * 0.2);
      }
    }
    if (hasCone) {
      if (erupt >= 0) {
        erupt += dt;
        if (rnd() < 0.85) spark(craterX + 0.5 + (rnd() - 0.5), coneY - 0.5, (rnd() - 0.5) * 7, -(7 + rnd() * 4), 0.9 + rnd() * 0.4);
        if (erupt >= ERUPT) {
          erupt = -1;
          eruptWait = 6 + rnd() * 2;
        }
      } else {
        eruptWait -= dt;
        if (eruptWait <= 0) erupt = 0;
      }
    }
    for (const s of sparks) {
      if (!s.alive) continue;
      s.age += dt;
      s.vy += SPARK_G * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age >= s.life || s.y >= rows || s.y < 0.5) s.alive = false;
    }
    for (const e of embers) {
      if (e.alive) {
        e.y -= e.vy * dt;
        if (e.y < 1) e.alive = false;
      } else if (cols > 0 && rnd() < 0.07) {
        e.alive = true;
        e.x = rnd() * cols;
        e.y = bottom;
        e.vy = 1 + rnd() * 1.5;
        e.ph = rnd() * 6.28;
      }
    }
  };

  // draw 中に毎フレーム closure を作らないよう、色の関数は外に置いて状態だけ差し替える
  let curPulse = 0;
  let coneFlash = crustA;
  const dripColor = (ch: string): string =>
    ch === '%' ? lavaAt(curPulse * 0.5) : ch === '\\' || ch === '/' ? lavaAt(0.5 + curPulse * 0.5) : lavaAt(0.25 + curPulse * 0.5);
  const coneColor = (_ch: string, _cx: number, cy: number): string => (cy === 0 ? coneFlash : crustA);

  const draw = (grid: CharGrid): void => {
    // 薄い煙の帯 (最背面)
    for (let x = 0; x < cols; x++) {
      const s = Math.sin(x * 0.22 + t * 0.9 + smokePh) + Math.sin(x * 0.07 - t * 0.4);
      // 途切れ途切れの筋にして一本線に見せない
      if (s > 1.05 && (x + Math.floor(t * 3)) % 4 !== 0) grid.put(x, Math.min(bottom, 4), '~', smokeColor, 0.16 + (s - 1.05) * 0.12);
    }
    for (const e of embers) {
      if (!e.alive) continue;
      const fade = (e.y - 1) / Math.max(1, rows - 2);
      grid.put(e.x + Math.sin(t * 3 + e.ph) * 0.8, e.y, fade > 0.5 ? "'" : '.', lavaAt(fade > 0.5 ? 0.66 : 1), Math.max(0.15, fade));
    }
    if (hasCone) {
      // 輪郭の内側は不透明にして、後ろの火の粉を隠す
      for (let cy = 0; cy < CONE.h; cy++) {
        const line = CONE.lines[cy] ?? '';
        let first = 0;
      while (first < line.length && line.charAt(first) === ' ') first++;
        for (let cx = Math.max(0, first + 1); cx < line.length - 1; cx++) grid.put(coneX + cx, coneY + cy, ' ', '', 0);
      }
      const flash = erupt >= 0 ? Math.floor(erupt * 12) % 2 === 0 : false;
      coneFlash = erupt >= 0 ? lavaAt(flash ? 0 : 0.33) : crustA;
      stamp(grid, CONE, coneX, coneY, coneColor);
      if (erupt >= 0) {
        grid.put(craterX, coneY - 1, flash ? '*' : '^', lavaAt(0), 1);
        // 片側の斜面を溶岩が流れ下る
        const reach = Math.min(CONE.h - 1, Math.floor((erupt / ERUPT) * (CONE.h + 1)));
        for (let k = 1; k <= reach; k++) {
          const x = trickleRight ? craterX + k : craterX + 1 - k;
          grid.put(x, coneY + k, trickleRight ? ')' : '(', lavaAt(0.2 + k * 0.15), 1);
        }
      }
    }
    for (const d of drips) {
      const pulse = 0.5 + 0.5 * Math.sin((t / d.period) * 6.283 + d.ph);
      // 芯 % は黄 ↔ 橙、縁 \ / は橙 ↔ 赤、先端は中間
      curPulse = pulse;
      stamp(grid, d.s, d.x, 1, dripColor);
      if (d.grow >= 0) grid.put(d.tipX, d.tipY + 1, d.grow < GROW / 2 ? '.' : 'o', lavaAt(0.2), 0.7 + (d.grow / GROW) * 0.3);
    }
    for (const b of blobs) {
      if (b.alive) grid.put(b.x, b.y, b.v > 6 ? 'O' : 'o', lavaAt(0.15), 1);
    }
    for (const s of sparks) {
      if (!s.alive) continue;
      const k = s.age / s.life;
      grid.put(s.x, s.y, k < 0.4 ? '*' : k < 0.75 ? "'" : '.', lavaAt(k < 0.4 ? 0 : k < 0.75 ? 0.4 : 0.8), 1 - k * 0.5);
    }
    for (let x = 0; x < cols; x++) {
      const ph = crackPh[x] ?? -1;
      if (ph >= 0) {
        // ひびは 黄 → 橙 → 赤 と巡る
        const c = 0.5 + 0.5 * Math.sin(t * 2.2 + ph);
        grid.put(x, 0, crustCh[x] ?? '#', lavaAt(1 - c), 1);
      } else grid.put(x, 0, crustCh[x] ?? 'v', crustDark[x] ? crustB : crustA, 1);
    }
  };

  return { step, draw };
}
