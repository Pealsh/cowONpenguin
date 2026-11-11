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

// meadow 以外は Task 9 で埋める（ここでは型を満たすための仮置き）
export const BIOME_LOOKS: Record<BiomeId, BiomeLook> = {
  meadow: meadow(),
  forest: meadow(),
  snow: meadow(),
  desert: meadow(),
  shore: meadow(),
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
