---
title: TeamViewerの遅延地獄から脱出 — Tailscale + SSH + cmux で快適リモート開発環境を構築する
tags:
  - SSH
  - macOS
  - リモート開発
  - tailscale
  - ClaudeCode
private: false
updated_at: '2026-03-24T00:25:53+09:00'
id: b4ee31a6578becf04770
organization_url_name: null
slide: false
ignorePublish: false
---

:::note info
この記事は AIと共同で執筆しました。
:::

## はじめに

母艦PC（macOS）にTeamViewerでリモートアクセスして開発作業をしていました。Claude Codeの操作、コード閲覧、フォルダ確認──全てTeamViewer越しに行っていたのですが、とにかく**遅い**。

TeamViewerはGUI画面をまるごと転送する仕組みです。帯域が細い環境ではカクカクし、ターミナルの文字入力すらストレスになります。CLI作業がメインなのに、フルスクリーンの画面転送は明らかに過剰です。

「テキストベースの通信で十分なのに、なぜ映像を転送しているのか？」

この疑問から、**Tailscale + SSH + cmux** という3層構成のリモート開発環境を構築しました。結果、TeamViewerの遅延地獄から完全に脱出できたので、そのセットアップ方法を共有します。

## なぜTeamViewerから移行するのか

まず、移行前後の違いを一枚の図で見てください。

![Before/After比較](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/before-after.png)
*TeamViewer は画面全体を映像として転送するため帯域を大量消費します。SSH はテキストのみなのでほぼゼロです*

### GUI画面転送 vs テキストベース通信

TeamViewerの通信量と、SSHの通信量を比較すると、その差は歴然です。

| 方式 | 転送内容 | 帯域消費 | 遅延の影響 |
|------|----------|----------|------------|
| TeamViewer（GUI転送） | 画面全体の映像ストリーム | 大 | 大きい |
| SSH（テキスト転送） | 入力コマンドと出力テキストのみ | 極小 | ほぼなし |

### CLI作業にGUI転送は過剰

日常の開発作業を振り返ると、その大半はCLI操作です。

- Claude Codeの操作 → **ターミナル**
- コード閲覧・編集 → **vim / less**
- Git操作 → **ターミナル**
- ファイル検索 → **find / grep**

これらは全てテキストベースで完結します。GUIが必要なのは、ブラウザで動作確認するときぐらいです。

### 解決策：3層構成

以下が今回構築する全体の構成です。

![全体構成図](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/architecture.png)
*普段の作業（90%）は SSH + cmux で軽量・高速に。GUI が必要な時（10%）だけ画面共有を使います*

**普段はSSH、GUIが必要な時だけ画面共有**。この使い分けが快適さの鍵です。

## Tailscale の導入と設定

Tailscaleは**WireGuardベースのP2P VPN**です。従来のVPNと違い、中央サーバーを経由せずデバイス間で直接接続するため高速です。NAT越えやファイアウォール突破も自動で行ってくれるので、面倒なポート開放やルーター設定は一切不要です。

セットアップは4ステップで完了します。

![Tailscaleセットアップ手順](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/tailscale-setup.png)
*① インストール → ② ログイン → ③ IP確認 → ④ MagicDNS有効化。すべてコピペで完了します*

### Step 1: インストール

```bash
brew install --cask tailscale
```

App Storeからもインストールできます。

### Step 2: ログイン

インストール後、メニューバーのTailscaleアイコンをクリックしてログインします。Google / Microsoft / GitHub アカウントが使えます。

### Step 3: IPアドレスの確認

接続先の母艦PCのTailscale IPアドレスをメモしておきます。

```bash
tailscale ip       # 自分のTailscale IPを表示
tailscale status   # 接続中のデバイス一覧
```

> **注意：** App Store版のTailscaleは `tailscale` コマンドがPATHに入りません。以下のエイリアスを設定してください。

```bash
# ~/.zshrc に追加
alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
```

### Step 4: MagicDNS の有効化（推奨）

Tailscaleの管理コンソールで**MagicDNS**を有効にすると、IPアドレスの代わりにマシン名で接続できるようになります。

```bash
# IPアドレスの代わりに
ssh user@100.x.x.x

# マシン名で接続可能
ssh user@my-macbook
```

IPアドレスを覚える必要がなくなり、接続がさらに簡単になります。

## SSH の有効化

次に、母艦PCへのSSH接続を有効にします。macOSのシステム設定で「リモートログイン」と「画面共有」をONにします。

![SSH設定方法](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/ssh-setup.png)
*macOS のシステム設定画面。「リモートログイン」をONにするだけで SSH 接続を受け付けます。Tailscale SSH なら SSH 鍵の管理も不要です*

### macOSでリモートログインを有効化

```bash
# 現在の設定を確認
sudo systemsetup -getremotelogin

# リモートログインを有効化
sudo systemsetup -setremotelogin on
```

GUIからの場合は、**システム設定 → 一般 → 共有 → リモートログイン** をONにします。

### Tailscale SSH（おすすめ：SSH鍵管理不要）

