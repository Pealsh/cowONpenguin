import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { PATH_LENGTH, sectionRanges, worldX } from '../src/scroll/path';

describe('buildSections', () => {
  it('has 5 sections in order with biomes', () => {
    expect(buildSections(3).map(s => `${s.id}/${s.biome}`)).toEqual(
      ['intro/meadow', 'about/forest', 'works/snow', 'skills/desert', 'contact/volcano']);
  });
  it('works height grows by 60vh per item from 100vh', () => {
    expect(buildSections(0)[2]!.heightVh).toBe(100);
    expect(buildSections(3)[2]!.heightVh).toBe(280);
  });
});

describe('sectionRanges', () => {
  it('returns contiguous ranges from 0 to 1', () => {
    const r = sectionRanges(buildSections(3));
    expect(r[0]!.start).toBe(0);
    expect(r[r.length - 1]!.end).toBeCloseTo(1);
    for (let i = 1; i < r.length; i++) expect(r[i]!.start).toBeCloseTo(r[i - 1]!.end);
  });
  it('splits by height ratio', () => {
    const r = sectionRanges(buildSections(0)); // total 600
    expect(r[0]!.end).toBeCloseTo(100 / 600);
    expect(r[1]!.end).toBeCloseTo(250 / 600);
  });
  it('works range widens with more works', () => {
    const w0 = sectionRanges(buildSections(0))[2]!, w5 = sectionRanges(buildSections(5))[2]!;
    expect(w5.end - w5.start).toBeGreaterThan(w0.end - w0.start);
  });
  it('carries id and biome', () => {
    expect(sectionRanges(buildSections(1))[3]).toMatchObject({ id: 'skills', biome: 'desert' });
  });
  it('returns [] for no sections', () => expect(sectionRanges([])).toEqual([]));
});

describe('worldX', () => {
  it('is linear 0..PATH_LENGTH', () => {
    expect(worldX(0)).toBe(0);
    expect(worldX(1)).toBe(PATH_LENGTH);
    expect(worldX(0.25)).toBeCloseTo(60);
  });
});
