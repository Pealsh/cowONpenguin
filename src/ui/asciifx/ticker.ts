/** 全 decor 共有の 12fps ループ。見えているものだけを step+draw する */
export const FPS = 12;
export const DT = 1 / FPS;

export type TickHandle = {
  step(dt: number): void;
  draw(): void;
};

type Entry = { el: Element; handle: TickHandle; visible: boolean };

const entries: Entry[] = [];
let io: IntersectionObserver | null = null;
let rafId = 0;
let last = 0;
let acc = 0;
let listening = false;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function frame(now: number): void {
  rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (last === 0) last = now;
  // タブ復帰などで大きく飛んだ分は捨てる
  acc = Math.min(acc + (now - last) / 1000, DT * 3);
  last = now;
  if (acc >= DT) {
    acc -= DT;
    for (const e of entries) {
      if (!e.visible) continue;
      e.handle.step(DT);
      e.handle.draw();
    }
  }
  schedule();
}

function schedule(): void {
  if (rafId !== 0 || entries.length === 0) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  rafId = requestAnimationFrame(frame);
}

function ensureListeners(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      last = 0;
      acc = 0;
      schedule();
    }
  });
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((records) => {
      for (const r of records) {
        const e = entries.find((x) => x.el === r.target);
        if (!e) continue;
        if (!r.target.isConnected) {
          // DOM から外れた decor は見えないまま回り続けさせず、ここで自分を登録解除する
          const i = entries.indexOf(e);
          if (i >= 0) entries.splice(i, 1);
          io?.unobserve(r.target);
          continue;
        }
        e.visible = r.isIntersecting;
      }
    });
  }
}

/** el が画面内にある間だけ handle を 12fps で回す。戻り値で登録解除 */
export function register(el: Element, handle: TickHandle): () => void {
  ensureListeners();
  const entry: Entry = { el, handle, visible: io === null };
  entries.push(entry);
  io?.observe(el);
  schedule();
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries.splice(i, 1);
    io?.unobserve(el);
  };
}
