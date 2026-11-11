import { MathUtils, BufferAttribute, BufferGeometry, Points, PointsMaterial, Scene } from 'three';
import { PATH_LENGTH } from '../scroll/path';
import type { BiomeLook } from './biomes';

export type Stars = { update(time: number, look: BiomeLook): void };

const COUNT = 400;
const SPREAD_X = PATH_LENGTH + 60;

// 漂う光（動画の o や * の粒）。starAlpha が高いバイオームでは空へ持ち上げて星に見せる
export function createStars(scene: Scene): Stars {
  const a = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    a[i * 3] = -30 + Math.random() * SPREAD_X;
    a[i * 3 + 1] = 0.5 + Math.random() * 4;
    a[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(a, 3));
  const mat = new PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true });
  const points = new Points(g, mat);
  scene.add(points);

  return {
    update(time, look) {
      mat.opacity = look.starAlpha;
      // 混合中に跳ねないよう、starAlpha に応じて滑らかに持ち上げる
      const lift = 8 * MathUtils.smoothstep(look.starAlpha, 0.4, 1);
      points.position.y = Math.sin(time * 0.5) * 0.3 + lift;
    },
  };
}
