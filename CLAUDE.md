# Blog リポジトリ運用ガイド

Zenn / Qiita 同時公開のテックブログ管理リポジトリ。

## リポジトリ構成

```
articles/          ... Zenn 記事（GitHub 連携で自動デプロイ）
public/            ... Qiita 記事（qiita-cli で手動公開）
images/            ... 記事用の生成画像（Puppeteer で HTML→PNG）
baseidea/          ... 記事のネタ・プロンプト・スクリーンショット素材
screenshot-*.mjs   ... 図表生成スクリプト（Puppeteer）
mosaic-*.mjs       ... モザイク/ブラー処理スクリプト（Puppeteer）
```

## 記事作成ワークフロー

### 1. ネタの準備

`baseidea/` に記事のネタ（プロンプト、参考リンク、スクリーンショット素材）を配置する。

### 2. 記事ファイルの作成

Zenn 用と Qiita 用の **2ファイル** を同時に作成する。slug は同じにする。

#### Zenn（`articles/<slug>.md`）

```yaml
---
title: "記事タイトル"
emoji: "🤖"
type: "tech"
topics: ["タグ1", "タグ2", "タグ3"]
published: true
---
```

- `topics` は最大5個
- `published: true` で公開

#### Qiita（`public/<slug>.md`）

```yaml
---
title: 記事タイトル
tags:
  - タグ1
  - タグ2
  - タグ3
private: false
updated_at: ''
id: null
organization_url_name: null
slide: false
ignorePublish: false
---
```

- **タグ形式に注意：** `- タグ名` のフラット形式を使う。`- name: タグ名` は NG（Bad Request になる）
- `id` と `updated_at` は初回公開後に qiita-cli が自動更新する

### 3. 画像の作成

#### 図表（Puppeteer で HTML→PNG）

`screenshot-<記事名>.mjs` を作成し、HTML テンプレートから図を生成する。

```bash
node screenshot-<記事名>.mjs
```

- 出力先: `images/<記事名>/`
- Viewport: `width: 1000, height: 800, deviceScaleFactor: 2`
- 共通ダークテーマスタイルを使用

#### モザイク処理（個人情報のブラー）

スクリーンショットに個人情報が含まれる場合は `mosaic-<名前>.mjs` でブラー処理する。

```bash
node mosaic-<名前>.mjs
```

- 元画像を base64 で読み込み、HTML に埋め込む方式（`file://` はPuppeteerで読み込めない場合がある）
- `backdrop-filter: blur(18px)` + `background: rgba(80,80,80,0.6)` でオーバーレイ
- 座標調整は画像を確認しながら繰り返す

### 4. 画像パスの違い

| プラットフォーム | 画像パス形式 |
|------------------|-------------|
| Zenn | `/images/<記事名>/file.png`（相対パス） |
| Qiita | `https://raw.githubusercontent.com/aieo-product/blog/main/images/<記事名>/file.png`（絶対URL） |

**Qiita はリポジトリ内の相対パスを解決できない。** 必ず GitHub raw URL を使うこと。

外部画像（X/Twitter の `pbs.twimg.com` 等）は両プラットフォームで同じ URL をそのまま使える。

### 5. ローカルプレビュー

```bash
npx zenn preview
# → http://localhost:8000 で確認
```

### 6. 公開

#### Zenn

```bash
git add articles/<slug>.md images/<記事名>/
git commit -m "feat: 記事タイトル"
git push origin main
# → Zenn が GitHub 連携で自動デプロイ
```

#### Qiita

```bash
npx qiita publish <slug>
```

- 初回公開後、`public/<slug>.md` のフロントマターに `id` と `updated_at` が自動追加される
- 更新後は `git add public/<slug>.md` でコミットしておく

### 7. 公開後の確認

- Zenn: https://zenn.dev/dashboard/deploys でデプロイ状態を確認
- Qiita: 公開 URL で画像が正しく表示されるか確認

## よくあるトラブル

### Qiita で「Bad Request」エラー

タグ形式を確認。`- name: タグ名` ではなく `- タグ名` を使う。

### Qiita で画像が表示されない

相対パスを使っていないか確認。`/images/...` → `https://raw.githubusercontent.com/aieo-product/blog/main/images/...` に変換する。

### Zenn にデプロイされない

1. https://zenn.dev/dashboard/deploys でエラー確認
2. https://zenn.dev/dashboard/connects で `aieo-product/blog` が連携されているか確認
3. Organization リポジトリの場合、Zenn の GitHub App がインストールされているか確認

### Puppeteer でスクリーンショットが真っ白

`file://` パスの画像が読み込めていない可能性。base64 で読み込んで data URI として埋め込む方式に変更する。

## コマンドまとめ

```bash
# 図表生成
node screenshot-<記事名>.mjs

# モザイク処理
node mosaic-<名前>.mjs

# Zenn プレビュー
npx zenn preview

# Qiita プレビュー
npx qiita preview

# Qiita 公開
npx qiita publish <slug>

# Qiita 全記事公開
npx qiita publish
```
