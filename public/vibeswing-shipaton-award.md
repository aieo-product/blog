---
title: Builders Weekend Special Edition — Shipaton 26で審査員賞！VibeSwingを3時間で作った話
tags:
  - ハッカソン
  - ClaudeCode
  - codex
  - threejs
  - 生成AI
private: true
updated_at: '2026-08-14T15:06:22+09:00'
id: ac712e0244c9c0b7b3dc
organization_url_name: null
slide: false
ignorePublish: false
---

## はじめに

8/8 に渋谷PARCOで行われた **Builders Weekend Special Edition — Shipaton 26** ハッカソンで、**審査員賞（Judges' Award）** を受賞しました！

![審査員賞の授賞式](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/award-stage.jpg)
*授賞式にて。左が私（オータニ）、右が相方の Yu 君*

この手の賞をもらえたのは、18年前（2008年）に札幌で行われたゲームコンテスト以来なので本当にうれしい…！あの時の副賞は iPod touch でしたが、今回は **OpenAI の Codex Micro** をいただきました。18年経つと副賞も時代を反映しますね。

作ったのは **VibeSwing** ── iPhone を Wii リモコンのように振り回してボールを打ち返し、2人で協力して巨大ボスを倒す体感型ゲームです。

![VibeSwing 完成版のプレイ画面](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/final.gif)
*完成版。これが3時間の Vibe Coding の成果物*

この記事では、受賞までの1日と「3時間で体感型ゲームを作り切るために何をしたか」を振り返ります。

## イベント概要

![会場入口のサイネージ](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/event-signage.jpg)

