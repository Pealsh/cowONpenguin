import type { Scene } from 'three';
import type { BiomeId } from '../../content/sections';
import type { SectionRange } from '../../scroll/path';
import { worldX } from '../../scroll/path';
import type { PropHandles } from '../props';
import { createDesert } from './desert';
import { createForest } from './forest';
import { nearSpan } from './logic';
import { createMeadow } from './meadow';
import { createSnow } from './snow';
import { createVolcano } from './volcano';

export type GimmickCtx = { time: number; dt: number; riderX: number; reduced: boolean; mobile: boolean };
export type Gimmick = { update(ctx: GimmickCtx): void };
export type Gimmicks = { update(ctx: GimmickCtx): void; shake(): number };

// バイオームの x 範囲（ワールド座標）
export type Span = { x0: number; x1: number };

// 各バイオームのギミック。setVisible は範囲 ±30 の出入りのときだけ呼ばれる
export type BiomeGimmick = Gimmick & { setVisible(visible: boolean): void; shake?(): number };
export type GimmickFactory = (scene: Scene, span: Span, props: PropHandles) => BiomeGimmick;

const FACTORIES: Record<BiomeId, GimmickFactory> = {
  meadow: createMeadow,
  forest: createForest,
  snow: createSnow,
  desert: createDesert,
  volcano: createVolcano,
};

type Slot = { span: Span; g: BiomeGimmick; active: boolean };

export function createGimmicks(scene: Scene, ranges: readonly SectionRange[], props: PropHandles): Gimmicks {
  const slots: Slot[] = [];
  for (const r of ranges) {
    const factory = FACTORIES[r.biome];
    const span = { x0: worldX(r.start), x1: worldX(r.end) };
    const g = factory(scene, span, props);
    g.setVisible(false);
    slots.push({ span, g, active: false });
  }

  let shakeAmp = 0;

  return {
    update(ctx) {
      shakeAmp = 0;
      for (const s of slots) {
        const active = nearSpan(ctx.riderX, s.span.x0, s.span.x1);
        if (active !== s.active) {
          s.active = active;
          s.g.setVisible(active);
        }
        if (!active) continue; // 範囲外は何もしない
        s.g.update(ctx);
        if (s.g.shake && !ctx.reduced) shakeAmp = Math.max(shakeAmp, s.g.shake());
      }
    },
    shake() {
      return shakeAmp;
    },
  };
}

