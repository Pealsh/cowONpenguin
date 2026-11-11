import { Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { GimmickFactory } from './index';
import { eruptionPhase, hash01, nextShootingStar, type Phase } from './logic';

const STAR_SEED = 7331;
const STAR_SECONDS = 0.6;
const STAR_LEN = 2.6;
const WEED_PERIOD = 5;
const WEED_SECONDS = 2.6;
const WEED_R = 0.5;
const WEED_Z0 = -8;
const WEED_Z1 = 3;

// 流れ星の通り道（ライダー x からの相対）。y≈12〜16 はカメラより上で写らないため、
// 画面上端の帯に入る高さ・奥行きに置く（デスクトップとモバイルで見える範囲が違う）
const STAR_PATH_DESKTOP = { x0: 9, x1: -12, y0: 2.6, y1: 1.8, z: -7 };
const STAR_PATH_MOBILE = { x0: 3, x1: -3, y0: 1.1, y1: 0.8, z: -3 };

// 砂漠: 決まったスケジュールで流れる流れ星と、歩行路を横切るタンブルウィード
export const createDesert: GimmickFactory = (scene, _span) => {
  const starGeo = new PlaneGeometry(1, 0.14);
  const starMat = new MeshBasicMaterial({ color: 0xffffff, fog: false });
  const star = new Mesh(starGeo, starMat);
  star.scale.x = STAR_LEN;
  star.visible = false;
  scene.add(star);

  let starIndex = 0;
  let starStart = nextShootingStar(0, 0, STAR_SEED);
  let starRiderX = 0; // 流れ始めたときのライダー位置に固定して流す

  // タンブルウィード: 暗い芯 + 砂色のワイヤーフレーム（細線だけだと ASCII の 1 点サンプルで消えやすい）
  const weed = new Group();
  const core = new Mesh(new IcosahedronGeometry(WEED_R * 0.8, 0), new MeshBasicMaterial({ color: 0x5a4024 }));
  const wire = new Mesh(
    new IcosahedronGeometry(WEED_R, 1),
    new MeshBasicMaterial({ color: 0xf0d8a0, wireframe: true }),
  );
  weed.add(core, wire);
  weed.visible = false;
  scene.add(weed);
  const weedPhase: Phase = { active: false, t: 0 };
  let weedCycle = -1;
  let weedX = 0;
  let shown = false;

  return {
    setVisible(v) {
      shown = v;
      if (!v) {
        star.visible = false;
        weed.visible = false;
      }
    },
    update({ time, riderX, mobile }) {
      // 流れ星: 長く止まっていた場合も含め、終わった分はスケジュールを進める
      while (time > starStart + STAR_SECONDS) {
        starIndex++;
        starStart = nextShootingStar(starStart, starIndex, STAR_SEED);
      }
      if (time >= starStart) {
        if (!star.visible) starRiderX = riderX;
        const path = mobile ? STAR_PATH_MOBILE : STAR_PATH_DESKTOP;
        const u = (time - starStart) / STAR_SECONDS;
        const dx = path.x1 - path.x0;
        const dy = path.y1 - path.y0;
        star.position.set(starRiderX + path.x0 + dx * u, path.y0 + dy * u, path.z);
        star.rotation.z = Math.atan2(dy, dx);
        star.scale.x = STAR_LEN * (mobile ? 0.5 : 1) * Math.sin(Math.PI * Math.min(1, u * 1.2 + 0.1));
        star.visible = shown;
      } else {
        star.visible = false;
      }

      // タンブルウィード: 5 秒ごとに奥 z=-8 から手前 z=3 へ転がる。転がった距離 / 半径 だけ回す
      eruptionPhase(time, WEED_PERIOD, WEED_SECONDS, 0, weedPhase);
      if (weedPhase.active) {
        const cycle = Math.floor(time / WEED_PERIOD);
        if (cycle !== weedCycle) {
          weedCycle = cycle;
          // ライダーの少し前後（画面内）を通るよう、周期ごとに決まった x を選ぶ
          weedX = riderX + (mobile ? -1.5 + hash01(cycle, 1) * 3 : -6 + hash01(cycle, 1) * 9);
        }
        const dist = (WEED_Z1 - WEED_Z0) * weedPhase.t;
        weed.position.set(weedX + weedPhase.t * 1.5, WEED_R + Math.abs(Math.sin(dist * 1.3)) * 0.25, WEED_Z0 + dist);
        weed.rotation.x = dist / WEED_R;
        weed.visible = shown;
      } else {
        weed.visible = false;
      }
    },
  };
};
