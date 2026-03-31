---
title: "Stop Exposing API Keys in env — macOS Keychain + Local Proxy for Secure AI Development"
emoji: "🔐"
type: "tech"
topics: ["macOS", "security", "AI", "Swift", "APIkeys"]
published: true
---

:::message
This article was co-written with AI (Claude).
:::

## Is Your `env` Safe?

If you're doing AI development, your `.zshrc` probably looks like this:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
export OPENAI_API_KEY=sk-proj-xxxxx...
export GITHUB_TOKEN=ghp_xxxxx...
```

Run `env` and every key is visible in plaintext. Worse — **AI tools like Claude Code and Cursor can read these env vars themselves**.

In 2026, API key leaks have become a serious problem:

- **CVE-2026-21852**: A vulnerability that exfiltrates API keys through Claude Code project files
- **Feb 2026**: A stolen Google Cloud API key resulted in an **$82,000** bill
- Over **5,000 GitHub repositories** found leaking API keys

Think you're safe? I thought so too.

## 🔥 The Trigger — Seeing "env Leak" Panic on X

It started when I saw [a post on X about an env API key leak](https://x.com/hassii_ad/status/2029481458218483742). A developer accidentally exposed their API keys stored in plaintext env vars. The replies were full of "I'm in the same situation" and "this is terrifying."

I checked my own environment — over 10 API keys sitting in plaintext in `.zshrc`. Running `env` showed everything. I was carrying the exact same risk.

That's when I decided to fundamentally rethink how I manage API keys. That's how AI KeyChain was born.

## 📋 The Problems

### Problem 1: Keys Exposed in env

```bash
$ env | grep API_KEY
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...  # fully visible
```

AI tools can read process environment variables. **Claude Code can read its own API key.** On Linux, `/proc/[pid]/environ` exposes env vars to any process running as the same user.

### Problem 2: Keychain Approval Fails Over SSH

When connecting to a Mac via Tailscale SSH, `security find-generic-password` tries to show a GUI approval dialog — which fails in an SSH session.

### Problem 3: Auto-Writing to `.zshrc` Is Dangerous

When automation tools write settings directly to `.zshrc`, all shell sessions break if the tool stops unexpectedly.

## 🛠 The Solution — AI KeyChain

I built a native macOS key management app to solve all three problems: **AI KeyChain**.

![AI KeyChain main screen](/images/main-screen.png)
*Main screen. 6 preset categories (AI API / AI Web / Code & Git / Cloud & Infra / Communication / Developer Tools) plus custom categories. 17 services come pre-configured, but you can add any API key or token.*

## 🏗 Architecture — Two Modes

AI KeyChain offers **Standard** and **Proxy** modes. You choose during initial setup.

![Mode selection — Proxy](/images/mode-proxy.png)
*Key Management Mode selection. Choosing Proxy mode keeps API keys completely out of env.*

![Mode selection — Standard](/images/mode-standard.png)
*Standard mode uses traditional Keychain reference. Simple, but keys are visible in env. You can switch modes anytime.*

### Standard Mode (Simple & Stable)

```
Terminal → export API_KEY=$(security ...) → API Server
```

Traditional Keychain reference. Simple, but **keys appear in env**.

### Proxy Mode (High Security)

```
Terminal (no keys in env)
  → HTTP request (no auth header)
  → AI KeyChain Proxy (localhost:18121)
  → Reads API key from Keychain
  → Injects Authorization header
  → API Server (api.anthropic.com, etc.)
