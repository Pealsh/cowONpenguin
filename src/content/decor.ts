import type { BiomeId } from './sections';

export type DecorEdge = 'top' | 'bottom';

export type DecorCorner = {
  /** 右上に置く小さな canvas のサイズ (文字数) */
  cols: number;
  rows: number;
  palette: string[];
};

/**
 * decor の設定のみ。絵そのものは src/ui/asciifx/scenes/* が手続き的に描く。
 * palette は明→暗 (白いパネル上で読める濃さに寄せてある)。accents は花・蝶・露など差し色。
 */
export type DecorConfig = {
  edge: DecorEdge;
  /** decor 領域の高さ (行数, 4–6) */
  rows: number;
  palette: string[];
  accents?: string[];
  corner?: DecorCorner;
};

export const DECOR: Record<BiomeId, DecorConfig> = {
  meadow: {
    edge: 'bottom',
    rows: 5,
    palette: ['#9bd86f', '#6cbf4e', '#4a9e3c', '#33792e', '#215522'],
    // 花: ピンク / 黄 / 薄紫, 蝶: オレンジ
    accents: ['#ff5fa2', '#f2b705', '#9a7bff', '#ff8a1f'],
  },
  forest: {
    edge: 'top',
    rows: 5,
    palette: ['#86c96f', '#57a14a', '#357530', '#235222', '#163a17'],
    // 葉の差し色 (黄緑・枯葉) / 露
    accents: ['#b5d13a', '#c98a2b', '#4aa3ff'],
  },
  snow: {
    edge: 'top',
    rows: 6,
    palette: ['#cfe3fb', '#a9cdf5', '#7fb2ec', '#5a95dd', '#3b74c4', '#24549a'],
    // きらめき / 氷柱の青み / 雫
    accents: ['#1f8bff', '#6fb6e8', '#3d9bea'],
  },
  desert: {
    edge: 'bottom',
    rows: 5,
    palette: ['#ecd39b', '#dcb873', '#c99a52', '#a67b3a', '#7d5a28'],
    corner: {
      cols: 12,
      rows: 4,
      // 月 (明→暗) と星
      palette: ['#e8c547', '#d1a92e', '#a8861f', '#8a7a4a'],
    },
  },
  volcano: {
    edge: 'top',
    rows: 6,
    // 溶岩 (明→暗) + 地殻の暗赤・黒 + 煙
    palette: ['#ffe08a', '#ffb03a', '#ff6a1a', '#c2300c', '#6b1a0a', '#2a0d08'],
    accents: ['#8a7f7a'],
  },
};
