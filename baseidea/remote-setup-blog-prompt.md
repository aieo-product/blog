# ブログ記事作成プロンプト: リモート開発環境セットアップガイド

以下の内容でテックブログ記事を作成してください。

## 記事テーマ

**「TeamViewerの遅延地獄から脱出 — Tailscale + SSH + cmux で快適リモート開発環境を構築する」**

## 背景・課題

- 母艦PC（macOS）にTeamViewerでリモートアクセスして開発作業（Claude Codeの操作、コード閲覧、フォルダ確認等）を行っていた
- TeamViewerはGUI画面転送のため、帯域・遅延の影響が大きく作業効率が著しく低下
- 特にCLI作業（Claude Code等）では画面転送は過剰でありテキストベースで十分

## 解決策の構成

以下の3層構成でリモート開発環境を構築する：

```
リモート端末（外出先PC / iPad等）
  │
  ├── Tailscale（P2P VPN / WireGuardベース）
  │
  └──→ 母艦PC（macOS）
        ├── SSH + cmux ← 普段のClaude Code作業・コード閲覧（軽量・高速）
        │     └── セッション永続化で切断しても安心
        │
        ├── Taildrop ← ファイル転送（AirDrop感覚）
        │
        └── macOS画面共有（VNC over Tailscale） ← GUIが必要な時だけ
```

## 記事に含めるべきセクション

### 1. なぜTeamViewerから移行するのか
- GUI画面転送 vs テキストベース通信の帯域差
- CLI作業にGUI転送は過剰
- TeamViewerの遅延が開発体験を大きく損なう

### 2. Tailscale の導入と設定
- Tailscaleとは（WireGuardベースのP2P VPN、NAT/FW自動突破）
- macOSへのインストール方法:
  ```bash
  brew install --cask tailscale
  ```
- ログインと接続確認
- Tailscale IPの確認方法:
  - メニューバーのTailscaleアイコンから確認
  - 管理コンソール https://login.tailscale.com/admin/machines
  - CLI: `tailscale ip` / `tailscale status`
  - ※ App Store版はCLIがPATHに入らないため、エイリアス設定が必要:
    ```bash
    alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
    ```
- MagicDNS の有効化（IPの代わりにマシン名で接続可能にする）

### 3. SSH の有効化
- macOSでリモートログインを有効化:
  ```bash
  # 確認
  sudo systemsetup -getremotelogin
  # 有効化
  sudo systemsetup -setremotelogin on
  ```
- Tailscale SSH の紹介（SSH鍵管理不要、SSO認証のみで接続可能）:
  ```bash
  # 母艦側
  sudo tailscale up --ssh
  # リモート側
  ssh ユーザー名@<tailscale-hostname>
  ```

### 4. cmux によるセッション管理
- cmux とは: macOSネイティブのターミナルマルチプレクサアプリ（tmuxラッパー）
  - ペイン分割、ワークスペース管理、ブラウザ統合などの機能を持つ
  - CLIからも制御可能（`/Applications/cmux.app/Contents/Resources/bin/cmux`）
- cmux の最大の利点: **セッションの永続化** — SSH切断してもセッションが維持される
- 基本的な運用フロー:
  ```bash
  # リモートからSSH接続
  ssh ユーザー名@<tailscale-ip>

  # cmux上でClaude Code起動
  cd /path/to/project
  claude

  # SSH切断しても再接続でセッション復帰
  ```
- cmux CLI の主要コマンド:
  - `cmux list-workspaces` — ワークスペース一覧
  - `cmux new-workspace` — 新規ワークスペース作成
  - `cmux new-split <left|right|up|down>` — ペイン分割
  - `cmux list-panes` — ペイン一覧
  - `cmux send` — コマンド送信
- おすすめのレイアウト例:
  ```
  ┌─────────────────────────────────┐
  │          Claude Code            │  ← メインペイン
  │                                 │
  ├────────────────┬────────────────┤
  │   コード閲覧    │    シェル       │  ← 下段分割
  │  (vim/less等)  │  (git等)       │
  └────────────────┴────────────────┘
  ```

### 5. Taildrop でファイル転送
- Taildrop とは: Tailscaleデバイス間でAirDrop感覚のファイル送受信ができる機能
- VNC（画面共有）にはファイル転送機能がない。クラウドストレージ経由は手間がかかる。Taildropなら直接送れる
- 使い方:
  ```bash
  # 送信（リモート → 母艦）
  tailscale file cp ./file.txt <母艦のマシン名>:

  # 送信（ディレクトリ）
  tailscale file cp ./my-dir/ <母艦のマシン名>:

  # 受信（母艦側で待ち受け）
  tailscale file get ./
  ```
- GUI からも利用可能: メニューバーの Tailscale アイコン → 「Send file...」
- scp/rsync との使い分け:

  | 方法 | 特徴 | 向いている場面 |
  |------|------|---------------|
  | **Taildrop** | 手軽、GUI対応、SSH不要 | 数ファイルのやり取り、非エンジニアとの共有 |
  | **scp** | SSH経由、パス指定で正確 | 特定パスへの配置が必要な場合 |
  | **rsync** | 差分転送、大量ファイル対応 | ディレクトリの同期・バックアップ |

### 6. macOS画面共有（GUIが必要な時）
- システム設定 → 一般 → 共有 → 画面共有 を ON
- Tailscale経由のVNCはLAN相当の速度（TeamViewerとは別物）
- 接続方法:
  - macOS: Finder → `vnc://<tailscale-ip>` または ⌘K
  - iPad: Screens等のVNCアプリ
  - Windows: RealVNC Viewer等
- GUIが必要な場面の例: ブラウザでの動作確認、GUI操作が必要なアプリ

### 7. 日常の運用フローまとめ

| 用途 | ツール | 特徴 |
|------|--------|------|
| Claude Code操作 | SSH + cmux | 最速・最軽量・セッション永続 |
| コード閲覧・編集 | SSH + cmux（vim等） | テキストベースで低遅延 |
| ファイル転送 | Taildrop / scp / rsync | Taildropが手軽、大量ファイルはrsync |
| GUI操作（たまに） | macOS画面共有 via Tailscale | LAN相当速度のVNC |

### 8. トラブルシューティング
- Tailscale接続できない場合の確認ポイント
- SSH接続タイムアウト時の対処
- cmuxセッションが見つからない場合

## 記事のトーン
- 実体験ベースの実用的な内容
- 設定手順はコピペで使えるコードブロック付き
- 「なぜこの構成なのか」の理由を明確に

## 対象読者
- macOSで開発している人
- リモートで母艦PCにアクセスして開発作業をしている人
- TeamViewer等のリモートデスクトップの遅延に悩んでいる人
- Claude Code等のCLIツールをリモートから快適に使いたい人
