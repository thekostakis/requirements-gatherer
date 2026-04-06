# Headless Playwright bridge (functional-tester)

All browser work in Steps 2–3 uses **headless Chromium** via Playwright — no MCP, no GUI.

## Resolve `BRIDGE`

~~~bash
BRIDGE="$(find . -path "*/functional-tester/scripts/playwright-skill-bridge.mjs" -print -quit 2>/dev/null)"
~~~

## Auth (optional)

~~~bash
export PW_STORAGE_STATE="/path/to/auth.json"   # Playwright storageState from prior login
export PW_IGNORE_HTTPS_ERRORS=1               # self-signed / local HTTPS
~~~

## Commands

| Command | Purpose |
|--------|---------|
| `node "$BRIDGE" snapshot <url>` | Accessibility tree JSON → stdout |
| `node "$BRIDGE" screenshot <url> <out.png> [w] [h]` | Full-page PNG |
| `node "$BRIDGE" network <url>` | Request log JSON (for debugging / waterfall context) |
| `node "$BRIDGE" probe-login <url>` | `{ behindLogin }` for Lighthouse SEO gating |
| `node "$BRIDGE" run <url> <module.mjs>` | Custom `async (page, context) => result` |

For **`run`**, the module must export `default` async function `(page, context)` and return
JSON-serializable data. Use it for `page.evaluate`, hover/focus screenshots, injecting
snippet files, etc.

## Lighthouse CI / Lighthouse CLI

Use **`npx lighthouse <url> --chrome-flags="--headless --no-sandbox"`** (or project
**`.lighthouserc`** / **`lhci autorun`** if configured). Same headless Chrome stack as
Playwright; no DevTools MCP.
