import { describe, it, expect } from 'vitest';
import { progressFromScroll, smoothProgress, limitStep, MAX_WALK_SPEED, MAX_GAIT_SPEED } from '../src/scroll/progress';

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

describe('limitStep', () => {
  it('MAX_WALK_SPEED is 24', () => expect(MAX_WALK_SPEED).toBe(24));
  it('MAX_GAIT_SPEED is 8 and does not exceed MAX_WALK_SPEED', () => {
    expect(MAX_GAIT_SPEED).toBe(8);
    expect(MAX_GAIT_SPEED).toBeLessThanOrEqual(MAX_WALK_SPEED);
  });
  it('within limit: returns target', () => expect(limitStep(0.1, 0.12, 1, 0.05)).toBe(0.12));
  it('caps forward motion at maxPerSec*dt', () => expect(limitStep(0, 1, 0.5, 0.1)).toBeCloseTo(0.05));
  it('cap applies backwards', () => expect(limitStep(0.9, 0, 1, 0.1)).toBeCloseTo(0.8));
  it('never overshoots the target', () => expect(limitStep(0.5, 0.51, 10, 0.1)).toBe(0.51));
  it('dt = 0 returns current', () => expect(limitStep(0.1, 0.9, 0, 0.1)).toBe(0.1));
});
