# Headless Playwright bridge (defect-reporter)

Visual defect investigation uses **headless Chromium** via Playwright — no MCP, no attached
Chrome window. Read this file when running Step 4 (visual path) or repro verification.

## Resolve `BRIDGE`

Prefer the defect-gatherer copy, then other plugins from this marketplace (monorepo / multi-plugin installs):

~~~bash
BRIDGE="$(find . -path "*/defect-gatherer/scripts/playwright-skill-bridge.mjs" -print -quit 2>/dev/null)"
test -n "$BRIDGE" || BRIDGE="$(find . -path "*/functional-tester/scripts/playwright-skill-bridge.mjs" -print -quit 2>/dev/null)"
test -n "$BRIDGE" || BRIDGE="$(find . -path "*/visual-design/scripts/playwright-skill-bridge.mjs" -print -quit)"
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
| `node "$BRIDGE" network <url>` | Request log JSON (method, URL, resource type) |
| `node "$BRIDGE" probe-login <url>` | `{ behindLogin, signals }` JSON |
| `node "$BRIDGE" run <url> <module.mjs>` | Custom `async (page, context) => result` |

For **`run`**, the module must export `default` async function `(page, context)` and return
JSON-serializable data. Use it for `page.evaluate` (computed styles, DOM checks), console
collection (attach `page.on('console', ...)` then `reload`), element screenshots, etc.

## Evidence paths

Write screenshots and any scratch artifacts under `defects/evidence/` (create the directory
if missing) so file paths stay stable for the defect report and the Read tool.

## Reliability

If a bridge command fails, retry up to **2** times with a **3-second** delay before
telling the user Playwright is unavailable. Use a **90s** timeout for navigation-heavy
commands when wrapping with `timeout` (adjust per OS).
