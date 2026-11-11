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

  it('keeps every prop behind the walking lane, in view (z in [-28, -6])', () => {
    for (const p of placements) {
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
    expect(countByKind('cone')).toBe(2);
    expect(countByKind('lavaCrack')).toBe(8);
  });

  it('has no wave kind anywhere', () => {
    expect(placements.some(p => (p.kind as string) === 'wave')).toBe(false);
  });

  it('places exactly 2 volcano cones at z <= -12', () => {
    const cones = placements.filter(p => p.kind === 'cone');
    expect(cones.length).toBe(2);
    for (const c of cones) expect(c.z).toBeLessThanOrEqual(-12);
  });

  it('places exactly 8 lavaCracks with |z| >= 6 inside the contact range x-bounds', () => {
    const contact = ranges.find(r => r.biome === 'volcano')!;
    const x0 = worldX(contact.start), x1 = worldX(contact.end);
    const cracks = placements.filter(p => p.kind === 'lavaCrack');
    expect(cracks.length).toBe(8);
    for (const c of cracks) {
      expect(Math.abs(c.z)).toBeGreaterThanOrEqual(6);
      expect(c.x).toBeGreaterThanOrEqual(x0);
      expect(c.x).toBeLessThanOrEqual(x1);
    }
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
