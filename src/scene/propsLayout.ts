import type { BiomeId } from '../content/sections';
import type { SectionRange } from '../scroll/path';
import { worldX } from '../scroll/path';

export type ForegroundKind = 'tuft' | 'pebble' | 'snowLump';
export type PropKind =
  | 'meadowTree'
  | 'forestTree'
  | 'snowman'
  | 'pine'
  | 'cactus'
  | 'rock'
  | 'cone'
  | 'lavaCrack'
  | ForegroundKind;

export type PropPlacement = {
  biome: BiomeId;
  kind: PropKind;
  x: number;
  z: number;
  scale: number;
};

export type LayoutOptions = { zFar?: number };

export function isForeground(kind: PropKind): kind is ForegroundKind {
  return kind === 'tuft' || kind === 'pebble' || kind === 'snowLump';
}

export const PROPS_SEED = 20261111;

// three.js に依存しない決定的な PRNG（毎回同じ配置になるよう固定シードで使う）
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// カメラは z≈7.5〜9 から 45° 見下ろすため、地面が画面に入るのはデスクトップで z≈-15〜4。
// 背景小物は歩行路のすぐ奥 z∈[-10,-4.5] に寄せ、低い前景小物は手前 z∈[2.5,3.5] に置く。
// 歩行路 |z|<1.8 には何も置かない
export const PROP_Z_NEAR = -4.5;
export const PROP_Z_FAR = -10;
export const CONE_Z_NEAR = -9;
export const CONE_Z_FAR = -12;
export const FG_Z_FAR = 2.5;
export const FG_Z_NEAR = 3.5;
export const FG_COUNT = 6;

const BG_SCALE = [1.3, 1.5] as const;
const FG_SCALE = [0.6, 0.9] as const;

function scatter(
  range: SectionRange,
  kind: PropKind,
  count: number,
  zFar: number,
  zNear: number,
  scale: readonly [number, number] | null,
  rng: () => number,
  out: PropPlacement[],
): void {
  const x0 = worldX(range.start);
  const x1 = worldX(range.end);
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * (x1 - x0);
    const z = zFar + rng() * (zNear - zFar);
    // cone は元々巨大なのでスケールしない（拡大すると裾野が歩行路にかかる）
    const s = scale ? scale[0] + rng() * (scale[1] - scale[0]) : 1;
    out.push({ biome: range.biome, kind, x, z, scale: s });
  }
}

export function layoutProps(
  ranges: readonly SectionRange[],
  seed: number = PROPS_SEED,
  opts: LayoutOptions = {},
): PropPlacement[] {
  const rng = mulberry32(seed);
  const out: PropPlacement[] = [];
  const zFar = opts.zFar ?? PROP_Z_FAR;
  const bg = (range: SectionRange, kind: PropKind, count: number): void =>
    scatter(range, kind, count, zFar, PROP_Z_NEAR, BG_SCALE, rng, out);
  const fg = (range: SectionRange, kind: ForegroundKind): void =>
    scatter(range, kind, FG_COUNT, FG_Z_FAR, FG_Z_NEAR, FG_SCALE, rng, out);
  for (const range of ranges) {
    switch (range.biome) {
      case 'meadow':
        bg(range, 'meadowTree', 14);
        fg(range, 'tuft');
        break;
      case 'forest':
        bg(range, 'forestTree', 40);
        fg(range, 'tuft');
        break;
      case 'snow':
        bg(range, 'snowman', 6);
        bg(range, 'pine', 18);
        fg(range, 'snowLump');
        break;
      case 'desert':
        bg(range, 'cactus', 10);
        bg(range, 'rock', 12);
        fg(range, 'pebble');
        break;
      case 'volcano':
        // 火口（cone）は奥寄りに固定し、溶岩の裂け目（lavaCrack）は奥側一帯に散らす
        scatter(range, 'cone', 2, CONE_Z_FAR, CONE_Z_NEAR, null, rng, out);
        bg(range, 'lavaCrack', 8);
        fg(range, 'pebble');
        break;
    }
  }
  return out;
}
