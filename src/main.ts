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

function start(): void {
  const main = document.getElementById('main') as HTMLElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const flatRoot = document.getElementById('flat') as HTMLElement;

  const sections = buildSections(WORKS.length);
  const { worksContainer } = renderSections(main, sections);
  renderWorks(worksContainer, WORKS);
  const flat = createFlat(flatRoot);

  const stage = createStage();
  if (!stage) {
    console.warn('scroll-biome: WebGL unavailable');
    const hud = createHud(hudRoot, PROFILE.name, {
      onToggleAscii: () => {},
      onToggleMode: () => {},
      onToggleFlat: () => {
        if (flat.isOpen()) {
          flat.close();
          hud.setFlat(false);
        } else {
          flat.open();
          hud.setFlat(true);
        }
      },
    });
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
    onToggleFlat: () => {
      if (flat.isOpen()) {
        flat.close();
        hud.setFlat(false);
      } else {
        flat.open();
        hud.setFlat(true);
      }
    },
  });
  hud.setAscii(asciiOn);
  hud.setMode(rider.mode);

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
