import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, SphereGeometry } from 'three';
import type { GimmickFactory } from './index';
import { ballistic, eruptionPhase, eruptionShake, halfIfMobile, proximity, type Phase, type Vec3Like } from './logic';
import { createParticles, rand } from './particles';

const PERIOD = 7;
const DURATION = 2.5;
const CRATER_OFFSET = 3.5;
const BOMBS = 14;
const G = 18;
const SPLAT_SECONDS = 0.4;
const EMBERS = 120;
const EMBER_G = 6;
const EMBER_LIFE = 0.9;
const EMBERS_PER_SPLAT = 4;
const SHAKE_RADIUS = 40;
const HOT = new Color(0xffd27a);

type Bomb = { mesh: Mesh; ox: number; oy: number; oz: number; v0: Vec3Like; launch: number; flying: boolean };
type Splat = { mesh: Mesh; born: number };

// 火山: 7 秒ごとに 2.5 秒の噴火（2 つの火口は 3.5 秒ずらす）。
// 火口のキャップが光り、溶岩弾が放物線で飛んで着地で弾け、火の粉が舞い上がる。最初の 0.8 秒はカメラが揺れる
export const createVolcano: GimmickFactory = (scene, _span, props) => {
  const craters = props.craters;
  const phases: Phase[] = craters.map(() => ({ active: false, t: 0 }));
  const wasActive: boolean[] = craters.map(() => false);

  const bombGeo = new SphereGeometry(0.26, 8, 6);
  const bombMat = new MeshBasicMaterial({ color: 0xff6a1a, fog: false });
  const splatGeo = new PlaneGeometry(1, 1);
  splatGeo.rotateX(-Math.PI / 2);
  const splatMat = new MeshBasicMaterial({ color: 0xffb050, fog: false });

  // 火口ごとに BOMBS 個の溶岩弾と、着地の跡（スプラット）をプールしておく
  const bombs: Bomb[][] = craters.map(() =>
    Array.from({ length: BOMBS }, () => {
      const mesh = new Mesh(bombGeo, bombMat);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, ox: 0, oy: 0, oz: 0, v0: { x: 0, y: 0, z: 0 }, launch: 0, flying: false };
    }),
  );
  const splats: Splat[] = Array.from({ length: BOMBS * craters.length }, () => {
    const mesh = new Mesh(splatGeo, splatMat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, born: -1 };
  });
  let nextSplat = 0;

  // 火の粉: 着地点から上へ散る粒（リングバッファ）。未使用の粒は地下に置く
  const embers = createParticles(scene, EMBERS, 0xffa040, 0.18);
  const ep = embers.pos;
  const eOrigin = new Float32Array(EMBERS * 3);
  const eVel = new Float32Array(EMBERS * 3);
  const eBorn = new Float32Array(EMBERS).fill(-100);
  for (let i = 0; i < EMBERS; i++) ep[i * 3 + 1] = -50;
  let nextEmber = 0;

  const tmp: Vec3Like = { x: 0, y: 0, z: 0 };
  const tmpV: Vec3Like = { x: 0, y: 0, z: 0 };
  let shakeAmp = 0;

  function emitEmbers(x: number, z: number, time: number, limit: number): void {
    for (let k = 0; k < EMBERS_PER_SPLAT; k++) {
      const i = nextEmber;
      nextEmber = (nextEmber + 1) % limit;
      eOrigin[i * 3] = x;
      eOrigin[i * 3 + 1] = 0.1;
      eOrigin[i * 3 + 2] = z;
      eVel[i * 3] = rand(-1.5, 1.5);
      eVel[i * 3 + 1] = rand(2.5, 5);
      eVel[i * 3 + 2] = rand(-1.5, 1.5);
      eBorn[i] = time;
    }
  }

  function hideAll(): void {
    for (const list of bombs) for (const b of list) b.mesh.visible = false;
    for (const s of splats) s.mesh.visible = false;
  }

  return {
    setVisible(v) {
      embers.points.visible = v;
      if (!v) {
        hideAll();
        for (const list of bombs) for (const b of list) b.flying = false;
        for (const s of splats) s.born = -1;
        for (let i = 0; i < craters.length; i++) craters[i]!.material.color.copy(craters[i]!.baseColor);
      }
    },
    update({ time, riderX, reduced, mobile }) {
      const bombCount = halfIfMobile(BOMBS, mobile);
      const emberLimit = halfIfMobile(EMBERS, mobile);
      embers.points.geometry.setDrawRange(0, emberLimit);
      if (nextEmber >= emberLimit) nextEmber = 0;
      shakeAmp = 0;

      for (let c = 0; c < craters.length; c++) {
        const crater = craters[c]!;
        const ph = eruptionPhase(time, PERIOD, DURATION, c * CRATER_OFFSET, phases[c]!);

        // 火口のキャップ: 噴火の頭で一番明るく、窓の終わりにかけて元の色へ戻す
        const glow = ph.active ? 1 - ph.t * ph.t : 0;
        crater.material.color.lerpColors(crater.baseColor, HOT, glow);

        // 噴火の始まりで溶岩弾をまとめて打ち上げる（少しずつ時間差をつける）
        if (ph.active && !wasActive[c]) {
          const list = bombs[c]!;
          for (let i = 0; i < bombCount; i++) {
            const b = list[i]!;
            b.ox = crater.position.x;
            b.oy = crater.position.y;
            b.oz = crater.position.z;
            // 上 9〜13・横 ±4。火口は画面上端より奥にあるので、手前（+z）にも飛ばして歩行路付近に降らせる
            b.v0.x = rand(-4, 4);
            b.v0.y = rand(9, 13);
            b.v0.z = rand(4, 7);
            b.launch = time + (i / bombCount) * 0.5;
            b.flying = true;
          }
        }
        wasActive[c] = ph.active;

        shakeAmp = Math.max(shakeAmp, eruptionShake(ph, DURATION, proximity(riderX, crater.position.x, SHAKE_RADIUS), reduced));
      }

      // 溶岩弾の飛行と着地
      for (const list of bombs) {
        for (const b of list) {
          if (!b.flying) continue;
          const t = time - b.launch;
          if (t < 0) {
            b.mesh.visible = false;
            continue;
          }
          ballistic(b.v0, G, t, tmp);
          const y = b.oy + tmp.y;
          if (y <= 0.15 && t > 0.1) {
            b.flying = false;
            b.mesh.visible = false;
            const x = b.ox + tmp.x;
            const z = b.oz + tmp.z;
            const s = splats[nextSplat]!;
            nextSplat = (nextSplat + 1) % splats.length;
            s.mesh.position.set(x, 0.05, z);
            s.born = time;
            s.mesh.visible = true;
            emitEmbers(x, z, time, emberLimit);
            continue;
          }
          b.mesh.position.set(b.ox + tmp.x, y, b.oz + tmp.z);
          b.mesh.visible = true;
        }
      }

      // スプラット: 0.4 秒で縮んで消える
      for (const s of splats) {
        if (s.born < 0) continue;
        const u = (time - s.born) / SPLAT_SECONDS;
        if (u >= 1) {
          s.born = -1;
          s.mesh.visible = false;
          continue;
        }
        s.mesh.scale.setScalar(1.3 * (1 - u) + 0.01);
      }

      // 火の粉
      for (let i = 0; i < emberLimit; i++) {
        const age = time - eBorn[i]!;
        if (age < 0 || age > EMBER_LIFE) {
          ep[i * 3 + 1] = -50;
          continue;
        }
        tmpV.x = eVel[i * 3]!;
        tmpV.y = eVel[i * 3 + 1]!;
        tmpV.z = eVel[i * 3 + 2]!;
        ballistic(tmpV, EMBER_G, age, tmp);
        ep[i * 3] = eOrigin[i * 3]! + tmp.x;
        ep[i * 3 + 1] = eOrigin[i * 3 + 1]! + tmp.y;
        ep[i * 3 + 2] = eOrigin[i * 3 + 2]! + tmp.z;
      }
      embers.attr.needsUpdate = true;
    },
    shake() {
      return shakeAmp;
    },
  };
};
