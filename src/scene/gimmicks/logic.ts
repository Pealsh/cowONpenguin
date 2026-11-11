// ギミックの時間・距離計算（three.js 非依存。Vitest の node 環境でテストする）

export type Vec3Like = { x: number; y: number; z: number };
export type Phase = { active: boolean; t: number };

// 距離 0 で 1、radius 以上で 0、その間は smoothstep
export function proximity(riderX: number, x: number, radius: number): number {
  const d = Math.abs(riderX - x);
  if (d >= radius) return 0;
  const u = 1 - d / radius;
  return u * u * (3 - 2 * u);
}

// 各周期の頭 duration 秒だけ active。t はその窓の中で 0..1
export function eruptionPhase(
  time: number,
  period: number,
  duration: number,
  offset = 0,
  out: Phase = { active: false, t: 0 },
): Phase {
  const local = (((time - offset) % period) + period) % period;
  out.active = local < duration;
  out.t = out.active ? local / duration : 0;
  return out;
}

// 原点から初速 v0 で投げて t 秒後の位置（重力 g は -y 方向）
export function ballistic(v0: Vec3Like, g: number, t: number, out: Vec3Like = { x: 0, y: 0, z: 0 }): Vec3Like {
  out.x = v0.x * t;
  out.y = v0.y * t - 0.5 * g * t * t;
  out.z = v0.z * t;
  return out;
}

// (seed, i) から決まる [0,1) の値
export function hash01(seed: number, i: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// index 番目の流れ星の開始時刻を受け取り、次の流れ星の開始時刻（4〜7 秒後）を返す
export function nextShootingStar(prevStart: number, index: number, seed: number): number {
  return prevStart + 4 + 3 * hash01(seed, index);
}

export const SHAKE_AMPLITUDE = 0.12;
export const SHAKE_WINDOW = 0.8;

// 噴火の最初の 0.8 秒だけ揺らす（近さ prox で減衰、reduced-motion では 0）
export function eruptionShake(phase: Phase, duration: number, prox: number, reduced: boolean): number {
  if (reduced || !phase.active) return 0;
  return phase.t * duration < SHAKE_WINDOW ? SHAKE_AMPLITUDE * prox : 0;
}

export const ACTIVE_MARGIN = 30;

// ライダーがバイオームの x 範囲 ±margin にいるか（外ならギミックは何もせず隠す）
export function nearSpan(riderX: number, x0: number, x1: number, margin = ACTIVE_MARGIN): boolean {
  return riderX >= x0 - margin && riderX <= x1 + margin;
}

// モバイルでは粒子数を半分にする
export function halfIfMobile(count: number, mobile: boolean): number {
  return mobile ? Math.max(1, Math.floor(count / 2)) : count;
}
