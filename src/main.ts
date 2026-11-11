import { Clock } from 'three';
import { createAsciiPass } from './scene/ascii';
import { BIOME_LOOKS, blendLook, createLookBuffer } from './scene/biomes';
import { isMobileLayout, updateCamera } from './scene/camera';
import { createRider } from './scene/creatures/rider';
import { createGround } from './scene/ground';
import { createProps } from './scene/props';
import { createStage } from './scene/renderer';
import { createStars } from './scene/stars';
import { buildSections } from './content/sections';
import { PROFILE } from './content/profile';
import { WORKS } from './content/works';
import { renderSections } from './ui/sections';
import { renderWorks } from './ui/works';
import { createHud, type Hud } from './ui/hud';
import { createFlat } from './ui/flat';
import { progressFromScroll, smoothProgress } from './scroll/progress';
import { biomeAt } from './scroll/biome';
import { sectionRanges, worldX } from './scroll/path';

function start(): void {
  const main = document.getElementById('main') as HTMLElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  const flatRoot = document.getElementById('flat') as HTMLElement;

  const sections = buildSections(WORKS.length);
  const ranges = sectionRanges(sections);
  const { worksContainer } = renderSections(main, sections);
  renderWorks(worksContainer, WORKS);
  const flat = createFlat(flatRoot);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 性能設定（地面の頂点数・ASCII セル）は起動時の幅だけで決める
  const smallScreen = innerWidth < 720;
  // カメラ配置は縦長も含めて判定し、リサイズで切り替える
  let mobile = isMobileLayout(innerWidth, innerHeight);
  addEventListener('resize', () => {
    mobile = isMobileLayout(innerWidth, innerHeight);
  });

  function toggleFlatWith(hud: Hud, onOpen?: () => void, onClose?: () => void): void {
    if (flat.isOpen()) {
      flat.close();
      hud.setFlat(false);
      onClose?.();
    } else {
      flat.open();
      hud.setFlat(true);
      onOpen?.();
    }
  }

  const stage = createStage();
  if (!stage) {
    console.warn('scroll-biome: WebGL unavailable');
    const hud = createHud(hudRoot, PROFILE.name, {
      onToggleAscii: () => {},
      onToggleMode: () => {},
      onToggleFlat: () => toggleFlatWith(hud),
    });
    hud.hideSceneControls();
    hud.hideFlatToggle(); // フラット表示しかないので戻る先がない
    flat.open();
    hud.setFlat(true);
    return;
  }
  const { renderer, scene, camera, dpr } = stage;
  const look = BIOME_LOOKS.meadow;
  const lookBuf = createLookBuffer();

  const ground = createGround(scene, smallScreen ? 40000 : 110000);
  ground.applyLook(look);
  const stars = createStars(scene);
  const props = createProps(scene, ranges);
  const rider = createRider();
  const initialMode = location.search.includes('p1') ? 1 : 0;
  rider.setMode(initialMode);
  scene.add(rider.group);
  const ascii = createAsciiPass(renderer, dpr);
  ascii.setCell(smallScreen ? 9 * dpr : 7 * dpr, smallScreen ? 14 * dpr : 11 * dpr);

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
    onToggleFlat: () => toggleFlatWith(hud, stop, start_),
  });
  hud.setAscii(asciiOn);
  hud.setMode(rider.mode);

  const clock = new Clock();
  let smoothed = 0;
  let prevX = 0;
  let first = true;
  let gait = 0;
  let running = false;
  let rafId = 0;

  const tick = (): void => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const target = progressFromScroll(scrollY, document.documentElement.scrollHeight, innerHeight);
    const snap = first;
    if (first) {
      // スクロール位置の復元で途中から始まっても、最初のフレームはその位置に置く
      smoothed = target;
      prevX = worldX(target);
      first = false;
    }
    smoothed = reduced ? target : smoothProgress(smoothed, target, dt);
    const x = worldX(smoothed);
    const dx = x - prevX;
    const speed = dt > 0 ? Math.abs(dx) / dt : 0;
    gait += speed * dt * 2.2;
    const k = Math.min(1, speed / 3);

    const headingDt = reduced ? 1 : dt;
    if (dx > 0.001) rider.setHeading(Math.PI / 2, headingDt);
    else if (dx < -0.001) rider.setHeading(-Math.PI / 2, headingDt);

    rider.group.position.x = x;
    rider.update(gait, k, t);

    const blend = biomeAt(smoothed, ranges);
    const blended = blendLook(BIOME_LOOKS[blend.a], BIOME_LOOKS[blend.b], blend.t, lookBuf);
    ground.applyLook(blended);
    ground.update(t, x);
    stars.update(t, blended);
    props.update(t);
    updateCamera(camera, x, snap ? 1 : dt, mobile); // 初回はカメラも追従先へ即座に置く
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
