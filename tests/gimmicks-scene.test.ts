import { describe, it, expect } from 'vitest';
import { Scene } from 'three';
import { buildSections } from '../src/content/sections';
import { sectionRanges, worldX } from '../src/scroll/path';
import { createProps } from '../src/scene/props';
import { createGimmicks, type GimmickCtx } from '../src/scene/gimmicks';

// three の Scene は WebGL なしでも組めるので、ギミックを実際に回して振る舞いを確かめる
function setup() {
  const scene = new Scene();
  const ranges = sectionRanges(buildSections(2));
  const props = createProps(scene, ranges);
  const before = scene.children.length;
  const gimmicks = createGimmicks(scene, ranges, props.handles);
  const added = scene.children.slice(before);
  return { scene, ranges, props, gimmicks, added };
}

function run(g: ReturnType<typeof setup>['gimmicks'], riderX: number, from: number, to: number, reduced = false) {
  const ctx: GimmickCtx = { time: from, dt: 1 / 60, riderX, reduced, mobile: false };
  let maxShake = 0;
  for (let t = from; t < to; t += ctx.dt) {
    ctx.time = t;
    g.update(ctx);
    maxShake = Math.max(maxShake, g.shake());
  }
  return maxShake;
}

describe('createGimmicks', () => {
  it('exposes prop handles for every biome gimmick', () => {
    const { props } = setup();
    expect(props.handles.craters.length).toBe(2);
    expect(props.handles.snowmanHeads.length).toBe(6);
    expect(props.handles.meadowTufts.length).toBe(6);
    expect(props.handles.forestTreeTops.length).toBe(40);
  });

  it('keeps every gimmick object hidden while the rider is far from all biomes', () => {
    const { gimmicks, added } = setup();
    run(gimmicks, -1000, 0, 10);
    expect(added.every(o => !o.visible)).toBe(true);
  });

  it('shakes the camera up to 0.12 near the volcano and never when reduced', () => {
    const { gimmicks, ranges } = setup();
    const v = ranges.find(r => r.biome === 'volcano')!;
    const x = (worldX(v.start) + worldX(v.end)) / 2;
    const shake = run(gimmicks, x, 0, 14);
    expect(shake).toBeGreaterThan(0);
    expect(shake).toBeLessThanOrEqual(0.12 + 1e-9);
    const r = setup();
    expect(run(r.gimmicks, x, 0, 14, true)).toBe(0);
  });

  it('does not shake in the meadow', () => {
    const { gimmicks } = setup();
    expect(run(gimmicks, 5, 0, 14)).toBe(0);
  });

  it('turns snowman heads toward the rider', () => {
    const { gimmicks, props, ranges } = setup();
    const s = ranges.find(r => r.biome === 'snow')!;
    const head = props.handles.snowmanHeads[0]!;
    const bx = head.parent!.position.x;
    run(gimmicks, Math.min(worldX(s.end), bx + 8), 0, 3);
    expect(head.rotation.y).toBeGreaterThan(0.3);
  });
});
