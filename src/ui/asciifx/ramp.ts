/** 明るさ(密度)順の ASCII ランプ。左が空白、右ほど「濃い」 */
export const RAMP = ' .,:;-=+*#%@';

/** v (0..1, 範囲外はクランプ) を濃さに応じた 1 文字へ変換する */
export function shade(v: number): string {
  const c = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
  const idx = Math.min(RAMP.length - 1, Math.floor(c * RAMP.length));
  return RAMP.charAt(idx);
}
