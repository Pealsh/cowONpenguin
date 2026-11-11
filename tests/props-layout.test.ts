import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { sectionRanges, worldX } from '../src/scroll/path';
import {
  layoutProps,
  isForeground,
  PROPS_SEED,
  PROP_Z_FAR,
  PROP_Z_NEAR,
  FG_Z_NEAR,
  FG_Z_FAR,
} from '../src/scene/propsLayout';

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

  it('uses the round-2 z constants', () => {
    expect(PROP_Z_FAR).toBe(-10);
    expect(PROP_Z_NEAR).toBe(-4.5);
    expect(FG_Z_FAR).toBe(2.5);
    expect(FG_Z_NEAR).toBe(3.5);
  });

  it('keeps background props (except cones) in z [-10, -4.5]', () => {
    for (const p of placements) {
      if (isForeground(p.kind) || p.kind === 'cone') continue;
      expect(p.z).toBeGreaterThanOrEqual(-10);
      expect(p.z).toBeLessThanOrEqual(-4.5);
    }
  });

  it('places foreground props in z [2.5, 3.5]', () => {
    const fg = placements.filter(p => isForeground(p.kind));
    expect(fg.length).toBeGreaterThan(0);
    for (const p of fg) {
      expect(p.z).toBeGreaterThanOrEqual(2.5);
      expect(p.z).toBeLessThanOrEqual(3.5);
    }
  });

  it('keeps the walking lane |z| < 1.8 empty for every prop', () => {
    for (const p of placements) expect(Math.abs(p.z)).toBeGreaterThanOrEqual(1.8);
  });

  it('places 6 foreground props per biome of the right kind', () => {
    const want: Record<string, string> = {
      meadow: 'tuft',
      forest: 'tuft',
      snow: 'snowLump',
      desert: 'pebble',
      volcano: 'pebble',
    };
    for (const r of ranges) {
      const fg = placements.filter(p => p.biome === r.biome && isForeground(p.kind));
      expect(fg.length).toBe(6);
      for (const p of fg) expect(p.kind).toBe(want[r.biome]);
    }
  });

  it('gives background props scale 1.3-1.5 and foreground 0.6-0.9 (cones stay 1)', () => {
    for (const p of placements) {
      if (p.kind === 'cone') expect(p.scale).toBe(1);
      else if (isForeground(p.kind)) {
        expect(p.scale).toBeGreaterThanOrEqual(0.6);
        expect(p.scale).toBeLessThanOrEqual(0.9);
      } else {
        expect(p.scale).toBeGreaterThanOrEqual(1.3);
        expect(p.scale).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('honours a zFar override for background props (mobile)', () => {
    const mob = layoutProps(ranges, PROPS_SEED, { zFar: -6 });
    for (const p of mob) {
      if (isForeground(p.kind) || p.kind === 'cone') continue;
      expect(p.z).toBeGreaterThanOrEqual(-6);
      expect(p.z).toBeLessThanOrEqual(-4.5);
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

  it('places exactly 2 volcano cones at z in [-12, -9]', () => {
    const cones = placements.filter(p => p.kind === 'cone');
    expect(cones.length).toBe(2);
    for (const c of cones) {
      expect(c.z).toBeGreaterThanOrEqual(-12);
      expect(c.z).toBeLessThanOrEqual(-9);
    }
  });

  it('places exactly 8 lavaCracks with |z| >= 4.5 inside the contact range x-bounds', () => {
    const contact = ranges.find(r => r.biome === 'volcano')!;
    const x0 = worldX(contact.start), x1 = worldX(contact.end);
    const cracks = placements.filter(p => p.kind === 'lavaCrack');
    expect(cracks.length).toBe(8);
    for (const c of cracks) {
      expect(Math.abs(c.z)).toBeGreaterThanOrEqual(4.5);
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
