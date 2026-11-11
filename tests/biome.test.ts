import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { sectionRanges } from '../src/scroll/path';
import { biomeAt, BLEND_WIDTH } from '../src/scroll/biome';

const ranges = sectionRanges(buildSections(3));
const e01 = ranges[0]!.end; // meadow→forest boundary

describe('biomeAt', () => {
  it('center of a section has a===b and t=0', () => {
    const mid = (ranges[1]!.start + ranges[1]!.end) / 2;
    expect(biomeAt(mid, ranges)).toEqual({ a: 'forest', b: 'forest', t: 0 });
  });
  it('exactly on a boundary is t=0.5 between neighbours', () => {
    const r = biomeAt(e01, ranges);
    expect(r.a).toBe('meadow'); expect(r.b).toBe('forest'); expect(r.t).toBeCloseTo(0.5);
  });
  it('just outside the blend zone is unblended', () => {
    expect(biomeAt(e01 - BLEND_WIDTH - 1e-6, ranges)).toEqual({ a: 'meadow', b: 'meadow', t: 0 });
    expect(biomeAt(e01 + BLEND_WIDTH + 1e-6, ranges)).toEqual({ a: 'forest', b: 'forest', t: 0 });
  });
  it('t rises monotonically across the zone', () => {
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const p = e01 - BLEND_WIDTH + (2 * BLEND_WIDTH * i) / 10;
      const { t } = biomeAt(p, ranges); expect(t).toBeGreaterThanOrEqual(prev); prev = t;
    }
  });
  it('clamps progress outside 0..1 to the end biomes', () => {
    expect(biomeAt(-0.5, ranges)).toEqual({ a: 'meadow', b: 'meadow', t: 0 });
    expect(biomeAt(1.5, ranges)).toEqual({ a: 'volcano', b: 'volcano', t: 0 });
  });
  it('handles empty ranges', () => expect(biomeAt(0.3, [])).toEqual({ a: 'meadow', b: 'meadow', t: 0 }));
});
