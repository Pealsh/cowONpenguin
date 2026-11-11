import { PerspectiveCamera, Vector3 } from 'three';

const target = new Vector3();

// 斜め上から見下ろして追従。デスクトップはプレイヤーを右寄せ（左に本文の余白）
export function updateCamera(camera: PerspectiveCamera, playerX: number, dt: number, mobile: boolean): void {
  if (mobile) target.set(playerX, 10, 9);
  else target.set(playerX - 4, 8.5, 7.5);
  camera.position.lerp(target, Math.min(1, dt * 3));
  camera.lookAt(mobile ? playerX : playerX - 4, 1, 0);
}