```

Proxy mode features:

- **API keys never appear in env**
- No Keychain approval dialog needed over SSH
- Proxy binds to localhost only (no external access)

### Mode Comparison

| | Standard | Proxy |
|---|---|---|
| Key storage | macOS Keychain | macOS Keychain |
| Key retrieval | `export` in `.zshrc` | Proxy injects headers |
| **Keys visible in `env`?** | **Yes** | **No** |
| App must be running? | No | Yes |

## 🚀 Initial Setup

AI KeyChain includes a 5-step onboarding wizard.

![Welcome](/images/onboarding-welcome.png)
*Welcome screen. Three key features: secure Keychain storage, invisible to env, automatic proxy injection.*

![Choose Your Mode](/images/onboarding-mode.png)
*Mode selection with a visual comparison of Standard vs Proxy. The bottom shows the request flow through AI KeyChain Proxy.*

![Register Your Keys](/images/onboarding-register.png)
*Key registration step. Shows the number of keys per category: AI API (4), AI Web (5), Code & Git (2), etc.*

![Shell Setup](/images/onboarding-shell.png)
*Shell setup. Just add one line to `.zshrc`: `[ -f ~/.aikeychain_proxy ] && source ~/.aikeychain_proxy` — that's all you need.*

![Setup Complete!](/images/onboarding-complete.png)
*Setup complete. **Just click "Enable Secure Proxy"** and the proxy starts immediately. Recovery Guide is available if anything goes wrong.*

## ✨ Key Features

### Key Management

![Edit Key dialog](/images/edit-key.png)
*Edit key screen. Set service name, category, and environment variable name. Token values are encrypted in Keychain. "Get Token" opens your browser to fetch tokens directly.*

### 4-Step env Import

A wizard to safely migrate existing env vars to Keychain.

![Step 1: Get env](/images/env-import-getenv.png)
*Step 1: Get env. Run `env | grep -E 'API_KEY|TOKEN|SECRET|ACCOUNT_ID|AUTH_KEY'` in terminal and copy the output.*

![Step 2: Scan](/images/env-import-scan.png)
*Step 2: Scan. Auto-parses pasted content and recommends migration by risk level. Keys already in Keychain show "Exists".*

![Step 3: Preview](/images/env-import-preview.png)
*Step 3: Preview. Confirm what will be saved to Keychain. Check "Remove matching export lines from .zshrc" to auto-clean plaintext exports.*

![Step 4: Result](/images/env-import-result.png)
*Step 4: Result. Import complete. Shows keys saved, export lines removed from .zshrc, and keys skipped. A `.zshrc` backup is created automatically.*

### Proxy Lifecycle Management

If `ANTHROPIC_BASE_URL` remains in `.zshrc` after the proxy stops, all terminals fail to connect to the API. This is solved with file-based lifecycle management.

```
Proxy starts → creates ~/.aikeychain_proxy
Proxy stops  → deletes ~/.aikeychain_proxy
Crash/reboot → shell startup checks port → auto-deletes file if no response
```

Just one line in `.zshrc`:

```bash
if [ -f ~/.aikeychain_proxy ]; then
  # Check if port responds before sourcing
  # No response → auto-delete file
