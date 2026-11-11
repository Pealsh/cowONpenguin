import type { CharGrid } from '../grid';

/** 純粋なシミュレーション。step で状態を進め、draw で grid に書く (DOM 非依存) */
export type Scene = {
  step(dt: number): void;
  draw(grid: CharGrid): void;
};

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** palette (明→暗) から v=0 明 … v=1 暗 で色を取る */
export function tone(palette: readonly string[], v: number): string {
  if (palette.length === 0) return '#000000';
  const i = Math.round(clamp01(v) * (palette.length - 1));
  return palette[i] ?? palette[0] ?? '#000000';
}

export function pickChar(chars: string, r: number): string {
  return chars.charAt(Math.min(chars.length - 1, Math.floor(r * chars.length)));
}

/** 列ごとに 2–5 列おきの位置を seeded に並べる */
export function spacedColumns(cols: number, rnd: () => number, minGap: number, maxGap: number): number[] {
  const out: number[] = [];
  let x = Math.floor(rnd() * maxGap);
  while (x < cols) {
    out.push(x);
    x += minGap + Math.floor(rnd() * (maxGap - minGap + 1));
  }
  return out;
}
