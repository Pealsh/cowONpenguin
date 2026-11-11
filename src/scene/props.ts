import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Scene,
  SphereGeometry,
} from 'three';
import type { SectionRange } from '../scroll/path';
import { layoutProps, mulberry32, type LayoutOptions } from './propsLayout';

export type Props = { update(time: number): void };

// legacy/index.html の木（Box 幹 + Icosahedron 葉、0x2b241c / 0x3f6b3a）を各バイオームの小物に流用する
export function createProps(scene: Scene, ranges: readonly SectionRange[], opts: LayoutOptions = {}): Props {
  const placements = layoutProps(ranges, undefined, opts);
  const jitter = mulberry32(1337); // 見た目の揺らぎ用（配置の決定性には影響しない別系列）

  // ジオメトリ/マテリアルはプロップ種別ごとに 1 つだけ作って共有する
  const barkMat = new MeshLambertMaterial({ color: 0x2b241c });
  const leafMat = new MeshLambertMaterial({ color: 0x3f6b3a });
  const meadowTrunkGeo = new BoxGeometry(0.4, 3, 0.4);
  const forestTrunkGeo = new BoxGeometry(0.4, 4.5, 0.4);
  const leafGeo = new IcosahedronGeometry(1.4, 0);

  const snowMat = new MeshLambertMaterial({ color: 0xffffff });
  const dotMat = new MeshBasicMaterial({ color: 0x111111 });
  const snowBigGeo = new SphereGeometry(0.6, 12, 12);
  const snowMidGeo = new SphereGeometry(0.45, 12, 12);
  const snowSmallGeo = new SphereGeometry(0.3, 12, 12);
  const dotGeo = new SphereGeometry(0.05, 8, 8);

  const pineMat = new MeshLambertMaterial({ color: 0x14361a });
  const pineCapMat = new MeshLambertMaterial({ color: 0xf4f7f9 });
  const pineGeo = new ConeGeometry(1.2, 4, 8);
  const pineCapGeo = new ConeGeometry(0.5, 1, 8);

  const cactusMat = new MeshLambertMaterial({ color: 0x4a7a3a });
  const cactusTrunkGeo = new CylinderGeometry(0.3, 0.3, 2.5, 8);
  const cactusArmGeo = new CylinderGeometry(0.2, 0.2, 1, 8);

  const rockMat = new MeshLambertMaterial({ color: 0x8a8a84 });
  const rockGeo = new IcosahedronGeometry(0.8, 0);

  // volcano: 火口の本体（暗い岩）とクレーターの発光キャップ
  const volcanoMat = new MeshLambertMaterial({ color: 0x2a1a14 });
  const craterMat = new MeshBasicMaterial({ color: 0xff4a10 });
  const volcanoGeo = new ConeGeometry(6, 8, 24);
  const craterGeo = new ConeGeometry(1.6, 1.2, 16);

  // volcano: 地面を這う溶岩の裂け目（1 マテリアルを全 lavaCrack で共有してパルスさせる）
  const lavaMat = new MeshBasicMaterial({ color: 0xff5a18 });

  // 前景（歩行路の手前）: 低く小さく、スケール後も高さ 0.8 未満に収まる寸法にする
  const tuftMat = new MeshLambertMaterial({ color: 0x7fcf5f });
  const tuftGeo = new ConeGeometry(0.06, 0.85, 4);
  tuftGeo.translate(0, 0.425, 0); // 根元を原点に（揺らすとき根元を支点にする）
  const pebbleGeo = new IcosahedronGeometry(0.45, 0);
  const desertPebbleMat = new MeshLambertMaterial({ color: 0xa08c6a });
  const volcanoPebbleMat = new MeshLambertMaterial({ color: 0x6a5048 });
  const snowLumpGeo = new SphereGeometry(0.5, 10, 8);

  for (const p of placements) {
    const group = new Group();
    group.position.set(p.x, 0, p.z);
    group.scale.setScalar(p.scale);

    switch (p.kind) {
      case 'meadowTree':
      case 'forestTree': {
        const isForest = p.kind === 'forestTree';
        const trunkH = isForest ? 4.5 : 3;
        const trunk = new Mesh(isForest ? forestTrunkGeo : meadowTrunkGeo, barkMat);
        trunk.position.y = trunkH / 2;
        group.add(trunk);
        const leafCount = isForest ? 5 : 4;
        for (let i = 0; i < leafCount; i++) {
          const leaf = new Mesh(leafGeo, leafMat);
          leaf.position.set((jitter() - 0.5) * 1.4, trunkH + jitter() * 1.6, (jitter() - 0.5) * 1.4);
          leaf.scale.setScalar(0.7 + jitter() * 0.3);
          group.add(leaf);
        }
        break;
      }
      case 'snowman': {
        const big = new Mesh(snowBigGeo, snowMat);
        big.position.y = 0.6;
        const mid = new Mesh(snowMidGeo, snowMat);
        mid.position.y = 0.6 + 0.6 + 0.45;
        const small = new Mesh(snowSmallGeo, snowMat);
        small.position.y = mid.position.y + 0.45 + 0.3;
        group.add(big, mid, small);
        const eyeL = new Mesh(dotGeo, dotMat);
        eyeL.position.set(-0.1, small.position.y + 0.02, 0.27);
        const eyeR = new Mesh(dotGeo, dotMat);
        eyeR.position.set(0.1, small.position.y + 0.02, 0.27);
        group.add(eyeL, eyeR);
        break;
      }
      case 'pine': {
        const cone = new Mesh(pineGeo, pineMat);
        cone.position.y = 2;
        const cap = new Mesh(pineCapGeo, pineCapMat);
        cap.position.y = 4.1;
        group.add(cone, cap);
        break;
      }
      case 'cactus': {
        const trunk = new Mesh(cactusTrunkGeo, cactusMat);
        trunk.position.y = 1.25;
        const arm = new Mesh(cactusArmGeo, cactusMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(0.3, 1.5, 0);
        group.add(trunk, arm);
        break;
      }
      case 'rock': {
        const rock = new Mesh(rockGeo, rockMat);
        rock.position.y = 0.4;
        rock.rotation.y = jitter() * Math.PI * 2;
        group.add(rock);
        break;
      }
      case 'cone': {
        const mountain = new Mesh(volcanoGeo, volcanoMat);
        mountain.position.y = 4;
        const crater = new Mesh(craterGeo, craterMat);
        crater.position.y = 8.6;
        group.add(mountain, crater);
        break;
      }
      case 'lavaCrack': {
        const width = 2.5 + jitter() * 1.5;
        const plane = new Mesh(new PlaneGeometry(width, 0.25), lavaMat);
        plane.rotation.x = -Math.PI / 2;
        plane.rotation.z = jitter() * Math.PI * 2;
        plane.position.y = 0.03;
        group.add(plane);
        break;
      }
      case 'tuft': {
        const blades = 3 + Math.floor(jitter() * 2);
        for (let i = 0; i < blades; i++) {
          const blade = new Mesh(tuftGeo, tuftMat);
          const a = (i / blades) * Math.PI * 2 + jitter();
          blade.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
          blade.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
          group.add(blade);
        }
        break;
      }
      case 'pebble': {
        const pebble = new Mesh(pebbleGeo, p.biome === 'volcano' ? volcanoPebbleMat : desertPebbleMat);
        pebble.scale.set(1, 0.5, 0.8);
        pebble.position.y = 0.15;
        pebble.rotation.y = jitter() * Math.PI * 2;
        group.add(pebble);
        break;
      }
      case 'snowLump': {
        const lump = new Mesh(snowLumpGeo, snowMat);
        lump.scale.set(1, 0.45, 0.8);
        lump.position.y = 0.05;
        group.add(lump);
        break;
      }
    }

    scene.add(group);
  }

  return {
    update(time) {
      // 1 マテリアルだけ色の明るさを脈動させる（溶岩が火照るように見せる、個別メッシュの更新はしない）
      const pulse = 0.8 + 0.2 * Math.sin(time * 2);
      lavaMat.color.setRGB(1 * pulse, 0.35 * pulse, 0.094 * pulse);
    },
  };
}
