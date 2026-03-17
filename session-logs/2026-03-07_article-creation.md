# セッションログ: Issue駆動開発 記事作成

## 日時
2026年3月7日

## 目的
baseIdeaの議事録を元に、Issue駆動開発について詳しく説明するZenn/Qiita向け記事を作成する

## 入力情報
- `baseidea/_2026_03_06 18_25 JST に開始した会議 - Gemini によるメモ.md`
  - 2026年3月6日の会議議事録（Geminiによる自動メモ）
  - 参加者：大谷剛弘、satoru o
- 参考記事スタイル: https://zenn.dev/ryoushin/articles/c5056195385090

## ユーザー要件
- **記事形式**: Zenn/Qiita投稿用Markdown（frontmatter付き）
- **ターゲット読者**: エンジニア・開発者
- **含めるトピック**:
  1. Issueベース開発手法の全体像
  2. ワークフロースキルの詳細（概念のみ、Skill自体は非公開）
  3. 実績・成功事例
- **議事録の使用範囲**: 「AI開発手法の普及を最優先事項とする方針」まで（それ以降は雑談のため除外）
- **追加要件**: OpenAI Symphony（2026年3月5日公開）への言及。自分の方が先に実践していたが、OpenAIも同じ手法を採用したというお墨付きの主張

## 実施内容

### 1. 議事録の分析
議事録から以下の核となる概念を抽出：
- AIとの会話を全てIssueに書き出す手法
- Issueを設計書として活用
- セッション断絶の解決（AIツールの切り替え可能）
- 属人化の解消（人もAIも交代可能）
- 各ステップでの人間によるゲートレビュー
- Git Worktreeによる複数エージェント並列開発
- コンテキスト管理（Claude MDの最小化）
- ベトナム人チームでの実践実績

### 2. OpenAI Symphony調査
WebSearchで以下を確認：
- Symphony: Elixirベースのオープンソースフレームワーク（Apache 2.0）
- Issue TrackerからAIエージェントが自動で作業するワークフロー
- Sandbox Isolationで各Issue専用環境を作成
- WORKFLOW.mdでエージェント設定をリポジトリ内管理
- Proof of Work（CI、テスト、ウォークスルー）で品質保証
- 「ハーネスエンジニアリング」の概念
- UBSアナリストが「AIの働き方がチャットからタスク実行へシフト」と評価

### 3. 参考記事スタイル分析
WebFetchで参考記事（Zenn-Qiita Sync）の構成を分析：
- frontmatter付き（title, emoji, type, topics, published）
- ですます調
- 絵文字付きH2見出し
- コードブロック、比較表、箇条書きを活用
- 約3,500字

### 4. 記事作成
`article/issue-driven-ai-development.md` として作成
- 構成: はじめに → 課題 → 概念 → 3つの柱 → ワークフロー → 複数エージェント → Symphony比較 → 実績 → 展望 → まとめ
- Symphony比較表で共通点を明示
- 「2025年後半から実践していた」と時系列を明記

## 成果物
- `article/issue-driven-ai-development.md` - Zenn/Qiita投稿用記事

## 未完了タスク（次セッションで対応）
- [ ] Zenn CLIセットアップとプレビュー
- [ ] Qiita CLIセットアップとプレビュー
- [ ] 記事の推敲・修正
- [ ] 実際の投稿

## 参考URL
- [OpenAI Symphony（GitHub）](https://github.com/openai/symphony)
- [OpenAI Symphony - MarkTechPost](https://www.marktechpost.com/2026/03/05/openai-releases-symphony-an-open-source-agentic-framework-for-orchestrating-autonomous-ai-agents-through-structured-scalable-implementation-runs/)
- [Symphony UBS分析 - Yahoo Finance](https://finance.yahoo.com/news/openai-symphony-may-shift-ai-164600732.html)
- [Symphony解説 - Top AI Product](https://topaiproduct.com/2026/03/04/openai-symphony-finally-a-framework-that-lets-you-stop-babysitting-your-coding-agents/)
