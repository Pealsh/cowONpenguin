import { BufferAttribute, BufferGeometry, Points, PointsMaterial, type Scene } from 'three';

export type ParticleCloud = { points: Points; pos: Float32Array; attr: BufferAttribute; count: number };

// ギミック用の粒子（位置バッファは使い回し、モバイルは drawRange で半分だけ描く）
export function createParticles(scene: Scene, count: number, color: number, size: number): ParticleCloud {
  const pos = new Float32Array(count * 3);
  const g = new BufferGeometry();
  const attr = new BufferAttribute(pos, 3);
  g.setAttribute('position', attr);
  const mat = new PointsMaterial({ color, size, fog: false });
  const points = new Points(g, mat);
  points.frustumCulled = false; // 位置を毎フレーム書き換えるので境界球を作り直さない
  scene.add(points);
  return { points, pos, attr, count };
}

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
