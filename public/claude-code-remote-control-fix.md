---
title: Claude Code の remote-control が動かない？3つのエラーパターンと完全復旧手順
tags:
  - CLI
  - macOS
  - トラブルシューティング
  - Anthropic
  - ClaudeCode
private: false
updated_at: '2026-03-24T00:29:00+09:00'
id: bfb6fba1d31cb08c8b8d
organization_url_name: null
slide: false
ignorePublish: false
---

:::note info
この記事は AIと共同で執筆しました。
:::

## はじめに

Claude Code の **remote-control** は、ブラウザやモバイルから Claude Code セッションを操作できる機能です。外出先からスマホでセッションを確認したり、別端末から指示を出したりと、非常に便利な機能です。

しかし、Max プランに加入しているにも関わらず **「Remote Control is not yet enabled for your account.」** と表示されて使えないケースが多発しています。

私自身もこの問題にハマり、3つの異なるエラーに遭遇しながら解決にたどり着きました。同じ問題で困っている方のために、原因と解決策をまとめます。

## 環境

| 項目 | 値 |
|------|-----|
| Claude Code バージョン | 2.1.81 |
| OS | macOS (Darwin 24.3.0) |
| プラン | Max |
| インストール方法 | Homebrew (`brew install --cask claude-code`) |
| ターミナルマルチプレクサ | cmux |

## 遭遇した3つのエラー

### エラー1: `Unknown argument: <UUID>`

```bash
$ claude remote-control
Error: Unknown argument: bd96b1c1-3b61-4776-979e-dfe768c7595b
Run 'claude remote-control --help' for usage.
```

謎のUUIDが引数として渡されてエラーになるパターン。

### エラー2: セッション内の `/rc` が動かない

```
> /remote-control
Unknown skill: remote-control
```

既存セッション内でスラッシュコマンドを打つとスキルとして解釈されてしまうパターン。

### エラー3: `Remote Control is not yet enabled for your account.`

```bash
$ claude remote-control
Error: Remote Control is not yet enabled for your account.
```

Max プランなのにアカウントで有効化されていないと言われるパターン。**これが最も多くの人がハマるエラーです。**

---

## 原因1: cmux ラッパーの干渉（エラー1の解決）

### なぜ起きるのか

**cmux** を使っている場合、`claude` コマンドはラッパースクリプト経由で実行されます。

```bash
$ which claude
/Applications/cmux.app/Contents/Resources/bin/claude  # ← 本体ではなくラッパー
```

このラッパーはセッション管理のために `--session-id <UUID>` を自動注入します。しかし、`remote-control` サブコマンドはこの引数を想定していないため、UUIDが不正な引数として扱われてエラーになります。

### 解決策

cmux のラッパースクリプトを編集し、`remote-control` をパススルー対象に追加します。

**ファイル:** `/Applications/cmux.app/Contents/Resources/bin/claude`

**変更前：**

```bash
case "${1:-}" in
    mcp|config|api-key) exec "$REAL_CLAUDE" "$@" ;;
esac
```

**変更後：**

```bash
case "${1:-}" in
    mcp|config|api-key|auth|remote-control) exec "$REAL_CLAUDE" "$@" ;;
esac
```

`auth` も追加しておくと、`claude auth login/logout` もラッパーを経由せず直接実行されるようになります。

> **注意:** cmux がアップデートされるとこの変更が上書きされる可能性があります。アップデート後は再確認してください。

### 代替策

ラッパーを編集したくない場合は、直接バイナリを呼び出せます：

```bash
/opt/homebrew/bin/claude remote-control
```

---

## 原因2: テレメトリ無効化がフィーチャーフラグを破壊（エラー3の解決）

**これが最も重要な原因です。多くのユーザーがこれに該当します。**

### なぜ起きるのか

Claude Code は **GrowthBook** を使ってフィーチャーフラグ（機能の有効/無効）を管理しています。remote-control が使えるかどうかも、このフィーチャーフラグで制御されています。

問題は、以下の環境変数が設定されていると **GrowthBook のフィーチャーフラグ評価が完全に無効化** されることです。

