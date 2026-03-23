---
title: "Claude Codeの/loopで「AI秘書」を作った ── Slackに常駐して5分おきに報告してくれるJCARVIS秘書モード"
tags:
  - 生成AI
  - AIエージェント
  - ClaudeCode
  - Slack
  - ChatGPT
private: false
updated_at: ''
id: null
organization_url_name: null
slide: false
ignorePublish: false
---

:::note info
この記事は AIと共同で執筆しました。
:::

## はじめに

Claude Codeには `/loop` という、あまり知られていない強力な機能があります。指定した間隔でコマンドを繰り返し実行する機能です。

私はこの `/loop` を使って、**Slackに常駐するAI秘書**を作りました。5分おきにプロジェクトの状態を確認し、Slackで進捗報告や指示の受付をしてくれる──まるでJARVIS（アイアンマンのAI執事）のような存在です。

本記事では、この「JCARVIS秘書モード」の仕組みと実装方法を解説します。

## 🎯 何ができるのか

秘書モードを起動すると、Claude Codeが**5分おきに自動で以下を実行**します：

1. **プロジェクトの状態確認**（git status、ダッシュボード、セッション状態）
2. **Slackの新着メッセージ確認**（ユーザーからの指示を受信）
3. **判断**（新しい指示があれば実行、なければステータス更新）
4. **Slackにレポート送信**（変化があれば詳細報告、なければハートビート）
5. **セッション間の連携管理**（開発セッションとの協調）

つまり、**PCの前にいなくても、Slackさえ見ていればプロジェクトの状況がリアルタイムで分かる**状態を作れます。

## 🚀 起動方法はたった1行

```
/loop 5m /secretary-loop
```

これだけです。Claude Codeのターミナルでこの1行を打つと、秘書モードが起動します。

- `/loop` ── Claude Codeの繰り返し実行コマンド
- `5m` ── 5分間隔
- `/secretary-loop` ── 実行するスキル（後述）

## 💬 Slackに届くメッセージ

### 通常レポート（変化があった場合）

```
🤖 JCARVIS Secretary Report

📊 システム状態:
• Brain: ONLINE | Skills: 13 active
• 開発セッション: working

🔧 開発進捗:
• feature/add-login: 3 commits today
• Issue #15 の実装中

📬 未処理キュー:
• instructions: 0件
• reports: 1件（Issue #14 完了報告）

⏭️ 次のアクション候補:
• Issue #15 のレビュー依頼
• Issue #16 の着手

ご指示をお待ちしております、サー。
```

### ハートビート（変化がない場合）

```
💓 JCARVIS Heartbeat - 14:30
状態: 正常 | 開発セッション: idle | 新着指示: なし
```

### 確認が必要なとき

```
❓ JCARVIS - ご確認ください、サー

Issue #15 のテストで1件失敗しています。

以下からお選びください:
1. テストを修正して続行
2. 一旦スキップして次のIssueへ
3. その他（テキストでご指示ください）
```

## 🔧 仕組みの全体像

```
┌─────────────────────────────────────────────────┐
│  Claude Code ターミナル                          │
│  /loop 5m /secretary-loop                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐    ┌──────────────┐              │
│  │ dashboard │    │ coordinator  │              │
│  │   .md     │    │   .yaml      │              │
│  └─────┬─────┘    └──────┬───────┘              │
│        │                 │                       │
│        ▼                 ▼                       │
│  ┌─────────────────────────────┐                │
│  │     secretary-loop          │                │
│  │  (SKILL.md で定義)          │                │
│  │                             │                │
│  │  1. 状態収集               │                │
│  │  2. Slack確認              │                │
│  │  3. 判断                   │                │
│  │  4. レポート送信           │                │
│  │  5. coordinator更新        │                │
│  └─────────────┬───────────────┘                │
│                │                                 │
│                ▼                                 │
│  ┌─────────────────────────────┐                │
│  │  Claude Code MCP            │                │
│  │  (Slack連携)                │                │
│  │  • slack_read_channel       │                │
│  │  • slack_send_message       │                │
│  └─────────────┬───────────────┘                │
│                │                                 │
└────────────────┼─────────────────────────────────┘
                 │
                 ▼
          ┌──────────────┐
          │  Slack        │
          │  #jcarvis-hq  │
          └──────────────┘
```

### ポイント：外部SDKは不要

Slackとの連携は **Claude Code に組み込まれた MCP（Model Context Protocol）** を使っています。Slack APIのトークン管理やSDKのインストールは不要で、Claude Code がネイティブで提供するSlack MCPツールをそのまま利用します。

使っているツール：
- `slack_read_channel` ── チャンネルのメッセージを読む
- `slack_send_message` ── メッセージを送信する
- `slack_search_channels` ── チャンネルを検索する
- `slack_read_thread` ── スレッドを読む

## 📁 必要なファイル構成

```
project/
├── CLAUDE.md                    # JCARVISの人格・ルール定義
├── dashboard.md                 # プロジェクト状態のダッシュボード
├── sessions/
│   └── coordinator.yaml         # セッション間の連携ファイル
└── skills/
    └── composite/
        └── secretary-loop/
            └── SKILL.md         # 秘書ループの定義
```

### SKILL.md（秘書ループの定義）

```yaml
---
name: secretary-loop
type: composite
description: 5分ごとにシステム状態を確認し、Slack経由で報告・指示を仰ぐ秘書ループ
composes:
  - slack-read
  - slack-send
provider: claude
token_estimate: low
---
```

SKILL.mdにはループの実行フロー、Slackメッセージのフォーマット、エラーハンドリングのルールを記述します。Claude Codeはこのファイルを読んで、何をすべきか理解します。

