import { Clock } from 'three';
import { createAsciiPass } from './scene/ascii';
import { BIOME_LOOKS } from './scene/biomes';
import { updateCamera } from './scene/camera';
import { createRider } from './scene/creatures/rider';
import { createGround } from './scene/ground';
import { createStage } from './scene/renderer';
import { createStars } from './scene/stars';

function start(): void {
  const stage = createStage();
  if (!stage) {
    console.warn('scroll-biome: WebGL unavailable');
    return;
  }
  const { renderer, scene, camera, dpr } = stage;
  const look = BIOME_LOOKS.meadow;

  const ground = createGround(scene, 110000);
  ground.applyLook(look);
  const stars = createStars(scene);
  const rider = createRider();
  if (location.search.includes('p1')) rider.setMode(1);
  scene.add(rider.group);
  const ascii = createAsciiPass(renderer, dpr);

  const resize = (): void => {
    stage.resize();
    ascii.resize(innerWidth * dpr, innerHeight * dpr);
  };
  addEventListener('resize', resize);
  resize();

  let asciiOn = !location.search.includes('raw');
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't') asciiOn = !asciiOn;
  });

  const clock = new Clock();
  const tick = (): void => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rider.update(0, 0, t);
    ground.update(t, 0);
    stars.update(t, look);
    updateCamera(camera, 0, dt, false);
    if (asciiOn) ascii.render(scene, camera);
    else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  };
  tick();
}

start();
