import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  Group,
  LatheGeometry,
  Material,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  SplineCurve,
  Vector2,
} from 'three';

export type Penguin = { root: Group; flippers: Group[]; feet: Mesh[] };

const lam = (color: number, emissive = 0): MeshLambertMaterial => new MeshLambertMaterial({ color, emissive });
const black = lam(0x161616);
const orange = lam(0xffa020, 0x402000);

const mesh = (geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0): Mesh => {
  const o = new Mesh(geo, mat);
  o.position.set(x, y, z);
  return o;
};
const sphere = (r: number): SphereGeometry => new SphereGeometry(r, 28, 20);

const PROFILE: [number, number][] = [
  [0, 0], [0.12, 0.015], [0.19, 0.08], [0.225, 0.2], [0.24, 0.35],
  [0.225, 0.5], [0.19, 0.63], [0.15, 0.73], [0.11, 0.8], [0, 0.84],
];

export function makePenguin(): Penguin {
  const root = new Group();
  // 卵型の胴を回転体で作り、頂点カラーで黒い背中・白いお腹・黄色い胸を塗り分ける
  const prof = PROFILE.map(([r, y]) => new Vector2(r, y));
  const geo = new LatheGeometry(new SplineCurve(prof).getPoints(40), 40);
  const pos = geo.attributes.position;
  if (!pos) throw new Error('penguin: LatheGeometry has no position attribute');
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  const B = new Color(0x181a1e), W = new Color(0xf2f2ea), Y = new Color(0xffc838);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z) || 1;
    const front = MathUtils.smoothstep(z / r, -0.05, 0.35);
    c.copy(B).lerp(W, front);
    const chest = MathUtils.smoothstep(y, 0.55, 0.7) * MathUtils.smoothstep(z / r, 0.3, 0.6);
    c.lerp(Y, chest);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new BufferAttribute(col, 3));
  root.add(mesh(geo, new MeshLambertMaterial({ vertexColors: true, emissive: 0x101010 })));
  const head = mesh(sphere(0.13), black, 0, 0.9, 0.02);
  head.scale.set(1, 1, 1.1);
  root.add(head);
  for (const sx of [-1, 1]) {
    const cheek = mesh(sphere(0.045), orange, sx * 0.1, 0.87, 0.0);
    cheek.scale.set(0.5, 1.4, 1);
    root.add(cheek);
  }
  const beak = mesh(new ConeGeometry(0.03, 0.2, 16), orange, 0, 0.88, 0.22);
  beak.rotation.x = Math.PI / 2;
  root.add(beak);
  const flippers: Group[] = [], feet: Mesh[] = [];
  for (const sx of [-1, 1]) {
    const pivot = new Group();
    pivot.position.set(sx * 0.21, 0.62, 0);
    const f = mesh(sphere(0.1), black, 0, -0.18, 0);
    f.scale.set(0.25, 2, 0.7);
    pivot.add(f);
    root.add(pivot);
    flippers.push(pivot);
    const foot = mesh(sphere(0.06), orange, sx * 0.08, 0.015, 0.06);
    foot.scale.set(1, 0.35, 1.6);
    root.add(foot);
    feet.push(foot);
  }
  return { root, flippers, feet };
}

export function animPenguin(p: Penguin, gait: number, k: number, t: number): void {
  p.root.rotation.z = Math.sin(gait) * 0.12 * k; // よちよち
  p.feet.forEach((f, i) => {
    f.position.z = 0.06 + Math.sin(gait + i * Math.PI) * 0.07 * k;
  });
  p.flippers.forEach((f, i) => {
    f.rotation.z = (i ? 1 : -1) * (0.15 + (0.5 + 0.5 * Math.sin(t * 6)) * 0.4 * k);
  });
}
