import { PerspectiveCamera, Vector3 } from 'three';

const target = new Vector3();

// 画面上での牛とペンギンの位置（左上原点、0..1）。
// デスクトップは横 65%（仕様 3.2 の 55〜75% 帯の中央）・縦はやや下（奥の小物まで画面に入れる）、
// モバイルは横中央・上から 1/4（上部 1/3 の中）
const DESKTOP_SCREEN = { x: 0.65, y: 0.55 };
const MOBILE_SCREEN = { x: 0.5, y: 0.25 };

// 幅 720px 未満、または縦長（アスペクト < 1）ならモバイル配置
export function isMobileLayout(width: number, height: number): boolean {
  return width < 720 || width < height;
}

// 注視点（プレイヤー）は常に視錐台の中心に来るので、setViewOffset で描画窓をずらして
// 画面上の狙った位置に投影させる。比率で指定するためアスペクト比に依存しない。
function applyFraming(camera: PerspectiveCamera, mobile: boolean): void {
  const s = mobile ? MOBILE_SCREEN : DESKTOP_SCREEN;
  const w = camera.aspect;
  const h = 1;
  const offsetX = (0.5 - s.x) * w;
  const offsetY = (0.5 - s.y) * h;
  const v = camera.view;
  if (v && v.enabled && v.fullWidth === w && v.offsetX === offsetX && v.offsetY === offsetY) return;
  camera.setViewOffset(w, h, offsetX, offsetY, w, h);
}

// 斜め上から見下ろして追従
export function updateCamera(camera: PerspectiveCamera, playerX: number, dt: number, mobile: boolean): void {
  if (mobile) target.set(playerX, 10, 9);
  else target.set(playerX, 8.5, 7.5);
  camera.position.lerp(target, Math.min(1, dt * 3));
  camera.lookAt(playerX, 1, 0);
  applyFraming(camera, mobile);
}
