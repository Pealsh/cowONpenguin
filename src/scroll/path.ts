import type { BiomeId, SectionDef, SectionId } from '../content/sections';

export const PATH_LENGTH = 240;

export type SectionRange = { id: SectionId; biome: BiomeId; start: number; end: number };

export function sectionRanges(sections: readonly SectionDef[]): SectionRange[] {
  if (sections.length === 0) return [];
  const total = sections.reduce((sum, s) => sum + s.heightVh, 0);
  let cursor = 0;
  const ranges: SectionRange[] = [];
  for (const s of sections) {
    const start = cursor / total;
    cursor += s.heightVh;
    const end = cursor / total;
    ranges.push({ id: s.id, biome: s.biome, start, end });
  }
  return ranges;
}

export function worldX(progress: number): number {
  return progress * PATH_LENGTH;
}
