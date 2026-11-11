import type { BiomeId } from '../content/sections';
import type { SectionRange } from '../scroll/path';
import { worldX } from '../scroll/path';

export type PropKind = 'meadowTree' | 'forestTree' | 'snowman' | 'pine' | 'cactus' | 'rock' | 'wave';

export type PropPlacement = {
  biome: BiomeId;
  kind: PropKind;
  x: number;
  z: number;
  // wave のみ: その区間の長さ（PlaneGeometry の幅に使う）
  width?: number;
};

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

// カメラは z≈7.5〜9 から 45° 見下ろすため、地面が画面に入るのはデスクトップで z≈-15〜4 だけ。
// 歩行路（z≈0）の奥 z∈[-15,-6] に置く（手前はカメラの背後で描かれず、奥すぎると画面上端の外）
export const PROP_Z_NEAR = -6;
export const PROP_Z_FAR = -15;
function randomZ(rng: () => number): number {
  return PROP_Z_FAR + rng() * (PROP_Z_NEAR - PROP_Z_FAR);
}

function scatter(
  range: SectionRange,
  kind: PropKind,
  count: number,
  rng: () => number,
  out: PropPlacement[],
): void {
  const x0 = worldX(range.start);
  const x1 = worldX(range.end);
  for (let i = 0; i < count; i++) {
    out.push({ biome: range.biome, kind, x: x0 + rng() * (x1 - x0), z: randomZ(rng) });
  }
}

export function layoutProps(ranges: readonly SectionRange[], seed: number = PROPS_SEED): PropPlacement[] {
  const rng = mulberry32(seed);
  const out: PropPlacement[] = [];
  for (const range of ranges) {
    switch (range.biome) {
      case 'meadow':
        scatter(range, 'meadowTree', 14, rng, out);
        break;
      case 'forest':
        scatter(range, 'forestTree', 40, rng, out);
        break;
      case 'snow':
        scatter(range, 'snowman', 6, rng, out);
        scatter(range, 'pine', 18, rng, out);
        break;
      case 'desert':
        scatter(range, 'cactus', 10, rng, out);
        scatter(range, 'rock', 12, rng, out);
        break;
      case 'shore': {
        const x0 = worldX(range.start);
        const x1 = worldX(range.end);
        const cx = (x0 + x1) / 2;
        const width = x1 - x0;
        // 海は奥側（カメラから見て歩行路の向こう）
        out.push({ biome: range.biome, kind: 'wave', x: cx, z: -8, width });
        out.push({ biome: range.biome, kind: 'wave', x: cx, z: -13, width });
        break;
      }
    }
  }
  return out;
}
