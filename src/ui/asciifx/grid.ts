/**
 * cols×rows の文字セル。各セルは {文字, 色, alpha}。
 * フレーム毎の確保を避けるため平坦な配列で持つ。
 */
export class CharGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly chars: string[];
  private readonly colors: string[];
  private readonly alphas: Float32Array;

  constructor(cols: number, rows: number) {
    this.cols = Math.max(0, Math.floor(cols));
    this.rows = Math.max(0, Math.floor(rows));
    const n = this.cols * this.rows;
    this.chars = new Array<string>(n).fill(' ');
    this.colors = new Array<string>(n).fill('');
    this.alphas = new Float32Array(n);
  }

  clear(): void {
    this.chars.fill(' ');
    this.alphas.fill(0);
  }

  private index(x: number, y: number): number {
    if (!(x >= 0 && y >= 0)) return -1; // NaN もここで弾く
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix >= this.cols || iy >= this.rows) return -1;
    return iy * this.cols + ix;
  }

  put(x: number, y: number, ch: string, color: string, alpha = 1): void {
    const i = this.index(x, y);
    if (i < 0) return;
    this.chars[i] = ch;
    this.colors[i] = color;
    this.alphas[i] = Math.min(1, Math.max(0, alpha));
  }

  chAt(x: number, y: number): string {
    const i = this.index(x, y);
    return i < 0 ? ' ' : (this.chars[i] ?? ' ');
  }

  colorAt(x: number, y: number): string {
    const i = this.index(x, y);
    return i < 0 ? '' : (this.colors[i] ?? '');
  }

  alphaAt(x: number, y: number): number {
    const i = this.index(x, y);
    return i < 0 ? 0 : (this.alphas[i] ?? 0);
  }

  toLines(): string[] {
    const out: string[] = [];
    for (let y = 0; y < this.rows; y++) {
      out.push(this.chars.slice(y * this.cols, (y + 1) * this.cols).join(''));
    }
    return out;
  }
}
