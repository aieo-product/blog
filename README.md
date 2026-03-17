# blog

技術ブログ記事の統合管理リポジトリ。Zenn と Qiita に同時公開する。

## 構成

```
blog/
├── articles/          # Zenn記事
├── public/            # Qiita記事
├── images/            # 記事用画像
├── baseidea/          # 元ネタ（議事録、アイデアメモ）
├── session-logs/      # 記事作成セッションログ
├── books/             # Zenn Books
├── screenshot.mjs     # スクリーンショット生成スクリプト
├── package.json
└── qiita.config.json
```

## 使い方

```bash
# 依存関係インストール
npm install

# Zenn記事の新規作成
npm run zenn:new -- --slug my-article

# Qiita記事の新規作成
npm run qiita:new my-article

# プレビュー
npm run zenn:preview
npm run qiita:preview

# Qiita公開
npm run qiita:publish my-article
```

## 公開方法

- **Zenn**: GitHub連携により `main` ブランチへの push で自動デプロイ
- **Qiita**: `npx qiita publish {slug}` または GitHub Actions で自動公開
