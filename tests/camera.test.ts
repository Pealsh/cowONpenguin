import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { isMobileLayout, updateCamera } from '../src/scene/camera';

// プレイヤー（注視点 y=1）を画面座標 0..1（左上原点）に投影する
function screenPos(aspect: number, mobile: boolean, playerX = 12): { x: number; y: number } {
  const camera = new PerspectiveCamera(45, aspect, 0.1, 200);
  updateCamera(camera, playerX, 1, mobile);
  camera.updateMatrixWorld();
  const v = new Vector3(playerX, 1, 0).project(camera);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
}

describe('updateCamera framing', () => {
  for (const aspect of [16 / 9, 4 / 3, 21 / 9, 1.05]) {
    it(`desktop keeps the rider in the 55-75% band at aspect ${aspect.toFixed(2)}`, () => {
      const { x, y } = screenPos(aspect, false);
      expect(x).toBeGreaterThanOrEqual(0.55);
      expect(x).toBeLessThanOrEqual(0.75);
      expect(y).toBeGreaterThan(0.3);
      expect(y).toBeLessThan(0.7);
    });
  }

  for (const aspect of [375 / 812, 768 / 1024, 0.9]) {
    it(`mobile puts the rider in the top third at aspect ${aspect.toFixed(2)}`, () => {
      const { x, y } = screenPos(aspect, true);
      expect(x).toBeCloseTo(0.5, 2);
      expect(y).toBeGreaterThan(0.1);
      expect(y).toBeLessThan(1 / 3);
    });
  }

  it('switching layouts updates the offset on the same camera', () => {
    const camera = new PerspectiveCamera(45, 16 / 9, 0.1, 200);
    updateCamera(camera, 0, 1, true);
    updateCamera(camera, 0, 1, false);
    camera.updateMatrixWorld();
    const v = new Vector3(0, 1, 0).project(camera);
    expect((v.x + 1) / 2).toBeCloseTo(0.65, 2);
  });
});

describe('isMobileLayout', () => {
  it('is mobile below 720px wide or in portrait', () => {
    expect(isMobileLayout(375, 812)).toBe(true);
    expect(isMobileLayout(768, 1024)).toBe(true);
    expect(isMobileLayout(1280, 800)).toBe(false);
    expect(isMobileLayout(700, 500)).toBe(true);
  });
});
