import { describe, it, expect } from 'vitest';
import { WORKS } from '../src/content/works';

describe('WORKS', () => {
  it('has unique ids', () => expect(new Set(WORKS.map(w => w.id)).size).toBe(WORKS.length));
  it('ids are url-safe', () => WORKS.forEach(w => expect(w.id).toMatch(/^[a-z0-9-]+$/)));
  it('urls are http(s)', () => WORKS.filter(w => w.url).forEach(w => expect(w.url).toMatch(/^https?:\/\//)));
  it('images live under /works/', () => WORKS.filter(w => w.image).forEach(w => expect(w.image).toMatch(/^\/works\//)));
  it('every work has title and summary', () => WORKS.forEach(w => { expect(w.title.length).toBeGreaterThan(0); expect(w.summary.length).toBeGreaterThan(0); }));
});
