import { describe, it, expect } from 'vitest';
import {
  proximity,
  eruptionPhase,
  ballistic,
  nextShootingStar,
  eruptionShake,
  hash01,
  nearSpan,
  halfIfMobile,
} from '../src/scene/gimmicks/logic';

describe('proximity', () => {
  it('is 1 at distance 0 and 0 at or beyond the radius', () => {
    expect(proximity(10, 10, 6)).toBe(1);
    expect(proximity(16, 10, 6)).toBe(0);
    expect(proximity(4, 10, 6)).toBe(0);
    expect(proximity(100, 10, 6)).toBe(0);
  });

  it('is a smoothstep in between (0.5 at half radius, monotone)', () => {
    expect(proximity(13, 10, 6)).toBeCloseTo(0.5, 6);
    expect(proximity(11, 10, 6)).toBeGreaterThan(proximity(12, 10, 6));
    expect(proximity(12, 10, 6)).toBeGreaterThan(proximity(15, 10, 6));
  });
});

describe('eruptionPhase', () => {
  it('is active for `duration` seconds at the start of each period', () => {
    expect(eruptionPhase(0, 7, 2.5)).toEqual({ active: true, t: 0 });
    expect(eruptionPhase(1.25, 7, 2.5).t).toBeCloseTo(0.5, 6);
    expect(eruptionPhase(1.25, 7, 2.5).active).toBe(true);
    expect(eruptionPhase(3, 7, 2.5)).toEqual({ active: false, t: 0 });
    expect(eruptionPhase(7.5, 7, 2.5).active).toBe(true);
    expect(eruptionPhase(7.5, 7, 2.5).t).toBeCloseTo(0.2, 6);
  });

  it('honours an offset', () => {
    expect(eruptionPhase(1, 7, 2.5, 3.5).active).toBe(false);
    expect(eruptionPhase(3.5, 7, 2.5, 3.5)).toEqual({ active: true, t: 0 });
    expect(eruptionPhase(4.75, 7, 2.5, 3.5).t).toBeCloseTo(0.5, 6);
  });

  it('writes into an out object when given (no allocation)', () => {
    const out = { active: false, t: 0 };
    const r = eruptionPhase(1.25, 7, 2.5, 0, out);
    expect(r).toBe(out);
    expect(out.active).toBe(true);
  });
});

describe('ballistic', () => {
  it('starts at the origin', () => {
    expect(ballistic({ x: 2, y: 10, z: 1 }, 18, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('follows x = vx t, y = vy t - g t^2 / 2', () => {
    const p = ballistic({ x: 2, y: 10, z: -1 }, 18, 0.5);
    expect(p.x).toBeCloseTo(1, 6);
    expect(p.y).toBeCloseTo(10 * 0.5 - 9 * 0.25, 6);
    expect(p.z).toBeCloseTo(-0.5, 6);
  });

  it('returns to y=0 at t = 2 vy / g', () => {
    expect(ballistic({ x: 0, y: 9, z: 0 }, 18, 1).y).toBeCloseTo(0, 6);
  });

  it('writes into an out object when given', () => {
    const out = { x: 0, y: 0, z: 0 };
    expect(ballistic({ x: 1, y: 1, z: 1 }, 18, 0.1, out)).toBe(out);
  });
});

describe('nextShootingStar', () => {
  it('schedules the next star 4-7 s after the previous one', () => {
    let start = 0;
    for (let i = 0; i < 200; i++) {
      const next = nextShootingStar(start, i, 42);
      expect(next - start).toBeGreaterThanOrEqual(4);
      expect(next - start).toBeLessThanOrEqual(7);
      start = next;
    }
  });

  it('is deterministic for the same seed and index', () => {
    expect(nextShootingStar(10, 3, 42)).toBe(nextShootingStar(10, 3, 42));
    expect(nextShootingStar(10, 3, 42)).not.toBe(nextShootingStar(10, 4, 42));
  });
});

describe('hash01', () => {
  it('is in [0, 1) and deterministic', () => {
    for (let i = 0; i < 100; i++) {
      const v = hash01(7, i);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(hash01(7, i)).toBe(v);
    }
  });
});

describe('eruptionShake', () => {
  it('is 0.12 * proximity during the first 0.8 s of an eruption', () => {
    expect(eruptionShake({ active: true, t: 0.1 }, 2.5, 1, false)).toBeCloseTo(0.12, 6);
    expect(eruptionShake({ active: true, t: 0.1 }, 2.5, 0.5, false)).toBeCloseTo(0.06, 6);
  });

  it('is 0 after 0.8 s, when inactive, or when reduced', () => {
    expect(eruptionShake({ active: true, t: 0.5 }, 2.5, 1, false)).toBe(0);
    expect(eruptionShake({ active: false, t: 0 }, 2.5, 1, false)).toBe(0);
    expect(eruptionShake({ active: true, t: 0.1 }, 2.5, 1, true)).toBe(0);
  });
});

describe('nearSpan', () => {
  it('is true inside the span widened by the margin, false outside', () => {
    expect(nearSpan(50, 40, 60, 30)).toBe(true);
    expect(nearSpan(10, 40, 60, 30)).toBe(true);
    expect(nearSpan(90, 40, 60, 30)).toBe(true);
    expect(nearSpan(9.9, 40, 60, 30)).toBe(false);
    expect(nearSpan(90.1, 40, 60, 30)).toBe(false);
  });
});

describe('halfIfMobile', () => {
  it('halves particle counts on mobile (rounded down, at least 1)', () => {
    expect(halfIfMobile(40, false)).toBe(40);
    expect(halfIfMobile(40, true)).toBe(20);
    expect(halfIfMobile(7, true)).toBe(3);
    expect(halfIfMobile(1, true)).toBe(1);
  });
});
