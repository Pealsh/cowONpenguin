import { DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { GimmickFactory } from './index';
import { halfIfMobile, proximity } from './logic';
import { createParticles, rand } from './particles';

const LEAVES = 80;
const BIRDS = 6;
const SCARE_RADIUS = 6;
const AWAY_SECONDS = 8;
const FLIGHT_SECONDS = 2.5;
// 木のてっぺん（y≈9）はデスクトップでも画面の上端より上なので、見える高さの低い枝にとまらせる
const PERCH_Y = 3;

type Bird = { group: Group; wingL: Mesh; wingR: Mesh; perch: Vector3; state: 0 | 1 | 2; since: number; dir: number };

// 森: ゆっくり舞い落ちる葉と、ライダーが近づくと飛び去る鳥
export const createForest: GimmickFactory = (scene, span, props) => {
  const leaves = createParticles(scene, LEAVES, 0xc8d070, 0.17);
  const lp = leaves.pos;
  const fall = new Float32Array(LEAVES);
  const sway = new Float32Array(LEAVES);
  for (let i = 0; i < LEAVES; i++) {
    lp[i * 3] = rand(span.x0, span.x1);
    lp[i * 3 + 1] = rand(0, 7);
    lp[i * 3 + 2] = rand(-9, 3.5);
    fall[i] = rand(0.5, 0.9);
    sway[i] = rand(0, Math.PI * 2);
  }

  // 鳥: 2 枚の板で V 字。ASCII 化で消えないよう暗い背景より明るい灰色にする
  const wingGeo = new PlaneGeometry(0.45, 0.16);
  wingGeo.rotateX(-Math.PI / 2);
  wingGeo.translate(0.225, 0, 0); // 付け根を原点に
  const birdMat = new MeshBasicMaterial({ color: 0xb0b0a0, side: DoubleSide });

  // span を 6 等分し、それぞれで歩行路に一番近い木を選ぶ
  const perches: Vector3[] = [];
  for (let b = 0; b < BIRDS; b++) {
    const lo = span.x0 + ((span.x1 - span.x0) * b) / BIRDS;
    const hi = span.x0 + ((span.x1 - span.x0) * (b + 1)) / BIRDS;
    let best: Vector3 | undefined;
    for (const t of props.forestTreeTops) if (t.x >= lo && t.x < hi && (!best || t.z > best.z)) best = t;
    if (best) perches.push(new Vector3(best.x, PERCH_Y, best.z + 0.6));
  }
  const birds: Bird[] = perches.map(perch => {
    const group = new Group();
    const wingR = new Mesh(wingGeo, birdMat);
    const wingL = new Mesh(wingGeo, birdMat);
    wingL.scale.x = -1;
    group.add(wingL, wingR);
    group.position.copy(perch);
    scene.add(group);
    return { group, wingL, wingR, perch, state: 0, since: 0, dir: 1 };
  });

  return {
    setVisible(v) {
      leaves.points.visible = v;
      for (const b of birds) b.group.visible = v && b.state !== 2;
    },
    update({ time, dt, riderX, mobile }) {
      const n = halfIfMobile(LEAVES, mobile);
      leaves.points.geometry.setDrawRange(0, n);
      // 葉はライダーの周囲 [-20, +15] に巻き直して密度を保つ（バイオームの外には出さない）
      const lo = Math.max(span.x0, riderX - 20);
      const hi = Math.min(span.x1, riderX + 15);
      const w = hi - lo;
      for (let i = 0; i < n; i++) {
        let x = lp[i * 3]!;
        let y = lp[i * 3 + 1]! - fall[i]! * dt;
        if (w > 0) {
          if (x < lo) x += w;
          else if (x > hi) x -= w;
        }
        if (y < 0) {
          y = rand(5.5, 7.5);
          x = w > 0 ? rand(lo, hi) : x;
        }
        lp[i * 3] = x + Math.sin(time * 0.9 + sway[i]!) * 0.5 * dt;
        lp[i * 3 + 1] = y;
      }
      leaves.attr.needsUpdate = true;

      for (const b of birds) {
        const near = proximity(riderX, b.perch.x, SCARE_RADIUS);
        if (b.state === 0) {
          // とまっている: 羽は小さな V で、時々ぴくっと動かす
          const a = 0.35 + Math.max(0, Math.sin(time * 3 + b.perch.x)) * 0.15;
          b.wingR.rotation.z = a;
          b.wingL.rotation.z = -a;
          if (near > 0) {
            b.state = 1;
            b.since = time;
            b.dir = riderX < b.perch.x ? 1 : -1; // ライダーから遠ざかる向き
          }
        } else if (b.state === 1) {
          // 上へ・奥へ弧を描いて飛び去る
          const u = time - b.since;
          b.group.position.set(b.perch.x + b.dir * 5 * u, b.perch.y + 1.5 * u + 1.2 * u * u, b.perch.z - 2 * u);
          const flap = Math.sin(time * 18) * 0.7;
          b.wingR.rotation.z = flap;
          b.wingL.rotation.z = -flap;
          if (u > FLIGHT_SECONDS) {
            b.state = 2;
            b.since = time;
            b.group.visible = false;
          }
        } else if (time - b.since > AWAY_SECONDS && near === 0) {
          // 画面外で 8 秒たったら元の枝に戻る（ライダーが近いままなら待つ）
          b.state = 0;
          b.group.position.copy(b.perch);
          b.group.visible = true;
        }
      }
    },
  };
};
