---
title: "Vibe Jam 2026: Three.js 100階ハクスラを 1MB に収めた（Procedural BGM + Voxel 合成）"
emoji: "🎮"
type: "tech"
topics: ["生成AI", "ClaudeCode", "ThreeJS", "WebAudio", "ゲーム開発"]
published: false
---

## はじめに

[Vibe Jam 2026](https://vibej.am/2026/) (主催: [@levelsio](https://x.com/levelsio)) に、Three.js 製のサイバーネオン系ハクスラ「**Rift Survivors**」を提出しました。

- 🎮 ライブ: https://rift-survivors.pages.dev/
- 🐙 ソース: https://github.com/aieo-product/vibejamGame
- 📄 設計書: https://rift-survivors-design.pages.dev/

![Rift Survivors](https://github.com/aieo-product/vibejamGame/blob/evidence/evidence/issue-178/rift-survivors-thumbnail.png?raw=true)

本作は **Demon's Souls 風の 4 段階コンボ + ブロック / パリィ + スタミナ管理**、**100 階構成 + 5F 刻みの 3 ボス循環**、**MMO 風レア度装備 (Common→Legendary)**、**スキル習得制 + チェイン補正**、**日本語/英語 自動切替**、**メガドライブ風 6 ボタンのモバイル UI** を全部詰め込んだ Web ゲームです。

ジャムの主要ルールは

> game has to be accessible on web without any login or signup and free-to-play, **under 1 MB**

の「**1 MB 以下**」が鬼門。普通に mp3 や GLTF を入れたらすぐに数 MB に膨らみます。

そこで本記事では、**音もモデルも全部クライアント側で合成して 1 MB 以下に抑えた工夫**を中心に共有します。最終ビルドは:

```
dist/index.html        32 KB
dist/assets/index.css  20 KB / gzip  4 KB
dist/assets/index.js  748 KB / gzip 192 KB
合計                  ≈ 800 KB / gzip ≈ 220 KB
```

外部ロードは **Vibe Jam 公式 widget** (jam の参加要件) と Google Fonts のみ。**音声ファイル 0、3D モデルファイル 0、画像は favicon の SVG 1 つだけ**です。

## 1 MB 制約への向き合い方

最初に決めたのは「**外部アセットを全部切る**」ことでした。

| 通常 | 本作 |
|---|---|
| BGM mp3 / wav (数 MB〜) | Web Audio + Oscillator で合成 |
| GLTF / FBX 3D モデル | Three.js BoxGeometry を組み立てて voxel 風に |
| spritesheet PNG | Canvas で実行時に描画して `CanvasTexture` |
| Howler.js / Tone.js | 自前 60 行ほどの helper |

「足りない見た目は **ネオン光** と **Bloom post-processing** でごまかす」という割り切りで、**ファイルとして同梱するのは TypeScript ソースだけ**にしました。

## Procedural BGM / SFX

### 音は全部 OscillatorNode

ロード待ちなし、ファイルサイズ 0、ライセンスフリー。代償は **作曲 / ミックスも自分のコードでやる** こと。`AudioContext.createOscillator()` を組み合わせて、シーン別に 4 種類の BGM を生成しました。

```ts
// 共通の小道具：単音をスケジュールする
private castSaw(now: number, fStart: number, fEnd: number, peak: number, dur: number) {
  const ctx = this.ctx!;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(fStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), now + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + 0.02);  // attack
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur); // release

  osc.connect(g).connect(this.sfxBus!);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
```

ポイントは

- **`exponentialRampToValueAtTime` で AD エンベロープ** ── 立ち上がりと減衰を 1 行ずつ
- **`sfxBus` / `musicBus` の 2 系統 GainNode** ── 設定パネルで BGM / SFX を独立スライダーに
- **scheduling は `audioContext.currentTime` ベース** ── `setTimeout` ではなくサンプル精度

### シーン別 BGM

`setBgm(scene)` で 4 種類を切り替えます。

```ts
type BgmScene = 'lobby' | 'dungeon' | 'boss' | 'bestiary';

setBgm(scene: BgmScene): void {
  this.stopBgm();
  switch (scene) {
    case 'lobby':    this.startLobbyBgm();    break;  // pad + arp / chillwave
    case 'dungeon':  this.startDungeonBgm();  break;  // 16-beat techno
    case 'boss':     this.startBossBgm();     break;  // 2.5s jingle → battle loop
    case 'bestiary': this.startBestiaryBgm(); break;  // sustained ambient
  }
}
```

たとえば **Dungeon の 16-beat テクノ** は

- **キック**: 4 つ打ち (`sine` 50→30 Hz の急な exp ramp)
- **ハイハット**: 16 分連打 (`AudioBuffer` のホワイトノイズを high-pass)
- **ベース**: 8 分の 1-3-4-5 度ループ (`triangle`)
- **リード**: 偶数小節だけ `square` で 2 種ローテ

の 4 トラックを `setInterval(stepCallback, stepMs)` でステップ化して動かしています。各トラックの音色は **OscillatorNode + 既存ヘルパー** だけなので、追加 KB ゼロ。

### Boss BGM は 2 段構成

ボス階に入った瞬間に「**派手なジングル**」を鳴らしたかったので、Boss だけ 2 段階にしました。

```ts
private startBossBgm() {
  const ctx = this.ctx!;
  const t0 = ctx.currentTime;
  // Phase 1: 2.5s 上昇 arpeggio + クラッシュ
  this.scheduleBossJingle(t0);
  // Phase 2: setTimeout で battle loop に自動遷移
  this.persistentTimers.push(
    setTimeout(() => this.startBossBattleLoop(), 2500),
  );
}
```

戦闘曲は Dungeon BGM より速い (BPM 150)。`stopBgm()` 経由で `clearTimeout` も走るので、ジングル中にプレイヤーが帰還してもハングしません。

### SFX も全部 procedural

`playPickup` / `playLevelUp` / `playPortal` / `playSkillCast(effect)` / `playShield` / `playFootstep` / `playAttackSwing` / `playHit` / `playDefeat` ──。
すべて `castSaw` / `castCluster` / `castNoiseSweep` の組み合わせで作っています。たとえばポータル通過音はこんな感じ:

```ts
playPortal() {
  const t = this.ctx!.currentTime;
  this.castCluster(t,       [220, 440, 660, 880], 0.18, 0.30); // 立ち上がりの和音
  this.castSaw    (t + 0.1, 1200, 60,             0.16, 0.45); // フィルター下降
  this.castNoiseSweep(t,    8000, 200,            0.10, 0.40, 'highpass');
}
```

短い「**シュワン**」が 0.4 秒だけ鳴る、それだけ。ファイルサイズ 0、ライセンス気にしない、後からチューニング自由 — リスクの少ない選択でした。

## モデルは Three.js BoxGeometry のみで合成

GLTF は使いません。**プレイヤー / 敵 7 種 / ボス 3 種 / アイテム / ポータル** すべて `BoxGeometry` / `CylinderGeometry` / `ConeGeometry` / `SphereGeometry` の組み立てです。

### プレイヤー (3 頭身チビ)

頭・胴・四肢・武器を Box で組み、`group.rotation.y` でカメラに対して向きを管理。

```ts
// Player.ts (一部抜粋)
const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.85, 0.8, 0.7),
  this.headSkinMat,
);
head.position.y = 1.45;
this.group.add(head);

// 顔は -Z 面 (キャラ前方) に Canvas テクスチャ
const face = new THREE.Mesh(
  new THREE.PlaneGeometry(0.7, 0.6),
  this.headFaceMat, // map: this.makeFaceTexture()
);
face.position.set(0, 1.5, -0.36);
this.group.add(face);
```

`makeFaceTexture()` は **Canvas に大きい目とピンクの頬を描いて `THREE.CanvasTexture` に渡すだけ**:

```ts
private makeFaceTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#e8b994'; ctx.fillRect(0, 0, 128, 128);  // 肌色
  ctx.fillStyle = '#ffffff'; ctx.fillRect(28, 50, 22, 24);  // 左目白目
  ctx.fillRect(78, 50, 22, 24);                              // 右目白目
  ctx.fillStyle = '#0c1e3e'; ctx.fillRect(34, 56, 12, 16);   // 左目玉
  ctx.fillRect(84, 56, 12, 16);                              // 右目玉
  ctx.fillStyle = '#ff8caa'; ctx.fillRect(20, 84, 16, 8);    // 左頬
  ctx.fillRect(92, 84, 16, 8);                               // 右頬
  return new THREE.CanvasTexture(c);
}
```

これで pixel art 風のチビ顔が **PNG 0 KB** で出来上がり。**ピクセル数 = 描き込みのコスト** なので、`128 × 128` でも十分可愛く仕上がります。

### 敵 7 種・ボス 3 種

EnemyBase 抽象クラスから派生させて、**派生クラス 1 個 = 1 ファイル** で voxel を組み立てます。

| 敵 | 主な構成 |
|---|---|
| Glitch Bit | 0.5 立方体コア + 12 本のネオンエッジ + 単眼 |
| Data Drone | 頭部 + 肩胴体 + 胸部データコア + 腕 × 2 + 脚 × 2 |
| Neon Sniper | チビ比率 + ライフルジオメトリ + aim line |
| Rift Charger | 4 脚 + 角 × 2 + グリッチ装飾 ×8 |
| Void Sentinel (ボス) | 兜 + 両手剣 + 胸部コア + 紫亀裂装飾 |
| Neon Phantom (ボス) | フード + 単眼 + 残像 ×3 + scanline |
| Core Corruptor (ボス) | 六角ベース + コアタワー + 砲身 ×6 + 衛星 ×4 |

それぞれ 100〜200 行の構築コードで全身が出来ます。**MeshLambertMaterial + emissive で発光させて**、ネオンっぽさは **Bloom post-processing** が担当します。

```ts
// EnemyBase の発光ヘルパー
export function neonMat(color: number, intensity = 0.9) {
  return new THREE.MeshLambertMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
  });
}
```

## 結果: gzip 192 KB

最終的な build 内訳:

```
dist/index.html              32 KB
dist/assets/index-xxx.css    20 KB / gzip   4 KB
dist/assets/index-xxx.js    748 KB / gzip 192 KB
─────────────────────────────────────────────
合計                        ≈ 800 KB / gzip 220 KB
```

JS の **9 割が Three.js** です。`tree-shaking` 効かせても WebGL コアはなかなか減らないのですが、**ゲームコード自体は 30 KB ぐらい** で 100 階分の戦闘 + 装備 + i18n まで賄っています。

ロード時間も体感即時。Cloudflare Pages が gzip / brotli を自動でやってくれるので、**初回 1 秒、CDN ヒットなら 0.3 秒** くらいで起動します。

## Claude Code 並列 agent で 100+ PR を捌く

書き始めから締切まで約 12 日、その間に **PR を 100 本以上マージ** しました。

### dev-workflow

[issue 駆動開発の delivery プロセス](https://aieo-product.github.io/issueDrivenDevelopment/) を踏襲し、各 Issue ごとに

1. **Step 1+2**: 現状調査と対応方針を Issue にコメント
2. **Step 3**: 実装と PR 作成
3. **Step 3.5**: agent-browser で動作確認 + evidence ブランチへスクショ
4. **Step 4**: セルフレビューを PR にコメント
5. **Step 5**: 人間レビュー (時間が無い時はスキップ)
6. **Step 6**: post-merge テスト

を必ず通すフロー。

### 並列 agent

特に終盤は、Claude Code の **`worktree isolation`** で 4 並列の subagent を立てて、

- Audio agent → AudioSystem 改修
- Score agent → ScoreSystem 新設
- UI agent → タイトル/リザルト/設定/HUD バンドル
- Portal+Submit agent → ポータル演出 + Vibeverse 戻り + README + OGP

を **同時に PR 化**。worktree を分けてあるので互いのファイル衝突は最小、どうしても被る `Game.ts` だけ supervisor (= 私) が手で rebase 解決。

```
[supervisor]
  ├─ spawn agent A (worktree A) → PR #117
  ├─ spawn agent B (worktree B) → PR #116
  ├─ spawn agent C (worktree C) → PR #119
  └─ spawn agent D (worktree D) → PR #118
       完了通知 → 順次マージ → conflict 手動解決
```

`Game.ts` は 4 PR 全部が触る hot path だったので、agent への指示で「**Game.ts は init 配列追加と HUD 1 行のみ、それ以外触らない**」のように排他を細かく指定したのが効きました。

## 学び

1. **「アセットを諦める」のは思ったより自由を生む** ── 著作権 / ロード待ち / バージョン管理から解放される。
2. **OscillatorNode の作曲は思ったより楽しい** ── BPM やコード進行を `setInterval` の callback で書くと、Excel のシーケンサ感覚で音が出る。
3. **voxel は Bloom がほとんど仕事してくれる** ── 立方体だけでも emissive と post-processing で「映える」。
4. **Claude Code の並列 agent は worktree isolation が前提** ── ファイル衝突は事前に agent への指示で抑える。
5. **i18n は手薄になりがち** ── 締切前にやろうとすると死ぬので、最初から `data-i18n` を貼る癖をつける。

## 遊んでみる

- 🎮 ライブ: **https://rift-survivors.pages.dev/**
  - PC: WASD 移動 / Space 攻撃 / V ガード+パリィ / Shift 回避 / Q,E,R,T スキル / I 装備画面 / B ストレージ
  - Mobile: 左半画面ドラッグ移動 + メガドライブ風 6 ボタン
- 🐙 ソース: https://github.com/aieo-product/vibejamGame

「procedural なんちゃら」は最初の数行を書くまでが一番面倒で、書き始めると `BoxGeometry` も `OscillatorNode` も癖になります。Vibe Jam の 1 MB 制約は個人的にはむしろ**創造性の制約**として楽しめました。次のジャムでも同じスタックでやると思います。
