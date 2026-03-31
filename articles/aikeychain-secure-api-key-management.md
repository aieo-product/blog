---
title: "env に API キーを晒さずに AI 開発する方法 — macOS Keychain + ローカルプロキシという選択肢"
emoji: "🔐"
type: "tech"
topics: ["macOS", "セキュリティ", "AI", "Swift", "APIキー"]
published: true
---

:::message
この記事は AIと共同で執筆しました。
:::

## はじめに — あなたの `env` は大丈夫？

AI 開発をしていると、こんな `.zshrc` になっていないでしょうか。

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
export OPENAI_API_KEY=sk-proj-xxxxx...
export GITHUB_TOKEN=ghp_xxxxx...
```

`env` コマンドを叩けば全キーが平文で丸見え。しかも **Claude Code や Cursor などの AI ツール自身がこの env を読み取れる** 状態です。

2026年に入ってから、API キー漏洩に関する深刻なインシデントが相次いでいます。

- **CVE-2026-21852**: Claude Code のプロジェクトファイル経由で API キーが窃取される脆弱性が発見された
- **2026年2月**: Google Cloud API キー盗難により **$82,000** の請求が発生した事例が報告された
- GitHub 上で **5,000以上のリポジトリ** から API キーが漏洩していることが確認された

「自分は大丈夫」と思っていませんか？ 筆者もそう思っていました。

## 🔥 きっかけ — X で見かけた「env 流出」の悲鳴

きっかけは、X (旧 Twitter) で [env に API キーが漏れた話](https://x.com/hassii_ad/status/2029481458218483742) が流れてきたことでした。

env に API キーを平文で置いている開発者が、意図せずキーを流出させてしまったという投稿です。リプライ欄にも「自分も同じ状態」「怖くなった」という声が並んでいました。

これを見て自分の環境を確認したところ、`.zshrc` に 10 個以上の API キーが平文で export されていることに気づきました。`env` を叩けば全部丸見え — まさに同じリスクを抱えていたのです。

「これは根本的に管理方法を見直さないとまずい」と決意したのが、AI KeyChain 開発のスタートです。

## 📋 課題の整理

### 課題 1: env にキーが露出する

```bash
$ env | grep API_KEY
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...  # 丸見え
```

AI ツールはプロセスの環境変数を読み取れます。つまり **Claude Code が自分自身の API キーを読める** 状態。Linux 環境では `/proc/[pid]/environ` から同一ユーザーの他プロセスの環境変数も取得可能です。

### 課題 2: SSH 経由で Keychain 承認ができない

Tailscale SSH などで Mac にリモート接続すると、`security find-generic-password` が GUI の承認ダイアログを出そうとして失敗します。SSH セッションではダイアログを表示する手段がありません。

### 課題 3: `.zshrc` への自動書き込みが危険

自動化ツールが `.zshrc` に設定を直接書き込む方式は、ツールが停止した時に全セッションが壊れるリスクがあります。

## 🛠 解決策 — AI KeyChain

これらの課題を解決するため、macOS ネイティブのキー管理アプリ **AI KeyChain** を開発しました。

![AI KeyChain メイン画面](/images/main-screen.png)
*メイン画面。AI API / AI Web / Code & Git など 6 つのプリセットカテゴリに加え、自由にカテゴリを追加可能。初期プリセットとして 17 個のサービスを用意していますが、どんな API キーやトークンでも追加して管理できます。*

## 🏗 アーキテクチャ — 2つのモード

AI KeyChain は **Standard** と **Proxy** の 2 つのモードを提供しています。初回セットアップ時にどちらかを選択できます。

![モード選択 — Proxy モード](/images/mode-proxy.png)
*Key Management Mode の選択画面。Proxy モードを選択すると、env に API キーが露出しなくなります。*

![モード選択 — Standard モード](/images/mode-standard.png)
*Standard モードは従来の Keychain 参照方式。シンプルですが env にキーが見えます。通知ボタンでいつでもモードを切り替えられます。*

### Standard モード（安定・シンプル）

```
Terminal → export API_KEY=$(security ...) → API Server
```

従来の Keychain 参照方式です。シンプルですが **env にキーが露出します**。

### Proxy モード（高セキュリティ）

```
Terminal (env にキーなし)
  → HTTP リクエスト (認証ヘッダなし)
  → AI KeyChain Proxy (localhost:18121)
  → Keychain から API キーを読み取り
  → Authorization ヘッダを注入
  → API Server (api.anthropic.com 等)
