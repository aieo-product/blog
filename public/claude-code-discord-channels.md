---
title: Claude Code Channels x Discord セットアップガイド -- スマホからAIコーディングを操作する
tags:
  - AI
  - MCP
  - discord
  - リモート開発
  - ClaudeCode
private: false
updated_at: '2026-03-22T12:24:29+09:00'
id: a8b04c2863eff1418098
organization_url_name: null
slide: false
ignorePublish: false
---

## はじめに

Claude Code v2.1.80 で追加された **Channels 機能**（リサーチプレビュー）を使うと、Discord から Claude Code セッションにメッセージを送れるようになります。

つまり、**スマホの Discord アプリからコーディング指示を出して、母艦PCの Claude Code に実行させる**ことが可能になります。

この記事では、実際にセットアップした手順と、ハマったポイントをまとめます。

なお、セットアップの実況ログは [X（旧Twitter）のスレッド](https://x.com/otani_ai_memo) にも投稿しています。スクリーンショット付きでリアルタイムの試行錯誤を追えるので、あわせて参考にしてみてください。

## Claude Code Channels とは

MCP（Model Context Protocol）サーバーを介して、外部サービスから Claude Code セッションにメッセージをプッシュできる機能です。

![全体構成図](https://raw.githubusercontent.com/aieo-product/blog/main/images/discord-channels/architecture.png)
*Discord アプリ → Bot → MCP Plugin → Claude Code の流れで双方向通信*

**できること：**
- Discord からスマホ経由で Claude Code に指示を送る
- Claude Code の応答を Discord で受け取る
- ファイルの送受信（添付ファイル対応）

**制約：**
- Claude Code セッションが開いている間のみイベントを受信
- 常時稼働には永続ターミナル（cmux や tmux）での実行が必要
- リサーチプレビュー段階のため、利用可能状況はアカウントにより異なる

## 前提条件

- Claude Code **v2.1.80 以上**
- **Bun**（チャネルプラグインの実行に必要）
- **claude.ai アカウント**でのログイン（API キー認証は不可）
- Team/Enterprise プランの場合、管理者による channels の有効化が必要

```bash
# バージョン確認
claude --version
# 2.1.80以上であること

bun --version
# インストールされていること
```

Bun が未インストールの場合：
```bash
curl -fsSL https://bun.sh/install | bash
```

## セットアップ手順

全体の流れは以下の通りです。

![セットアップ手順](https://raw.githubusercontent.com/aieo-product/blog/main/images/discord-channels/setup-flow.png)
*Discord 側 2ステップ → Claude Code 側 3ステップ → ペアリングで完了*

### Step 1: Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. **New Application** をクリックして名前をつける（例：`claudebot`）
3. **Bot** セクションでユーザー名を設定

![Developer Portal でアプリ作成](https://pbs.twimg.com/media/HD0ZqflboAAZjay.png)
*Developer Portal の一般情報画面。アプリ名・アイコンを設定する*

4. **Reset Token** でトークンをコピー（**一度しか表示されない**ので必ず保存）

![Bot トークンの取得](https://pbs.twimg.com/media/HD0Z2EQboAErBtD.jpg)
*Bot セクション。「トークンを表示」でトークンをコピーして安全な場所に保管*

5. **Privileged Gateway Intents** で **Message Content Intent** を有効化

![Message Content Intent を有効化](https://pbs.twimg.com/media/HD0aUvLa8AAgwsI.jpg)
*Message Content Intent を ON にする。Presence Intent と Server Members Intent は OFF のままで OK*

> **Public Bot はオフ（非公開）にしましょう。** 個人利用なら非公開で十分です。
>
> 非公開に変更する際に「プライベートアプリケーションはデフォルトの認証リンクを持つことはできません」エラーが出る場合：
> 1. **Installation** ページを開く
> 2. Install Link の設定を **None** に変更して保存
> 3. Bot セクションに戻り Public Bot をオフにして保存
>
> ![Installation 設定](https://pbs.twimg.com/media/HD0cTDwbUAAuhzC.jpg)
> *Install Link を「None」に設定すると Public Bot をオフにできる*

### Step 2: Bot をサーバーに招待

自分の Discord サーバーがなければ作成しておきます（左サイドバー「+」→「オリジナルの作成」）。

1. Developer Portal の **OAuth2 > URL Generator** を開く
2. SCOPES で **bot** にチェック

![OAuth2 スコープ選択](https://pbs.twimg.com/media/HD0cyiobwAAEtJZ.jpg)
*SCOPES で「bot」にチェックを入れる*

3. BOT PERMISSIONS で以下にチェック：
   - View Channels
   - Send Messages
   - Send Messages in Threads
   - Read Message History
   - Attach Files
   - Add Reactions

![Bot 権限の設定](https://pbs.twimg.com/media/HD0c4nuboAMARNr.jpg)
*必要な権限にチェック。スレッド作成や音声接続を追加してもOK*

4. 生成された URL を**ブラウザのアドレスバーに貼り付けて開く**（Discord 内に貼るのではない）
5. ドロップダウンから自分のサーバーを選択して認証

![Bot の追加確認](https://pbs.twimg.com/media/HD0djsOaYAAjtZJ.png)
*生成 URL をブラウザで開くと、Bot をサーバーに追加する確認画面が表示される*

![Bot がサーバーに参加](https://pbs.twimg.com/media/HD0d4U8bwAArzhn.jpg)
*Bot がサーバーに参加すると歓迎メッセージが表示される*

> **注意：** 生成された URL は必ず**ブラウザで開いて**ください。Discord アプリ内に貼っても正しく動作しません。

### Step 3: Claude Code にプラグインをインストール

Claude Code セッション内で以下を実行します。

```
/plugin marketplace add https://github.com/anthropics/claude-plugins-official.git
/plugin install discord@claude-plugins-official
/reload-plugins
```

> **名前ベースの `anthropics/claude-plugins-official` では Discord プラグインが見つからないケースがあります。** Git URL で登録するのが確実です。
>
> プラグインが見つからない場合：
> ```bash
> # プラグインキャッシュのクリア
> rm -rf ~/.claude/plugins/cache
> # セッションを再起動してから再インストール
> ```

### Step 4: Bot トークンを設定

```
/discord:configure <コピーしたボットトークン>
```

これで `~/.claude/channels/discord/.env` にトークンが保存されます。

`/discord:configure` がタブ補完に出ない場合は、セッションを再起動してください。コマンドがサジェストされなくても、そのまま入力すれば実行できる場合もあります。

![プラグイン設定の実行](https://pbs.twimg.com/media/HD0lL_CboAIenyh.png)
*Claude Code 内でのプラグインインストール・設定の実行画面*

> **⚠️ `/discord:configure` が「Unknown skill」になる場合**
>
> 以下のように `Unknown skill: discord:configure` と表示され、トークンが引数として表示されてしまう場合があります。
>
> ![discord:configure が Unknown skill になるエラー](https://raw.githubusercontent.com/aieo-product/blog/main/images/remote-control-fix/claude_error_masked.png?v=2)
> *`/discord:configure` が認識されず、Bot トークンが「Args from unknown skill」として表示されてしまう例*
>
> この問題は、`.zshrc` や `settings.json` で **テレメトリを無効化** していることが原因です。テレメトリ無効化がフィーチャーフラグの評価を破壊し、プラグインのスラッシュコマンドが正しく登録されなくなります。
>
> **解決方法は別記事にまとめています：**
> 👉 [Claude Code の remote-control が動かない？3つのエラーパターンと完全復旧手順](https://qiita.com/items/bfb6fba1d31cb08c8b8d)
>
> この問題は **VS Code、Cursor、Antigravity** など、ターミナルを内蔵するすべての IDE でも同様に発生します。IDE 内蔵ターミナルはシェルプロファイル（`.zshrc` 等）の環境変数を継承するためです。

### Step 5: Channels 付きで起動

セッションを終了し、`--channels` フラグ付きで起動します。

```bash
claude --channels plugin:discord@claude-plugins-official
```

### Step 6: ペアリング

1. Discord で Bot に **DM を送る**（内容は何でも OK）
2. Bot がペアリングコードを返信
3. Claude Code 内で実行：
   ```
   /discord:access pair <ペアリングコード>
   ```
4. Bot から「**Paired! Say hi to Claude.**」と返信が来れば成功

![Discord でのペアリング成功](https://raw.githubusercontent.com/aieo-product/blog/main/images/discord-channels/discord-pairing.png)
*Bot に DM を送るとペアリングコードが返信される。Claude Code 側でコードを入力すると「Paired! Say hi to Claude.」と表示されて接続完了*

### Step 7: アクセスをロックダウン

```
/discord:access policy allowlist
```

allowlist に登録されたユーザーのみが Bot にメッセージを送れるようになります。セキュリティのために必ず設定しましょう。

## 利用可能なツール

チャネル経由で Claude が使える Discord 操作は以下の通りです。

![Discord 経由で使えるツール](https://raw.githubusercontent.com/aieo-product/blog/main/images/discord-channels/tools.png)

| ツール | 用途 |
|--------|------|
| `reply` | メッセージを送信。ファイル添付も可能（最大10ファイル、各25MB） |
| `react` | メッセージにリアクションを追加 |
| `edit_message` | Bot 自身が送信したメッセージを編集 |
| `fetch_messages` | 直近のメッセージ履歴を取得（最大100件） |
| `download_attachment` | 添付ファイルをダウンロード |

## 実運用のポイント

### cmux / tmux との組み合わせが必須

Channels はセッションが開いている間のみ機能します。SSH を閉じるとメッセージを受信できなくなるため、**cmux や tmux で Claude Code セッションを永続化**する必要があります。

```bash
# cmux でワークスペースを作成して起動
cmux create-workspace discord-bot
claude --channels plugin:discord@claude-plugins-official
```

SSH を切断しても cmux がセッションを保持してくれるので、Discord からのメッセージを 24 時間受信し続けられます。


## トラブルシューティング

ここまでの手順で基本的にはペアリングまで完了するはずですが、途中でハマりやすいポイントをまとめておきます。

### `/discord` コマンドがサジェストされない

タブ補完に出なくても、コマンドをそのまま入力すれば実行できる場合があります。それでもダメなら：

```bash
# セッション再起動 → 再インストール
/plugin install discord@claude-plugins-official
/reload-plugins
/discord:configure <トークン>
```

### プラグインが見つからない

```bash
# キャッシュクリアして再登録
rm -rf ~/.claude/plugins/cache
/plugin marketplace add https://github.com/anthropics/claude-plugins-official.git
```

## 【追記予定】筆者の環境で発生した問題

> **以下は筆者の環境固有の問題と思われます。** 通常は上記の手順でペアリングまで完了するはずです。

筆者の環境（個人 Max プラン）では、`--channels` フラグ付きで起動すると以下のエラーが発生しました。

```
--channels ignored (Channels are not currently available)
```

`claude auth status` で確認すると、個人アカウントに自動付与された組織 ID（orgId）が Team/Enterprise 扱いされているのが原因のようです。claude.ai の管理画面には Channels の有効化トグルが存在しないため、個人プランでは設定変更ができない状態です。

リサーチプレビューの段階的ロールアウトによるものか、アカウント固有の問題かは切り分けできておらず、現在調査中です。

**報告 Issue：** https://github.com/anthropics/claude-code/issues/36460

解決でき次第、この記事を更新します。同じ問題に遭遇した方は、上記 Issue にリアクションを付けていただけると助かります。

## まとめ

Claude Code Channels x Discord は、**スマホから母艦 PC の Claude Code を操作できる**強力な機能です。

| 観点 | 詳細 |
|------|------|
| 何ができる | Discord から Claude Code にメッセージ送信・応答受信 |
| セットアップ時間 | 約 15 分（Bot 作成 + プラグイン設定） |
| 必要なもの | Claude Code v2.1.80+、Bun、Discord アカウント |
| 現在のステータス | リサーチプレビュー |

セットアップ自体はシンプルなので、Claude Code を日常的に使っている方はぜひ試してみてください。Discord からサッと指示を出して、母艦 PC で Claude Code が黙々とコードを書いてくれる体験は、一度味わうと戻れなくなるはずです。

> この記事はリサーチプレビュー段階の機能を扱っているため、正式リリース時に手順が変わる可能性があります。更新があり次第、記事を追記していきます。

## 解説動画

セットアップの一連の流れを解説動画にまとめました。記事と合わせてご覧ください。

👉 [セットアップ解説動画（ずんだもんナレーション付き）](https://x.com/otani_ai_memo/status/2035557887905566778)

## 参考リンク

- [Claude Code Channels 公式ドキュメント](https://code.claude.com/docs/en/channels)
- [Channels Reference](https://code.claude.com/docs/en/channels-reference)
- [Discord Plugin ソースコード](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/discord)
- [Claude Code Settings](https://code.claude.com/docs/en/settings)

---

> この記事は Claude Code（Claude Opus）と共同で執筆しました。
