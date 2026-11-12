import type { CharGrid } from './grid';

/** 手描きの複数行 ASCII 絵。' ' は透明 */
export type Sprite = { readonly w: number; readonly h: number; readonly lines: readonly string[] };

export type SpriteColor = string | ((ch: string, cx: number, cy: number) => string);

export function sprite(lines: readonly string[]): Sprite {
  let w = 0;
  for (const l of lines) if (l.length > w) w = l.length;
  return { w, h: lines.length, lines };
}

/** s の空白以外の文字を (x+cx, y+cy) に書く。はみ出した分は黙って切り捨てる */
export function stamp(grid: CharGrid, s: Sprite, x: number, y: number, color: SpriteColor, alpha = 1): void {
  const ox = Math.floor(x);
  const oy = Math.floor(y);
  if (!(ox < grid.cols && oy < grid.rows && ox + s.w > 0 && oy + s.h > 0)) return;
  for (let cy = 0; cy < s.h; cy++) {
    const gy = oy + cy;
    if (gy < 0 || gy >= grid.rows) continue;
    const line = s.lines[cy] ?? '';
    for (let cx = 0; cx < line.length; cx++) {
      const gx = ox + cx;
      if (gx < 0 || gx >= grid.cols) continue;
      const ch = line.charAt(cx);
      if (ch === ' ') continue;
      grid.put(gx, gy, ch, typeof color === 'string' ? color : color(ch, cx, cy), alpha);
    }
  }
}
