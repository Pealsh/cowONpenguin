import type { BiomeId } from '../content/sections';
import { DECOR } from '../content/decor';
import { CharGrid } from './asciifx/grid';
import { createGridRenderer, measureCharWidth } from './asciifx/render';
import { DT, prefersReducedMotion, register } from './asciifx/ticker';
import { seedFor } from './asciifx/rng';
import type { Scene } from './asciifx/scenes/types';
import { createSnow } from './asciifx/scenes/snow';
import { createMeadow } from './asciifx/scenes/meadow';
import { createForest } from './asciifx/scenes/forest';
import { createDesert, createDesertCorner } from './asciifx/scenes/desert';
import { createVolcano } from './asciifx/scenes/volcano';

type Factory = (cols: number, rows: number, seed: number) => Scene;

const FACTORIES: Record<BiomeId, Factory> = {
  snow: createSnow,
  meadow: createMeadow,
  forest: createForest,
  desert: createDesert,
  volcano: createVolcano,
};

/** reduced-motion 時はこの秒数ぶん進めた 1 枚だけを描く (空っぽの絵にしないため) */
const PREWARM_SECONDS = 2;

// (biome, 何個目) ごとに seed を変えて、カード毎に違う絵にする
const attachCount: Partial<Record<BiomeId, number>> = {};

type Layer = { canvas: HTMLCanvasElement; rebuild(cols: number): void; unregister(): void };

function createLayer(box: HTMLElement, className: string, rows: number, seed: number, factory: Factory): Layer {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position: absolute; display: block; pointer-events: none;';
  box.appendChild(canvas);
  const renderer = createGridRenderer(canvas);
  const reduced = prefersReducedMotion();

  let cols = -1;
  let grid = new CharGrid(0, rows);
  let scene: Scene = factory(0, rows, seed);
  const draw = (): void => {
    grid.clear();
    scene.draw(grid);
    renderer.draw(grid);
  };

  const unregister = reduced ? (): void => {} : register(canvas, { step: (dt) => scene.step(dt), draw });

  return {
    canvas,
    unregister,
    rebuild(nextCols: number): void {
      if (nextCols === cols) return;
      cols = nextCols;
      grid = new CharGrid(cols, rows);
      scene = factory(cols, rows, seed);
      renderer.resize(cols, rows);
      if (reduced) {
        for (let i = 0; i < Math.round(PREWARM_SECONDS / DT); i++) scene.step(DT);
      }
      draw();
    },
  };
}

/** desert corner を描くのに十分な横幅 (列数) */
const MIN_CORNER_COLS = 14;

export function attachDecor(box: HTMLElement, biome: BiomeId): void {
  const cfg = DECOR[biome];
  const index = attachCount[biome] ?? 0;
  attachCount[biome] = index + 1;
  const seed = seedFor(biome, index);

  box.style.position = 'relative';
  box.style.setProperty('--decor-rows', String(cfg.rows));

  const main = createLayer(box, `decor decor-${cfg.edge}`, cfg.rows, seed, FACTORIES[biome]);
  main.canvas.style.left = '0';
  if (cfg.edge === 'top') main.canvas.style.top = '0';
  else main.canvas.style.bottom = '0';
  if (cfg.edge === 'top') box.style.paddingTop = 'calc(var(--decor-rows) * 1.1em + 12px)';
  else box.style.paddingBottom = 'calc(var(--decor-rows) * 1.1em + 12px)';

  const corner = cfg.corner;
  let cornerLayer: Layer | null = null;
  if (corner) {
    cornerLayer = createLayer(box, 'decor decor-corner', corner.rows, seed ^ 0x9e3779b9, (c, r, s) =>
      createDesertCorner(c, r, s, corner.palette),
    );
    cornerLayer.canvas.style.top = '0';
    cornerLayer.canvas.style.right = '0';
  }

  // 幅が足りない (MIN_CORNER_COLS 未満) 時は corner canvas を描かず隠す
  const setCornerVisible = (visible: boolean): void => {
    if (!cornerLayer) return;
    cornerLayer.canvas.style.display = visible ? 'block' : 'none';
    box.style.paddingTop = !corner
      ? box.style.paddingTop
      : visible
        ? cfg.edge === 'top'
          ? `calc(var(--decor-rows) * 1.1em + 12px + ${corner.rows} * 1.1em + 8px)`
          : `calc(${corner.rows} * 1.1em + 8px)`
        : cfg.edge === 'top'
          ? 'calc(var(--decor-rows) * 1.1em + 12px)'
          : '0px';
  };

  const cleanup = (): void => {
    main.unregister();
    cornerLayer?.unregister();
    ro?.disconnect();
    removeEventListener('resize', update);
  };

  const update = (): void => {
    if (!box.isConnected) {
      cleanup();
      return;
    }
    const cols = Math.max(0, Math.floor(box.clientWidth / measureCharWidth()));
    main.rebuild(cols);
    if (corner && cornerLayer) {
      const fits = cols >= MIN_CORNER_COLS;
      setCornerVisible(fits);
      if (fits) cornerLayer.rebuild(corner.cols);
    }
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => update());
    ro.observe(box);
  } else {
    addEventListener('resize', update);
  }

  update();
}
