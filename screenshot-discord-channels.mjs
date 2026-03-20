import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = './images/discord-channels';
mkdirSync(OUTPUT_DIR, { recursive: true });

const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', 'Hiragino Sans', Helvetica, Arial, sans-serif;
    background: #1a1a2e;
    color: #e6edf3;
    padding: 40px;
  }
  .card {
    background: #16213e;
    border-radius: 16px;
    padding: 32px;
    border: 1px solid #30363d;
    max-width: 900px;
    margin: 0 auto;
  }
  .card-title {
    font-size: 18px;
    font-weight: 700;
    color: #58a6ff;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
  }
  .badge-green { background: #238636; color: white; }
  .badge-blue { background: #1f6feb; color: white; }
  .badge-red { background: #da3633; color: white; }
  .badge-purple { background: #8b5cf6; color: white; }
  .badge-yellow { background: #d29922; color: white; }
  .badge-discord { background: #5865F2; color: white; }
`;

// 1. Architecture diagram
function buildArchitecture() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .arch { display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .arch-row { display: flex; gap: 20px; align-items: center; justify-content: center; }
  .arch-box {
    border-radius: 12px; padding: 20px 28px; text-align: center;
    min-width: 200px; position: relative;
  }
  .arch-discord { background: #2d2654; border: 2px solid #5865F2; }
  .arch-mcp { background: #2d1f4e; border: 2px solid #8b5cf6; }
  .arch-claude { background: #1b2d1b; border: 2px solid #238636; min-width: 700px; }
  .arch-phone { background: #1e3a5f; border: 2px solid #58a6ff; }
  .arch-box h4 { font-size: 16px; margin-bottom: 8px; }
  .arch-box p { font-size: 13px; color: #7d8590; }
  .arch-connector { font-size: 24px; color: #5865F2; }
  .arch-connector-v { font-size: 24px; color: #8b5cf6; }
  .arch-inner { display: flex; gap: 16px; margin-top: 16px; }
  .arch-service {
    flex: 1; background: #0d1117; border-radius: 8px; padding: 16px;
    text-align: left;
  }
  .arch-service h5 { font-size: 14px; margin-bottom: 6px; color: #e6edf3; }
  .arch-service p { font-size: 12px; color: #7d8590; line-height: 1.6; }
  .flow-label {
    font-size: 11px; color: #7d8590; text-align: center;
    margin-top: 4px;
  }
</style></head><body>
  <div class="card">
    <div class="card-title">Claude Code Channels x Discord 全体構成</div>
    <div class="arch">
      <div class="arch-row">
        <div class="arch-box arch-phone">
          <h4>iPhone / iPad</h4>
          <p>Discord アプリから<br>メッセージを送信</p>
        </div>
        <div class="arch-connector">--></div>
        <div class="arch-box arch-discord">
          <h4>Discord Bot</h4>
          <p>Developer Portal で作成<br>自分のサーバーに招待</p>
        </div>
      </div>
      <div class="arch-connector-v">MCP (Model Context Protocol)</div>
      <div class="arch-box arch-mcp">
        <h4>Discord Plugin</h4>
        <p>claude-plugins-official の Discord プラグイン<br>Bot のメッセージを Claude Code に中継</p>
      </div>
      <div class="arch-connector-v">--channels フラグで起動</div>
      <div class="arch-box arch-claude">
        <h4>Claude Code セッション（母艦PC）</h4>
        <p>常時起動でコーディングタスクを実行</p>
        <div class="arch-inner">
          <div class="arch-service">
            <h5>受信</h5>
            <p>Discord からのメッセージ・<br>ファイル添付を受け取る</p>
          </div>
          <div class="arch-service">
            <h5>実行</h5>
            <p>タスクを解釈して<br>コード生成・編集</p>
          </div>
          <div class="arch-service">
            <h5>返信</h5>
            <p>結果を Discord に<br>メッセージで返信</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 2. Setup flow
function buildSetupFlow() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .steps { display: flex; flex-direction: column; gap: 12px; }
  .step {
    display: flex; gap: 16px; align-items: flex-start;
    background: #0d1117; border-radius: 12px; padding: 18px 20px;
  }
  .step-num {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; flex-shrink: 0; color: white;
  }
  .step-discord { background: #5865F2; }
  .step-claude { background: #238636; }
  .step-pair { background: #8b5cf6; }
  .step-content { flex: 1; }
  .step-content h4 { font-size: 14px; margin-bottom: 4px; color: #e6edf3; }
  .step-content p { font-size: 13px; color: #7d8590; line-height: 1.5; }
  .step-code {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 10px 14px; margin-top: 8px;
    font-family: 'SF Mono', Monaco, monospace; font-size: 12px;
    color: #3fb950;
  }
  .step-note {
    background: #2d2b1b; border-left: 3px solid #d29922;
    padding: 8px 12px; border-radius: 0 8px 8px 0;
    margin-top: 8px; font-size: 12px; color: #d29922;
  }
  .section-label {
    font-size: 13px; font-weight: 700; color: #7d8590;
    margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 1px;
  }
</style></head><body>
  <div class="card">
    <div class="card-title">セットアップ手順</div>
    <div class="section-label">Discord 側</div>
    <div class="steps">
      <div class="step">
        <div class="step-num step-discord">1</div>
        <div class="step-content">
          <h4>Discord Bot を作成</h4>
          <p>Developer Portal で New Application → Bot セクションでトークンをコピー → Message Content Intent を ON</p>
        </div>
      </div>
      <div class="step">
        <div class="step-num step-discord">2</div>
        <div class="step-content">
          <h4>Bot をサーバーに招待</h4>
          <p>OAuth2 > URL Generator で bot スコープ + 必要な権限を選択 → 生成 URL をブラウザで開く</p>
        </div>
      </div>
    </div>
    <div class="section-label" style="margin-top: 16px;">Claude Code 側</div>
    <div class="steps">
      <div class="step">
        <div class="step-num step-claude">3</div>
        <div class="step-content">
          <h4>プラグインをインストール</h4>
          <div class="step-code">/plugin marketplace add https://github.com/anthropics/claude-plugins-official.git<br>/plugin install discord@claude-plugins-official<br>/reload-plugins</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num step-claude">4</div>
        <div class="step-content">
          <h4>Bot トークンを設定</h4>
          <div class="step-code">/discord:configure &lt;ボットトークン&gt;</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num step-claude">5</div>
        <div class="step-content">
          <h4>Channels 付きで起動</h4>
          <div class="step-code">claude --channels plugin:discord@claude-plugins-official</div>
        </div>
      </div>
    </div>
    <div class="section-label" style="margin-top: 16px;">ペアリング</div>
    <div class="steps">
      <div class="step">
        <div class="step-num step-pair">6</div>
        <div class="step-content">
          <h4>Discord から Bot に DM → ペアリングコードで接続</h4>
          <div class="step-code">/discord:access pair &lt;ペアリングコード&gt;</div>
          <div class="step-note">Bot から「Paired! Say hi to Claude.」と返信が来れば成功</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 3. Available tools
function buildTools() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .tools { display: flex; flex-direction: column; gap: 12px; }
  .tool-item {
    display: flex; gap: 16px; align-items: center;
    background: #0d1117; border-radius: 12px; padding: 16px 20px;
    border: 1px solid #30363d;
  }
  .tool-icon { font-size: 28px; flex-shrink: 0; }
  .tool-info { flex: 1; }
  .tool-name { font-size: 14px; font-weight: 700; color: #e6edf3; margin-bottom: 4px; }
  .tool-name code {
    background: #161b22; padding: 2px 8px; border-radius: 6px;
    font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
    color: #79c0ff;
  }
  .tool-desc { font-size: 13px; color: #7d8590; }
  .tool-limit { font-size: 11px; color: #d29922; margin-top: 4px; }
</style></head><body>
  <div class="card">
    <div class="card-title">Discord 経由で使えるツール</div>
    <div class="tools">
      <div class="tool-item">
        <div class="tool-icon">💬</div>
        <div class="tool-info">
          <div class="tool-name"><code>reply</code> メッセージ送信</div>
          <div class="tool-desc">Claude からの返信を Discord に送信。ファイル添付も可能</div>
          <div class="tool-limit">最大 10 ファイル / 各 25MB まで</div>
        </div>
      </div>
      <div class="tool-item">
        <div class="tool-icon">👍</div>
        <div class="tool-info">
          <div class="tool-name"><code>react</code> リアクション</div>
          <div class="tool-desc">メッセージに絵文字リアクションを追加</div>
        </div>
      </div>
      <div class="tool-item">
        <div class="tool-icon">✏️</div>
        <div class="tool-info">
          <div class="tool-name"><code>edit_message</code> メッセージ編集</div>
          <div class="tool-desc">Bot 自身が送信したメッセージを編集（進捗更新に便利）</div>
        </div>
      </div>
      <div class="tool-item">
        <div class="tool-icon">📜</div>
        <div class="tool-info">
          <div class="tool-name"><code>fetch_messages</code> 履歴取得</div>
          <div class="tool-desc">直近のメッセージ履歴を取得して文脈を把握</div>
          <div class="tool-limit">最大 100 件</div>
        </div>
      </div>
      <div class="tool-item">
        <div class="tool-icon">📎</div>
        <div class="tool-info">
          <div class="tool-name"><code>download_attachment</code> 添付ダウンロード</div>
          <div class="tool-desc">Discord に添付されたファイルをダウンロード</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

async function captureScreenshot(browser, html, filename) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: `${OUTPUT_DIR}/${filename}`,
    fullPage: true,
  });
  console.log(`Captured: ${OUTPUT_DIR}/${filename}`);
  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  await captureScreenshot(browser, buildArchitecture(), 'architecture.png');
  await captureScreenshot(browser, buildSetupFlow(), 'setup-flow.png');
  await captureScreenshot(browser, buildTools(), 'tools.png');

  await browser.close();
  console.log('Done! All screenshots saved to', OUTPUT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
