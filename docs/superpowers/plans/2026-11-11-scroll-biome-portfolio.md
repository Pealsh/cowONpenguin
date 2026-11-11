# スクロール式バイオーム・ポートフォリオ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の 1 ファイル three.js プロトタイプを、スクロールで牛に乗ったペンギンが 5 つのバイオームを歩いて通過する TypeScript + Vite のポートフォリオサイトに作り直す。

**Architecture:** `scrollY` を 0〜1 の進行度に変換し、その 1 つの値から牛とペンギンのワールド x 座標・カメラ・バイオーム混合率を決める。`scroll/` は DOM も three も触らない純粋関数で、テストはここに集中する。canvas は画面固定で後ろに置き、HTML の `<section>` 群が前でスクロールしてページ高さを作る。

**Tech Stack:** Vite 6、TypeScript 5（strict）、three 0.170、Vitest 2。

**Spec:** `docs/superpowers/specs/2026-11-11-scroll-biome-portfolio-design.md`

## Global Constraints

- TypeScript は `strict: true`。`any` を使わない。
- `src/scroll/` は `three` と DOM API を import しない。`src/content/` の型のみ import 可。
- `src/scene/` と `src/ui/` は互いを import しない。組み立ては `src/main.ts` だけが行う。
- 既存の配色変数 `--fg:#d8e6d0 --dim:#7f9378 --bg:#050806 --accent:#f2f5e8` を引き継ぐ。
- 既存 URL 互換: `?raw` で初期 ASCII OFF、`?p1` で初期 mode 1。
- 既存キー互換: `T` で ASCII 切替、`P` で乗り換え。
- `PATH_LENGTH = 240`、バイオーム混合幅 `BLEND_WIDTH = 0.06`（進行度単位）。
- 草は 110,000 本（720px 未満は 40,000 本）、`devicePixelRatio` 上限 2。
- GitHub へ push しない。コミットはローカルのみ。
- 各タスクはテストを先に書く（TDD）。three の描画はテストしない。

## Review Focus

仕様が明示していないが、使う人が踏みやすい入力。各行のテストは所有タスクに入れてある。

1. iOS のバウンススクロールで `scrollY` が負になる → 進行度は 0 に clamp（Task 2）。
2. ウィンドウリサイズで `scrollHeight` が変わる → 進行度は毎フレーム、その時点の `scrollHeight` で計算し直す（Task 8 の実装メモ。テストは Task 2 の純粋関数で担保）。
3. 作品が 0 件 → works セクションは 100vh で存在し、カードなしで崩れない（Task 3, 5）。
4. 進行度が 0 未満 / 1 超で `biomeAt` を呼ぶ → 端のバイオームを返し、配列外参照しない（Task 4）。
5. 作品画像が 404 → `onerror` でプレースホルダーに差し替わる（Task 7、手動確認手順あり）。

---

### Task 1: Vite + TypeScript 雛形と git 初期化

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
- Create: `src/main.ts`（仮。`console.log` のみ）
- Create: `src/styles.css`（色変数と `html,body` のリセットのみ）
- Modify: `index.html`（Vite エントリに書き換え。既存の中身は `legacy/index.html` に退避）
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev` / `npm run build` / `npm test` が動く雛形。`legacy/index.html` に移植元のコードが残る。

- [ ] **Step 1: git 初期化と既存ファイルの退避**

```bash
git init
mkdir -p legacy && git mv index.html legacy/index.html 2>/dev/null || mv index.html legacy/index.html
```

`.gitignore` に `node_modules/`, `dist/`, `graft/` を書く。

- [ ] **Step 2: 依存をインストール**

```bash
npm init -y
npm i three@0.170.0
npm i -D vite@6 typescript@5 vitest@2 @types/three@0.170.0
```

`package.json` の scripts: `"dev": "vite"`, `"build": "tsc --noEmit && vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: tsconfig と vite.config**

`tsconfig.json`: `target ES2022`, `module ESNext`, `moduleResolution Bundler`, `strict true`, `noUncheckedIndexedAccess true`, `types ["vite/client"]`, `include ["src", "tests"]`。
`vite.config.ts`: `defineConfig({ test: { environment: 'node' } })`（`vitest/config` から import）。

- [ ] **Step 4: 失敗する smoke テストを書く**

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PATH_LENGTH } from '../src/scroll/path';
describe('smoke', () => { it('PATH_LENGTH is 240', () => expect(PATH_LENGTH).toBe(240)); });
```

- [ ] **Step 5: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL（`Cannot find module '../src/scroll/path'`）

- [ ] **Step 6: `src/scroll/path.ts` に `export const PATH_LENGTH = 240;` だけ書く**

- [ ] **Step 7: テストが通ることを確認**

Run: `npm test`
Expected: PASS 1

- [ ] **Step 8: index.html を Vite エントリにする**

`<!doctype html>`, `lang="ja"`, `<title>`, `<link rel="stylesheet" href="/src/styles.css">`, `<body>` に以下の骨組みだけ: `<div id="hud"></div>`, `<main id="main"></main>`, `<div id="flat" hidden></div>`, `<script type="module" src="/src/main.ts"></script>`。

- [ ] **Step 9: dev が起動することを確認**

Run: `npm run dev -- --port 5173 &` のあと `curl -s localhost:5173 | grep -c main.ts`
Expected: `1`。確認後 dev サーバを止める。

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + typescript, move prototype to legacy/"
```

