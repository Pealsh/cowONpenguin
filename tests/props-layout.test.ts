import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { sectionRanges, worldX } from '../src/scroll/path';
import { layoutProps, PROPS_SEED } from '../src/scene/propsLayout';

const ranges = sectionRanges(buildSections(2));
const placements = layoutProps(ranges);

function countByKind(kind: string): number {
  return placements.filter(p => p.kind === kind).length;
}

describe('layoutProps', () => {
  it('places every prop inside its section range in world x', () => {
    for (const p of placements) {
      const range = ranges.find(r => r.biome === p.biome)!;
      expect(p.x).toBeGreaterThanOrEqual(worldX(range.start));
      expect(p.x).toBeLessThanOrEqual(worldX(range.end));
    }
  });

  it('keeps the walking lane clear (|z| >= 6 for every prop)', () => {
    for (const p of placements) {
      expect(Math.abs(p.z)).toBeGreaterThanOrEqual(6);
    }
  });

  it('matches the brief counts per biome', () => {
    expect(countByKind('meadowTree')).toBe(14);
    expect(countByKind('forestTree')).toBe(40);
    expect(countByKind('snowman')).toBe(6);
    expect(countByKind('pine')).toBe(18);
    expect(countByKind('cactus')).toBe(10);
    expect(countByKind('rock')).toBe(12);
    expect(countByKind('wave')).toBe(2);
  });

  it('shore waves sit at z = 14 and z = 20', () => {
    const waveZs = placements.filter(p => p.kind === 'wave').map(p => p.z).sort((a, b) => a - b);
    expect(waveZs).toEqual([14, 20]);
  });

  it('is deterministic for a fixed seed', () => {
    const again = layoutProps(ranges, PROPS_SEED);
    expect(again).toEqual(placements);
  });

  it('produces a different layout for a different seed', () => {
    const other = layoutProps(ranges, PROPS_SEED + 1);
    expect(other).not.toEqual(placements);
  });
});
