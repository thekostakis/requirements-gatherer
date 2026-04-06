# Headless Playwright bridge (design-reviewer)

Mechanical inspection and Category F use **headless Chromium** only — no MCP, no attached
Chrome window.

## Resolve `BRIDGE`

Prefer visual-design copy, then functional-tester (monorepo / multi-plugin installs):

~~~bash
BRIDGE="$(find . -path "*/visual-design/scripts/playwright-skill-bridge.mjs" -print -quit 2>/dev/null)"
test -n "$BRIDGE" || BRIDGE="$(find . -path "*/functional-tester/scripts/playwright-skill-bridge.mjs" -print -quit)"
~~~

## Auth

~~~bash
export PW_STORAGE_STATE="/path/to/storage.json"
export PW_IGNORE_HTTPS_ERRORS=1
~~~

## Commands

| Command | Purpose |
|--------|---------|
| `node "$BRIDGE" snapshot <url>` | Accessibility tree JSON |
| `node "$BRIDGE" screenshot <url> <out.png> [w] [h]` | Full-page PNG |
| `node "$BRIDGE" network <url>` | Request log JSON |
| `node "$BRIDGE" probe-login <url>` | Login-page heuristic JSON |
| `node "$BRIDGE" run <url> <module.mjs>` | `export default async (page, context) => data` |

Use **`run`** for hover/focus, `page.evaluate`, viewport loops, axe via CDN, and injecting
`scripts/read-computed-styles.js` / `read-motion-properties.js` logic.

## Outputs

Write screenshots under `.agent-progress/` (create the directory if missing) so paths are
stable for the Read tool.
