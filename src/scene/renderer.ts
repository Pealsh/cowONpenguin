import { Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export type Stage = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  dpr: number;
  resize(): void;
};

// WebGL が使えない環境では null を返す（呼び出し側がフラット表示へ切り替える）
export function createStage(): Stage | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: false });
  } catch {
    return null;
  }
  const dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  document.body.prepend(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(0x020302);
  scene.fog = new Fog(0x020302, 18, 45);
  const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 8.5, 7.5);
  camera.lookAt(0, 1, 0);

  scene.add(new HemisphereLight(0xcfe0c8, 0x101410, 0.7));
  const sun = new DirectionalLight(0xffffff, 1.8);
  sun.position.set(-8, 14, 6);
  scene.add(sun);

  return {
    renderer,
    scene,
    camera,
    dpr,
    resize() {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    },
  };
}
