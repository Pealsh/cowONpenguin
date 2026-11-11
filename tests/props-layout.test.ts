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

  it('keeps every non-wave prop behind the walking lane, in view (z in [-28, -6])', () => {
    for (const p of placements.filter(q => q.kind !== 'wave')) {
      expect(p.z).toBeGreaterThanOrEqual(-28);
      expect(p.z).toBeLessThanOrEqual(-6);
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

  it('shore waves sit on the far side at z = -13 and z = -8', () => {
    const waveZs = placements.filter(p => p.kind === 'wave').map(p => p.z).sort((a, b) => a - b);
    expect(waveZs).toEqual([-13, -8]);
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
