import { CircleGeometry, Mesh, MeshBasicMaterial } from 'three';
import type { GimmickFactory } from './index';
import { halfIfMobile } from './logic';
import { createParticles, rand } from './particles';

const FLAKES = 300;
const PRINTS = 60;
const STRIDE = 0.8;
const MAX_HEAD_TURN = 1.2;

// 雪原: 降る雪、ライダーを目で追う雪だるま、歩いた跡に残る足跡
export const createSnow: GimmickFactory = (scene, span, props) => {
  const flakes = createParticles(scene, FLAKES, 0xffffff, 0.14);
  const fp = flakes.pos;
  const fall = new Float32Array(FLAKES);
  const sway = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) {
    fp[i * 3] = rand(span.x0, span.x1);
    fp[i * 3 + 1] = rand(0, 8);
    fp[i * 3 + 2] = rand(-10, 4);
    fall[i] = rand(1.1, 1.9);
    sway[i] = rand(0, Math.PI * 2);
  }

  // 足跡: 共有ジオメトリ/マテリアルの平たい楕円を 60 個使い回す（古いものから再利用）
  const printGeo = new CircleGeometry(0.12, 12);
  printGeo.rotateX(-Math.PI / 2);
  const printMat = new MeshBasicMaterial({ color: 0x5a6068 });
  const prints: Mesh[] = [];
  for (let i = 0; i < PRINTS; i++) {
    const m = new Mesh(printGeo, printMat);
    m.scale.set(1.8, 1, 1); // 進行方向（x）に長い楕円
    m.visible = false;
    scene.add(m);
    prints.push(m);
  }
  let nextPrint = 0;
  let side = 1;
  let lastStepX = Number.NaN;
  let shown = false;

  const heads = props.snowmanHeads;

  return {
    setVisible(v) {
      shown = v;
      flakes.points.visible = v;
      for (let i = 0; i < PRINTS; i++) prints[i]!.visible = v && prints[i]!.userData.used === true;
    },
    update({ time, dt, riderX, mobile }) {
      const n = halfIfMobile(FLAKES, mobile);
      flakes.points.geometry.setDrawRange(0, n);
      const lo = Math.max(span.x0, riderX - 20);
      const hi = Math.min(span.x1, riderX + 15);
      const w = hi - lo;
      for (let i = 0; i < n; i++) {
        let x = fp[i * 3]!;
        let y = fp[i * 3 + 1]! - fall[i]! * dt;
        if (w > 0) {
          if (x < lo) x += w;
          else if (x > hi) x -= w;
        }
        if (y < 0) {
          y = rand(6, 8);
          x = w > 0 ? rand(lo, hi) : x;
        }
        fp[i * 3] = x + Math.sin(time * 1.3 + sway[i]!) * 0.35 * dt;
        fp[i * 3 + 1] = y;
      }
      flakes.attr.needsUpdate = true;

      // 雪だるまの頭はライダー（z≈0）の方へなめらかに向く
      const k = Math.min(1, dt * 3);
      for (const h of heads) {
        const body = h.parent;
        if (!body) continue;
        let target = Math.atan2(riderX - body.position.x, -body.position.z);
        target = Math.max(-MAX_HEAD_TURN, Math.min(MAX_HEAD_TURN, target));
        h.rotation.y += (target - h.rotation.y) * k;
      }

      // 足跡: 雪原の中で 0.8 進むごとに左右交互に置く（前進でも後退でも）
      if (riderX < span.x0 || riderX > span.x1) {
        lastStepX = Number.NaN;
        return;
      }
      if (Number.isNaN(lastStepX)) lastStepX = riderX;
      for (let guard = 0; guard < 4 && Math.abs(riderX - lastStepX) >= STRIDE; guard++) {
        lastStepX += Math.sign(riderX - lastStepX) * STRIDE;
        const m = prints[nextPrint]!;
        m.position.set(lastStepX, 0.02, 0.3 * side);
        m.userData.used = true;
        m.visible = shown;
        side = -side;
        nextPrint = (nextPrint + 1) % PRINTS;
      }
      if (Math.abs(riderX - lastStepX) >= STRIDE) lastStepX = riderX; // 一気に飛んだ分は間を詰めない
    },
  };
};