- **イベント**: [Builders Weekend - Shipaton Special Edition with OnLab](https://luma.com/c32o6i8l)。「**1日でモバイルアプリをつくって、世界に出す**」がコンセプトの1日完結ミニハッカソンで、RevenueCat の世界最大級モバイルハッカソン「Shipaton 2026」（賞金総額 $1M・Times Square ビルボード掲載）への入口イベントでもあります
- **会場**: 渋谷PARCO DGビル 18F の Digital Garage イベントスペース「Dragon Gate」（Open Network Lab 協力）。眺望が最高
- **ホスト**: Builders Weekend / Takeoff Tokyo の CEO・Antti さん。進行と通訳は RevenueCat の上田さん
- **フォーマット**: 「**30秒でピッチして、3時間で作って、60秒でデモする**」。チームは最大2人

![タイムスケジュール](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/time-schedule.jpg)
*朝10時スタート。ビルドタイムは実質3時間しかない*

賞は参加者投票の3賞（Best Idea / Best Ship / Best Monetizable、各1万円）に加えて、グランプライズ（3万円 + Codex Micro）と、審査員が選ぶ **Judges' Award（Codex Micro）**。審査員は Antti さんと Open Network Lab の清原さんでした。

## チームビルド〜アイデア出し

今回のハッカソンにはチームビルドタイムがあり、前から一緒にやってみたかった [Yu 君](https://x.com/YuYoshimuta)に一目散に声を掛けてチームビルドは即完了。

アイデア出しでは「ハッカソンは**ピッチでの注目度**と**審査員にどう響くか**がポイント」と Yu 君に教えてもらい、事前に温めていた「iPhone をコントローラーにする」案を軸に膨らませていきました。

- カメラ系はネタ被りが多そう → **加速度センサー + 振動**なら会場でデモ映えする
- ターゲットは自分たち。「**バイブコーダー、運動しなさすぎ問題**」を解決する体感ゲームに

ただ、ゲーム画面は Mac からディスプレイに出す構成なので「モバイルアプリのハッカソン」としてルール的にOKかが不安。そこで運営の上田さんに直接確認を取りました。

> 「スマホを Wii のリモコン的にして、こっちのスクリーンに映像を映す。それってモバイルアプリとして出して大丈夫ですか？」
> 「アプリは作れるんですよね。大丈夫です」

オッケーいただきました。30秒ピッチでは「**皆さん、運動されてない方は手を挙げてください。バイブコーダー、みんな足りてないですよね。スマホを Wii のコントローラーみたいにして、運動しながら一緒に遊べるパーティーゲームを作ります！**」と宣言してビルドタイムへ。

## 作ったもの: VibeSwing

最終形はこんな構成です。登場するのは iPhone（SwiftUI + Core Motion）・Mac（Node.js の WebSocket リレー）・ブラウザ（Three.js のゲーム画面）の3つだけで、iPhone のテザリングに Mac をつなぐだけの完全オフライン構成にしました。

![vibeSwing の構成図](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/architecture.png)
*構成図（[vibeSwing 設計書サイト](https://vibeswing-docs.pages.dev/)より）*

- 2人協力で巨大ボスの HP を削るタイミングゲーム（PERFECT ±80ms / GOOD ±300ms / MISS）
- スイング強度が閾値を超えた PERFECT は **SMAASH!!** 演出で追加ダメージ
- ボスの HP に応じて3段階のフェーズ、制限時間、スコアと D〜S ランク評価
- 打球音・接近音・ハプティクスは各プレイヤーの iPhone 側から鳴る
- リザルトには観客が感想を X にポストできる QR コード

リポジトリ名は `dopaTeni`（ドーパミン + テニス）でスタートしましたが、途中でアプリ名を **VibeSwing** に統一しました。

## 3時間で作り切るためにやったこと

ここからが本題の「今回作業したポイント」です。

### 1. 役割分担と issue 駆動開発

役割分担は、私がメインプログラム + グラフィック作成、Yu 君がスマホアプリ（加速度対応）と音まわり。音は BGM が Suno で、SE はなんと [Yu 君の自作](https://x.com/YuYoshimuta/status/2086262383048319095)です。

普段から [issue 駆動開発](https://zenn.dev/aieo_product/articles/issue-driven-ai-development)で進めているので、GitHub リポジトリを Yu 君とシェアして **すべての作業を issue → PR** で回しました。これがうまくハマって、2人 + 複数 AI エージェントが同じリポジトリを触っているのに**作業がほぼ競合せずに完走**。issue / PR の通し番号はビルドタイム終盤の15:45時点で #64、当日中に #80 まで到達し、マージした PR は40本近くになりました。

私側の体制はこんな感じの多層構成です。

```
オータニ側
├─ Claude Code セッション①「司令塔」
│    … issue 管理・方針決定・レビュー・マージだけを担当
│    ├─ 実装は Codex CLI (gpt-5.3-codex-spark) へ委譲
│    ├─ Sonnet サブエージェント … フォールバック実装 + スクショの画像解析で PASS/FAIL 判定
│    └─ agent-browser … E2E スクリーンショット取得
└─ Claude Code セッション②「デザイン」
     … アートディレクション + アセット生成 (Higgsfield MCP / gpt-image)
Yu 君側
└─ iPhone アプリ (Core Motion) + 音まわり (BGM: Suno / SE: 自作)
```

司令塔セッションは自分ではほぼコードを書かず、**レビューとマージに集中**。実装は Codex に投げ、視覚確認は「agent-browser でスクショ → Sonnet に画像解析させて合否判定」という検証ループで回しました。

### 2. 1時間で「クソみたいな見た目」の PoC を作る

まず狙ったのは、とにかく早く**遊べる最小構成**を通すこと。開発開始からおよそ1時間、12:58 にはサーバー + ゲーム画面 + 演出の初期 PR 群がマージされ、PoC が動きました。

![12:58 の PoC マージ完了報告](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/poc-merge-report.jpg)
*Claude Code からの 12:58 時点のマージ完了報告*

![PoC 段階のプレイ画面](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/poc.gif)
*1時間時点の PoC。見た目はクソだが、ゲームとしてはもう遊べる*

見た目は正直ひどい。でも「3時間で作るゲーム」としてはこの時点で及第点で、**残り時間を全部クオリティアップに使える**状態になったのが大きかったです。

### 3. コンペ形式でゴールを決めて、共闘ボスバトルへピボット

最初は2人で対戦するテニスゲームを作ろうとしていましたが、マリオパーティーやリズム天国のようなキャッチーさが欲しくなり、**みんなで巨大ボスを共闘して倒す方式**に方向転換（最大4人案から始めて、パフォーマンス重視で最終的に2人固定にしました）。

ゴールのすり合わせは、画像生成でゲームのイメージ画像を**コンペ形式**で複数案作って選ぶ方法を取りました。「ニンテンドー風3案 → ボスバトル構図3案 → 3D想定3案」とラウンドを重ねて絞り込んでいきます。実際に issue に貼られていたコンセプトアートがこちら。

![最初期のテニス案](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/concept-tennis.jpg)
*ラウンド1: 最初期のクリーンなテニス案*

![ボスバトル案（もちもちマスコット）](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/concept-mochi-boss.jpg)
*ラウンド2: ボスバトルにピボットした「もちもちマスコット」案。プリンがボス*

口頭で世界観を議論するより、**絵で選ぶ方が圧倒的に速い**です。

### 4. 2D の可愛い路線から Three.js へ途中変更

当初は 2D グラフィックメインの可愛らしい世界観を想定していましたが、「ドーパミンがドパドパ出る演出全部盛り」にしたくなり、途中で **Three.js (WebGL)** に方針変更。パーティクルや発光エフェクトを大量に重ねても GPU 描画なら 60fps を維持しやすい、という実装都合ともマッチしました。

![採用されたネオン3D案](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/concept-dopamine-3d.jpg)
*ラウンド3で採用された「ドーパミン全開」のネオン3D案。完成版とほぼ同じ画角*

ネオン + Bloom は多少雑なモデルでも「映える」のでハッカソン向きです。

### 5. アセットは画像生成 AI、確認は専用シミュレーター

Claude は 3D レンダリングのコードはそれなりに上手いのですが、**デザインセンスはゼロ**。なのでビジュアルアセットは gpt-image と Higgsfield MCP（nano banana 系モデル）でのハイクオリティ画像生成に全振りしました。ボス・プレイヤー・観客・ロゴ・HUD・判定スタンプなど、最終的に **79 アセット**を生成してゲームに投入。ボスは image-to-3D で GLB メッシュ化までできました（人型キャラは団子状に潰れて不採用。被写体によって向き不向きがあります）。

もう1つ効いたのが **アセット確認シミュレーター**。生成したアセットを実ゲームに組み込んで確認すると1往復が重いので、アセットとエフェクトだけを一覧再生できる `asset-viewer.html` を別途作り、そこで演出の確認・微調整をしてから本体に反映しました。

Yu 君のスマホアプリも順調に仕上がってきたので PoC と接続して動作確認。**iPhone を振るとちゃんとボールが打ち返せた瞬間**はテンション上がりました。Yu 君は実際のスイングログを貯めて「反応してほしい振り / してほしくない振り」を Codex に解析させ、シンプルな処理で判定精度が出るよう詰めてくれていました。

### 6. クオリティと時間のコントロール

ハッカソンは時間との勝負。**「クオリティと時間のコントロールが一番重要」** というのが今回一番の学びでした。

![締切から逆算したアラーム](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/alarm-timer.jpg)
*「基盤完成」「そろそろ纏める時間」「リリース準備」── 締切から逆算してアラームを仕込んでおいた*

この「締切から逆算してアラームを仕込む」やり方は [@GOROman](https://x.com/GOROman) さんから教わったものです。ハッカソンとの相性が抜群でした。

- 追加要素は最小限に絞り、**常に「いつでもリリースできる状態」を維持**しながら積み増す
- 終盤はテストのエビデンス取得を省略して「テスト → 目視1枚 → 即マージ」の最短フローに切り替え
- 発表直前の17:51にも、デモ用の「30秒制限 + スコア2倍」モード（`?demo=true`）の PR をマージ

ビルドタイム終了時点のビフォーアフターがこちら。

![当日の X ポスト（ビフォーアフター）](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/x-post-build.png)
*[当日の投稿](https://x.com/otani_ai_memo)より。下が1時間時点の PoC、上が完成版*

## ピッチ本番 ── 音が出ない

デモ発表の待ち時間も、他チームのピッチを聴きながら手元でスマッシュ判定の閾値をライブ調整（0.96 → 0.92）。「横振りマジむずい」と言いながら直前まで粘ります。

そして本番。せっかくなのでホストの Antti さんに実際にプレイしてもらう実演スタイルにしました。

![ピッチでの実演の様子](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/pitch-demo.jpg)
*会場スクリーンに投影しながら iPhone を振ってもらう実演デモ*

……が、ここで大失態。本来 iPhone から気持ちのいいスマッシュ音が出るはずが、**端末をミュートにしたまま渡してしまった**。直前に「ちゃんと音鳴るんかな」「音が鳴るかどうかめっちゃでかい」と自分たちで言っていたのに、音を鳴らしてテストする時間がなかったための完全なチョンボです。

それでもプレイ自体は大いに盛り上がり、ピッチとしては成功。**ピッチでは何が起こるかわからないトラブルが付きもの**。これも学びの一つです。

## 結果発表

ピッチ後はやり切った達成感と「クオリティは申し分ない」という確信があったので、あとは祈るだけ。Yu 君とひと足先に乾杯していました。

![「3万円とcodexMicro欲しい!!」のポスト](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/x-post-want.png)
*[当日の投稿](https://x.com/otani_ai_memo)より。Judges' Award の副賞は Codex Micro*

いよいよ発表の瞬間──だったのですが、直前まで雑談していたため、**Yu 君に言われるまで何が起こったのか分かりませんでしたw** 何の賞を取れたのかも分からないまま壇上に上がり、ピッチでプレイしてくれた Antti さんから Codex Micro を受け取って、**そこで初めて審査員賞だと気づく**というオチ。

![副賞の Codex Micro](https://raw.githubusercontent.com/aieo-product/blog/main/images/vibeswing-shipaton/prize-codex-micro.jpg)
*副賞の Codex Micro と VibeSwing のタイトル画面*

## おわりに

朝10時に始まったハッカソンはあっという間。それでも、

1. **時間管理が全て** ── 1時間で PoC、残りは全部クオリティアップ。常にリリース可能な状態を維持する
2. **issue 駆動は少人数 + AI エージェントの並行開発と相性抜群** ── 2人 + 複数エージェントで PR 40本弱を無事故マージ
3. **AI の得意不得意で道具を分ける** ── 実装は Codex、視覚検証は Sonnet の画像解析、ビジュアルは画像生成 AI（Claude のデザインセンスはゼロ）
4. **本番デモは音まで含めてリハーサルする** ── やっていればミュート事故は防げた…

という学びを持ち帰りつつ、無事に審査員賞も取れて最高の1日でした。

イベントの終わり際には、明治神宮方面で上がっていた花火が渋谷PARCO の18階から見えて、気持ちよく帰宅。

一緒に戦ってくれた Yu 君、運営の Antti さん・上田さんはじめ Builders Weekend / Shipaton の皆さん、ありがとうございました！Shipaton 本戦もこの勢いで Ship していきます 🚀