| 環境変数 | 影響 |
|----------|------|
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` | フィーチャーフラグの取得・評価を無効化 |
| `DISABLE_TELEMETRY=1` | 同上 |

フラグ評価が無効化されると、remote-control を含む **すべてのゲート付き機能** がデフォルト値（`false` = 無効）として扱われます。Max プランで権限があっても、フラグが評価されないので「有効化されていない」と判定されるわけです。

### 確認方法

```bash
# 現在のシェル環境を確認
env | grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL"

# .zshrc を確認
grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL" ~/.zshrc

# settings.json を確認
grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL" ~/.claude/settings.json
```

### 解決策

`.zshrc`（または `.bashrc`、`.zprofile`）から該当行を **削除** します。

```bash
# 以下の行を削除する
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
```

`~/.claude/settings.json` に `DISABLE_TELEMETRY` が含まれている場合も同様に削除してください。

変更後、**新しいターミナルを開く** ことが必要です。既存のターミナルには古い環境変数が残っています。

> **重要:** プライバシーを考慮してテレメトリを無効化したくなる気持ちはわかります。しかし現状の Claude Code では、テレメトリ無効化がフィーチャーフラグの評価まで巻き込んでしまう設計になっています。remote-control 等のゲート付き機能を使いたい場合は、テレメトリを有効にしておく必要があります。

---

## 原因3: 認証キャッシュの不整合

テレメトリ設定を修正しても解決しない場合、ログイン時に取得されたトークンのキャッシュが古い可能性があります。

### 解決策

ログアウト → 再ログインでキャッシュを更新します。

```bash
claude auth logout
claude auth login
```

ブラウザが開いて OAuth 認証フローが始まるので、ログインし直してください。

---

## セッション内の `/rc` について（エラー2）

セッション内で `/remote-control` や `/rc` を実行すると `Unknown skill` になる問題は、2026年2月末から報告されている **既知のバグ** です。

- [GitHub Issue #28322](https://github.com/anthropics/claude-code/issues/28322)
- [GitHub Issue #29265](https://github.com/anthropics/claude-code/issues/29265)

現時点でのワークアラウンドは、セッション内のスラッシュコマンドではなく **CLI サブコマンドとして** `claude remote-control` を使うことです。

---

## 完全な復旧手順まとめ

上記3つの原因を踏まえた、確実に復旧するための手順です。

### Step 1: テレメトリ無効化を解除

`~/.zshrc` から以下の行を削除：

```bash
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
```

### Step 2: 新しいターミナルを開く

環境変数の変更を反映するため、必ず新しいターミナルで作業してください。

### Step 3: Claude Code を最新版にアップデート

```bash
brew upgrade --cask claude-code
```

### Step 4: ログアウト → 再ログイン

```bash
claude auth logout
claude auth login
```

### Step 5: cmux ユーザーはラッパーを修正

```bash
# /Applications/cmux.app/Contents/Resources/bin/claude の
# case文に remote-control を追加（原因1を参照）
```

### Step 6: remote-control を起動

```bash
claude remote-control
```

---

## `remoteControlAtStartup` 設定

毎回 `claude remote-control` を実行する代わりに、`~/.claude/settings.json` に以下を追加すると、セッション開始時に自動で有効になります。

```json
{
  "remoteControlAtStartup": true
}
```

ただし、テレメトリ問題が解決されていないとこの設定も効果がありません。先に Step 1 を実施してください。

## トラブルシューティング早見表

| 症状 | 原因 | 対応 |
|------|------|------|
| `Unknown argument: <UUID>` | cmux ラッパーがセッションIDを注入 | ラッパーにパススルー設定を追加 |
| `Remote Control is not yet enabled` | テレメトリ無効化がフラグ評価を破壊 | `.zshrc` から環境変数を削除 |
| `Unknown skill: remote-control` | セッション内の `/rc` は既知バグ | `claude remote-control` をCLIから実行 |
| 上記すべて試してダメ | 認証キャッシュの不整合 | `claude auth logout` → `login` |

## 関連リンク

- [GitHub Issue #28322 - /remote-control not recognized](https://github.com/anthropics/claude-code/issues/28322)
- [GitHub Issue #29265 - /remote-control returns 'Unknown skill'](https://github.com/anthropics/claude-code/issues/29265)
- [GitHub Issue #33327 - Telemetry disabling breaks feature flags](https://github.com/anthropics/claude-code/issues/33327)
- [Claude Code 公式ドキュメント - Remote Control](https://code.claude.com/docs/en/remote-control)

## IDE のターミナルでも同じ問題が発生する

この問題はスタンドアロンのターミナルだけでなく、**IDE 内蔵ターミナルでも同様に発生します。**

IDE 内蔵ターミナルはシェルプロファイル（`.zshrc` 等）を読み込んで起動するため、`DISABLE_TELEMETRY` や `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` が設定されていれば、そのまま Claude Code に継承されます。

### Antigravity での実例

実際に **Antigravity**（Google の IDE）の内蔵ターミナルで Claude Code を使っていたところ、remote-control が使えませんでした。`.zshrc` からテレメトリ無効化の環境変数を削除した後、Antigravity を再起動すると `/remote-control` が正常に表示されるようになりました。

![Antigravity で /remote-control が使えるようになった様子](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-control-fix/antigravity_ss.png)
*`.zshrc` 修正後、Antigravity のターミナルで `/remote-control` が表示されている*

### 影響を受ける可能性がある IDE

ターミナルを内蔵するすべての IDE で同じ問題が起きる可能性があります。

| IDE | ターミナル | 影響 |
|-----|-----------|------|
| **Antigravity** | 内蔵ターミナル | 確認済み |
| **VS Code / Cursor** | 統合ターミナル | 同じ仕組みのため影響する可能性が高い |
| **JetBrains 系**（WebStorm, IntelliJ 等） | 内蔵ターミナル | 同上 |
| **Windsurf** | 内蔵ターミナル | 同上 |

いずれの場合も、**`.zshrc` から環境変数を削除して IDE を再起動する** ことで解決できます。

## 「テレメトリ」と「Claudeアプリのプライバシー設定」は別物

「テレメトリを無効化したのにまた有効にするの？プライバシーは大丈夫？」と思った方のために補足します。

### Claude アプリのプライバシー設定

Claude デスクトップアプリ（claude.ai）の設定にある**ロケーションメタデータ**や**改善データ**の設定は、Anthropic サーバー側での会話データの扱いを制御するものです。これらは今回の問題とは無関係で、引き続きオフのままで問題ありません。

### Claude Code のテレメトリ（今回の問題）

`.zshrc` に設定していた `DISABLE_TELEMETRY` や `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` は、**Claude Code CLI ツール自体の利用統計送信**を制御するものです。デスクトップアプリのプライバシー設定とは別系統です。

| 設定 | 制御対象 | 場所 |
|------|----------|------|
| アプリのプライバシー設定 | 会話データの利用・位置情報 | Claude アプリの設定画面 |
| `DISABLE_TELEMETRY` 等 | CLI の利用統計・フィーチャーフラグ | `.zshrc` や `settings.json` |

### テレメトリを有効にしても大丈夫？

そもそも Claude Code を使う時点で、**コードのコンテキストやプロンプトは API 通信として Anthropic に送信**されています。テレメトリの有無に関わらず、これは製品が動くために必須の通信です。

テレメトリで追加で送られるのは、利用統計（どの機能を使ったか、エラー情報、パフォーマンスデータ等）であり、テレメトリを切ってもコードが送られなくなるわけではありません。

つまり、**テレメトリを切るメリットはほぼなく、フィーチャーフラグが壊れるデメリットだけが残る**のが現状です。

## おわりに

プライバシーのためにテレメトリを無効化していた方は多いと思います。私もその一人でした。しかし現状では、テレメトリ無効化がフィーチャーフラグと連動しているため、remote-control を始めとするゲート付き機能が全て使えなくなります。

この設計については Anthropic 側の改善を期待したいところです。テレメトリの無効化とフィーチャーフラグの評価は、本来独立して制御できるべきでしょう。

同じ問題で困っている方の助けになれば幸いです。