---

### Task 2: `scroll/progress.ts` 進行度の計算

**Files:**
- Create: `src/scroll/progress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Produces:
  - `progressFromScroll(scrollY: number, scrollHeight: number, innerHeight: number): number` — 0〜1。スクロール不能（`scrollHeight <= innerHeight`）なら 0。
  - `smoothProgress(current: number, target: number, dt: number, rate?: number): number` — `rate` 既定 6。`current + (target - current) * min(1, dt * rate)`。

- [ ] **Step 1: 失敗するテストを書く**

`tests/progress.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { progressFromScroll, smoothProgress } from '../src/scroll/progress';

describe('progressFromScroll', () => {
  it('0 at top', () => expect(progressFromScroll(0, 3000, 1000)).toBe(0));
  it('1 at bottom', () => expect(progressFromScroll(2000, 3000, 1000)).toBe(1));
  it('0.5 at middle', () => expect(progressFromScroll(1000, 3000, 1000)).toBeCloseTo(0.5));
  it('clamps over-scroll', () => expect(progressFromScroll(2500, 3000, 1000)).toBe(1));
  it('clamps negative scrollY (iOS bounce)', () => expect(progressFromScroll(-80, 3000, 1000)).toBe(0));
  it('returns 0, not NaN, when page cannot scroll', () => {
    expect(progressFromScroll(0, 1000, 1000)).toBe(0);
    expect(progressFromScroll(0, 800, 1000)).toBe(0);
  });
});

