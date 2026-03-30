# Reviewer functional-change escalation — implementation plan

This document records the **full plan** for cross-cutting reviewer behavior: anything that would **change how the system functions** for users must be explicitly flagged so the **orchestrator escalates to the end user before any fix is applied**. **BLOCKING** (or similar severity) is **not** permission to auto-implement product-changing work.

## Goals

1. **Single visible tag** across report-only outputs: **`FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX`** (optional short form in tables: note under **Behavior impact**).
2. **Clear separation**: cosmetic/token/a11y-only fixes vs. flow, confirmation, validation, navigation, auth, API contract, caching semantics, or business-rule changes.
3. **Agents and skills aligned**: parent agents state the escalation obligation; phase files show how to label findings; templates include **Behavior impact** fields.

## Scope (what was scanned)

| Surface | Role | Change |
|--------|------|--------|
| `plugins/visual-design/skills/design-reviewer/SKILL.md` | Report template + hard rules | Behavior impact fields; save `design-review-*.md` for diff mode; hard rule 12 |
| `plugins/visual-design/skills/design-reviewer/phases/ux-heuristics.md` | Nielsen / UX issues | New section: Functional vs cosmetic (caller escalation) |
| `plugins/visual-design/skills/design-reviewer/phases/mechanical-inspection.md` | A–E + Mode B | Escalation paragraph in Issue Classification; Mode B Step 5 summary handoff |
| `plugins/visual-design/agents/design-reviewer.md` | Autonomous agent | Synthesis step + hard rule |
| `plugins/functional-tester/skills/functional-tester/SKILL.md` | Step 8 report | Preamble + template lines + Important Boundaries #13 |
| `plugins/functional-tester/skills/functional-tester/phases/lighthouse-perf.md` | Step 6 | Early-exit JSON cleanup; performance suggestion categorization |
| `plugins/functional-tester/skills/functional-tester/phases/axe-audit.md` | Step 7 | Third category for flow-changing a11y fixes |
| `plugins/functional-tester/agents/functional-tester.md` | Autonomous agent | `resize_page` on TDD sub-agent; hard rule 7 |
| `plugins/visual-design/skills/visual-design-consultant/SKILL.md` | Not a “reviewer” but extraction | Correct tab parallelization (`list_pages` vs multi-tab / sequential) |
| `plugins/defect-gatherer/skills/defect-reporter/SKILL.md` | Intake, not fix suggestions | Dispatch: URL **or** API endpoint identity for non-visual bugs |
| `CLAUDE.md` | Repo guidance | Versions + Key pattern + agent bullet |
| `.claude-plugin/marketplace.json` + `plugin.json` files | Distribution | Patch bumps + description tweaks |

**Out of scope (by design):**

- **TDD loop (`tdd-loop.md`)** — already applies code changes under test-driven rules; ambiguous *product* intent still belongs to team process, not the same “report-only” contract.
- **defect-organizer**, **requirements** skills — they create tickets/docs, not ranked fix lists with the same template.
- **component-context** — loads specs; does not emit fix suggestions.

## Tagging rules (for authors and models)

Apply **`FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX`** when a recommendation would:

- Add/remove/alter **confirmations** (especially destructive actions).
- Change **validation timing** or error **enforcement** (inline vs submit, blocking vs non-blocking).
- Change **navigation**, **IA**, or **primary action** placement/discovery in a way that removes or hides capabilities.
- Change **auth/session** UX or security-sensitive flows.
- Change **API** response shape, **pagination**, **filtering**, **authorization**, or **caching** semantics visible to clients.
- Remove or hide **content** or **actions** users currently have.

Do **not** require this tag for: token/color/spacing fixes, non-conflicting **alt/label/role** additions, **meta/viewport/lang**, heading fixes that do not hide content, performance optimizations that do not change observable behavior (e.g. `defer`, image dimensions).

## Other fixes bundled in this pass

- **Lighthouse early exit**: When performance score > 90 and deep-dive is skipped, still **`rm -f ./lighthouse-report.json`** (and budget JSON if used) so artifacts are not left behind.
- **Consultant fingerprinting**: Document that **`list_pages` does not create tabs**; parallel batches need multiple tabs or sequential single-tab fingerprinting.
- **Mode B**: mechanical-inspection **Step 5** compiles summary aligned with main SKILL Mode B template; Category F remains opus.
- **functional-tester sub-agent**: add **`resize_page`** for viewport-sensitive tests.

## Verification checklist

- [x] Grep repo for `FUNCTIONAL / BEHAVIOR CHANGE` — appears in design-reviewer, functional-tester, agents, phases as intended.
- [x] `marketplace.json` versions match `plugins/*/plugin.json` for visual-design, functional-tester, defect-gatherer.
- [x] `CLAUDE.md` plugin version lines match marketplace.

## Version bumps applied

- **visual-design** `4.0.0` → `4.0.1` (design-reviewer SKILL + phases + agent + consultant patch)
- **functional-tester** `2.0.0` → `2.0.1`
- **defect-gatherer** `1.2.0` → `1.2.1`
- **visual-design-consultant** SKILL only: `1.2.0` → `1.3.0` (tab-flow correction)
