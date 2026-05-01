# AI KeyChain v1.6.0 — Secret Reference モード ブログ baseidea

## トリガー
- AI KeyChain v1.6.0 を 2026-04-21 にリリース
- 設計書 PR (#88) と CHANGELOG PR (#89) をマージ済み
- Qiita / Zenn で技術ブログ化したい

## コア概念
**「macOS Keychain で 1Password の `op://` 相当 (Secret Reference) を実装した話」**

- AI 開発で増殖する API キーを `.env` に平文で持つ問題
- 既存の Keychain 直接参照 (`security find-generic-password`) は親 env にキー値が露出する
- 1Password CLI には `op://` 参照を `op run` が解決する仕組みがある
- **AI KeyChain は同じ思想を macOS Keychain でやる** — `keychain://KEY_NAME` を `akc run` が子プロセスにのみ注入

## ターゲット読者
- AI / LLM API を毎日叩いている macOS 開発者
- 1Password CLI の `op://` ワークフローを知っている / 興味がある人
- `.env` に平文を書くことに不安がある人
- macOS Keychain 連携の Swift / Bash 実装に興味がある人

## 記事の種類
**技術解説 + ハウツー** (体験記でも比較分析でもなく、設計と使い方を伝える)

## 含めるべきトピック
1. なぜ `.env` ではダメか (環境変数経由の漏洩経路)
2. 既存の Keychain 直接参照と何が違うか
3. `keychain://` 参照を `akc` が解決する仕組み (Bash + `security` コマンド)
4. **3 モードの選び分け**: Standard / Secret Reference / Proxy
5. 1Password の `op://` との比較
6. 実際の使い方 (オンボーディングから `akc run -- claude` まで)
7. セキュリティ的な防御層 (親 env vs 子 env vs アプリメモリ)

## 除外する情報
- 個人名 / 社内固有事情
- API キーの実値 / セッショントークン
- まだ完成していない機能

## 差別化ポイント
- **macOS ネイティブ**: 1Password / Doppler / Infisical はクラウドサービスや CLI 単体だが、AI KeyChain はメニューバー常駐の Swift アプリ
- **OSS** (MIT)
- **3 モードの設計上の選択**: 「シンプル / バランス / 最大セキュリティ」を 1 つのアプリで選べる
- AI 開発に特化したサービスプリセット (Anthropic / OpenAI / xAI / GitHub / Cloudflare 等 17 種)

## 想定キーワード (タグ候補)
- macOS, Swift, SwiftUI
- Keychain, セキュリティ
- AI, LLM, ClaudeCode
- DevTools, OSS, シェル
- 1Password (差別化軸として)

## 想定タイトル候補
1. macOS Keychain で 1Password の `op://` 相当を実装した話 — AI 開発の API キー管理を環境変数から解放する
2. AI 開発者向け macOS Keychain 管理アプリ AI KeyChain v1.6.0 ── Secret Reference モードで env からキーを消す
3. `.env` をやめる ── macOS Keychain ベースの 3 モード API キー管理 (AI KeyChain v1.6.0)

## 参考情報
- リポジトリ: https://github.com/aieo-product/AIkeychain
- リリース: https://github.com/aieo-product/AIkeychain/releases/tag/v1.6.0
- CHANGELOG: https://github.com/aieo-product/AIkeychain/blob/main/CHANGELOG.md
- 設計書: https://aieo-product.github.io/AIkeychain/design/

## 画像素材アイデア
- 3 モード比較図 (env への露出比較)
- スクリーンショット: メイン画面 / オンボーディングのモード選択 / Activity ログ
- アーキ図: `keychain://` → `akc run` → 子プロセス