```

Proxy モードの特徴:

- **env に API キーが一切露出しない**
- SSH 経由でも Keychain 承認ダイアログが不要
- プロキシは localhost のみで動作（外部からアクセス不可）

### モード比較

| | Standard | Proxy |
|---|---|---|
| キーの保管 | macOS Keychain | macOS Keychain |
| キーの取り出し | `.zshrc` で export | プロキシがヘッダに注入 |
| **env にキーが見える？** | **見える** | **見えない** |
| アプリ常時起動が必要？ | いいえ | はい |

## 🚀 初回セットアップ

AI KeyChain は 5 ステップのオンボーディングウィザードを搭載しています。

![Welcome 画面](/images/onboarding-welcome.png)
*Welcome 画面。AI KeyChain の 3 つの特徴が表示されます: Keychain で安全に保管、環境変数に露出しない、ローカルプロキシで自動注入。*

![Choose Your Mode](/images/onboarding-mode.png)
*モード選択。Standard と Proxy の違いが図解されます。下部にはターミナルから AI KeyChain Proxy を経由する流れが視覚的に表示されます。*

![Register Your Keys](/images/onboarding-register.png)
*キー登録ステップ。AI API (4件)、AI Web (5件)、Code & Git (2件) など、カテゴリごとに管理対象のキー数が表示されます。*

![Shell Setup](/images/onboarding-shell.png)
*シェル設定ステップ。`.zshrc` に追加する 1 行が表示されます。`[ -f ~/.aikeychain_proxy ] && source ~/.aikeychain_proxy` — これだけでプロキシ連携が有効になります。*

![Setup Complete!](/images/onboarding-complete.png)
*セットアップ完了。**「Enable Secure Proxy」ボタンを押すだけで** プロキシが起動し、すぐに利用開始できます。接続不能時は Recovery Guide で復旧できる旨も案内されます。*

## ✨ 主要機能

### キー管理

![Edit Key ダイアログ](/images/edit-key.png)
*キーの編集画面。サービス名、カテゴリ、環境変数名を設定し、Token Value は Keychain に暗号化保存されます。「Get Token」でブラウザからトークンを取得することも可能です。*

### 4ステップ env インポート

既存の env 変数を安全に Keychain に移行するウィザードを搭載しています。

![Step 1: Get env](/images/env-import-getenv.png)
*Step 1: Get env。ターミナルで `env | grep -E 'API_KEY|TOKEN|SECRET|ACCOUNT_ID|AUTH_KEY'` を実行し、結果をコピーして貼り付けます。*

![Step 2: Scan](/images/env-import-scan.png)
*Step 2: Scan。貼り付けた内容を自動パースし、API キーとして認識されたものをリスクレベル別にレコメンド。既に Keychain に登録済みのキーは「Exists」と表示されます。*

![Step 3: Preview](/images/env-import-preview.png)
*Step 3: Preview。Keychain への保存内容を確認。「.zshrc から該当する export 行を削除する」にチェックを入れると、インポート後に `.zshrc` から自動的に平文の export 行が削除されます。*

![Step 4: Result](/images/env-import-result.png)
*Step 4: Result。インポート完了。Keychain への保存件数、`.zshrc` から削除された export 行数、スキップされた件数が表示されます。`.zshrc` のバックアップも自動作成されます。*

### プロキシのライフサイクル管理

プロキシが停止しているのに `ANTHROPIC_BASE_URL` が `.zshrc` に残ると、全ターミナルで API 接続が失敗します。この問題を「ファイルベースのライフサイクル管理」で構造的に解決しました。

```
プロキシ起動 → ~/.aikeychain_proxy を生成
プロキシ停止 → ~/.aikeychain_proxy を削除
PC 強制終了 → シェル起動時にポート応答チェック → ファイル自動削除
```

`.zshrc` には以下の 1 行だけ:

```bash
if [ -f ~/.aikeychain_proxy ]; then
  # ポートが応答するか確認してから source
  # 応答なし → ファイル自動削除
