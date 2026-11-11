import { Color } from 'three';
import type { BiomeId } from '../content/sections';

export type BiomeLook = {
  ground: Color;
  grassBase: Color;
  grassTip: Color;
  grassDensity: number;
  fog: Color;
  sky: Color;
  starAlpha: number;
};

const meadow = (): BiomeLook => ({
  ground: new Color(0x1a2a1a),
  grassBase: new Color(0x050d05),
  grassTip: new Color(0x73b36b),
  grassDensity: 1,
  fog: new Color(0x020302),
  sky: new Color(0x020302),
  starAlpha: 0.3,
});

const forest = (): BiomeLook => ({
  ground: new Color(0x15200f),
  grassBase: new Color(0x030803),
  grassTip: new Color(0x2f6b2a),
  grassDensity: 0.8,
  fog: new Color(0x030a04),
  sky: new Color(0x030a04),
  starAlpha: 0.1,
});

const snow = (): BiomeLook => ({
  ground: new Color(0xd9dde0),
  grassBase: new Color(0x9aa3a8),
  grassTip: new Color(0xf4f7f9),
  grassDensity: 0.25,
  fog: new Color(0x7d8f9d),
  sky: new Color(0x7d8f9d),
  starAlpha: 0.2,
});

const desert = (): BiomeLook => ({
  ground: new Color(0xc9a86a),
  grassBase: new Color(0x5a4a2a),
  grassTip: new Color(0xb9a060),
  grassDensity: 0.15,
  fog: new Color(0x0a1030),
  sky: new Color(0x0a1030),
  starAlpha: 1.0,
});

const shore = (): BiomeLook => ({
  ground: new Color(0xb8a878),
  grassBase: new Color(0x3a5a3a),
  grassTip: new Color(0x8fcf8f),
  grassDensity: 0.3,
  fog: new Color(0x3a5a6a),
  sky: new Color(0x3a5a6a),
  starAlpha: 0.4,
});

// blendLook の out 用。BIOME_LOOKS の値そのものは書き換えない別バッファを作る
export const createLookBuffer = (): BiomeLook => meadow();

export const BIOME_LOOKS: Record<BiomeId, BiomeLook> = {
  meadow: meadow(),
  forest: forest(),
  snow: snow(),
  desert: desert(),
  shore: shore(),
};

export function blendLook(a: BiomeLook, b: BiomeLook, t: number, out: BiomeLook): BiomeLook {
  out.ground.lerpColors(a.ground, b.ground, t);
  out.grassBase.lerpColors(a.grassBase, b.grassBase, t);
  out.grassTip.lerpColors(a.grassTip, b.grassTip, t);
  out.grassDensity = a.grassDensity + (b.grassDensity - a.grassDensity) * t;
  out.fog.lerpColors(a.fog, b.fog, t);
  out.sky.lerpColors(a.sky, b.sky, t);
  out.starAlpha = a.starAlpha + (b.starAlpha - a.starAlpha) * t;
  return out;
}