Tailscaleには**Tailscale SSH**という機能があり、SSH鍵の管理が不要になります。Tailscaleのアカウント認証（SSO）だけで接続できます。

```bash
# 母艦PC側で有効化
sudo tailscale up --ssh

# リモート側から接続（SSH鍵不要）
ssh ユーザー名@my-macbook
```

SSH鍵の生成・配布・管理が不要になるので、新しいデバイスからのアクセスも簡単です。

## cmux によるセッション管理

### cmux とは

cmuxは**macOSネイティブのターミナルマルチプレクサアプリ**です。tmuxのラッパーとして動作し、ペイン分割、ワークスペース管理、ブラウザ統合などの機能を提供します。

### cmux の最大の利点：セッションの永続化

cmuxを使う最大の理由は**セッションの永続化**です。SSH接続が切れても、cmux上で実行中のプロセスはそのまま生き続けます。再接続すると、切断前の画面がそのまま復帰します。

Claude Codeの長時間タスクも、切断を恐れずに実行できます。

### おすすめのレイアウト

以下は普段使っている3ペイン構成です。

![cmuxおすすめレイアウト](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/cmux-layout.png)
*上段で Claude Code を操作しながら、下段左でコードを閲覧、下段右で Git 操作。SSH が切断されても全てのペインが保持されます*

### 基本的な運用フロー

```bash
# リモートからSSH接続
ssh ユーザー名@my-macbook

# cmux上でClaude Code起動
cd /path/to/project
claude

# SSH切断しても再接続でセッション復帰
```

### cmux CLI の主要コマンド

| コマンド | 用途 |
|----------|------|
| `cmux list-workspaces` | ワークスペース一覧を表示 |
| `cmux new-workspace` | 新規ワークスペースを作成 |
| `cmux new-split <left\|right\|up\|down>` | ペインを分割 |
| `cmux list-panes` | ペイン一覧を表示 |
| `cmux send` | ペインにコマンドを送信 |

## Taildrop でファイル転送

リモート開発では、スクリーンショットやデータファイルをデバイス間でやり取りする場面があります。VNC（画面共有）にはファイル転送機能がなく、クラウドストレージ経由は手間がかかります。

Tailscaleには**Taildrop**というファイル転送機能が組み込まれています。Apple の AirDrop のように、Tailscaleネットワーク内のデバイス間でファイルを直接送受信できます。

![Taildropでファイル転送](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/taildrop.png)
*AirDrop と同じ感覚でファイルを送受信。CLI でもGUI でも使え、SSH の設定も不要です*

### CLI での使い方

```bash
# 送信（リモート → 母艦）
tailscale file cp ./screenshot.png my-macbook:

# ディレクトリごと送信
tailscale file cp ./my-dir/ my-macbook:

# 受信（母艦側で待ち受け）
tailscale file get ./
```

### GUI からも送信可能

Tailscaleの管理画面でデバイスを選択すると「Taildrop」エリアが表示されます。「**Select a File...**」ボタンを押すか、ファイルをドラッグ＆ドロップするだけで送信できます。非エンジニアでも簡単に使えます。

![Tailscale管理画面のTaildrop](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/taildrop-gui.png)
*Tailscaleの管理画面。デバイスを選択すると右側に「Taildrop」エリアが表示され、ファイルをドラッグ＆ドロップするだけで送信できます*

### scp / rsync との使い分け

| 方法 | 特徴 | 向いている場面 |
|------|------|---------------|
| **Taildrop** | 手軽、GUI対応、SSH不要 | 数ファイルのやり取り、非エンジニアとの共有 |
| **scp** | SSH経由、パス指定で正確 | 特定パスへの配置が必要な場合 |
| **rsync** | 差分転送、大量ファイル対応 | ディレクトリの同期・バックアップ |

普段のちょっとしたファイル転送は Taildrop、大量ファイルの同期は rsync と使い分けるのがおすすめです。

## macOS画面共有（GUIが必要な時）

普段はSSHで十分ですが、ブラウザでの動作確認やGUI操作が必要な場面もあります。そんな時は**macOSの画面共有（VNC）** をTailscale経由で使います。

### 設定方法

**システム設定 → 一般 → 共有 → 画面共有** をONにするだけです（上のSSH設定画面で同時に設定できます）。

### Tailscale経由のVNCはLAN相当の速度

TeamViewerとの決定的な違いは、**Tailscale経由のVNCはLAN内接続と同等の速度**が出ることです。TeamViewerのような中継サーバーを経由しないため、圧倒的に快適です。

### 接続方法

| プラットフォーム | 接続方法 |
|------------------|----------|
| macOS | Finder → `vnc://<tailscale-ip>` または ⌘K |
| iPad | Screens等のVNCアプリ |
| Windows | RealVNC Viewer等 |

### GUIが必要な場面

- ブラウザでのWebアプリ動作確認
- Figma等のデザインツール操作
- システム設定の変更

逆に言えば、これら以外の場面ではSSHで十分です。

## 実際の開発ワークフロー

