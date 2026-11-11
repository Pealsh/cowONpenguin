import {
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from 'three';

export type Cow = { root: Group; legs: Group[]; tail: Group };

const lam = (color: number, emissive = 0): MeshLambertMaterial => new MeshLambertMaterial({ color, emissive });
const white = lam(0xf0f0e8, 0x2a2a26);
const black = lam(0x161616);
const pink = lam(0xd9a0a0, 0x201010);
const hornMat = lam(0xc8b89a);

// ホルスタイン柄テクスチャ（カプセルのUVに巻く）
const spotTex = ((): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#f0f0e8';
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#141414';
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * 512, y = 40 + Math.random() * 176;
      for (let j = 0; j < 7; j++) {
        g.beginPath();
        g.ellipse(
          x + (Math.random() - 0.5) * 60,
          y + (Math.random() - 0.5) * 40,
          14 + Math.random() * 22,
          10 + Math.random() * 16,
          Math.random() * 3,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
    }
  }
  return new CanvasTexture(c);
})();
const spotted = new MeshLambertMaterial({ map: spotTex, emissive: 0x1a1a18 });

const mesh = (geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0): Mesh => {
  const o = new Mesh(geo, mat);
  o.position.set(x, y, z);
  return o;
};
const capsule = (r: number, l: number): CapsuleGeometry => new CapsuleGeometry(r, l, 10, 28);
const sphere = (r: number): SphereGeometry => new SphereGeometry(r, 28, 20);

export function makeCow(): Cow {
  const root = new Group();
  const body = mesh(capsule(0.42, 1.05), spotted, 0, 1.35, 0);
  body.rotation.x = Math.PI / 2;
  body.scale.set(1.08, 1, 1);
  root.add(body);
  const neck = mesh(new CylinderGeometry(0.2, 0.32, 0.6, 24), black, 0, 1.58, 0.9);
  neck.rotation.x = 0.9;
  root.add(neck);
  const head = mesh(capsule(0.2, 0.28), white, 0, 1.7, 1.28);
  head.rotation.x = Math.PI / 2 + 0.35;
  root.add(head);
  const cap = mesh(sphere(0.21), black, 0, 1.82, 1.18);
  cap.scale.set(1.05, 0.6, 0.8);
  root.add(cap);
  const muzzle = mesh(sphere(0.18), pink, 0, 1.53, 1.5);
  muzzle.scale.set(1.05, 0.8, 0.85);
  root.add(muzzle);
  for (const sx of [-1, 1]) {
    const ear = mesh(sphere(0.1), black, sx * 0.27, 1.78, 1.15);
    ear.scale.set(1.8, 0.6, 1);
    root.add(ear);
    const horn = mesh(new ConeGeometry(0.05, 0.2, 16), hornMat, sx * 0.15, 1.98, 1.18);
    horn.rotation.z = -sx * 0.6;
    root.add(horn);
    root.add(mesh(sphere(0.035), black, sx * 0.17, 1.76, 1.36)); // 目
  }
  const udder = mesh(sphere(0.2), pink, 0, 0.98, -0.45);
  udder.scale.set(1, 0.6, 1);
  root.add(udder);
  const tail = new Group();
  tail.position.set(0, 1.65, -1.0);
  tail.add(mesh(new CylinderGeometry(0.03, 0.04, 0.9, 12), white, 0, -0.45, 0));
  const tuft = mesh(sphere(0.08), white, 0, -0.95, 0);
  tuft.scale.set(1, 1.8, 1);
  tail.add(tuft);
  root.add(tail);
  const legs: Group[] = [];
  const legPos: [number, number][] = [[-0.26, 0.68], [0.26, 0.68], [-0.26, -0.68], [0.26, -0.68]];
  for (const [x, z] of legPos) {
    const hip = new Group();
    hip.position.set(x, 1.05, z);
    hip.add(mesh(new CylinderGeometry(0.13, 0.09, 0.9, 20), white, 0, -0.45, 0));
    hip.add(mesh(new CylinderGeometry(0.09, 0.11, 0.12, 20), black, 0, -0.95, 0)); // ひづめ
    root.add(hip);
    legs.push(hip);
  }
  return { root, legs, tail };
}

export function animCow(c: Cow, gait: number, k: number, t: number): void {
  c.legs.forEach((l, i) => {
    l.rotation.x = Math.sin(gait + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * k;
  });
  c.tail.rotation.z = Math.sin(t * 3) * 0.25;
}
