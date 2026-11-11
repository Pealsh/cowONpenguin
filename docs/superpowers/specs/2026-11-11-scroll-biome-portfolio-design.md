# スクロール式バイオーム・ポートフォリオ 設計仕様

日付: 2026-11-11
対象: `ascii-portfolio-prototype`（現状は `index.html` 1 ファイルのプロトタイプ）

## 1. 目的

- スクロールすると、牛に乗ったペンギンが左から右へ歩き、セクションごとに違うバイオームを通過していくポートフォリオサイトにする。
- 作品と自己紹介を、背景の牛とペンギンを隠さずに見やすく表示する。
- 既存の ASCII 表示（T キー切替）と乗り方切替（P キー）はそのまま残す。
- TypeScript + Vite + three.js（npm）で作り直す。CDN 読み込みはやめる。

成功の判定:
- `npm run dev` で起動し、スクロールだけで最初から最後まで見られる。
- 5 バイオームが順に現れ、牛とペンギンが歩いて通過する。
- WORKS セクションで作品カードが 1 枚ずつ読める。画像がなくても崩れない。
- T / P キーと画面ボタンが動く。「普通に見る」で文字だけの一覧が出る。
- `npm test` が通る。

## 2. やらないこと

- WASD / ドラッグの自由移動（削除する）
- 石碑に近づくとパネルが開く仕組み（削除する）
- CMS や外部 API。内容はすべて `src/content/` の TS ファイルに書く
- three.js の描画結果の自動テスト

## 3. 画面構成

画面の重なり（後ろ → 前）:

1. `<canvas>`（`position: fixed; inset: 0`）。three.js が描く。スクロールしない。
2. `<main>`（通常のドキュメントフロー）。5 つの `<section>` が縦に並び、ページの高さを作る。背景は透明。
3. HUD（`position: fixed`）。左上に名前、右上にボタン 3 つ（ASCII / 乗り換え / 普通に見る）。
4. `#flat`（`position: fixed; inset: 0`）。文字だけの一覧。「普通に見る」で表示。

### 3.1 セクションとバイオーム

| 順 | id | バイオーム | 内容 | 高さ（vh） |
|---|---|---|---|---|
| 1 | `intro` | 草原 | 名前・一言・「↓ スクロール」 | 100 |
| 2 | `about` | 森 | 自己紹介（短文 2〜3 段落） | 150 |
| 3 | `works` | 雪原 | 作品カード一覧 | 100 + 作品数 × 60 |
| 4 | `skills` | 夜の砂漠（星空） | 技術一覧（タグ風） | 150 |
| 5 | `contact` | 海辺 | 連絡先リンク | 100 |

高さは `src/content/sections.ts` の定数で持ち、CSS カスタムプロパティで `<section>` に渡す。works の高さは作品数から算出する。

### 3.2 文字の置き場所

- 牛とペンギンは画面の横方向 55%〜75% の帯を歩く（カメラが追う）。
- 文字・カードはこの帯を避け、画面左側 0%〜50% に置く。
- 画面幅 720px 未満では、牛とペンギンを画面上部 1/3 に寄せ、文字は下 2/3 に置く（カメラ位置を切り替える）。
- 文字の地は `rgba(5,8,6,.78)`、枠は現状の `--dim` 色 1px。現状の配色変数（`--fg --dim --bg --accent`）を引き継ぐ。

### 3.3 作品カード

- データ: `src/content/works.ts`

```ts
export type Work = {
  id: string;        // 一意。カードの DOM id に使う
  title: string;
  summary: string;   // 1〜2 文
  url?: string;      // 外部リンク。なければリンクを出さない
  image?: string;    // /public/works/*.png などのパス。なければプレースホルダー
  tags?: string[];
};
export const WORKS: Work[] = [ ... ];
```

- 表示: 左側に縦 1 列。1 枚の幅は `min(440px, 100% - 32px)`。
- 中身: 上から 画像（16:9）→ タイトル → summary → tags → リンク。
- 画像がない場合: 同じ 16:9 の枠に、タイトルの先頭 1〜2 文字を大きく、周りに `. : - = + *` をランダムに散らした ASCII 風プレースホルダーを CSS/テキストで描く（canvas は使わない）。
- 表示タイミング: `IntersectionObserver` で画面の 30% に入ったら `.visible` を付け、opacity 0→1、translateY 16px→0 を 0.4s で動かす。一度表示したら戻さない。
- ホバー: 画像の明度を 1.0→1.15。他の動きはなし。
- 初期データ: ダミー 3 件（画像なし）。後から差し替えられることをコメントで示す。

