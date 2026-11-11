import type { BiomeId } from './sections';

export type DecorEdge = 'top' | 'bottom';
export type Decor = {
  edge: DecorEdge;
  rows: string[];
  color: string;
  corner?: { rows: string[]; color: string };
};

export function tileRow(pattern: string, width: number): string {
  if (width <= 0) return '';
  if (pattern === '') return ' '.repeat(width);
  let out = '';
  while (out.length < width) out += pattern;
  return out.slice(0, width);
}

export function decorRows(decor: Decor, width: number): string[] {
  return decor.rows.map((row) => tileRow(row, width));
}

export const DECOR: Record<BiomeId, Decor> = {
  meadow: {
    edge: 'bottom',
    color: '#3f8f3a',
    rows: [
      '  ,  \\|/  *  ,  \\|/',
      ',\\|/,.|.,\\|/,,|,.\\|',
    ],
  },
  forest: {
    edge: 'top',
    color: '#2f6b2a',
    rows: [
      '}{@}{~@~}{@}{~~@~}{',
      ' |  @   |  |   @  |',
      ' @       \'  @      ',
    ],
  },
  snow: {
    edge: 'top',
    color: '#6aa9ff',
    rows: [
      '~~~~~~~~~~~~~~~~~~~',
      '| || |  ||  | ||| |',
      '\' |\' \'  |\'  \' |\'\' \'',
      '  \'        \'    \'  ',
    ],
  },
  desert: {
    edge: 'bottom',
    color: '#c9a86a',
    rows: [
      '~-.._..--~~--.._..-',
      '  ..   \'\'   ..   \'\'',
    ],
    corner: {
      color: '#8a7a4a',
      rows: [
        '  _  *  ',
        ' ( `  . ',
        '  ~   * ',
      ],
    },
  },
  volcano: {
    edge: 'top',
    color: '#ff5a18',
    rows: [
      'vVvVvVvVvVvVvVvVvVvV',
      ' | . |  . | . |  .  ',
      ' .   \'    .   \'     ',
    ],
  },
};
