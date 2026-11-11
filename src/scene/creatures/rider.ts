import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { animCow, makeCow } from './cow';
import { animPenguin, makePenguin } from './penguin';

export type RiderMode = 0 | 1;
export type Rider = {
  group: Group;
  mode: RiderMode;
  setMode(m: RiderMode): void;
  setHeading(target: number, dt: number): void;
  update(gait: number, k: number, t: number): void;
};

const shadowTex = ((): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(0,0,0,.85)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
})();

export function createRider(): Rider {
  const group = new Group();
  const mount = new Group();
  group.add(mount);
  // モード0：牛の上にペンギン
  const cowA = makeCow(), pengA = makePenguin();
  pengA.root.position.set(0, 1.76, -0.1);
  cowA.root.add(pengA.root);
  // モード1：大きいペンギンの上に小さい牛
  const pengB = makePenguin(), cowB = makeCow();
  pengB.root.scale.setScalar(2.6);
  cowB.root.scale.setScalar(0.17);
  cowB.root.position.set(0, 0.98, -0.02);
  pengB.root.add(cowB.root);
  mount.add(cowA.root, pengB.root);
  // 影
  const shadow = new Mesh(
    new PlaneGeometry(3, 4),
    new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);
  group.scale.setScalar(1.4);

  let heading = Math.PI / 2; // +x 向き
  mount.rotation.y = heading;

  const rider: Rider = {
    group,
    mode: 0,
    setMode(m) {
      rider.mode = m;
      cowA.root.visible = m === 0;
      pengB.root.visible = m === 1;
    },
    setHeading(target, dt) {
      let d = target - heading;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading += d * Math.min(1, dt * 10);
      mount.rotation.y = heading;
    },
    update(gait, k, t) {
      mount.position.y = Math.abs(Math.sin(gait)) * 0.08 * k;
      if (rider.mode === 0) {
        animCow(cowA, gait, k, t);
        animPenguin(pengA, gait, k * 0.5, t);
        pengA.root.rotation.y = Math.sin(t * 0.7) * 0.4; // きょろきょろ
      } else {
        animPenguin(pengB, gait * 1.6, k, t);
        animCow(cowB, 0, 0, t);
        cowB.root.rotation.y = Math.sin(t * 0.5) * 0.6;
      }
    },
  };
  rider.setMode(0);
  return rider;
}
