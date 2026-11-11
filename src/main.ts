import { Clock } from 'three';
import { createAsciiPass } from './scene/ascii';
import { BIOME_LOOKS } from './scene/biomes';
import { updateCamera } from './scene/camera';
import { createRider } from './scene/creatures/rider';
import { createGround } from './scene/ground';
import { createStage } from './scene/renderer';
import { createStars } from './scene/stars';
import { buildSections } from './content/sections';
import { PROFILE } from './content/profile';
import { WORKS } from './content/works';
import { renderSections } from './ui/sections';
import { renderWorks } from './ui/works';
import { createHud } from './ui/hud';
import { createFlat } from './ui/flat';
import { progressFromScroll, smoothProgress } from './scroll/progress';
import { worldX } from './scroll/path';

function start(): void {
  const main = document.getElementById('main') as HTMLElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const flatRoot = document.getElementById('flat') as HTMLElement;

  const sections = buildSections(WORKS.length);
  const { worksContainer } = renderSections(main, sections);
  renderWorks(worksContainer, WORKS);
  const flat = createFlat(flatRoot);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mobile = innerWidth < 720;
  addEventListener('resize', () => {
    mobile = innerWidth < 720;
  });

  const stage = createStage();
  if (!stage) {
    console.warn('scroll-biome: WebGL unavailable');
    const hud = createHud(hudRoot, PROFILE.name, {
      onToggleAscii: () => {},
      onToggleMode: () => {},
      onToggleFlat: () => toggleFlat(),
    });
    function toggleFlat(): void {
      if (flat.isOpen()) {
        flat.close();
        hud.setFlat(false);
      } else {
        flat.open();
        hud.setFlat(true);
      }
    }
    hud.hideSceneControls();
    return;
  }
  const { renderer, scene, camera, dpr } = stage;
  const look = BIOME_LOOKS.meadow;

  const ground = createGround(scene, 110000);
  ground.applyLook(look);
  const stars = createStars(scene);
  const rider = createRider();
  const initialMode = location.search.includes('p1') ? 1 : 0;
  rider.setMode(initialMode);
  scene.add(rider.group);
  const ascii = createAsciiPass(renderer, dpr);

  const resize = (): void => {
    stage.resize();
    ascii.resize(innerWidth * dpr, innerHeight * dpr);
  };
  addEventListener('resize', resize);
  resize();

  let asciiOn = !location.search.includes('raw');

  const hud = createHud(hudRoot, PROFILE.name, {
    onToggleAscii: () => {
      asciiOn = !asciiOn;
      hud.setAscii(asciiOn);
    },
    onToggleMode: () => {
      rider.setMode(rider.mode === 0 ? 1 : 0);
      hud.setMode(rider.mode);
    },
    onToggleFlat: () => toggleFlat(),
  });
  hud.setAscii(asciiOn);
  hud.setMode(rider.mode);

  function toggleFlat(): void {
    if (flat.isOpen()) {
      flat.close();
      hud.setFlat(false);
      start_();
    } else {
      flat.open();
      hud.setFlat(true);
      stop();
    }
  }

  const clock = new Clock();
  let smoothed = 0;
  let prevX = 0;
  let gait = 0;
  let running = false;
  let rafId = 0;

  const tick = (): void => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const target = progressFromScroll(scrollY, document.documentElement.scrollHeight, innerHeight);
    smoothed = reduced ? target : smoothProgress(smoothed, target, dt);
    const x = worldX(smoothed);
    const dx = x - prevX;
    const speed = dt > 0 ? Math.abs(dx) / dt : 0;
    gait += speed * dt * 2.2;
    const k = Math.min(1, speed / 3);

    if (dx > 0.001) rider.setHeading(Math.PI / 2, dt);
    else if (dx < -0.001) rider.setHeading(-Math.PI / 2, dt);

    rider.group.position.x = x;
    rider.update(gait, k, t);
    ground.update(t, x);
    stars.update(t, look);
    updateCamera(camera, x, dt, mobile);
    prevX = x;

    if (asciiOn) ascii.render(scene, camera);
    else {
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);
  };

  function start_(): void {
    if (running) return;
    running = true;
    clock.getDelta(); // dt の跳ねを防ぐため捨てる
    rafId = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else if (!flat.isOpen()) start_();
  });

  start_();
}

start();
