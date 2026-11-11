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

type Layer = { canvas: HTMLCanvasElement; rebuild(cols: number): void };

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

  if (!reduced) register(canvas, { step: (dt) => scene.step(dt), draw });

  return {
    canvas,
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
  if (corner) {
    const layer = createLayer(box, 'decor decor-corner', corner.rows, seed ^ 0x9e3779b9, (c, r, s) =>
      createDesertCorner(c, r, s, corner.palette),
    );
    layer.canvas.style.top = '0';
    layer.canvas.style.right = '0';
    layer.rebuild(corner.cols);
    // 右上に乗る corner はメインの edge とは別に上側の余白を確保する
    // (メインが top edge の場合は両方を足し合わせて重ならないようにする)
    box.style.paddingTop =
      cfg.edge === 'top'
        ? `calc(var(--decor-rows) * 1.1em + 12px + ${corner.rows} * 1.1em + 8px)`
        : `calc(${corner.rows} * 1.1em + 8px)`;
  }

  const update = (): void => {
    const cols = Math.max(0, Math.floor(box.clientWidth / measureCharWidth()));
    main.rebuild(cols);
  };
  update();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe(box);
  } else {
    addEventListener('resize', update);
  }
}
