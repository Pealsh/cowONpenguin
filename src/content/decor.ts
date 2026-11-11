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
  /**
   * alpha < 0.6 でしか使わない差し色 (煙・消えゆく飛沫など)。
   * 白背景での最低コントラスト 3:1 の対象外 — palette/accents より明るいままで良い。
   */
  faint?: string[];
  corner?: DecorCorner;
};

export const DECOR: Record<BiomeId, DecorConfig> = {
  meadow: {
    edge: 'bottom',
    rows: 5,
    // 明→暗 (白パネル上でコントラスト 3:1 以上になるよう調整済み)
    palette: ['#5ea32c', '#56a23b', '#4a9e3c', '#33792e', '#215522'],
    // 花: ピンク / 黄 / 薄紫, 蝶: オレンジ
    accents: ['#ff4d98', '#b78a04', '#9979ff', '#e36c00'],
  },
  forest: {
    edge: 'top',
    rows: 5,
    palette: ['#57a33d', '#57a14a', '#357530', '#235222', '#163a17'],
    // 葉の差し色 (黄緑・枯葉) / 露
    accents: ['#859b24', '#c18429', '#2690ff'],
  },
  snow: {
    edge: 'top',
    rows: 6,
    palette: ['#4894f0', '#4693ea', '#4b92e4', '#5390dc', '#3b74c4', '#24549a'],
    // きらめき / 氷柱の青み / 雫
    accents: ['#1f8bff', '#2590dc', '#218ce7'],
  },
  desert: {
    edge: 'bottom',
    rows: 5,
    palette: ['#b98a23', '#b8882e', '#b8863a', '#a67b3a', '#7d5a28'],
    corner: {
      cols: 12,
      rows: 4,
      // 月 (明→暗) と星
      palette: ['#b08e16', '#ae8d26', '#a8861f', '#8a7a4a'],
    },
  },
  volcano: {
    edge: 'top',
    rows: 6,
    // 溶岩 (明→暗) + 地殻の暗赤・黒
    palette: ['#bc8a00', '#d27d00', '#fd5800', '#c2300c', '#6b1a0a', '#2a0d08'],
    // 煙の帯は常に alpha < 0.6 (低アルファ) で描くので faint に置く
    faint: ['#8a7f7a'],
  },
};
