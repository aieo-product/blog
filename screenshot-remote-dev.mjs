import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = './images/remote-dev';
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
`;

// 1. Before/After comparison
function buildBeforeAfter() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .comparison { display: flex; gap: 24px; }
  .panel { flex: 1; border-radius: 12px; padding: 24px; }
  .panel-before { background: #2d1b1b; border: 2px solid #da3633; }
  .panel-after { background: #1b2d1b; border: 2px solid #238636; }
  .panel-label {
    font-size: 14px; font-weight: 700; text-transform: uppercase;
    margin-bottom: 16px; letter-spacing: 1px;
  }
  .panel-before .panel-label { color: #f85149; }
  .panel-after .panel-label { color: #3fb950; }
  .panel h3 { font-size: 16px; margin-bottom: 12px; color: #e6edf3; }
  .data-flow {
    background: #0d1117; border-radius: 8px; padding: 16px;
    margin-bottom: 16px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
  }
  .flow-line { margin: 4px 0; color: #7d8590; }
  .flow-highlight-red { color: #f85149; font-weight: 600; }
  .flow-highlight-green { color: #3fb950; font-weight: 600; }
  .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .metric-label { color: #7d8590; font-size: 14px; }
  .metric-value { font-weight: 600; font-size: 14px; }
  .metric-bad { color: #f85149; }
  .metric-good { color: #3fb950; }
  .arrow-section { display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 0 8px; }
  .arrow { font-size: 32px; color: #58a6ff; }
  .arrow-text { color: #58a6ff; font-size: 12px; font-weight: 600; margin-top: 4px; }
</style></head><body>
  <div class="card">
    <div class="card-title">📊 Before / After 比較</div>
    <div class="comparison">
      <div class="panel panel-before">
        <div class="panel-label">❌ Before: TeamViewer</div>
        <div class="data-flow">
          <div class="flow-line">リモートPC</div>
          <div class="flow-line">  ↓ <span class="flow-highlight-red">画面全体を映像として転送</span></div>
          <div class="flow-line">  ↓ <span class="flow-highlight-red">（1920×1080 を常時ストリーム）</span></div>
          <div class="flow-line">TeamViewer中継サーバー</div>
          <div class="flow-line">  ↓ <span class="flow-highlight-red">帯域大量消費</span></div>
          <div class="flow-line">母艦PC</div>
        </div>
        <div class="metric"><span class="metric-label">遅延</span><span class="metric-value metric-bad">常にカクカク</span></div>
        <div class="metric"><span class="metric-label">帯域消費</span><span class="metric-value metric-bad">大（映像転送）</span></div>
        <div class="metric"><span class="metric-label">切断時</span><span class="metric-value metric-bad">作業が全て中断</span></div>
        <div class="metric"><span class="metric-label">セッション永続</span><span class="metric-value metric-bad">なし</span></div>
      </div>
      <div class="arrow-section">
        <div class="arrow">→</div>
        <div class="arrow-text">移行</div>
      </div>
      <div class="panel panel-after">
        <div class="panel-label">✅ After: Tailscale + SSH + cmux</div>
        <div class="data-flow">
          <div class="flow-line">リモートPC</div>
          <div class="flow-line">  ↓ <span class="flow-highlight-green">テキストのみ送受信</span></div>
          <div class="flow-line">  ↓ <span class="flow-highlight-green">（P2P直接接続・暗号化済み）</span></div>
          <div class="flow-line">Tailscale（WireGuard VPN）</div>
          <div class="flow-line">  ↓ <span class="flow-highlight-green">帯域ほぼゼロ</span></div>
          <div class="flow-line">母艦PC</div>
        </div>
        <div class="metric"><span class="metric-label">遅延</span><span class="metric-value metric-good">ほぼゼロ</span></div>
        <div class="metric"><span class="metric-label">帯域消費</span><span class="metric-value metric-good">極小（テキスト転送）</span></div>
        <div class="metric"><span class="metric-label">切断時</span><span class="metric-value metric-good">再接続で即復帰</span></div>
        <div class="metric"><span class="metric-label">セッション永続</span><span class="metric-value metric-good">cmuxで永続化</span></div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 2. Architecture diagram
function buildArchitecture() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .arch { display: flex; flex-direction: column; gap: 20px; align-items: center; }
  .arch-box {
    border-radius: 12px; padding: 20px 28px; text-align: center;
    min-width: 300px; position: relative;
  }
  .arch-remote { background: #1e3a5f; border: 2px solid #58a6ff; }
  .arch-vpn { background: #2d1f4e; border: 2px solid #8b5cf6; }
  .arch-mac { background: #1b2d1b; border: 2px solid #238636; min-width: 700px; }
  .arch-box h4 { font-size: 16px; margin-bottom: 8px; }
  .arch-box p { font-size: 13px; color: #7d8590; }
  .arch-connector { font-size: 28px; color: #8b5cf6; }
  .arch-inner { display: flex; gap: 16px; margin-top: 16px; }
  .arch-service {
    flex: 1; background: #0d1117; border-radius: 8px; padding: 16px;
    text-align: left;
  }
  .arch-service h5 { font-size: 14px; margin-bottom: 6px; color: #e6edf3; }
  .arch-service p { font-size: 12px; color: #7d8590; line-height: 1.6; }
  .arch-service .usage {
    margin-top: 8px; padding: 6px 10px; border-radius: 6px;
    font-size: 12px; font-weight: 600;
  }
  .usage-main { background: #1b2d1b; color: #3fb950; }
  .usage-sub { background: #2d2b1b; color: #d29922; }
  .usage-file { background: #1e2a3a; color: #58a6ff; }
  .percent-bar { height: 6px; border-radius: 3px; margin-top: 8px; background: #30363d; overflow: hidden; }
  .percent-fill { height: 100%; border-radius: 3px; }
  .percent-90 { width: 90%; background: #3fb950; }
  .percent-10 { width: 10%; background: #d29922; }
</style></head><body>
  <div class="card">
    <div class="card-title">🏗️ 全体構成図</div>
    <div class="arch">
      <div class="arch-box arch-remote">
        <h4>💻 リモート端末</h4>
        <p>外出先PC / iPad / スマホ など</p>
      </div>
      <div class="arch-connector">↕️ 暗号化P2P接続</div>
      <div class="arch-box arch-vpn">
        <h4>🔒 Tailscale（WireGuard VPN）</h4>
        <p>NAT/ファイアウォール自動突破 ・ 設定不要 ・ P2P直接接続で高速</p>
      </div>
      <div class="arch-connector">↕️</div>
      <div class="arch-box arch-mac">
        <h4>🖥️ 母艦PC（macOS）</h4>
        <p>開発環境が全て入っているメインマシン</p>
        <div class="arch-inner">
          <div class="arch-service">
            <h5>🔧 SSH + cmux</h5>
            <p>Claude Code 操作<br>コード閲覧・編集<br>Git 操作<br>ファイル検索</p>
            <div class="usage usage-main">⚡ 普段使い（90%）</div>
            <div class="percent-bar"><div class="percent-fill percent-90"></div></div>
          </div>
          <div class="arch-service">
            <h5>📦 Taildrop</h5>
            <p>AirDrop 感覚で<br>デバイス間ファイル転送<br>SSH 不要・GUI 対応</p>
            <div class="usage usage-file">📁 ファイル転送</div>
          </div>
          <div class="arch-service">
            <h5>🖥️ macOS画面共有（VNC）</h5>
            <p>ブラウザ動作確認<br>GUIアプリ操作<br>システム設定変更</p>
            <div class="usage usage-sub">📺 必要な時だけ</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 3. Tailscale setup steps
function buildTailscaleSetup() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .steps { display: flex; flex-direction: column; gap: 16px; }
  .step {
    display: flex; gap: 16px; align-items: flex-start;
    background: #0d1117; border-radius: 12px; padding: 20px;
  }
  .step-num {
    width: 36px; height: 36px; border-radius: 50%;
    background: #1f6feb; color: white; display: flex;
    align-items: center; justify-content: center;
    font-weight: 700; font-size: 16px; flex-shrink: 0;
  }
  .step-content { flex: 1; }
  .step-content h4 { font-size: 15px; margin-bottom: 6px; color: #e6edf3; }
  .step-content p { font-size: 13px; color: #7d8590; line-height: 1.6; }
  .step-code {
    background: #161b22; border: 1px solid #30363d; border-radius: 8px;
    padding: 12px 16px; margin-top: 10px;
    font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
    color: #3fb950;
  }
  .step-note {
    background: #2d2b1b; border-left: 3px solid #d29922;
    padding: 10px 14px; border-radius: 0 8px 8px 0;
    margin-top: 10px; font-size: 12px; color: #d29922;
  }
  .step-img {
    background: #161b22; border-radius: 8px; padding: 16px;
    margin-top: 10px; text-align: center;
  }
  .menubar {
    display: inline-flex; align-items: center; gap: 12px;
    background: #2d333b; border-radius: 6px; padding: 8px 16px;
  }
  .menubar-icon { font-size: 20px; }
  .menubar-item { font-size: 13px; color: #7d8590; }
  .menubar-highlight { color: #58a6ff; font-weight: 600; }
</style></head><body>
  <div class="card">
    <div class="card-title">🔧 Tailscale セットアップ手順</div>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-content">
          <h4>Tailscale をインストール</h4>
          <p>Homebrew で一発インストール。App Store からも入れられます。</p>
          <div class="step-code">$ brew install --cask tailscale</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-content">
          <h4>ログインしてデバイスを接続</h4>
          <p>メニューバーの Tailscale アイコンをクリック → ログイン。Google / Microsoft / GitHub アカウントが使えます。</p>
          <div class="step-img">
            <div class="menubar">
              <span class="menubar-icon">🔗</span>
              <span class="menubar-item">Tailscale</span>
              <span class="menubar-item">|</span>
              <span class="menubar-highlight">Connected</span>
              <span class="menubar-item">|</span>
              <span class="menubar-item">100.x.x.x</span>
            </div>
            <p style="color: #7d8590; font-size: 12px; margin-top: 8px;">↑ メニューバーに表示される Tailscale アイコン</p>
          </div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-content">
          <h4>接続先の IP を確認</h4>
          <p>母艦PCの Tailscale IP アドレスをメモしておきます。</p>
          <div class="step-code">$ tailscale ip<br>100.64.0.1</div>
          <div class="step-code">$ tailscale status<br>100.64.0.1  my-macbook    otani@  macOS  -<br>100.64.0.2  my-ipad       otani@  iOS    idle</div>
          <div class="step-note">⚠️ App Store 版は tailscale コマンドが使えません。<br>→ alias tailscale="/Applications/Tailscale.app/Contents/MacOS/Tailscale" を ~/.zshrc に追加</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-content">
          <h4>MagicDNS を有効化（推奨）</h4>
          <p>管理コンソールで MagicDNS を ON にすると、IP の代わりにマシン名で接続できます。</p>
          <div class="step-code">
            # IP アドレスの代わりに…<br>
            $ ssh user@100.64.0.1<br><br>
            # マシン名で OK！<br>
            $ ssh user@my-macbook
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 4. SSH setup steps
function buildSSHSetup() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .macos-settings {
    background: #1c1c1e; border-radius: 12px; overflow: hidden;
    border: 1px solid #38383a; max-width: 600px; margin: 0 auto 20px;
  }
  .settings-header {
    background: #2c2c2e; padding: 12px 16px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #38383a;
  }
  .settings-dots { display: flex; gap: 6px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }
  .settings-title { font-size: 14px; color: #e6edf3; margin-left: 8px; }
  .settings-body { padding: 20px; }
  .settings-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; background: #2c2c2e; border-radius: 10px;
    margin-bottom: 10px;
  }
  .settings-row-left { display: flex; align-items: center; gap: 12px; }
  .settings-icon { font-size: 24px; }
  .settings-label { font-size: 15px; color: #e6edf3; }
  .settings-sublabel { font-size: 12px; color: #7d8590; }
  .toggle {
    width: 50px; height: 30px; border-radius: 15px;
    position: relative; display: inline-block;
  }
  .toggle-on { background: #30d158; }
  .toggle-off { background: #636366; }
  .toggle-knob {
    width: 26px; height: 26px; border-radius: 50%;
    background: white; position: absolute; top: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .toggle-on .toggle-knob { right: 2px; }
  .toggle-off .toggle-knob { left: 2px; }
  .method-cards { display: flex; gap: 16px; margin-top: 20px; }
  .method-card {
    flex: 1; background: #0d1117; border-radius: 12px; padding: 20px;
    border: 1px solid #30363d;
  }
  .method-card h4 { font-size: 14px; margin-bottom: 8px; }
  .method-card p { font-size: 12px; color: #7d8590; line-height: 1.6; }
  .method-code {
    background: #161b22; border-radius: 6px; padding: 10px 12px;
    margin-top: 10px; font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px; color: #3fb950;
  }
  .recommend { border-color: #8b5cf6 !important; }
  .recommend-badge {
    background: #8b5cf6; color: white; padding: 2px 8px;
    border-radius: 10px; font-size: 11px; font-weight: 600;
    margin-left: 8px;
  }
</style></head><body>
  <div class="card">
    <div class="card-title">🔐 SSH 設定方法</div>
    <div class="macos-settings">
      <div class="settings-header">
        <div class="settings-dots">
          <div class="dot dot-red"></div>
          <div class="dot dot-yellow"></div>
          <div class="dot dot-green"></div>
        </div>
        <span class="settings-title">システム設定 → 一般 → 共有</span>
      </div>
      <div class="settings-body">
        <div class="settings-row">
          <div class="settings-row-left">
            <span class="settings-icon">🌐</span>
            <div>
              <div class="settings-label">リモートログイン</div>
              <div class="settings-sublabel">SSH 接続を許可します</div>
            </div>
          </div>
          <div class="toggle toggle-on"><div class="toggle-knob"></div></div>
        </div>
        <div class="settings-row">
          <div class="settings-row-left">
            <span class="settings-icon">🖥️</span>
            <div>
              <div class="settings-label">画面共有</div>
              <div class="settings-sublabel">VNC 接続を許可します</div>
            </div>
          </div>
          <div class="toggle toggle-on"><div class="toggle-knob"></div></div>
        </div>
      </div>
    </div>
    <div class="method-cards">
      <div class="method-card">
        <h4>方法A: 通常のSSH</h4>
        <p>SSH鍵を事前に設定しておく従来の方法です。</p>
        <div class="method-code">
          # macOS 側でリモートログイン有効化<br>
          $ sudo systemsetup -setremotelogin on<br><br>
          # リモート側から接続<br>
          $ ssh user@my-macbook
        </div>
      </div>
      <div class="method-card recommend">
        <h4>方法B: Tailscale SSH <span class="recommend-badge">おすすめ</span></h4>
        <p>SSH鍵の管理が不要！Tailscaleの認証だけで接続できます。</p>
        <div class="method-code">
          # 母艦PC側で有効化<br>
          $ sudo tailscale up --ssh<br><br>
          # リモート側から接続（鍵不要！）<br>
          $ ssh user@my-macbook
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 5. cmux workspace layout
function buildCmuxLayout() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .terminal {
    background: #0d1117; border-radius: 12px; overflow: hidden;
    border: 1px solid #30363d; max-width: 700px; margin: 0 auto 20px;
  }
  .terminal-header {
    background: #161b22; padding: 10px 16px;
    display: flex; align-items: center; gap: 8px;
    border-bottom: 1px solid #30363d;
  }
  .terminal-dots { display: flex; gap: 6px; }
  .tdot { width: 12px; height: 12px; border-radius: 50%; }
  .tdot-red { background: #ff5f57; }
  .tdot-yellow { background: #febc2e; }
  .tdot-green { background: #28c840; }
  .terminal-title { font-size: 13px; color: #7d8590; margin-left: 8px; }
  .terminal-body { padding: 0; }
  .panes { display: flex; flex-direction: column; }
  .pane-top {
    padding: 16px 20px; border-bottom: 2px solid #58a6ff;
    min-height: 160px;
  }
  .pane-bottom { display: flex; }
  .pane-bottom-left {
    flex: 1; padding: 16px 20px;
    border-right: 2px solid #58a6ff;
    min-height: 120px;
  }
  .pane-bottom-right {
    flex: 1; padding: 16px 20px;
    min-height: 120px;
  }
  .pane-label {
    font-size: 11px; color: #58a6ff; font-weight: 600;
    margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;
  }
  .terminal-line {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 13px; line-height: 1.8; color: #7d8590;
  }
  .prompt { color: #3fb950; }
  .cmd { color: #e6edf3; }
  .output { color: #7d8590; }
  .highlight { color: #f0abfc; }
  .ai-response { color: #58a6ff; }
  .features {
    display: flex; gap: 12px; margin-top: 16px;
  }
  .feature {
    flex: 1; background: #0d1117; border-radius: 8px; padding: 14px;
    text-align: center; border: 1px solid #30363d;
  }
  .feature-icon { font-size: 24px; margin-bottom: 6px; }
  .feature-text { font-size: 12px; color: #7d8590; }
  .feature-name { font-size: 13px; color: #e6edf3; font-weight: 600; margin-bottom: 4px; }
</style></head><body>
  <div class="card">
    <div class="card-title">📐 cmux おすすめレイアウト</div>
    <div class="terminal">
      <div class="terminal-header">
        <div class="terminal-dots">
          <div class="tdot tdot-red"></div>
          <div class="tdot tdot-yellow"></div>
          <div class="tdot tdot-green"></div>
        </div>
        <span class="terminal-title">cmux — ssh user@my-macbook</span>
      </div>
      <div class="terminal-body">
        <div class="panes">
          <div class="pane-top">
            <div class="pane-label">メインペイン — Claude Code</div>
            <div class="terminal-line"><span class="prompt">$</span> <span class="cmd">claude</span></div>
            <div class="terminal-line"><span class="ai-response">Claude Code v1.x</span></div>
            <div class="terminal-line"><span class="ai-response">? How can I help you?</span></div>
            <div class="terminal-line"><span class="prompt">></span> <span class="cmd">このコンポーネントにバリデーションを追加して</span></div>
            <div class="terminal-line"><span class="ai-response">承知しました。src/components/Form.tsx を確認します...</span></div>
          </div>
          <div class="pane-bottom">
            <div class="pane-bottom-left">
              <div class="pane-label">左下 — コード閲覧</div>
              <div class="terminal-line"><span class="prompt">$</span> <span class="cmd">vim src/components/Form.tsx</span></div>
              <div class="terminal-line"><span class="highlight">  1</span> <span class="output">import React from 'react'</span></div>
              <div class="terminal-line"><span class="highlight">  2</span> <span class="output">import { useState } from 'react'</span></div>
              <div class="terminal-line"><span class="highlight">  3</span> <span class="output"></span></div>
            </div>
            <div class="pane-bottom-right">
              <div class="pane-label">右下 — シェル（Git等）</div>
              <div class="terminal-line"><span class="prompt">$</span> <span class="cmd">git status</span></div>
              <div class="terminal-line"><span class="output">On branch feature/form</span></div>
              <div class="terminal-line"><span class="output">Changes not staged:</span></div>
              <div class="terminal-line"><span class="output">  <span style="color:#f85149">modified</span>: src/Form.tsx</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🔄</div>
        <div class="feature-name">セッション永続化</div>
        <div class="feature-text">SSH切断しても<br>再接続で即復帰</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📐</div>
        <div class="feature-name">ペイン分割</div>
        <div class="feature-text">1画面で複数の<br>作業を同時進行</div>
      </div>
      <div class="feature">
        <div class="feature-icon">💾</div>
        <div class="feature-name">ワークスペース</div>
        <div class="feature-text">プロジェクトごとに<br>レイアウトを保存</div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 6. Daily workflow
function buildDailyWorkflow() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .workflow { display: flex; flex-direction: column; gap: 0; }
  .wf-step {
    display: flex; gap: 16px; align-items: stretch;
  }
  .wf-timeline {
    width: 48px; display: flex; flex-direction: column; align-items: center;
    flex-shrink: 0;
  }
  .wf-dot {
    width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
  }
  .wf-line { width: 2px; flex: 1; min-height: 16px; }
  .wf-line-blue { background: #1f6feb; }
  .wf-line-green { background: #238636; }
  .wf-line-purple { background: #8b5cf6; }
  .wf-dot-blue { background: #1f6feb; }
  .wf-dot-green { background: #238636; }
  .wf-dot-purple { background: #8b5cf6; }
  .wf-content {
    flex: 1; background: #0d1117; border-radius: 10px;
    padding: 16px 20px; margin-bottom: 12px;
  }
  .wf-content h4 { font-size: 14px; margin-bottom: 4px; color: #e6edf3; }
  .wf-content p { font-size: 13px; color: #7d8590; }
  .wf-tool {
    display: inline-block; padding: 2px 8px; border-radius: 6px;
    font-size: 11px; font-weight: 600; margin-top: 6px;
  }
  .wf-tool-ssh { background: #1b2d1b; color: #3fb950; }
  .wf-tool-vnc { background: #2d2b1b; color: #d29922; }
  .wf-tool-scp { background: #1e3a5f; color: #58a6ff; }
  .wf-tool-taildrop { background: #1e2a3a; color: #79c0ff; }

  .usage-bar-container { margin-top: 20px; }
  .usage-bar-label { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
  .usage-bar { height: 24px; border-radius: 12px; overflow: hidden; display: flex; background: #30363d; }
  .usage-ssh { background: #238636; width: 90%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
  .usage-vnc { background: #d29922; width: 10%; }
</style></head><body>
  <div class="card">
    <div class="card-title">📅 1日の使い分けフロー</div>
    <div class="workflow">
      <div class="wf-step">
        <div class="wf-timeline"><div class="wf-dot wf-dot-blue">🌅</div><div class="wf-line wf-line-blue"></div></div>
        <div class="wf-content">
          <h4>朝：SSH接続してClaude Code起動</h4>
          <p>ssh user@my-macbook → cmux のセッションに復帰 → Claude Code で開発開始</p>
          <span class="wf-tool wf-tool-ssh">SSH + cmux</span>
        </div>
      </div>
      <div class="wf-step">
        <div class="wf-timeline"><div class="wf-dot wf-dot-blue">💻</div><div class="wf-line wf-line-blue"></div></div>
        <div class="wf-content">
          <h4>午前：コード閲覧・編集・Git操作</h4>
          <p>vim でコードを読み書き。git commit / push もターミナルから。全てテキストベースで超軽量。</p>
          <span class="wf-tool wf-tool-ssh">SSH + cmux</span>
        </div>
      </div>
      <div class="wf-step">
        <div class="wf-timeline"><div class="wf-dot wf-dot-purple">🖥️</div><div class="wf-line wf-line-purple"></div></div>
        <div class="wf-content">
          <h4>たまに：ブラウザで動作確認</h4>
          <p>GUIが必要な時だけ画面共有に切り替え。Tailscale 経由なので LAN 相当の速度で快適。</p>
          <span class="wf-tool wf-tool-vnc">macOS 画面共有（VNC）</span>
        </div>
      </div>
      <div class="wf-step">
        <div class="wf-timeline"><div class="wf-dot wf-dot-green">📁</div><div class="wf-line wf-line-green"></div></div>
        <div class="wf-content">
          <h4>ファイル転送が必要な時</h4>
          <p>スクリーンショットやデータファイルを Taildrop で AirDrop 感覚で送受信。大量ファイルは rsync も使い分け。</p>
          <span class="wf-tool wf-tool-taildrop">Taildrop</span> <span class="wf-tool wf-tool-scp">scp / rsync</span>
        </div>
      </div>
      <div class="wf-step">
        <div class="wf-timeline"><div class="wf-dot wf-dot-blue">🌙</div></div>
        <div class="wf-content">
          <h4>退勤：SSHを閉じるだけ</h4>
          <p>cmux がセッションを保持。翌朝 SSH 接続すれば昨日の続きからすぐ再開。</p>
          <span class="wf-tool wf-tool-ssh">SSH + cmux</span>
        </div>
      </div>
    </div>
    <div class="usage-bar-container">
      <div class="usage-bar-label">
        <span style="color: #3fb950">⚡ SSH + cmux（90%）</span>
        <span style="color: #d29922">📺 VNC（10%）</span>
      </div>
      <div class="usage-bar">
        <div class="usage-ssh">SSH + cmux</div>
        <div class="usage-vnc"></div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 7. Troubleshooting
function buildTroubleshooting() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .trouble { display: flex; flex-direction: column; gap: 14px; }
  .trouble-item {
    background: #0d1117; border-radius: 10px; overflow: hidden;
    border: 1px solid #30363d;
  }
  .trouble-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 16px; background: #161b22;
    border-bottom: 1px solid #30363d;
  }
  .trouble-icon { font-size: 20px; }
  .trouble-q { font-size: 14px; font-weight: 600; color: #e6edf3; }
  .trouble-body { padding: 14px 16px; }
  .trouble-step {
    display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 8px; font-size: 13px; color: #7d8590;
  }
  .trouble-check { color: #3fb950; font-weight: 600; flex-shrink: 0; }
  .trouble-code {
    background: #161b22; border-radius: 6px; padding: 8px 12px;
    margin: 6px 0; font-family: 'SF Mono', Monaco, monospace;
    font-size: 12px; color: #3fb950;
  }
</style></head><body>
  <div class="card">
    <div class="card-title">🔍 よくあるトラブルと解決法</div>
    <div class="trouble">
      <div class="trouble-item">
        <div class="trouble-header">
          <span class="trouble-icon">🔌</span>
          <span class="trouble-q">Tailscale で接続できない</span>
        </div>
        <div class="trouble-body">
          <div class="trouble-step"><span class="trouble-check">✓</span> 両方のデバイスで Tailscale アプリが起動しているか確認</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> tailscale status で接続状態を確認</div>
          <div class="trouble-code">$ tailscale status</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> ファイアウォールが Tailscale をブロックしていないか確認</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> Tailscale アプリを再起動してみる</div>
        </div>
      </div>
      <div class="trouble-item">
        <div class="trouble-header">
          <span class="trouble-icon">⏱️</span>
          <span class="trouble-q">SSH 接続がタイムアウトする</span>
        </div>
        <div class="trouble-body">
          <div class="trouble-step"><span class="trouble-check">✓</span> ~/.ssh/config に KeepAlive 設定を追加</div>
          <div class="trouble-code">Host *<br>&nbsp;&nbsp;ServerAliveInterval 60<br>&nbsp;&nbsp;ServerAliveCountMax 3</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> macOS 側のリモートログインが有効か再確認</div>
          <div class="trouble-code">$ sudo systemsetup -getremotelogin</div>
        </div>
      </div>
      <div class="trouble-item">
        <div class="trouble-header">
          <span class="trouble-icon">🔍</span>
          <span class="trouble-q">cmux セッションが見つからない</span>
        </div>
        <div class="trouble-body">
          <div class="trouble-step"><span class="trouble-check">✓</span> cmux アプリが起動しているか確認</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> cmux list-workspaces でワークスペースの存在を確認</div>
          <div class="trouble-code">$ cmux list-workspaces</div>
          <div class="trouble-step"><span class="trouble-check">✓</span> cmux アプリを再起動すると前回のセッションが復元される</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

// 8. Taildrop file transfer
function buildTaildrop() {
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
  ${commonStyles}
  .section { margin-bottom: 24px; }
  .section-label {
    font-size: 14px; font-weight: 700; color: #79c0ff;
    margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .airdrop-compare {
    display: flex; gap: 16px; margin-bottom: 20px;
  }
  .airdrop-box {
    flex: 1; background: #0d1117; border-radius: 12px; padding: 20px;
    text-align: center; border: 1px solid #30363d;
  }
  .airdrop-box h5 { font-size: 15px; margin-bottom: 6px; }
  .airdrop-box p { font-size: 12px; color: #7d8590; line-height: 1.6; }
  .airdrop-icon { font-size: 36px; margin-bottom: 8px; }
  .airdrop-arrow { display: flex; align-items: center; justify-content: center; font-size: 24px; color: #58a6ff; padding: 0 4px; }
  .cmd-block {
    background: #0d1117; border-radius: 10px; padding: 18px 20px;
    border: 1px solid #30363d; margin-bottom: 12px;
  }
  .cmd-label {
    font-size: 12px; font-weight: 600; color: #8b5cf6;
    margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .cmd-line {
    font-family: 'SF Mono', Monaco, monospace; font-size: 13px;
    line-height: 1.9; color: #7d8590;
  }
  .cmd-prompt { color: #3fb950; }
  .cmd-text { color: #e6edf3; }
  .cmd-comment { color: #6e7681; }
  .cmd-highlight { color: #79c0ff; }
  .gui-note {
    background: #1e2a3a; border: 1px solid #30486a; border-radius: 10px;
    padding: 14px 18px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 12px;
  }
  .gui-note-icon { font-size: 28px; flex-shrink: 0; }
  .gui-note-text { font-size: 13px; color: #79c0ff; }
  .gui-note-text strong { color: #e6edf3; }
  .compare-table {
    width: 100%; border-collapse: collapse; font-size: 13px;
  }
  .compare-table th {
    background: #161b22; padding: 10px 14px; text-align: left;
    border-bottom: 2px solid #30363d; color: #e6edf3; font-weight: 600;
  }
  .compare-table td {
    padding: 10px 14px; border-bottom: 1px solid #21262d; color: #7d8590;
  }
  .compare-table tr:hover td { background: #161b22; }
  .compare-table .method-name { color: #e6edf3; font-weight: 600; }
  .compare-table .recommend-row td { background: #0d1f0d; }
  .recommend-star { color: #3fb950; font-weight: 600; }
</style></head><body>
  <div class="card">
    <div class="card-title">📦 Taildrop でファイル転送</div>

    <div class="section">
      <div class="section-label">💡 Taildrop とは？</div>
      <div class="airdrop-compare">
        <div class="airdrop-box">
          <div class="airdrop-icon">📱</div>
          <h5>Apple の AirDrop</h5>
          <p>同じ Wi-Fi 内の<br>Apple デバイス同士で<br>ファイルを送受信</p>
        </div>
        <div class="airdrop-arrow">≈</div>
        <div class="airdrop-box" style="border-color: #58a6ff;">
          <div class="airdrop-icon">📦</div>
          <h5 style="color: #58a6ff;">Tailscale の Taildrop</h5>
          <p>Tailscale ネットワーク内の<br><strong style="color:#e6edf3">全 OS のデバイス</strong>間で<br>ファイルを送受信</p>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">⌨️ CLI での使い方</div>
      <div class="cmd-block">
        <div class="cmd-label">送信（リモート → 母艦）</div>
        <div class="cmd-line"><span class="cmd-comment"># ファイルを送信</span></div>
        <div class="cmd-line"><span class="cmd-prompt">$</span> <span class="cmd-text">tailscale file cp</span> <span class="cmd-highlight">./screenshot.png</span> <span class="cmd-text">my-macbook:</span></div>
        <div class="cmd-line" style="margin-top: 8px;"><span class="cmd-comment"># ディレクトリごと送信</span></div>
        <div class="cmd-line"><span class="cmd-prompt">$</span> <span class="cmd-text">tailscale file cp</span> <span class="cmd-highlight">./my-dir/</span> <span class="cmd-text">my-macbook:</span></div>
      </div>
      <div class="cmd-block">
        <div class="cmd-label">受信（母艦側で待ち受け）</div>
        <div class="cmd-line"><span class="cmd-comment"># カレントディレクトリに受信</span></div>
        <div class="cmd-line"><span class="cmd-prompt">$</span> <span class="cmd-text">tailscale file get</span> <span class="cmd-highlight">./</span></div>
      </div>
    </div>

    <div class="gui-note">
      <span class="gui-note-icon">🖱️</span>
      <div class="gui-note-text">
        <strong>GUI からも送信可能：</strong>メニューバーの Tailscale アイコン → 「Send file...」<br>
        ドラッグ＆ドロップでファイルを選ぶだけ。非エンジニアでも簡単に使えます。
      </div>
    </div>

    <div class="section">
      <div class="section-label">📊 ファイル転送方法の比較</div>
      <table class="compare-table">
        <thead>
          <tr><th>方法</th><th>特徴</th><th>向いている場面</th></tr>
        </thead>
        <tbody>
          <tr class="recommend-row">
            <td class="method-name">📦 Taildrop <span class="recommend-star">★ おすすめ</span></td>
            <td>手軽、GUI 対応、SSH 不要</td>
            <td>数ファイルのやり取り、非エンジニアとの共有</td>
          </tr>
          <tr>
            <td class="method-name">📋 scp</td>
            <td>SSH 経由、パス指定で正確</td>
            <td>特定パスへの配置が必要な場合</td>
          </tr>
          <tr>
            <td class="method-name">🔄 rsync</td>
            <td>差分転送、大量ファイル対応</td>
            <td>ディレクトリの同期・バックアップ</td>
          </tr>
        </tbody>
      </table>
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

  await captureScreenshot(browser, buildBeforeAfter(), 'before-after.png');
  await captureScreenshot(browser, buildArchitecture(), 'architecture.png');
  await captureScreenshot(browser, buildTailscaleSetup(), 'tailscale-setup.png');
  await captureScreenshot(browser, buildSSHSetup(), 'ssh-setup.png');
  await captureScreenshot(browser, buildCmuxLayout(), 'cmux-layout.png');
  await captureScreenshot(browser, buildTaildrop(), 'taildrop.png');
  await captureScreenshot(browser, buildDailyWorkflow(), 'daily-workflow.png');
  await captureScreenshot(browser, buildTroubleshooting(), 'troubleshooting.png');

  await browser.close();
  console.log('Done! All screenshots saved to', OUTPUT_DIR);
}

main().catch(e => { console.error(e); process.exit(1); });
