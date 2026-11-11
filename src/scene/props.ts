import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
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
import { layoutProps, mulberry32 } from './propsLayout';

export type Props = { update(time: number): void };

type WaveEntry = { group: Group; baseZ: number; phase: number };

// legacy/index.html の木（Box 幹 + Icosahedron 葉、0x2b241c / 0x3f6b3a）を各バイオームの小物に流用する
export function createProps(scene: Scene, ranges: readonly SectionRange[]): Props {
  const placements = layoutProps(ranges);
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

  const waveMat = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.55,
    side: DoubleSide,
    depthWrite: false,
  });

  const waves: WaveEntry[] = [];

  for (const p of placements) {
    const group = new Group();
    group.position.set(p.x, 0, p.z);

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
      case 'wave': {
        const plane = new Mesh(new PlaneGeometry(p.width ?? 10, 1.2), waveMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = 0.05;
        group.add(plane);
        waves.push({ group, baseZ: p.z, phase: waves.length === 0 ? 0 : 1.5 });
        break;
      }
    }

    scene.add(group);
  }

  return {
    update(time) {
      for (const w of waves) {
        w.group.position.z = w.baseZ + Math.sin(time * 0.8 + w.phase) * 0.6;
      }
    },
  };
}
