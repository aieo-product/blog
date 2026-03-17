import puppeteer from 'puppeteer';
import { marked } from 'marked';
import { writeFileSync } from 'fs';

const OUTPUT_DIR = './article/images';

const issue = {
  number: 1,
  title: 'ユーザープロフィール画面に「最終ログイン日時」フィールドを追加',
  user: 'syn-otani',
  created_at: '2026-03-07T11:32:10Z',
  state: 'open',
  body: `## 概要
ユーザープロフィール画面に「最終ログイン日時」フィールドを追加したい

## 現状
プロフィール画面にログイン日時の表示がない。ユーザーがいつ最後にログインしたかを確認する手段がない。

## 期待する動作
- プロフィールセクションに「最終ログイン日時」を表示
- フォーマット：YYYY/MM/DD HH:mm
- APIレスポンスの既存フィールド \`last_login_at\` を利用

## 受け入れ条件
- [ ] プロフィール画面に最終ログイン日時が表示される
- [ ] 日時フォーマットが \`YYYY/MM/DD HH:mm\` である
- [ ] 未ログインユーザーの場合は「未ログイン」と表示される`
};

const comments = [
  {
    user: 'claude-ai',
    avatar: '🤖',
    role: 'AI Agent',
    created_at: '2026-03-07T11:33:32Z',
    body: `## 🤖 AIエージェントによる修正方針

Issueの内容とコードベースを調査しました。以下の方針で修正を進めます。

### 修正対象ファイル
1. \`src/components/UserProfile.tsx\` - 表示コンポーネント
2. \`src/types/user.ts\` - 型定義への \`lastLoginAt\` 追加

### 修正方針
1. **UserProfileコンポーネント**に \`lastLoginAt\` プロパティを追加
2. APIレスポンスの既存フィールド \`last_login_at\` を利用（新規API不要）
3. **表示位置**：メールアドレスの下
4. \`date-fns\` の \`format\` 関数でフォーマット（\`yyyy/MM/dd HH:mm\`）
5. \`lastLoginAt\` が \`null\` の場合は「未ログイン」を表示

### 影響範囲
- UserProfileコンポーネントのみ。他コンポーネントへの影響なし
- 既存テストへの影響なし

この方針でよろしければ、実装に進みます。`
  },
  {
    user: 'syn-otani',
    avatar: '👤',
    role: 'Human Reviewer',
    created_at: '2026-03-07T11:33:52Z',
    body: `## 👤 レビュー（人間）

方針概ね問題ありませんが、1点修正をお願いします。

> 表示位置はメールアドレスの下ではなく、**プロフィールセクションの一番上**にしてください。
> 最終ログイン日時はセキュリティ上重要な情報なので、目立つ位置に配置したいです。

それ以外はOKです。修正方針を更新して実装に進めてください。`
  },
  {
    user: 'claude-ai',
    avatar: '🤖',
    role: 'AI Agent',
    created_at: '2026-03-07T11:34:33Z',
    body: `## 🤖 方針更新・実装完了

レビューを反映し、表示位置をプロフィールセクションの一番上に変更しました。

### 変更内容
- \`UserProfile.tsx\`: \`lastLoginAt\` の表示位置をセクション先頭に移動
- \`user.ts\`: \`lastLoginAt?: string | null\` を型定義に追加
- 未ログイン時は「未ログイン」を表示するガード処理を追加

### 実装ブランチ
\`feature/add-last-login-display\`

ローカルでの動作確認をお願いします。`
  },
  {
    user: 'syn-otani',
    avatar: '👤',
    role: 'Human Reviewer',
    created_at: '2026-03-07T11:35:32Z',
    body: `## 👤 動作確認完了

ローカルで動作確認しました。

**確認結果：**
- ✅ プロフィールセクションの一番上に最終ログイン日時が表示される
- ✅ フォーマットが \`2026/03/07 14:30\` の形式で正しい
- ✅ 未ログインユーザーの場合「未ログイン」と表示される

MR/PRの作成をお願いします。`
  }
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

function renderComment(c, index) {
  const isAI = c.role === 'AI Agent';
  const borderColor = isAI ? '#8b5cf6' : '#3b82f6';
  const bgColor = isAI ? '#1a1040' : '#0a1628';
  const badgeColor = isAI ? '#7c3aed' : '#2563eb';
  const badgeText = isAI ? 'AI Agent' : 'Human';

  return `
  <div class="comment" style="border-left: 3px solid ${borderColor}; background: ${bgColor}; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
    <div class="comment-header" style="padding: 12px 16px; background: ${bgColor}; border-bottom: 1px solid #30363d; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 24px; line-height: 1;">${c.avatar}</span>
      <strong style="color: #e6edf3;">${c.user}</strong>
      <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${badgeText}</span>
      <span style="color: #7d8590; margin-left: auto; font-size: 13px;">${formatDate(c.created_at)}</span>
    </div>
    <div class="comment-body markdown-body" style="padding: 16px;">
      ${marked.parse(c.body)}
    </div>
  </div>`;
}

function buildHTML(showComments = 'all') {
  const issueBody = marked.parse(issue.body);
  let commentsHTML = '';

  if (showComments === 'all') {
    commentsHTML = comments.map((c, i) => renderComment(c, i)).join('\n');
  } else if (showComments === 'first-two') {
    commentsHTML = comments.slice(0, 2).map((c, i) => renderComment(c, i)).join('\n');
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', Helvetica, Arial, sans-serif;
    background: #0d1117;
    color: #e6edf3;
    padding: 32px;
    max-width: 1000px;
    margin: 0 auto;
  }
  .repo-path {
    color: #7d8590;
    font-size: 14px;
    margin-bottom: 8px;
  }
  .repo-path a { color: #58a6ff; text-decoration: none; }
  .issue-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #30363d;
  }
  .issue-title {
    font-size: 28px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 8px;
  }
  .issue-title .number { color: #7d8590; font-weight: 400; }
  .issue-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #7d8590;
  }
  .state-badge {
    background: #238636;
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 500;
  }
  .issue-body-container {
    border: 1px solid #30363d;
    border-radius: 8px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .issue-body-header {
    padding: 12px 16px;
    background: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .issue-body-header strong { color: #e6edf3; }
  .issue-body-header .date { color: #7d8590; margin-left: auto; font-size: 13px; }
  .issue-body {
    padding: 16px;
  }
  .markdown-body h2 { font-size: 20px; margin: 16px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #30363d; color: #e6edf3; }
  .markdown-body h3 { font-size: 16px; margin: 12px 0 6px; color: #e6edf3; }
  .markdown-body p { margin: 8px 0; line-height: 1.6; color: #e6edf3; }
  .markdown-body ul, .markdown-body ol { margin: 8px 0; padding-left: 24px; }
  .markdown-body li { margin: 4px 0; line-height: 1.6; color: #e6edf3; }
  .markdown-body code {
    background: #1f2937;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: #f0abfc;
  }
  .markdown-body blockquote {
    border-left: 3px solid #3b82f6;
    padding: 8px 16px;
    margin: 8px 0;
    color: #a5b4c8;
    background: #0f1923;
    border-radius: 0 6px 6px 0;
  }
  .markdown-body strong { color: #f0f6fc; }
  .markdown-body input[type="checkbox"] { margin-right: 6px; }

  .timeline-line {
    width: 2px;
    height: 24px;
    background: #30363d;
    margin-left: 20px;
  }
  .comments-section {
    margin-top: 8px;
  }

  .workflow-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #1a1a2e;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 4px 10px;
    margin: 8px 0;
    font-size: 13px;
    color: #7d8590;
  }
  .workflow-label .step { color: #58a6ff; font-weight: 600; }
</style>
</head>
<body>
  <div class="repo-path">
    <a>aieo-product</a> / <a>issueDrivenDevelopment</a>
  </div>
  <div class="issue-header">
    <div class="issue-title">${issue.title} <span class="number">#${issue.number}</span></div>
    <div class="issue-meta">
      <span class="state-badge">● Open</span>
      <span><strong style="color:#e6edf3">${issue.user}</strong> opened this issue on ${formatDate(issue.created_at)}</span>
    </div>
  </div>

  <div class="issue-body-container">
    <div class="issue-body-header">
      <span style="font-size: 20px;">📋</span>
      <strong>${issue.user}</strong>
      <span class="date">${formatDate(issue.created_at)}</span>
    </div>
    <div class="issue-body markdown-body">
      ${issueBody}
    </div>
  </div>

  <div class="comments-section">
    <div class="workflow-label"><span class="step">Step 1</span> Issue作成完了 → AIエージェントが読み取り開始</div>
    <div class="timeline-line"></div>
    ${commentsHTML}
  </div>
</body>
</html>`;
}

async function captureScreenshot(browser, html, filename, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({
    path: `${OUTPUT_DIR}/${filename}`,
    fullPage: true,
    ...opts
  });
  console.log(`Captured: ${filename}`);
  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  // 1. Issue overview (issue body only)
  await captureScreenshot(browser, buildHTML('none'), 'issue-overview.png');

  // 2. AI proposal + Human review (first 2 comments)
  await captureScreenshot(browser, buildHTML('first-two'), 'issue-workflow.png');

  // 3. Full thread (all comments)
  await captureScreenshot(browser, buildHTML('all'), 'issue-full.png');

  await browser.close();
  console.log('Done! All screenshots saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
