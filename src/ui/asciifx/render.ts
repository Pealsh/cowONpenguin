import type { CharGrid } from './grid';

export const FONT_PX = 11;
export const LINE_HEIGHT = 1.1;
export const FONT_FAMILY = 'ui-monospace, "SF Mono", Menlo, monospace';

let cachedCharWidth: number | null = null;

/** 等幅フォント 1 文字の幅 (CSS px)。全 decor 共通なので 1 度だけ測る */
export function measureCharWidth(): number {
  if (cachedCharWidth !== null) return cachedCharWidth;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let w = FONT_PX * 0.6;
  if (ctx) {
    ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
    w = ctx.measureText('0').width || w;
  }
  cachedCharWidth = w;
  return w;
}

export type GridRenderer = {
  readonly canvas: HTMLCanvasElement;
  /** グリッドサイズに合わせて canvas の CSS/実ピクセルサイズを合わせる */
  resize(cols: number, rows: number): void;
  draw(grid: CharGrid): void;
};

export function createGridRenderer(canvas: HTMLCanvasElement): GridRenderer {
  const ctx = canvas.getContext('2d');
  const charW = measureCharWidth();
  const lineH = FONT_PX * LINE_HEIGHT;
  let dpr = 1;

  const resize = (cols: number, rows: number): void => {
    dpr = Math.max(1, Math.min(3, globalThis.devicePixelRatio || 1));
    const cssW = cols * charW;
    const cssH = rows * lineH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
  };

  const draw = (grid: CharGrid): void => {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_PX}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    const top = (lineH - FONT_PX) / 2;
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const ch = grid.chAt(x, y);
        if (ch === ' ') continue;
        const a = grid.alphaAt(x, y);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = grid.colorAt(x, y);
        ctx.fillText(ch, x * charW, y * lineH + top);
      }
    }
    ctx.globalAlpha = 1;
  };

  return { canvas, resize, draw };
}