fi
```

No direct writes to `.zshrc` — safe by design.

### Encrypted Key Transfer (Between Devices)

Transfer Keys feature for secure device-to-device migration.

![Transfer Keys — My Keys](/images/transfer-my-keys.png)
*My Keys tab. Start by generating a key pair. "How it works" illustrates the 3-step flow.*

![Transfer Keys — Send](/images/transfer-send.png)
*Send tab. Load the destination device's public key file (`.aikeychain-pub`) and encrypt your keys.*

![Transfer Keys — Receive](/images/transfer-receive.png)
*Receive tab. Decrypt the `.aikeychain` file with your private key and register keys in Keychain.*

**Encryption**: P-256 + ECDH + AES-256-GCM. Private keys are stored in Keychain and cannot be exported.

:::message
Originally named "Share Keys", but after reviewing API providers' terms of service, sharing personal API keys with third parties may violate their terms. Renamed to "Transfer Keys" and repositioned for device migration only.
:::

### Team Key Sharing

Sharing personal API keys is a ToS issue, but **team/org-shared keys** (shared API keys, service account tokens, etc.) need a secure sharing mechanism.

AI KeyChain uses public key cryptography (P-256 ECDH + AES-256-GCM) for encrypted key exchange between team members.

**Sharing flow:**

1. Receiver generates a key pair and shares the **public key** (`.aikeychain-pub`)
2. Sender encrypts keys with the public key and sends the ciphertext (`.aikeychain`)
3. Receiver decrypts with private key and registers in Keychain

![Key share flow](/images/key-share-flow.png)
*Public key cryptography flow. Plaintext keys never travel over the network.*

Plaintext keys never leave the Keychain. Private keys are non-exportable. It's safe to send the encrypted file via Slack or any chat tool.

### Custom Categories — Manage Any Key

AI KeyChain is not just for AI API keys. **You can register any API key, token, or secret.** The 6 preset categories are just starting defaults — add, edit, or delete categories freely.

![Custom categories](/images/custom-category.png)
*Custom category example. "VideoTools" category added. Organize by project, team, or any way you like.*

### Help & Troubleshooting

![Help screen](/images/help-troubleshooting.png)
*Built-in help. Covers auto-launch, export, troubleshooting (ECONNREFUSED errors, proxy verification), and keyboard shortcuts.*

### Recovery Guide

![Recovery Guide](/images/recovery-guide.png)
*Recovery guide for proxy mode issues. 4-tier recovery: restart app → switch to Standard → manual config delete → remove .zshrc hook entirely.*

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Swift 5.9+ |
| UI | SwiftUI (macOS 14 Sonoma+) |
| State | Observation framework (`@Observable`) |
| Security | Security.framework (Keychain Services) |
| Proxy | Network.framework (`NWListener`) |
| Encryption | CryptoKit (P-256, AES-256-GCM, HKDF) |
| Build | Swift Package Manager |
| Distribution | Notarized DMG |

## 🆚 Comparison with Similar Tools

Several tools addressing the same problem have appeared in 2026.

| Feature | AI KeyChain | 1Password CLI | LLM Key Ring | ServeMyAPI |
|---------|------------|---------------|--------------|------------|
| Keys invisible in env | **Proxy mode** | No | No | No |
| Native macOS GUI | **Yes** | Separate app | CLI only | CLI only |
| AI-service focused | **Yes** | General | LLM-focused | General |
| No cloud required | **Yes** | No | Yes | Yes |
| Encrypted device transfer | **Yes** | Cloud sync | No | No |
| Team key sharing | **Yes** | Cloud-based | No | No |
| Lifecycle management | **Yes** | — | No | No |

**The combination of "macOS Keychain + local proxy that keeps keys out of env" is unique to AI KeyChain.**

## 📦 Installation

Download the latest DMG from [GitHub Releases](https://github.com/aieo-product/AIkeychain/releases).

**Steps:**

1. Download `AIKeyChain-v1.5.1.dmg` from the Releases page
2. Double-click the DMG to mount
3. Drag `AI KeyChain.app` to `/Applications`
4. **Before first launch**, run this command in Terminal:

```bash
sudo xattr -rd com.apple.quarantine /Applications/AI\ KeyChain.app
```

5. Launch `AI KeyChain.app` → the onboarding wizard will start

:::message alert
The app is not yet notarized with Apple Developer Program. Without step 4, macOS Gatekeeper will show a security warning. The command above removes the quarantine attribute.
:::

## 🗺 Roadmap

- Apple Developer Program enrollment → Notarization → no Gatekeeper warning
- Proxy request logging & monitoring
- Mac App Store distribution

## Summary

- API keys visible in `env` are a real risk — AI tools can read their own keys
- 2026 has seen serious API key leak incidents — action is needed now
- macOS Keychain + local proxy keeps **keys completely out of env**
- Public key cryptography enables secure team key sharing
- No existing tool offered this combination, so I built one
- File-based lifecycle management prevents stale proxy settings

**GitHub**: https://github.com/aieo-product/AIkeychain

---

### Disclaimer

This app encrypts and stores your API keys in the macOS Keychain. In Proxy mode, keys never appear in `.env` at all, so security should be quite strong under normal usage.

However, **no software can guarantee 100% security**. In the unlikely event of key leaks or bugs, **use at your own risk**.

I've built this as carefully as I can, but ultimately it's your responsibility to evaluate and decide whether to use it.

:::message
AI KeyChain is open source. If you're doing AI development on macOS, give it a try. Issues and pull requests are welcome!
:::
