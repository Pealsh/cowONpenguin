import type { GimmickFactory } from './index';
import { halfIfMobile, proximity } from './logic';
import { createParticles, rand } from './particles';

const FLIES = 40;
const SCARE_RADIUS = 6;
const MAX_Y = 4;
const SETTLE_SECONDS = 3;

// 草原: 草むらや木の近くを低く漂う蛍。ライダーが近づくと舞い上がって散り、約 3 秒かけて降りてくる
export const createMeadow: GimmickFactory = (scene, span, props) => {
  const cloud = createParticles(scene, FLIES, 0xfff2a0, 0.2);
  const anchors = [...props.meadowTufts.map(t => t.position), ...props.meadowTrees];
  const base = new Float32Array(FLIES * 3);
  const scatter = new Float32Array(FLIES * 2);
  const lift = new Float32Array(FLIES);
  const phase = new Float32Array(FLIES);
  for (let i = 0; i < FLIES; i++) {
    const a = anchors.length > 0 ? anchors[i % anchors.length] : undefined;
    base[i * 3] = (a ? a.x : rand(span.x0, span.x1)) + rand(-2.5, 2.5);
    base[i * 3 + 1] = rand(0.3, 1.1);
    // 木の根元（奥）付近でも見えるよう、奥行きは歩行路寄りに引き寄せる
    base[i * 3 + 2] = Math.max(-6, Math.min(3.5, (a ? a.z * 0.6 : 0) + rand(-1.5, 1.5)));
    const ang = rand(0, Math.PI * 2);
    scatter[i * 2] = Math.cos(ang) * rand(1.5, 3);
    scatter[i * 2 + 1] = Math.sin(ang) * rand(1, 2);
    phase[i] = rand(0, Math.PI * 2);
  }

  const tufts = props.meadowTufts;
  const swayPhase = new Float32Array(tufts.length);

  return {
    setVisible(v) {
      cloud.points.visible = v;
    },
    update({ time, dt, riderX, mobile }) {
      const n = halfIfMobile(FLIES, mobile);
      cloud.points.geometry.setDrawRange(0, n);
      const p = cloud.pos;
      for (let i = 0; i < n; i++) {
        const bx = base[i * 3]!;
        const near = proximity(riderX, bx, SCARE_RADIUS);
        const l = lift[i]!;
        // 近いと素早く舞い上がり、離れると SETTLE_SECONDS かけてゆっくり戻る
        lift[i] = near > 0 ? Math.min(1, Math.max(l, near) + dt * 2) : Math.max(0, l - dt / SETTLE_SECONDS);
        const k = lift[i]!;
        const ph = phase[i]!;
        const by = base[i * 3 + 1]!;
        p[i * 3] = bx + scatter[i * 2]! * k + Math.sin(time * 0.7 + ph) * 0.4;
        p[i * 3 + 1] = by + (MAX_Y - by) * k * (0.6 + 0.4 * Math.sin(ph)) + Math.sin(time * 2.3 + ph) * 0.15;
        p[i * 3 + 2] = base[i * 3 + 2]! + scatter[i * 2 + 1]! * k + Math.cos(time * 0.5 + ph) * 0.3;
      }
      cloud.attr.needsUpdate = true;

      // 草むらはライダーが近いほど速く大きく揺れる（周波数が変わっても跳ねないよう位相を積分する）
      for (let i = 0; i < tufts.length; i++) {
        const t = tufts[i]!;
        const near = proximity(riderX, t.position.x, SCARE_RADIUS);
        swayPhase[i] = swayPhase[i]! + dt * (1.5 + 7 * near);
        t.rotation.z = Math.sin(swayPhase[i]! + i) * (0.06 + 0.16 * near);
      }
    },
  };
};