## 4. スクロールと歩行の対応

### 4.1 進行度

- `progress = scrollY / (document.scrollHeight - innerHeight)`、0〜1 に clamp。
- 進行度は毎フレーム `lerp(current, target, min(1, dt * 6))` でなめらかに追従させる。描画はこの `smoothed` を使う。

### 4.2 ワールド座標

- ワールドの歩行路は x 軸に沿った直線。`x = progress * PATH_LENGTH`、`PATH_LENGTH = 240`（ワールド単位）。z = 0。
- 各セクションの区間は、セクションの高さ比で `PATH_LENGTH` を分割する。`scroll/path.ts` の `sectionRanges(sections)` が `{ id, start, end }[]`（0〜1）を返す。
- 牛とペンギンは +x を向いて歩く。歩行アニメーション（脚・よちよち）は `smoothed` の変化速度 `|d progress / dt| * PATH_LENGTH` から求めた速度を既存の `gait` / `k` に流し込む。止まれば止まる。
- 戻りスクロールでは後ろ向きに歩かず、向きを -x に 0.3s で回してから歩く。

### 4.3 カメラ

- プレイヤーの x に追従。オフセットは現状と同じ斜め上（`y 8.5, z 7.5`）を基準に、横方向は歩行帯（3.2 節）に牛とペンギンが収まるようにプレイヤーより左に `-4` ずらす。
- 720px 未満: `y 10, z 9`、横ずらしなし、縦方向に見下ろし角を強める。

### 4.4 バイオームの混合

- `scroll/biome.ts` の `biomeAt(progress, ranges)` が `{ a: BiomeId, b: BiomeId, t: number }` を返す。`t` はセクション境界の前後 ±6%（進行度単位 0.06）で 0→1 に smoothstep。境界から離れていれば `a === b, t = 0`。
- `scene/biomes.ts` に各バイオームの見た目パラメータを定義する:

```ts
type BiomeLook = {
  ground: Color;       // 地面色
  grassBase: Color;    // 草の根元色
  grassTip: Color;     // 草の先端色
  grassDensity: number;// 0〜1。草インスタンスの表示割合
  fog: Color;
  sky: Color;
  starAlpha: number;   // 星粒の不透明度 0〜1
};
```

| id | ground | grassTip | grassDensity | fog/sky | starAlpha | 小物 |
|---|---|---|---|---|---|---|
| `meadow` | 深緑 | 黄緑 | 1.0 | 現状の暗緑 | 0.3 | 木（現状） |
| `forest` | 暗い茶緑 | 濃緑 | 0.8 | 濃緑、近め | 0.1 | 木を密に、背高 |
| `snow` | 白灰 | 白 | 0.25 | 青白、遠め | 0.2 | 雪だるま、針葉樹 |
| `desert` | 砂色 | 枯草色 | 0.15 | 紺 | 1.0 | サボテン、岩 |
| `shore` | 砂色→青 | 薄緑 | 0.3 | 青灰 | 0.4 | 波（板ポリの帯を sin で上下） |

- 毎フレーム `a` と `b` のパラメータを `t` で線形補間して uniform と色にセットする。
- 小物はワールドに全部置いておき、各セクション区間の x 範囲にだけ配置する（切替処理は不要）。
- 草はワールド全体（`PATH_LENGTH + 40` × 70）に敷き、`grassDensity` は頂点シェーダで `params.z < density` のときだけ描く（それ以外は `gl_Position` を画面外に飛ばす）。既存の 110,000 本を維持。
- 星粒は既存の motes を流用し、`starAlpha` を `PointsMaterial.opacity` に入れる。`desert` では高さを 6〜14 に上げて星に見せる。

## 5. 操作

| 操作 | 動作 |
|---|---|
| ホイール / タッチ / キーボード（Space, PageDown, ↓） | ブラウザ標準のスクロール。独自ハンドリングしない |
| `T` / ボタン「ASCII」 | ASCII パス ON/OFF。状態をボタンの見た目に反映 |
| `P` / ボタン「乗り換え」 | mode 0（牛にペンギン）⇄ mode 1（ペンギンに牛）。既存の 2 組のメッシュを流用 |
| ボタン「普通に見る」 | `#flat` を表示、ボタン文言を「戻る」に。`#flat` 表示中は canvas の描画を止める |
| URL `?raw` | 初期 ASCII OFF（既存互換） |
| URL `?p1` | 初期 mode 1（既存互換） |

