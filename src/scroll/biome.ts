import type { BiomeId } from '../content/sections';
import type { SectionRange } from './path';

export const BLEND_WIDTH = 0.06;

export type BiomeBlend = { a: BiomeId; b: BiomeId; t: number };

function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

export function biomeAt(progress: number, ranges: readonly SectionRange[]): BiomeBlend {
  if (ranges.length === 0) return { a: 'meadow', b: 'meadow', t: 0 };

  const p = Math.min(1, Math.max(0, progress));

  for (let i = 0; i < ranges.length - 1; i++) {
    const left = ranges[i]!;
    const right = ranges[i + 1]!;
    const e = left.end;
    if (Math.abs(p - e) <= BLEND_WIDTH) {
      const t = smoothstep((p - (e - BLEND_WIDTH)) / (2 * BLEND_WIDTH));
      return { a: left.biome, b: right.biome, t };
    }
  }

  const containing = ranges.find(r => p >= r.start && p <= r.end) ?? ranges[ranges.length - 1]!;
  return { a: containing.biome, b: containing.biome, t: 0 };
}
