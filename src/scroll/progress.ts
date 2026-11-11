export function progressFromScroll(scrollY: number, scrollHeight: number, innerHeight: number): number {
  const scrollable = scrollHeight - innerHeight;
  if (scrollable <= 0) return 0;
  const raw = scrollY / scrollable;
  return Math.min(1, Math.max(0, raw));
}

export function smoothProgress(current: number, target: number, dt: number, rate = 6): number {
  const t = Math.min(1, dt * rate);
  return current + (target - current) * t;
}

// ワールド単位/秒。速くスクロールしても牛はこの速さまでしか歩かない
export const MAX_WALK_SPEED = 24;
// ワールド単位/秒。脚の waddle アニメの速さの上限（legacy prototype の歩行速度 6×1.4 相当）
export const MAX_GAIT_SPEED = 8;

export function limitStep(current: number, target: number, dt: number, maxPerSec: number): number {
  const max = maxPerSec * dt;
  const delta = Math.max(-max, Math.min(max, target - current));
  return current + delta;
}