`prefers-reduced-motion: reduce` のとき、カードのフェードと進行度の lerp を無効化し、即時反映にする。

## 6. ファイル構成

```
ascii-portfolio-prototype/
  index.html              Vite のエントリ。HUD・main・flat の骨組みのみ
  package.json            vite, typescript, three, @types/three, vitest
  tsconfig.json           strict: true
  vite.config.ts
  public/works/           作品画像（最初は空）
  src/
    main.ts               起動。各モジュールを組み立ててループを回す
    content/
      profile.ts          名前・一言・自己紹介・連絡先
      works.ts            Work 型と WORKS
      skills.ts           技術一覧
      sections.ts         セクション定義（id, biome, 高さ vh）
    scroll/
      progress.ts         scrollY → progress、smoothing
      path.ts             sectionRanges()、progress → world x
      biome.ts            biomeAt()
    scene/
      renderer.ts         WebGLRenderer, camera, resize
      ground.ts           地面と草（既存シェーダを移植、density 追加）
      biomes.ts           BiomeLook 定義と補間
      props.ts            木・雪だるま・サボテン・岩・波の生成と配置
      creatures/
        cow.ts            makeCow, animCow（既存を移植）
        penguin.ts        makePenguin, animPenguin（既存を移植）
        rider.ts          mode 切替、2 組の組み立て、影
      camera.ts           追従とブレークポイント切替
      ascii.ts            ASCII 変換パス（既存を移植）
      stars.ts            motes の移植
    ui/
      hud.ts              名前とボタン 3 つ、キー入力
      sections.ts         <section> 生成、高さ設定
      works.ts            作品カード生成、IntersectionObserver
      flat.ts             文字だけ一覧
    styles.css
  tests/
    path.test.ts
    biome.test.ts
    progress.test.ts
    works.test.ts
```

モジュール間の依存は `main.ts → ui / scene / scroll → content` の一方向。`scene` と `ui` は互いを import しない。`scroll` は DOM も three も import しない（純粋関数のみ。テストはここに集中する）。

## 7. テスト（Vitest、実装前に書く）

- `path.test.ts`
  - 5 セクションの高さ比から `sectionRanges` が 0 始まり 1 終わりの連続区間を返す
  - works の高さが作品数で増え、区間幅が伸びる
  - `worldX(progress)` が 0 → `PATH_LENGTH` に線形
- `biome.test.ts`
  - 区間の中央では `a === b, t === 0`
  - 境界ちょうどで `t === 0.5`
  - 境界 ±0.06 の外で `t` が 0 または 1
  - 最初と最後の端で範囲外にならない
- `progress.test.ts`
  - `scrollY` 0 → 0、最大 → 1、超過は clamp
  - `scrollHeight === innerHeight`（スクロール不能）で 0 を返し NaN にならない
  - smoothing が目標に単調に近づく
- `works.test.ts`
  - `WORKS` の `id` が重複しない
  - `url` があれば `https?://` で始まる
  - `image` があれば `/works/` で始まる

## 8. エラー処理

- WebGL が使えない（`renderer` 生成で例外）: canvas を作らず、自動で `#flat` を開き、HUD のボタン「ASCII」「乗り換え」を非表示にする。
- 作品画像の読み込み失敗（`onerror`）: その `<img>` をプレースホルダーに差し替える。
- `IntersectionObserver` 非対応: 全カードに最初から `.visible` を付ける。

## 9. 性能

- `devicePixelRatio` は 2 で上限（既存）。
- 720px 未満では草を 40,000 本、ASCII セルを 1 段大きく（`9×14` px）。
- `#flat` 表示中とタブ非表示（`visibilitychange`）中は `requestAnimationFrame` を止める。
- 目標: デスクトップ 60fps、スマホ 30fps 以上。

## 10. 実装の段階（計画書で詳細化する）

1. Vite + TS 雛形、既存 index.html の内容をモジュールに移植して「今と同じ見た目」で動かす（WASD 込み）
2. `scroll/` を TDD で実装
3. WASD を外し、スクロール進行度で歩行・カメラを動かす
4. セクション DOM と作品カード、HUD ボタン、flat
5. バイオーム補間と小物
6. スマホ対応、reduced-motion、エラー処理、性能調整
