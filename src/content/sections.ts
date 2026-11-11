export type BiomeId = 'meadow' | 'forest' | 'snow' | 'desert' | 'volcano';
export type SectionId = 'intro' | 'about' | 'works' | 'skills' | 'contact';
export type SectionDef = { id: SectionId; biome: BiomeId; heightVh: number };

export const WORKS_BASE_VH = 100;
export const WORKS_PER_ITEM_VH = 60;

export function buildSections(worksCount: number): SectionDef[] {
  return [
    { id: 'intro', biome: 'meadow', heightVh: 100 },
    { id: 'about', biome: 'forest', heightVh: 150 },
    { id: 'works', biome: 'snow', heightVh: WORKS_BASE_VH + WORKS_PER_ITEM_VH * worksCount },
    { id: 'skills', biome: 'desert', heightVh: 150 },
    { id: 'contact', biome: 'volcano', heightVh: 100 },
  ];
}