describe('smoothProgress', () => {
  it('moves monotonically toward target', () => {
    let p = 0; let prev = 0;
    for (let i = 0; i < 20; i++) { p = smoothProgress(p, 1, 1 / 60); expect(p).toBeGreaterThanOrEqual(prev); prev = p; }
    expect(p).toBeLessThanOrEqual(1);
  });
  it('snaps when dt*rate >= 1', () => expect(smoothProgress(0, 1, 1)).toBe(1));
  it('uses rate 6 by default', () => expect(smoothProgress(0, 1, 0.1)).toBeCloseTo(0.6));
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL（module not found）

- [ ] **Step 3: `src/scroll/progress.ts` を実装**

- [ ] **Step 4: 通ることを確認**

Run: `npx vitest run tests/progress.test.ts`
Expected: PASS 9

- [ ] **Step 5: Commit**

```bash
git add src/scroll/progress.ts tests/progress.test.ts
git commit -m "feat(scroll): progress from scrollY with smoothing"
```

---

### Task 3: `content/sections.ts` と `scroll/path.ts`

**Files:**
- Create: `src/content/sections.ts`
- Modify: `src/scroll/path.ts`
- Test: `tests/path.test.ts`

**Interfaces:**
- Produces（`src/content/sections.ts`）:
  ```ts
  export type BiomeId = 'meadow' | 'forest' | 'snow' | 'desert' | 'shore';
  export type SectionId = 'intro' | 'about' | 'works' | 'skills' | 'contact';
  export type SectionDef = { id: SectionId; biome: BiomeId; heightVh: number };
  export const WORKS_BASE_VH = 100;
  export const WORKS_PER_ITEM_VH = 60;
  export function buildSections(worksCount: number): SectionDef[];
  ```
  順番と高さ: intro/meadow/100, about/forest/150, works/snow/`100 + 60 * worksCount`, skills/desert/150, contact/shore/100。
- Produces（`src/scroll/path.ts`）:
  ```ts
  export const PATH_LENGTH = 240;
  export type SectionRange = { id: SectionId; biome: BiomeId; start: number; end: number };
  export function sectionRanges(sections: readonly SectionDef[]): SectionRange[];
  export function worldX(progress: number): number;   // progress * PATH_LENGTH
  ```
  `sectionRanges` は高さ比で 0〜1 を分割。空配列なら `[]`。

- [ ] **Step 1: 失敗するテストを書く**

`tests/path.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { PATH_LENGTH, sectionRanges, worldX } from '../src/scroll/path';

describe('buildSections', () => {
  it('has 5 sections in order with biomes', () => {
    expect(buildSections(3).map(s => `${s.id}/${s.biome}`)).toEqual(
      ['intro/meadow', 'about/forest', 'works/snow', 'skills/desert', 'contact/shore']);
  });
  it('works height grows by 60vh per item from 100vh', () => {
    expect(buildSections(0)[2]!.heightVh).toBe(100);
    expect(buildSections(3)[2]!.heightVh).toBe(280);
  });
});

describe('sectionRanges', () => {
  it('returns contiguous ranges from 0 to 1', () => {
    const r = sectionRanges(buildSections(3));
    expect(r[0]!.start).toBe(0);
    expect(r[r.length - 1]!.end).toBeCloseTo(1);
    for (let i = 1; i < r.length; i++) expect(r[i]!.start).toBeCloseTo(r[i - 1]!.end);
  });
  it('splits by height ratio', () => {
    const r = sectionRanges(buildSections(0)); // total 600
    expect(r[0]!.end).toBeCloseTo(100 / 600);
    expect(r[1]!.end).toBeCloseTo(250 / 600);
  });
  it('works range widens with more works', () => {
    const w0 = sectionRanges(buildSections(0))[2]!, w5 = sectionRanges(buildSections(5))[2]!;
    expect(w5.end - w5.start).toBeGreaterThan(w0.end - w0.start);
  });
  it('carries id and biome', () => {
    expect(sectionRanges(buildSections(1))[3]).toMatchObject({ id: 'skills', biome: 'desert' });
  });
  it('returns [] for no sections', () => expect(sectionRanges([])).toEqual([]));
});

describe('worldX', () => {
  it('is linear 0..PATH_LENGTH', () => {
    expect(worldX(0)).toBe(0);
    expect(worldX(1)).toBe(PATH_LENGTH);
    expect(worldX(0.25)).toBeCloseTo(60);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/path.test.ts`
Expected: FAIL

- [ ] **Step 3: `src/content/sections.ts` と `src/scroll/path.ts` を実装**

- [ ] **Step 4: 通ることを確認**

Run: `npm test`
Expected: PASS（smoke 1 + progress 9 + path 8）

- [ ] **Step 5: Commit**

```bash
git add src/content/sections.ts src/scroll/path.ts tests/path.test.ts
git commit -m "feat(scroll): section definitions and progress-to-world path"
```

---

### Task 4: `scroll/biome.ts` バイオーム混合

**Files:**
- Create: `src/scroll/biome.ts`
- Test: `tests/biome.test.ts`

**Interfaces:**
- Consumes: `SectionRange` from `src/scroll/path.ts`、`BiomeId` from `src/content/sections.ts`
- Produces:
  ```ts
  export const BLEND_WIDTH = 0.06;
  export type BiomeBlend = { a: BiomeId; b: BiomeId; t: number };
  export function biomeAt(progress: number, ranges: readonly SectionRange[]): BiomeBlend;
  ```
  規則: 隣り合う区間の境界 `e` について `|progress - e| < BLEND_WIDTH` なら `a` = 手前の biome、`b` = 次の biome、`t = smoothstep((progress - (e - BLEND_WIDTH)) / (2 * BLEND_WIDTH))`（smoothstep は `x*x*(3-2x)`、x は 0〜1 に clamp）。どの境界にも近くなければ `a === b` = その区間の biome、`t = 0`。`progress` は 0〜1 に clamp。`ranges` が空なら `{ a: 'meadow', b: 'meadow', t: 0 }`。

- [ ] **Step 1: 失敗するテストを書く**

`tests/biome.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildSections } from '../src/content/sections';
import { sectionRanges } from '../src/scroll/path';
import { biomeAt, BLEND_WIDTH } from '../src/scroll/biome';

const ranges = sectionRanges(buildSections(3));
const e01 = ranges[0]!.end; // meadow→forest boundary

describe('biomeAt', () => {
  it('center of a section has a===b and t=0', () => {
    const mid = (ranges[1]!.start + ranges[1]!.end) / 2;
    expect(biomeAt(mid, ranges)).toEqual({ a: 'forest', b: 'forest', t: 0 });
  });
  it('exactly on a boundary is t=0.5 between neighbours', () => {
    const r = biomeAt(e01, ranges);
    expect(r.a).toBe('meadow'); expect(r.b).toBe('forest'); expect(r.t).toBeCloseTo(0.5);
  });
  it('just outside the blend zone is unblended', () => {
    expect(biomeAt(e01 - BLEND_WIDTH - 1e-6, ranges)).toEqual({ a: 'meadow', b: 'meadow', t: 0 });
    expect(biomeAt(e01 + BLEND_WIDTH + 1e-6, ranges)).toEqual({ a: 'forest', b: 'forest', t: 0 });
  });
  it('t rises monotonically across the zone', () => {
    let prev = -1;
    for (let i = 0; i <= 10; i++) {
      const p = e01 - BLEND_WIDTH + (2 * BLEND_WIDTH * i) / 10;
      const { t } = biomeAt(p, ranges); expect(t).toBeGreaterThanOrEqual(prev); prev = t;
    }
  });
  it('clamps progress outside 0..1 to the end biomes', () => {
    expect(biomeAt(-0.5, ranges)).toEqual({ a: 'meadow', b: 'meadow', t: 0 });
    expect(biomeAt(1.5, ranges)).toEqual({ a: 'shore', b: 'shore', t: 0 });
  });
  it('handles empty ranges', () => expect(biomeAt(0.3, [])).toEqual({ a: 'meadow', b: 'meadow', t: 0 }));
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/biome.test.ts`
Expected: FAIL

- [ ] **Step 3: `src/scroll/biome.ts` を実装**

- [ ] **Step 4: 通ることを確認**

Run: `npm test`
Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add src/scroll/biome.ts tests/biome.test.ts
git commit -m "feat(scroll): biome blend from progress"
```

---

### Task 5: コンテンツ（profile / works / skills）

**Files:**
- Create: `src/content/profile.ts`, `src/content/works.ts`, `src/content/skills.ts`
- Test: `tests/works.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // profile.ts
  export const PROFILE: {
    name: string; tagline: string; about: string[];       // about は段落ごと
    contact: { label: string; url: string }[];
  };
  // works.ts
  export type Work = { id: string; title: string; summary: string; url?: string; image?: string; tags?: string[] };
  export const WORKS: Work[];      // ダミー 3 件、image なし
  // skills.ts
  export const SKILLS: { group: string; items: string[] }[];
  ```
  `PROFILE.name` は既存の `YOUR NAME` を仮で使う。各ファイル先頭に「ここを書き換える」コメントを日本語で 1 行。

- [ ] **Step 1: 失敗するテストを書く**

`tests/works.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { WORKS } from '../src/content/works';

describe('WORKS', () => {
  it('has unique ids', () => expect(new Set(WORKS.map(w => w.id)).size).toBe(WORKS.length));
  it('ids are url-safe', () => WORKS.forEach(w => expect(w.id).toMatch(/^[a-z0-9-]+$/)));
  it('urls are http(s)', () => WORKS.filter(w => w.url).forEach(w => expect(w.url).toMatch(/^https?:\/\//)));
  it('images live under /works/', () => WORKS.filter(w => w.image).forEach(w => expect(w.image).toMatch(/^\/works\//)));
  it('every work has title and summary', () => WORKS.forEach(w => { expect(w.title.length).toBeGreaterThan(0); expect(w.summary.length).toBeGreaterThan(0); }));
});
```

- [ ] **Step 2: 失敗を確認** — Run: `npx vitest run tests/works.test.ts` Expected: FAIL

- [ ] **Step 3: 3 ファイルを実装**

- [ ] **Step 4: 通ることを確認** — Run: `npm test` Expected: 全 PASS

- [ ] **Step 5: Commit**

```bash
git add src/content tests/works.test.ts
git commit -m "feat(content): profile, works, skills placeholders"
```

---

### Task 6: シーンの移植（見た目は現状と同じ、入力なし）

`legacy/index.html` の three.js 部分をモジュールに分けて移植する。プレイヤーは x=0 に立ち止まったまま。この時点で `npm run dev` を開くと、ASCII 表示された草原に牛とペンギンが見える。

**Files:**
- Create: `src/scene/renderer.ts`, `src/scene/ground.ts`, `src/scene/stars.ts`, `src/scene/ascii.ts`, `src/scene/camera.ts`
- Create: `src/scene/creatures/cow.ts`, `src/scene/creatures/penguin.ts`, `src/scene/creatures/rider.ts`
- Create: `src/scene/biomes.ts`（この時点では型と `meadow` の値のみ）
- Modify: `src/main.ts`

**Interfaces:**
- Produces:
  ```ts
  // renderer.ts
  export type Stage = { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera; dpr: number; resize(): void };
  export function createStage(): Stage | null;        // WebGL 不可なら null（例外を握る）

  // biomes.ts
  export type BiomeLook = { ground: Color; grassBase: Color; grassTip: Color; grassDensity: number; fog: Color; sky: Color; starAlpha: number };
  export const BIOME_LOOKS: Record<BiomeId, BiomeLook>;
  export function blendLook(a: BiomeLook, b: BiomeLook, t: number, out: BiomeLook): BiomeLook;

  // ground.ts
  export type Ground = { applyLook(look: BiomeLook): void; update(time: number, playerX: number): void };
  export function createGround(scene: Scene, blades: number): Ground;

  // stars.ts
  export type Stars = { update(time: number, look: BiomeLook): void };
  export function createStars(scene: Scene): Stars;

  // ascii.ts
  export type AsciiPass = { render(scene: Scene, camera: Camera): void; resize(w: number, h: number): void; setCell(w: number, h: number): void };
  export function createAsciiPass(renderer: WebGLRenderer, dpr: number): AsciiPass;

  // camera.ts
  export function updateCamera(camera: PerspectiveCamera, playerX: number, dt: number, mobile: boolean): void;

  // creatures/cow.ts, penguin.ts
  export type Cow = { root: Group; legs: Group[]; tail: Group };
  export function makeCow(): Cow;  export function animCow(c: Cow, gait: number, k: number, t: number): void;
  export type Penguin = { root: Group; flippers: Group[]; feet: Mesh[] };
  export function makePenguin(): Penguin;  export function animPenguin(p: Penguin, gait: number, k: number, t: number): void;

  // creatures/rider.ts
  export type RiderMode = 0 | 1;
  export type Rider = { group: Group; mode: RiderMode; setMode(m: RiderMode): void; setHeading(target: number, dt: number): void; update(gait: number, k: number, t: number): void };
  export function createRider(): Rider;
  ```

- [ ] **Step 1: `creatures/cow.ts`, `creatures/penguin.ts` を移植**

`legacy/index.html` の `makeCow / makePenguin / animCow / animPenguin` と、それらが使う材質・ヘルパー（`lam, mesh, capsule, sphere, spotTex, spotted`）を移す。材質はファイル内のモジュール定数にする。

- [ ] **Step 2: `creatures/rider.ts` を移植**

legacy の `player / mount / cowA / pengA / pengB / cowB / setMode / shadow / player.scale 1.4` を `createRider()` にまとめる。`update` は legacy の `tick` 内の mode 分岐（`animCow/animPenguin` 呼び出しと `pengA.root.rotation.y` のきょろきょろ）をそのまま持つ。`setHeading(target, dt)` は `mount.rotation.y` を目標角へ、角度差（`atan2(sin, cos)` で -π〜π に正規化）× `min(1, dt * 10)` ずつ詰める。初期 heading は `+π/2`（+x 向き）。

- [ ] **Step 3: `biomes.ts` に型と `meadow` を定義**

`meadow`: `ground 0x1a2a1a`, `grassBase 0x050d05`, `grassTip 0x73b36b`, `grassDensity 1`, `fog 0x020302`, `sky 0x020302`, `starAlpha 0.3`。残り 4 つは Task 9 で埋めるため、ここでは `meadow` をコピーして仮置きする（型を満たすため）。`blendLook` は `Color.lerpColors` と数値 lerp。

- [ ] **Step 4: `ground.ts` を移植し、x 方向に無限化 + 密度を追加**

legacy の地面 Plane と草シェーダを移す。変更点:
- 地面 Plane は `PlaneGeometry(PATH_LENGTH + 200, 200)` を `x = PATH_LENGTH / 2` に置く。
- 草は 70×70 の 1 パッチのまま。頂点シェーダで `float fx = mod(offset.x - uPlayerX + 35.0, 70.0) - 35.0 + uPlayerX;` として x を常にプレイヤー周りに巻き戻す（繰り返しで無限に見せる）。`uPlayer` は従来どおりかき分けに使う。
- uniform `uDensity` を追加し、`params.z >= uDensity` の頂点は `gl_Position = vec4(2.0, 2.0, 2.0, 1.0);` で画面外に飛ばす。
- 色は uniform `uBase`, `uTip` にし、`applyLook` で `ground.material.color`, `uBase`, `uTip`, `uDensity`, `scene.fog.color`, `scene.background` を更新する。fog の near/far は固定（18, 45）。

- [ ] **Step 5: `stars.ts`, `ascii.ts`, `camera.ts` を移植**

- `stars.ts`: legacy の `motes` を移す。`PointsMaterial` に `transparent: true` を付け、`update` で `opacity = look.starAlpha`、y の持ち上げは `look.starAlpha` が 0.8 以上のとき `+8`（desert で星に見せる）。粒は x 方向に `PATH_LENGTH + 60` の幅でばらまく。
- `ascii.ts`: legacy の `CHARS / atlas / rt / asciiMat / quadScene` を移す。`setCell` で `uCell` を変える。
- `camera.ts`: 位置の目標は `mobile ? (x, 10, 9) : (x - 4, 8.5, 7.5)`（x はプレイヤー x）、`lerp(min(1, dt*3))`、`lookAt(mobile ? x : x - 4, 1, 0)`。

- [ ] **Step 6: `renderer.ts` と `main.ts`**

`createStage` は legacy の renderer / scene / camera / ライトを作る。`WebGLRenderer` 生成を `try/catch` し失敗なら `null`。`main.ts` はこの時点で: stage を作り、ground(110000)・stars・rider・ascii を組み、`requestAnimationFrame` ループで `rider.update(0,0,t)`, `ground.update(t, 0)`, `updateCamera(camera, 0, dt, false)`, ASCII で描画。`T` キーで ASCII 切替だけ付ける（`?raw` 対応込み）。

- [ ] **Step 7: 目視確認**

Run: `npm run dev` を起動してブラウザで開く。
Expected: ASCII 表示の草原、中央に牛に乗ったペンギン、草が風で揺れる。`T` で通常描画に切り替わる。コンソールにエラーなし。
あわせて `npm run build` が型エラーなしで通ること。

- [ ] **Step 8: Commit**

```bash
git add src/scene src/main.ts
git commit -m "feat(scene): port prototype scene into modules"
```

---

### Task 7: UI（セクション DOM・作品カード・HUD・flat）

canvas の前に置く HTML を作る。この時点ではシーンとまだつながない（Task 8 でつなぐ）。

**Files:**
- Create: `src/ui/sections.ts`, `src/ui/works.ts`, `src/ui/hud.ts`, `src/ui/flat.ts`
- Modify: `src/styles.css`, `src/main.ts`

**Interfaces:**
- Consumes: `PROFILE, WORKS, SKILLS, buildSections` from `src/content/*`
- Produces:
  ```ts
  // sections.ts
  export function renderSections(main: HTMLElement, sections: readonly SectionDef[]): { worksContainer: HTMLElement };
  // works.ts
  export function renderWorks(container: HTMLElement, works: readonly Work[]): void;
  // hud.ts
  export type HudHandlers = { onToggleAscii(): void; onToggleMode(): void; onToggleFlat(): void };
  export type Hud = { setAscii(on: boolean): void; setMode(m: RiderMode): void; setFlat(open: boolean): void; hideSceneControls(): void };
  export function createHud(root: HTMLElement, name: string, handlers: HudHandlers): Hud;  // T/P キーもここで購読
  // flat.ts
  export type Flat = { open(): void; close(): void; isOpen(): boolean };
  export function createFlat(el: HTMLElement): Flat;   // PROFILE/WORKS/SKILLS を文字だけで描く
  ```

- [ ] **Step 1: `sections.ts`**

各 `SectionDef` につき `<section id={id} data-biome={biome} style="--h: {heightVh}vh">`。中身:
- intro: `<h1>PROFILE.name</h1><p>PROFILE.tagline</p><p class="hint">↓ スクロール</p>`
- about: `<h2>ABOUT</h2>` + `PROFILE.about` を `<p>` で
- works: `<h2>WORKS</h2><div class="works"></div>`（この div を返す）
- skills: `<h2>SKILLS</h2>` + group ごとに `<h3>` と `<ul class="tags">`
- contact: `<h2>CONTACT</h2><ul>` にリンク（`target="_blank" rel="noopener"`）
文字ブロックは `<div class="copy">` で包む。

- [ ] **Step 2: `works.ts`**

カード 1 枚: `<article class="card" id="work-{id}">` に `figure`（画像 or プレースホルダー）→ `h3` → `p` → `ul.tags` → `a`（url があるときだけ）。
- プレースホルダー: `<div class="ph" aria-hidden="true">` に、タイトル先頭 2 文字（絵文字や結合文字を壊さないよう `Array.from(title).slice(0,2).join('')`）を `<span class="ph-initial">` で、その周りに `' .:-=+*'` から選んだ文字を 48 個ランダムに並べた `<span class="ph-noise">`。乱数は `id` から作る簡易ハッシュ（`xorshift32` でよい）をシードにして毎回同じ見た目にする。
- `<img>` には `loading="lazy"`、`onerror` で同じプレースホルダーに差し替える。
- `IntersectionObserver`（`threshold: 0.3`）で `.visible` を付け、付けたら `unobserve`。`IntersectionObserver` が `undefined` なら全部に即 `.visible`。

- [ ] **Step 3: `hud.ts`**

左上 `<h1 class="name">`、右上に `<button data-act="ascii">ASCII</button><button data-act="mode">乗り換え</button><button data-act="flat">普通に見る</button>`。`setAscii/setMode` は `aria-pressed` を切り替える。`setFlat(true)` で flat ボタンの文言を「戻る」に。`keydown` で `t`/`p` を handlers に流す（`e.repeat` は無視、入力欄にフォーカス中は無視）。`hideSceneControls` は ascii/mode ボタンを `hidden` に。

- [ ] **Step 4: `flat.ts`**

`#flat` に `<section>` で ABOUT / WORKS / SKILLS / CONTACT を文字だけで描く（legacy の `#flat` 相当）。`open()` で `hidden=false` と `document.body.classList.add('flat-open')`、`close()` で戻す。

- [ ] **Step 5: `styles.css`**

- `canvas { position: fixed; inset: 0; z-index: 0 }`、`main { position: relative; z-index: 1 }`、`#hud { position: fixed; z-index: 2 }`、`#flat { position: fixed; inset: 0; z-index: 3; overflow: auto; background: var(--bg) }`。
- `section { min-height: var(--h); display: flex; align-items: center }`、`.copy { width: min(50%, 520px); margin-left: 16px; background: rgba(5,8,6,.78); border: 1px solid var(--dim); padding: 20px 22px }`。
- `.card { width: min(440px, 100% - 32px); opacity: 0; transform: translateY(16px); transition: opacity .4s, transform .4s } .card.visible { opacity: 1; transform: none }`。`figure { aspect-ratio: 16/9 }`、`.card img:hover { filter: brightness(1.15) }`。
- `.ph { aspect-ratio: 16/9; display: grid; place-items: center; font-family: monospace; color: var(--dim) } .ph-initial { font-size: 56px; color: var(--accent) }`。
- `@media (max-width: 719px) { .copy { width: calc(100% - 32px); margin-top: 33vh } section { align-items: flex-end } }`。
- `@media (prefers-reduced-motion: reduce) { .card { transition: none } }`。
- `body.flat-open { overflow: hidden }`。

- [ ] **Step 6: `main.ts` に組み込む（表示のみ）**

`buildSections(WORKS.length)` → `renderSections` → `renderWorks`、`createHud`（ascii は Task 6 の切替に、mode は `rider.setMode(1 - rider.mode)` に、flat は `flat.open/close` + `hud.setFlat` につなぐ）、`createFlat`。初期 mode は `location.search.includes('p1') ? 1 : 0`。

- [ ] **Step 7: 目視確認**

Run: `npm run dev`
Expected: 左側に文字ブロックとカード 3 枚（プレースホルダー付き）、スクロールするとカードがフェードイン。右上 3 ボタンが動き、「普通に見る」で文字だけ一覧、「戻る」で戻る。`P` で乗り換え。
画像 404 の確認: `WORKS[0].image = '/works/nope.png'` を一時的に入れて開き、プレースホルダーに置き換わることを見たら戻す。

- [ ] **Step 8: Commit**

```bash
git add src/ui src/styles.css src/main.ts
git commit -m "feat(ui): sections, work cards, hud, flat view"
```

---

### Task 8: スクロールで歩かせる

**Files:**
- Modify: `src/main.ts`
- Modify: `src/scene/creatures/rider.ts`（向き回転のなめらか化）

**Interfaces:**
- Consumes: `progressFromScroll, smoothProgress`（Task 2）、`worldX, sectionRanges`（Task 3）、`Rider`（Task 6）、`updateCamera`（Task 6）

- [ ] **Step 1: ループを進行度駆動にする**

毎フレーム:
```
target = progressFromScroll(window.scrollY, document.documentElement.scrollHeight, window.innerHeight)
smoothed = reduced ? target : smoothProgress(smoothed, target, dt)
x = worldX(smoothed)
speed = |x - prevX| / dt     // ワールド単位/秒
gait += speed * dt * 2.2;  k = min(1, speed / 3)
```
`rider.group.position.x = x`、`rider.update(gait, k, t)`、`ground.update(t, x)`、`updateCamera(camera, x, dt, mobile)`。`scrollHeight` は毎フレーム読む（リサイズで変わるため）。`reduced` は `matchMedia('(prefers-reduced-motion: reduce)').matches`。`mobile` は `innerWidth < 720`（resize で更新）。

- [ ] **Step 2: 向き**

`x - prevX > 0.001` なら目標 heading = `+π/2`（+x 向き）、`< -0.001` なら `-π/2`、止まっていれば変えない。`rider.setHeading` は内部で `lerp` ではなく角度差を `min(1, dt * 10)` で詰める（0.3s 程度で回る）。`setHeading(target, dt)` にシグネチャを変える。

- [ ] **Step 3: flat 中とタブ非表示中は止める**

`flat.open()` 時と `document.visibilityState === 'hidden'` 時はループを止め、戻ったら `clock.getDelta()` を 1 回捨ててから再開する（dt の跳ねを防ぐ）。

- [ ] **Step 4: 目視確認**

Run: `npm run dev`
Expected: スクロールで牛とペンギンが右へ歩き、止めると止まる。戻すと向きを変えて左へ歩く。最下部で x ≈ 240。文字ブロックは歩く帯に重ならない。

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/scene/creatures/rider.ts
git commit -m "feat: drive walk, gait and camera from scroll progress"
```

---

### Task 9: バイオームの見た目と小物

**Files:**
- Modify: `src/scene/biomes.ts`
- Create: `src/scene/props.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `biomeAt`（Task 4）、`blendLook, BIOME_LOOKS, Ground.applyLook, Stars.update`（Task 6）
- Produces:
  ```ts
  // props.ts
  export type Props = { update(time: number): void };
  export function createProps(scene: Scene, ranges: readonly SectionRange[]): Props;
  ```

- [ ] **Step 1: `BIOME_LOOKS` の残り 4 つを埋める**

| id | ground | grassBase | grassTip | density | fog / sky | starAlpha |
|---|---|---|---|---|---|---|
| forest | 0x15200f | 0x030803 | 0x2f6b2a | 0.8 | 0x030a04 | 0.1 |
| snow | 0xd9dde0 | 0x9aa3a8 | 0xf4f7f9 | 0.25 | 0x7d8f9d | 0.2 |
| desert | 0xc9a86a | 0x5a4a2a | 0xb9a060 | 0.15 | 0x0a1030 | 1.0 |
| shore | 0xb8a878 | 0x3a5a3a | 0x8fcf8f | 0.3 | 0x3a5a6a | 0.4 |

- [ ] **Step 2: `props.ts`**

各 range の x 区間 `[worldX(start), worldX(end)]` に、biome ごとに以下を置く（z は ±6〜±28、歩行路 |z| < 5 は空ける）。形は legacy の木と同じ素朴な Box/Icosahedron/Cone/Sphere:
- meadow: 木 × 14（legacy と同じ）
- forest: 木 × 40、幹 4.5、葉 5 個
- snow: 雪だるま（Sphere 0.6 + 0.45 + 0.3、白、黒の点 2 つ）× 6、針葉樹（Cone 1.2×4、暗緑、先端に白 Cone）× 18
- desert: サボテン（Cylinder 0.3×2.5 + 横腕 Cylinder 0.2×1）× 10、岩（Icosahedron 0.8、灰）× 12
- shore: 波 = `PlaneGeometry(区間長, 1.2)` を z = 14 と z = 20 に 2 枚（半透明の白、`opacity .55`）。`update(t)` で `position.z += sin(t*0.8)*0.6` と `sin(t*0.8 + 1.5)` で前後させる

- [ ] **Step 3: `main.ts` で毎フレーム look を適用**

```
blend = biomeAt(smoothed, ranges)
look = blendLook(BIOME_LOOKS[blend.a], BIOME_LOOKS[blend.b], blend.t, lookBuf)
ground.applyLook(look); stars.update(t, look); props.update(t)
```

- [ ] **Step 4: 目視確認**

Run: `npm run dev`
Expected: スクロールで 草原 → 森（暗く木が密）→ 雪原（白く草が薄い）→ 夜の砂漠（星が明るい）→ 海辺（波が動く）と、境界で徐々に変わる。ASCII でもバイオームの差が分かる。

- [ ] **Step 5: Commit**

```bash
git add src/scene/biomes.ts src/scene/props.ts src/main.ts
git commit -m "feat(scene): biome looks, blending and props"
```

---

### Task 10: スマホ・reduced-motion・エラー処理・性能

**Files:**
- Modify: `src/main.ts`, `src/scene/ascii.ts`, `src/styles.css`

**Interfaces:**
- Consumes: `createStage` が `null` を返す（Task 6）、`Hud.hideSceneControls`, `Flat.open`（Task 7）、`AsciiPass.setCell`（Task 6）

- [ ] **Step 1: WebGL 不可の分岐**

`createStage()` が `null` なら: canvas を追加せず、`flat.open()`、`hud.hideSceneControls()`、ループを開始しない。確認: `main.ts` の先頭で一時的に `const stage = null as Stage | null;` にして開き、文字一覧だけが表示されることを見たら戻す。

- [ ] **Step 2: 720px 未満の性能設定**

起動時 `innerWidth < 720` なら `createGround(scene, 40000)`、`ascii.setCell(9 * dpr, 14 * dpr)`。それ以外は 110000 と `7 * dpr, 11 * dpr`。

- [ ] **Step 3: reduced-motion**

Task 8 の `reduced` フラグで `smoothProgress` をスキップ済みであることを確認。加えて `setHeading` の回転も即時にする。

- [ ] **Step 4: 目視確認（3 つ）**

1. DevTools のデバイスモード（375px 幅）: 牛とペンギンが画面上 1/3、文字が下 2/3。30fps 以上（Performance パネルの FPS メーター）。
2. OS の「視差効果を減らす」ON（または DevTools の Rendering → `prefers-reduced-motion: reduce`）: カードが即表示、スクロールに歩行が遅れなく追従。
3. デスクトップ 1440px: Performance で 60fps 付近。

- [ ] **Step 5: ビルドとテストの最終確認**

Run: `npm test && npm run build`
Expected: テスト全 PASS、`dist/` が生成され、`npm run preview` で開いて同じ動きをする。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: mobile layout, reduced-motion, webgl fallback, perf tuning"
```

---

## 完了条件（仕様 §1 の再掲）

- `npm run dev` で起動し、スクロールだけで最初から最後まで見られる
- 5 バイオームが順に現れ、牛とペンギンが歩いて通過する
- WORKS で作品カードが 1 枚ずつ読める。画像がなくても崩れない
- T / P キーと画面ボタンが動く。「普通に見る」で文字だけの一覧が出る
- `npm test` が通る
