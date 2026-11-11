import { describe, it, expect } from 'vitest';
import { progressFromScroll, smoothProgress } from '../src/scroll/progress';

describe('progressFromScroll', () => {
  it('0 at top', () => expect(progressFromScroll(0, 3000, 1000)).toBe(0));
  it('1 at bottom', () => expect(progressFromScroll(2000, 3000, 1000)).toBe(1));
  it('0.5 at middle', () => expect(progressFromScroll(1000, 3000, 1000)).toBeCloseTo(0.5));
  it('clamps over-scroll', () => expect(progressFromScroll(2500, 3000, 1000)).toBe(1));
  it('clamps negative scrollY (iOS bounce)', () => expect(progressFromScroll(-80, 3000, 1000)).toBe(0));
  it('returns 0, not NaN, when page cannot scroll', () => {
    expect(progressFromScroll(0, 1000, 1000)).toBe(0);
    expect(progressFromScroll(0, 800, 1000)).toBe(0);
  });
});

describe('smoothProgress', () => {
  it('moves monotonically toward target', () => {
    let p = 0; let prev = 0;
    for (let i = 0; i < 20; i++) { p = smoothProgress(p, 1, 1 / 60); expect(p).toBeGreaterThanOrEqual(prev); prev = p; }
    expect(p).toBeLessThanOrEqual(1);
  });
  it('snaps when dt*rate >= 1', () => expect(smoothProgress(0, 1, 1)).toBe(1));
  it('uses rate 6 by default', () => expect(smoothProgress(0, 1, 0.1)).toBeCloseTo(0.6));
});