fi
```

これにより `.zshrc` への直接書き込みに依存しない安全な設計を実現しています。

### 暗号化キー転送（デバイス間移行）

デバイス間でキーを安全に移行する Transfer Keys 機能を搭載しています。

![Transfer Keys — My Keys タブ](/images/transfer-my-keys.png)
*My Keys タブ。鍵ペアを生成するところから始まります。「How it works」で 3 ステップの流れが図解されています。*

![Transfer Keys — Send タブ](/images/transfer-send.png)
*Send タブ。移行先デバイスの公開鍵ファイル（`.aikeychain-pub`）を読み込み、キーを暗号化して送信します。*

![Transfer Keys — Receive タブ](/images/transfer-receive.png)
*Receive タブ。暗号化された `.aikeychain` ファイルを自分の秘密鍵で復号し、Keychain に登録します。*

**暗号方式**: P-256 + ECDH + AES-256-GCM を採用。秘密鍵は Keychain 内に保存され、エクスポートできません。

:::message
当初「Share Keys」という名称でしたが、各社の API 利用規約を調査したところ、個人 API キーの第三者共有は規約違反の可能性があることが判明。「Transfer Keys」に名称変更し、デバイス間移行用途に再定義しました。
:::

### 社内チーム向けキーシェア

個人の API キーを第三者に共有することは利用規約上の問題がありますが、**チームや組織で共有して使うキー**（社内共有の API キーやサービスアカウントのトークン等）については、安全に共有する需要があります。

AI KeyChain では、公開鍵暗号方式（P-256 ECDH + AES-256-GCM）を使って、チームメンバー間でキーを暗号化して受け渡しできます。

**シェアの流れ:**

1. 受け取り側が AI KeyChain で鍵ペアを生成し、**公開鍵** (`.aikeychain-pub`) を共有する
2. 送り側が公開鍵を使ってキーを暗号化し、暗号文 (`.aikeychain`) を渡す
3. 受け取り側が秘密鍵で復号し、自分の Keychain に登録する

![キーシェアフロー](/images/key-share-flow.png)
*公開鍵暗号方式によるキーシェアのフロー。平文のキーがネットワーク上を流れることはありません。*

平文のキーがネットワーク上を流れることは一切なく、秘密鍵は Keychain 内に保存されるためエクスポートもできません。Slack や社内チャットで暗号文ファイルを送っても安全です。

### カスタムカテゴリ — どんなキーでも管理可能

AI KeyChain は AI API キー専用ではありません。**あらゆる API キー・トークン・シークレットを自由に登録できます。** プリセットの 6 カテゴリ（AI API / AI Web / Code & Git / Cloud & Infra / Communication / Developer Tools）は独断で用意した初期値にすぎず、カテゴリの追加・編集・削除も自由です。

![カスタムカテゴリ](/images/custom-category.png)
*カスタムカテゴリの追加例。「VideoTools」カテゴリを追加した状態。社内ツールや SaaS のキーなど、用途に合わせて自由に分類できます。*

### ヘルプ・トラブルシューティング

![ヘルプ画面](/images/help-troubleshooting.png)
*アプリ内ヘルプ。自動起動設定、エクスポート、トラブルシューティング（ECONNREFUSED エラー対処、プロキシ確認方法）、キーボードショートカットなどが網羅されています。*

### Recovery Guide

![Recovery Guide](/images/recovery-guide.png)
*プロキシモードでトラブルが発生した場合の復旧ガイド。4 段階の復旧手順が用意されています: アプリ再起動 → Standard モード切替 → 設定ファイル手動削除 → `.zshrc` フック完全除去。*

## 🔧 技術スタック

| 項目 | 技術 |
|------|------|
| 言語 | Swift 5.9+ |
| UI | SwiftUI (macOS 14 Sonoma+) |
| 状態管理 | Observation framework (`@Observable`) |
| セキュリティ | Security.framework (Keychain Services) |
| プロキシ | Network.framework (`NWListener`) |
| 暗号化 | CryptoKit (P-256, AES-256-GCM, HKDF) |
| ビルド | Swift Package Manager |
| 配布 | Notarized DMG |

## 🆚 類似ツールとの比較

2026年に入り、同じ課題感を持つツールがいくつか登場しています。

| 機能 | AI KeyChain | 1Password CLI | LLM Key Ring | ServeMyAPI |
|------|------------|---------------|--------------|------------|
| env にキーが見えない | **Proxy モード** | いいえ | いいえ | いいえ |
| macOS ネイティブ GUI | **はい** | アプリ別 | CLI のみ | CLI のみ |
| AI サービス特化 | **はい** | 汎用 | LLM 特化 | 汎用 |
| クラウド不要 | **はい** | いいえ | はい | はい |
| 暗号化デバイス間転送 | **はい** | クラウド同期 | いいえ | いいえ |
| チーム向けキーシェア | **はい** | クラウド経由 | いいえ | いいえ |
| ライフサイクル管理 | **はい** | — | いいえ | いいえ |

**「macOS Keychain + ローカルプロキシで env にキーを露出させない」の組み合わせは、現時点で他のツールにはない特徴です。**

[LLM Key Ring](https://zenn.dev/yottayoshida/articles/llm-key-ring-secure-api-key-management) は Keychain をバックエンドにした CLI ツールで、子プロセスにのみ環境変数を注入する設計です。設計思想は近いですが、GUI やプロキシモードは提供していません。

## 📦 インストール方法

[GitHub Releases](https://github.com/aieo-product/AIkeychain/releases) から最新の DMG をダウンロードしてインストールできます。

**手順:**

1. Releases ページから `AIKeyChain-v1.5.1.dmg` をダウンロード
2. DMG をダブルクリックしてマウント
3. `AI KeyChain.app` を `/Applications` にドラッグ&ドロップ
4. **初回起動前に**、ターミナルで以下のコマンドを実行

```bash
sudo xattr -rd com.apple.quarantine /Applications/AI\ KeyChain.app
```

5. `AI KeyChain.app` を起動 → オンボーディングウィザードが開始

:::message alert
現在 Apple Developer Program 未登録のため、手順 4 を省略すると macOS Gatekeeper の警告が表示されます。上記コマンドで隔離属性を解除すれば、警告なしで起動できます。
:::

## 🗺 今後の予定

- Apple Developer Program 登録 → Notarization → Gatekeeper 警告なし配布
- プロキシリクエストログ・モニタリング機能
- Mac App Store での配布

## まとめ

- `env` に API キーが丸見えの状態は、AI ツールが自身のキーを読めるリスクがある
- 2026年は API キー漏洩による重大インシデントが続いており、対策は急務
- macOS Keychain + ローカルプロキシで、**キーを env に露出させずに** AI 開発できる
- 公開鍵暗号方式で、社内チーム間のキーシェアも安全に行える
- この組み合わせを実現する既存ツールは見つからなかったため、自分で作った
- プロキシ停止時の設定残留を防ぐファイルベースのライフサイクル管理を搭載

**GitHub**: https://github.com/aieo-product/AIkeychain

---

:::message
この記事で紹介した AI KeyChain はオープンソースで公開しています。macOS で AI 開発をされている方は、ぜひ試してみてください。Issue やプルリクエストも歓迎です。
:::