ここまでで環境は整いました。では、この環境を使って実際にどう開発しているのか、私の日常ワークフローを紹介します。

![実際の開発ワークフロー](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/actual-workflow.png)
*CC Pocket → Screens → cmux のサイクルが回り続けることで、場所を問わず開発が進みます*

### Step 1: 母艦PCのセットアップ（本記事の内容）

本記事で解説した Tailscale + SSH + cmux の環境を母艦PCに構築します。これが全ての基盤になります。

### Step 2: CC Pocket で常時 Claude Code を実行

[CC Pocket](https://apps.apple.com/jp/app/cc-pocket-%E3%81%A9%E3%81%93%E3%81%A7%E3%82%82%E3%82%B3%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0/id6759188790)はiPhoneから母艦PCのClaude Codeを操作できるアプリです。Bridge Serverを母艦PCにインストールし、QRコードで接続するだけでセットアップ完了。

```bash
# 母艦PCにBridge Serverをインストール
npx @ccpocket/bridge@latest
```

移動中やスキマ時間にタスクを投げて、AIが常時コードを書き続ける環境が手に入ります。承認リクエストもプッシュ通知で届くので、電車の中でもサッと対応できます。

### Step 3: Screens アプリで iPhone から動作確認

Claude Codeがコードを書き上げたら、iPhoneの**Screens**アプリ（VNCクライアント）で母艦PCの画面にアクセスします。ブラウザの動作確認やUIの目視チェックなど、GUIが必要な確認作業をその場で実施できます。

Tailscale経由なので外出先からでもLAN相当の速度で画面操作が可能です。

### Step 4: PCが使える時は cmux + SSH でバイブコーディング

PCを触れる環境では、cmux経由でSSH接続してバイブコーディング。Claude Codeと対話しながらコードの方向性を指示したり、レビューしたり。cmuxのセッション永続化のおかげで、CC Pocketで投げたタスクの結果を確認しながら次の指示を出せます。

### このサイクルが回り続ける

```
📱 CC Pocket でタスク投入
  → 📲 Screens で動作確認
    → 💻 cmux でバイブコーディング
      → 📱 CC Pocket でタスク投入 → ...
```

場所やデバイスを問わず、常に開発が進み続ける。これが Tailscale + SSH + cmux 環境の真価です。

## 日常の運用フローまとめ

実際の1日の使い分けは以下のようになります。

![1日の使い分けフロー](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/daily-workflow.png)
*朝の SSH 接続から退勤まで。作業の 9割は SSH + cmux で完結し、GUI が必要な場面は 1割程度です*

| 用途 | ツール | 特徴 |
|------|--------|------|
| Claude Code操作 | SSH + cmux | 最速・最軽量・セッション永続 |
| コード閲覧・編集 | SSH + cmux（vim等） | テキストベースで低遅延 |
| ファイル転送 | Taildrop / scp / rsync | Taildropが手軽、大量ファイルはrsync |
| GUI操作（たまに） | macOS画面共有 via Tailscale | LAN相当速度のVNC |

**作業の9割はSSH + cmux、残り1割で画面共有**。これが最も効率的な構成です。

## トラブルシューティング

困った時はこちらを確認してください。

![よくあるトラブルと解決法](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-dev/troubleshooting.png)
*よくある3つのトラブルとその解決手順。チェックリスト形式で順に確認していけば解決できます*

### Tailscale接続できない場合

- 両方のデバイスでTailscaleが起動しているか確認
- `tailscale status` で接続状態を確認
- ファイアウォールがTailscaleの通信をブロックしていないか確認
- Tailscaleアプリを再起動してみる

### SSH接続タイムアウト時の対処

- `~/.ssh/config` にKeepAlive設定を追加：

```
Host *
  ServerAliveInterval 60
  ServerAliveCountMax 3
```

- macOS側のリモートログインが有効か再確認：

```bash
sudo systemsetup -getremotelogin
```

### cmuxセッションが見つからない場合

- cmuxアプリが起動しているか確認
- `cmux list-workspaces` でワークスペースの存在を確認
- cmuxアプリを再起動すると、前回のセッションが復元される

## まとめ

TeamViewerからの移行で得られた効果を整理します。

| 観点 | Before（TeamViewer） | After（Tailscale + SSH + cmux） |
|------|---------------------|--------------------------------|
| 遅延 | 常にカクカク | ほぼゼロ |
| 帯域消費 | 大（映像転送） | 極小（テキスト転送） |
| セッション永続性 | なし | cmuxで永続化 |
| 切断時の影響 | 作業が全て中断 | 再接続で即復帰 |
| セットアップ | アプリを入れるだけ | 初回のみ設定が必要 |

初回のセットアップに30分ほどかかりますが、一度構築すれば日々の開発体験が劇的に改善します。

特にClaude CodeのようなCLIベースのAIツールをリモートで使う場合、SSH + cmux の組み合わせは必須と言っても過言ではありません。TeamViewerの遅延に悩んでいる方は、ぜひ試してみてください。
