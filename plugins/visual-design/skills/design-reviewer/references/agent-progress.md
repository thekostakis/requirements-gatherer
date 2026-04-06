# Agent progress log — design-reviewer

Use when the **design-reviewer agent** runs or when dispatch includes `progress_log_path`
/ `PROGRESS_LOG`. Goal: **orchestrators and humans** see **where** the review is without
duplicating mechanical detail in the opus parent context.

## Log path

- **Default filename:** `.agent-progress/design-reviewer-<YYYYMMDD-HHMMSS>.md` (workspace
  root).
- **Override:** `progress_log_path` from dispatch; create parent directories if missing.
- **Handoff:** pass the resolved absolute path to the haiku mechanical sub-agent as
  **`PROGRESS_LOG`**.

## Roles (token efficiency)

| Actor | Responsibility |
|-------|----------------|
| **Haiku** (`phases/mechanical-inspection.md`, Categories A–E) | **Most** granular appends: after **each category A–E** per page/component (short findings, blocking count). |
| **Opus** parent | Create file + header; milestones (checks, mechanical dispatched/returned, mode, Category F, diff, report); short chat summaries. |

## Append format (compact)

Same pattern as functional-tester; reuse for consistency across plugins.

~~~bash
PROGRESS_LOG="/absolute/path/to/.agent-progress/design-reviewer-20260403-143022.md"
printf '\n### %s | %s | %s\n- %s\n' "$(date -Iseconds 2>/dev/null || date)" "sub|parent" "checks|mechanical|ux|diff|report" "detail line" >> "$PROGRESS_LOG"
~~~

**Field 3 — area:** `checks` | `mechanical` | `ux` | `diff` | `report`.

**Detail examples:** `category:A page:/dash blocking:0`, `category:C a11y:3 issues`,
`H3 score:8`, `diff:complete`, `report:complete`.

On Windows, prefer Git Bash/WSL for `printf`/`date`, or mirror fields with PowerShell
`Add-Content`.

**Playwright bridge:** retry failed `node …/playwright-skill-bridge.mjs` calls up to 2 times
with a 3-second delay (same as phase reliability rules).

## Minimum append points (haiku / mechanical)

After **each** of Categories **A–E** for each page/component under review: one block with
category id, target, and pass/fail or blocking count.

## Minimum append points (opus parent)

- `checks | started` before tool checks; `checks | complete` after.
- `mode | A` or `A-Diff` or `B` once mode is chosen.
- `mechanical | sub-agent dispatched` / one-line summary when sub-agent returns.
- `ux | started` before Category F; after each heuristic **H1–H10** append one line:
  `| parent | ux | Hn | score:X | <short note>` (keep under ~120 chars); then
  `ux | complete | score:XX` for the overall UX score.
- `diff | complete` when diff table is done (Mode A-Diff only, if applicable).
- `report | complete` when the final report is written.

## Parent chat summary (after every milestone)

~~~markdown
## Agent progress (design-reviewer)
- **Log:** `<path>`
- **Phase:** [e.g. mechanical — Category C]
- **Now:** [one line]
~~~

## Phase cross-references

- **`phases/mechanical-inspection.md`** — haiku Category A–E append points.
- **`phases/ux-heuristics.md`** — opus Category F per-heuristic lines.
