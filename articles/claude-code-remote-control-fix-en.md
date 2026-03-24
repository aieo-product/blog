---
title: "Claude Code remote-control Not Working? 3 Error Patterns and Complete Fix Guide"
emoji: "🔧"
type: "tech"
topics: ["claudecode", "troubleshooting", "macOS", "CLI", "Anthropic"]
published: true
---

:::message
This article was co-written with AI.
:::

:::message
🇯🇵 [日本語版はこちら](https://zenn.dev/aieo_product/articles/claude-code-remote-control-fix)
:::

:::message alert
Are you hitting **"Channels are not currently available"** or **"Remote Control is not yet enabled"** on a Max plan? The root cause is likely the same — **telemetry-disabling env vars break all feature flags**. See [GitHub Issue #36460](https://github.com/anthropics/claude-code/issues/36460) for the channels-specific discussion.
:::

## Introduction

Claude Code's **remote-control** feature lets you operate Claude Code sessions from a browser or mobile device. It's incredibly useful for checking sessions from your phone or sending instructions from a different device.

However, many users on the Max plan are encountering **"Remote Control is not yet enabled for your account."** even though they should have access. The same root cause also affects **Channels** (`--channels ignored (Channels are not currently available)`) and other gated features — see [Issue #36460](https://github.com/anthropics/claude-code/issues/36460).

I ran into this issue myself, encountering 3 different errors before finding the solution. Here's a complete guide for anyone facing the same problem.

## Environment

| Item | Value |
|------|-------|
| Claude Code Version | 2.1.81 |
| OS | macOS (Darwin 24.3.0) |
| Plan | Max |
| Install Method | Homebrew (`brew install --cask claude-code`) |
| Terminal Multiplexer | cmux |

## The 3 Errors I Encountered

### Error 1: `Unknown argument: <UUID>`

```bash
$ claude remote-control
Error: Unknown argument: bd96b1c1-3b61-4776-979e-dfe768c7595b
Run 'claude remote-control --help' for usage.
```

A mysterious UUID is passed as an argument, causing the error.

### Error 2: `/rc` Doesn't Work Inside a Session

```
> /remote-control
Unknown skill: remote-control
```

The slash command inside an existing session is interpreted as a skill instead.

### Error 3: `Remote Control is not yet enabled for your account.`

```bash
$ claude remote-control
Error: Remote Control is not yet enabled for your account.
```

The account reports the feature as disabled despite being on the Max plan. **This is the most common error.**

---

## Cause 1: cmux Wrapper Interference (Fixing Error 1)

### Why It Happens

If you're using **cmux**, the `claude` command runs through a wrapper script.

```bash
$ which claude
/Applications/cmux.app/Contents/Resources/bin/claude  # ← wrapper, not the actual binary
```

This wrapper auto-injects `--session-id <UUID>` for session management. However, the `remote-control` subcommand doesn't expect this argument, so the UUID is treated as an invalid argument.

### Fix

Edit the cmux wrapper script to add `remote-control` to the passthrough list.

**File:** `/Applications/cmux.app/Contents/Resources/bin/claude`

**Before:**

```bash
case "${1:-}" in
    mcp|config|api-key) exec "$REAL_CLAUDE" "$@" ;;
esac
```

**After:**

```bash
case "${1:-}" in
    mcp|config|api-key|auth|remote-control) exec "$REAL_CLAUDE" "$@" ;;
esac
```

Adding `auth` also ensures `claude auth login/logout` bypasses the wrapper.

:::message
This change may be overwritten when cmux updates. Re-check after updates.
:::

### Alternative

If you don't want to edit the wrapper, call the binary directly:

```bash
/opt/homebrew/bin/claude remote-control
```

---

## Cause 2: Telemetry Disabling Breaks Feature Flags (Fixing Error 3)

**This is the most important cause. Many users are affected by this.**

### Why It Happens

Claude Code uses **GrowthBook** to manage feature flags (enabling/disabling features). Whether remote-control is available is also controlled by these feature flags.

The problem: setting the following environment variables **completely disables GrowthBook feature flag evaluation**.

| Environment Variable | Effect |
|---------------------|--------|
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` | Disables feature flag fetching and evaluation |
| `DISABLE_TELEMETRY=1` | Same effect |

When flag evaluation is disabled, remote-control and **all gated features** default to `false` (disabled). Even with Max plan permissions, the flags aren't evaluated, so you're told the feature "is not yet enabled."

### How to Check

```bash
# Check current shell environment
env | grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL"

# Check .zshrc
grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL" ~/.zshrc

# Check settings.json
grep -i -E "DISABLE_TELEMETRY|NONESSENTIAL" ~/.claude/settings.json
```

### Fix

**Remove** the relevant lines from `.zshrc` (or `.bashrc`, `.zprofile`):

```bash
# Delete these lines
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
```

If `DISABLE_TELEMETRY` is in `~/.claude/settings.json`, remove it from there too.

After making changes, **open a new terminal**. Old environment variables persist in existing terminals.

:::message alert
It's understandable to want to disable telemetry for privacy. However, in the current Claude Code implementation, disabling telemetry also kills feature flag evaluation. If you want to use gated features like remote-control, telemetry must be enabled.
:::

---

## Cause 3: Authentication Cache Inconsistency

If fixing telemetry settings doesn't resolve the issue, the token cache from login may be stale.

### Fix

Logout and re-login to refresh the cache:

```bash
claude auth logout
claude auth login
```

A browser will open for the OAuth flow. Log in again.

---

## About `/rc` Inside Sessions (Error 2)

The issue where `/remote-control` or `/rc` returns `Unknown skill` inside a session has been a **known bug** since late February 2026.

- [GitHub Issue #28322](https://github.com/anthropics/claude-code/issues/28322)
- [GitHub Issue #29265](https://github.com/anthropics/claude-code/issues/29265)

The current workaround is to use `claude remote-control` as a **CLI subcommand** instead of the in-session slash command.

---

## Complete Recovery Steps

Here's the definitive step-by-step guide covering all 3 causes:

### Step 1: Remove Telemetry Disabling

Delete these lines from `~/.zshrc`:

```bash
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
export DISABLE_TELEMETRY=1
```

### Step 2: Open a New Terminal

You must open a new terminal to pick up the environment variable changes.

### Step 3: Update Claude Code

```bash
brew upgrade --cask claude-code
```

### Step 4: Logout and Re-login

```bash
claude auth logout
claude auth login
```

### Step 5: Fix cmux Wrapper (cmux Users Only)

```bash
# Edit /Applications/cmux.app/Contents/Resources/bin/claude
# Add remote-control to the case statement (see Cause 1)
```

### Step 6: Launch remote-control

```bash
claude remote-control
```

---

## `remoteControlAtStartup` Setting

Instead of running `claude remote-control` every time, add this to `~/.claude/settings.json` to auto-enable it at session start:

```json
{
  "remoteControlAtStartup": true
}
```

Note: This setting has no effect if the telemetry issue hasn't been resolved. Complete Step 1 first.

## Quick Reference

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Unknown argument: <UUID>` | cmux wrapper injects session ID | Add passthrough to wrapper |
| `Remote Control is not yet enabled` | Telemetry disabling breaks flag evaluation | Remove env vars from `.zshrc` |
| `Unknown skill: remote-control` | In-session `/rc` is a known bug | Use `claude remote-control` from CLI |
| None of the above works | Stale auth cache | `claude auth logout` → `login` |

## Related Links

- [GitHub Issue #36460 - Channels not available on personal Max plan](https://github.com/anthropics/claude-code/issues/36460) — same root cause affects Channels
- [GitHub Issue #28322 - /remote-control not recognized](https://github.com/anthropics/claude-code/issues/28322)
- [GitHub Issue #29265 - /remote-control returns 'Unknown skill'](https://github.com/anthropics/claude-code/issues/29265)
- [GitHub Issue #33327 - Telemetry disabling breaks feature flags](https://github.com/anthropics/claude-code/issues/33327)
- [Claude Code Official Docs - Remote Control](https://code.claude.com/docs/en/remote-control)

## This Issue Also Affects IDE Terminals

This problem isn't limited to standalone terminals — **IDE integrated terminals are affected too.**

IDE terminals load your shell profile (`.zshrc` etc.) on startup, so `DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` are inherited by Claude Code.

### Confirmed in Antigravity

I was using Claude Code in **Antigravity** (Google's IDE) and remote-control wasn't available. After removing the telemetry env vars from `.zshrc` and restarting Antigravity, `/remote-control` appeared correctly.

![remote-control working in Antigravity](/images/remote-control-fix/antigravity_ss.png)
*After fixing `.zshrc`, `/remote-control` shows up in Antigravity's terminal*

### Potentially Affected IDEs

Any IDE with an integrated terminal may be affected:

| IDE | Terminal | Status |
|-----|----------|--------|
| **Antigravity** | Built-in terminal | Confirmed |
| **VS Code / Cursor** | Integrated terminal | Likely affected |
| **JetBrains** (WebStorm, IntelliJ, etc.) | Built-in terminal | Likely affected |
| **Windsurf** | Built-in terminal | Likely affected |

In all cases, **removing the env vars from `.zshrc` and restarting the IDE** resolves the issue.

## "Telemetry" vs Claude App Privacy Settings — They're Different

If you're thinking "I disabled telemetry for privacy, and now I have to re-enable it?" — here's the clarification.

### Claude App Privacy Settings

The **location metadata** and **improvement data** settings in the Claude desktop app (claude.ai) control how Anthropic handles your conversation data on their servers. These are unrelated to this issue and can stay off.

### Claude Code Telemetry (This Issue)

`DISABLE_TELEMETRY` and `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` in `.zshrc` control **usage statistics from the Claude Code CLI tool itself**. This is a separate system from the desktop app's privacy settings.

| Setting | Controls | Location |
|---------|----------|----------|
| App privacy settings | Conversation data usage, location | Claude app settings UI |
| `DISABLE_TELEMETRY` etc. | CLI usage stats, feature flags | `.zshrc` or `settings.json` |

### Is It Safe to Enable Telemetry?

When you use Claude Code, **your code context and prompts are already sent to Anthropic via API calls**. This is required for the product to function, regardless of telemetry settings.

Telemetry only adds usage statistics (which features you used, error data, performance metrics). Disabling telemetry doesn't stop your code from being sent.

In short, **disabling telemetry has almost no privacy benefit, but breaks feature flags** — that's the current situation.

## Conclusion

Many of us disabled telemetry for privacy reasons — myself included. But currently, disabling telemetry is coupled with feature flag evaluation, which means remote-control and all other gated features stop working.

This is a design issue that Anthropic should address. Telemetry opt-out and feature flag evaluation should be independent controls.

I hope this helps anyone struggling with the same issue.
