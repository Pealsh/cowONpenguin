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