### coordinator.yaml（セッション間連携）

```yaml
slack_channel:
  name: "#jcarvis-hq"
  id: "C0AKBQ49NFN"

monitored_projects:
  - name: "ProjectA"
    path: "/path/to/ProjectA"
  - name: "ProjectB"
    path: "/path/to/ProjectB"

active_sessions:
  - session_id: "secretary-loop"
    role: "secretary"
    status: "watching"
    current_task: "全プロジェクト定期巡回中"
    last_heartbeat: "2026-03-08T17:11:00+09:00"

instructions_queue: []   # Slack → 開発セッションへの指示
reports_queue: []         # 開発セッション → Slackへの報告
```

このファイルが秘書セッションと開発セッションの**橋渡し役**です。開発セッションが進捗を書き込み、秘書セッションがそれを読み取ってSlackに転送します。

## 👥 複数セッションとの連携

秘書モードの真価は、**他の開発セッションと連携する**ときに発揮されます。

```
┌────────────────┐     ┌──────────────────┐
│  秘書セッション  │     │  開発セッション    │
│  (secretary-    │◄───►│  (Issue #15 対応) │
│   loop)         │     │                  │
└───────┬────────┘     └──────────────────┘
        │
        │  coordinator.yaml
        │
        ▼
┌──────────────┐
│   Slack       │ ◄──── ユーザー（スマホから指示）
│  #jcarvis-hq  │
└──────────────┘
```

### 開発セッション側の動き

開発セッションは、タスクの進行に応じて `coordinator.yaml` を更新します：

- **タスク開始時**: `status: working`, `current_task: "Issue #15 の実装"` に更新
- **タスク完了時**: `reports_queue` に完了報告を追加
- **ブロック時**: `status: blocked`, 質問を `reports_queue` に追加

### 秘書セッション側の動き

- `reports_queue` の未送信レポートを Slack に転送
- Slack のユーザー指示を `instructions_queue` に書き込み
- 開発セッションの heartbeat が **15分以上古い** 場合、「開発セッションが応答していません」と警告

## 🎭 JARVIS風の人格設定

CLAUDE.md で AI の人格を定義しています：

```markdown
## Identity

英国執事のように丁寧で知的、かつ効率的に振る舞う。

### 応答パターン
- 「了解しました、サー。」
- 「お調べいたします、サー。」
- 「完了いたしました。結果をご報告いたします。」
- 「ご確認ください、サー。」
- 「サー、お知らせすべきことがございます。」
```

これだけで、Claude Code のすべての応答がJARVIS風になります。Slackに届くメッセージも「ご指示をお待ちしております、サー。」で締められるので、日常のやり取りが楽しくなります。

## 🔒 安全性の担保

AI秘書が勝手に危険な操作をしないよう、安全境界を設定しています。

### 自律実行可能な操作
- ファイルの読み取り・検索
- git status / git log の確認
- Slackメッセージの読み取り
- ステータスレポートの送信

### Slack承認が必要な操作
- git push / git merge
- ファイルの作成・編集
- 外部APIの呼び出し
- PRの作成

### 絶対禁止
- `git push --force`
- `rm -rf *`
- `sudo`
- `.env` の内容表示

これにより、**放置しても安全に動き続ける**秘書モードが実現できています。

## 📈 実際の運用風景

朝、PCを開くと Slack にこんなメッセージが並んでいます：

```
💓 JCARVIS Heartbeat - 03:00
状態: 正常 | 開発セッション: idle | 新着指示: なし

💓 JCARVIS Heartbeat - 03:05
状態: 正常 | 開発セッション: idle | 新着指示: なし

🤖 JCARVIS Secretary Report - 08:30
📊 システム状態: Brain: ONLINE | Skills: 13 active
🔧 開発進捗: main branch - 0 uncommitted changes
⏭️ 次のアクション候補:
• Issue #16 の着手
• 週報の生成
ご指示をお待ちしております、サー。
```

外出中にスマホで「Issue #16 をやっておいて」と Slack に書き込むだけで、次のループで秘書が指示を拾い、開発セッションに委譲してくれます。

## 🔮 応用例

### 1. 週報の自動生成

秘書ループに週報生成スキルを組み合わせることで、**毎週金曜に自動で週報を生成してSlackに投稿**できます。

### 2. 複数プロジェクトの横断監視

`coordinator.yaml` の `monitored_projects` に複数プロジェクトを登録すれば、1つの秘書セッションで全プロジェクトを横断的に監視できます。

### 3. 夜間バッチ処理

夜中にIssueを割り当てておくと、秘書ループが開発セッションに指示を出し、翌朝には対応済みの状態になっています。

## 📝 まとめ

| 要素 | 内容 |
|------|------|
| 起動コマンド | `/loop 5m /secretary-loop` |
| Slack連携 | Claude Code MCP（外部SDK不要） |
| 連携ファイル | `coordinator.yaml`（セッション間の橋渡し） |
| 安全性 | 自律実行/承認制/禁止の3段階 |
| 人格 | CLAUDE.md で JARVIS 風に定義 |

Claude Codeの `/loop` は、単なる繰り返し実行ではなく、**AI秘書を作るためのインフラ**になります。SKILL.md でループの振る舞いを定義し、coordinator.yaml でセッション間を連携させることで、Slackを通じた非同期のAI協調システムが構築できます。

外部サービスやSDKは不要。Claude Code と Slack だけで、あなただけのJARVISを作ってみませんか？

---

**関連記事：**
- [AIエージェント時代の開発手法 ── Issue駆動開発で属人化・セッション断絶・品質問題を一挙に解決する](https://qiita.com/items/be1fc389d203235493e5)
