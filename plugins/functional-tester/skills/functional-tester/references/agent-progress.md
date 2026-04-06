# Agent progress log — functional-tester

Use when the **functional-tester agent** runs or when dispatch includes `progress_log_path`
/ `PROGRESS_LOG`. Goal: **orchestrators and humans** see **where** the run is without
streaming full detail into the parent context.

## Log path

- **Default filename:** `.agent-progress/functional-tester-<YYYYMMDD-HHMMSS>.md` (workspace
  root, local time).
- **Override:** absolute or workspace-relative `progress_log_path` from dispatch; create
  parent directories if missing.
- **Env / handoff:** pass the resolved absolute path to the haiku sub-agent as
  **`PROGRESS_LOG`**.

## Roles (token efficiency)

| Actor | Responsibility |
|-------|----------------|
| **Haiku** (Steps 2–5, `phases/tdd-loop.md`) | **Most** granular appends: per page, inventory, test file, fix cycle, pass/fail batch. |
| **Opus** parent | Create file + header; milestone lines only (checks start/end, sub-agent dispatched/returned, lighthouse/axe/report start/end); short chat summaries. |

## Append format (compact, one block per event)

Use shell append — avoids re-reading the whole file into context.

~~~bash
PROGRESS_LOG="/absolute/path/to/.agent-progress/functional-tester-20260403-143022.md"
printf '\n### %s | %s | %s\n- %s\n' "$(date -Iseconds 2>/dev/null || date)" "sub|parent" "checks|tdd|lighthouse|axe|report" "detail line" >> "$PROGRESS_LOG"
~~~

**Field 2 — actor:** `sub` (haiku TDD loop) or `parent` (opus).

**Field 3 — area:** `checks` | `tdd` | `lighthouse` | `axe` | `report`.

**Detail line — examples:** `page:/login render:ok`, `inventory:14btn 3forms`,
`test:checkout.spec.ts written`, `cycle:2 fail:login-timeout`, `lighthouse:complete a11y:94`.

On Windows without GNU `date`, use Git Bash/WSL for these commands, or equivalent
`Add-Content` in PowerShell with the same four logical fields.

If a **Playwright bridge** (`node …/playwright-skill-bridge.mjs`) command fails, apply the
same retry policy (2 retries, 3s delay) before escalating.

## Minimum append points (haiku / `tdd-loop.md`)

- After **Step 2** per page: URL, render OK or blocked.
- After **Step 3** per page: inventory summary (counts).
- After **Step 4**: targeted test names / spec paths.
- Each **fix cycle** in Step 5: failing tests, delta.
- **Step 5** stable: one-line final pass/fail summary.

## Minimum append points (opus parent)

- `checks | started` before Step 1 tool checks; `checks | complete` after (or abort on failure).
- `tdd | sub-agent dispatched` / one-line summary when sub-agent returns.
- `lighthouse | started` / `complete|skipped+reason`.
- `axe | started` / `complete|skipped+reason`.
- `report | complete` when Step 8 template is emitted.

## Parent chat summary (after every milestone)

Keep **2–4 bullets**; point to the log for detail.

~~~markdown
## Agent progress (functional-tester)
- **Log:** `<path>`
- **Phase:** [e.g. TDD sub-agent — Step 4]
- **Now:** [one line]
~~~

## Phase cross-references

- **`phases/tdd-loop.md`** — haiku responsibilities and step-level append points.
- **`phases/lighthouse-perf.md`** — parent lighthouse markers.
- **`phases/axe-audit.md`** — parent axe markers.
