# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace (`functional-design-tools`) containing four plugins for product design, project planning, testing, and QA workflows. Plugins are prompt engineering artifacts (markdown + JSON), not application code.

## Repository Layout

- `.claude-plugin/marketplace.json` — marketplace index listing all plugins with versions
- `plugins/<name>/.claude-plugin/plugin.json` — per-plugin manifest (name, version, keywords)
- `plugins/<name>/skills/<skill>/SKILL.md` — interactive skills (run in main conversation); optional `references/` (e.g. `agent-progress.md`, `playwright-headless.md` for tester / design-reviewer)
- `plugins/<name>/agents/<agent>.md` — autonomous subagents (dispatched via Agent tool)
- `plugins/<name>/scripts/` — supporting files shipped with the plugin

Four plugins:
- **requirements-gatherer** (v1.2.0) — requirements interview; **source sync** (`phases/source-sync.md`) to derive or reconcile `requirements.md` from repo/docs/URLs/attachments with drift analysis and explicit approval before overwrite; GitHub/Jira issue creation via organizer
- **visual-design** (v4.1.0) — design system, component specs, **visual-design-consultant** (interview/extraction; **codebase reverse-engineering** still uses chrome-devtools-mcp for live route inspection, spec at `docs/design-system/codebase-reverse-spec-*.md`), **component-context agent**, **design-reviewer** agent/skill: **headless Playwright** (`playwright-skill-bridge.mjs`) + Nielsen UX scoring, diff mode, `.agent-progress/` logs — **no DevTools MCP** for design-reviewer
- **functional-tester** (v2.2.0) — **headless Playwright** + bridge script, TDD loop, @axe-core/playwright, visual regression, Lighthouse CLI/CI, performance deep-dive (report-only); `.agent-progress/` logs — **no DevTools MCP**
- **defect-gatherer** (v1.2.3) — defect/issue intake (bugs, problems, regressions), story/spec change requests, concrete feature requests; **defect-reporter** visual path uses **headless Playwright** + bridge (`playwright-skill-bridge.mjs`) like functional-tester; dispatch (URL or API endpoint); organizer submits to trackers

## Agent Architecture (opus + haiku)

**`visual-design:component-context`** (opus) — **Exact** or **high-confidence** fuzzy: paste the **complete** matched `design/components/*.md` file + **motion**. **Top-3** full files + synthesis + **motion** when ambiguous. **Gap** + motion when no match. Never dump whole compendium.

**`visual-design:design-reviewer`** and **`functional-tester:functional-tester`** use a two-tier dispatch pattern:
- **Opus parent** handles judgment-heavy work: UX/usability review with Nielsen's heuristics (design-reviewer), full-stack performance analysis (functional-tester), and final report synthesis
- **Haiku sub-agent** handles mechanical work: structured CSS inspection (design-reviewer), Playwright TDD test loop with AI agents (functional-tester)
- **Run progress:** design-reviewer and functional-tester agents write append-only logs under `.agent-progress/` (optional `progress_log_path` in dispatch); haiku sub-agents do most granular appends, opus parent emits short chat milestones + final log path
- Agents are **report-only** for audit/analysis steps — they produce categorized fix suggestions but do not apply changes (only the functional-tester's TDD sub-agent applies code fixes during the test loop)
- Agents are **proxies to skills**: they Glob + Read the corresponding SKILL.md and phase files at runtime, keeping the skill as the single source of truth
- **design-reviewer** and **functional-tester** use **headless Playwright** + bridge + Lighthouse CLI (CI-safe); **defect-reporter** (visual path) uses the same **headless Playwright** bridge for capture and inspection; **visual-design-consultant** site extraction / codebase route inspection still uses **chrome-devtools-mcp** where that skill says so (fail-fast, no fallback to other browser MCPs there)
- Skills are **phase-split** for token efficiency: main SKILL.md is a slim orchestrator, heavy content lives in `phases/` subdirectories loaded on demand
- Extracted JS/bash snippets live in `scripts/` directories

## Dispatch Contracts

Agents expose `Required Dispatch Context` sections in their .md files. The orchestrator MUST provide the listed context (server URL, auth method, pages to test/review, etc.) when dispatching an agent. The `defect-reporter` skill also has a dispatch contract for when it is called as a sub-agent.

Key auth methods: Playwright **`storageState`** path (export `PW_STORAGE_STATE` for headless bridge/tests), credentials for scripted login, or `none`. **`autoConnect`** (live chrome-devtools-mcp) applies only to skills that still document MCP browser use (e.g. visual-design-consultant site extraction / codebase route inspection).

Requirements traceability: dispatchers should provide requirements summaries or issue/epic references (content, not file paths that may be stale), supporting Jira, GitHub, and Linear sources.

## Plugin Authoring Conventions

### SKILL.md Structure (interactive, runs in main conversation)
1. YAML frontmatter: `name`, `description`, `version`
   - The `description` field serves double duty: it documents the skill's purpose AND lists trigger phrases that tell Claude Code when to activate the skill. Always include both.
2. Mode detection early (check for existing artifacts + user input to branch into modes)
3. Step-by-step numbered workflows with explicit **STOP gates** blocking progression until user confirms
4. Tool dependency checks at the top of skills that need external tools (chrome-devtools-mcp, Playwright, GitHub CLI, etc.) — check availability, report what's missing, offer alternatives, never silently skip. Where a skill documents chrome-devtools-mcp, it is fail-fast (no fallback). **design-reviewer**, **functional-tester**, and **defect-reporter** (visual path) document **headless Playwright** + bridge instead of MCP for that path.
5. Phase-split architecture: main SKILL.md is a slim orchestrator (~100-150 lines), heavy content in `skills/<name>/phases/` loaded on demand. Scripts in `plugins/<name>/scripts/`.
6. Output format templates showing exact markdown structure the skill produces
7. **Hard Rules** / **Important Boundaries** section at the end — immutable constraints

### Agent .md Structure (autonomous, dispatched as subagent)
1. YAML frontmatter: `name`, `description` (start with "Use when...", triggering conditions only), `tools` (array — MCP tool names only if the agent uses them; **design-reviewer** / **functional-tester** agents omit chrome-devtools MCP), `model` (opus for parent agents)
2. **Agents are proxies to skills, not copies.** The agent reads and follows the corresponding SKILL.md and phase files at runtime via Glob + Read. This keeps the skill as the single source of truth and prevents drift.
3. The agent body defines: how to find the skill, which phases to dispatch to a haiku sub-agent vs run itself, how to adapt STOP gates for autonomous operation, error recovery contracts, and a Required Dispatch Context section
4. STOP gates become autonomous decisions: missing dependencies -> return error report immediately; user confirmation gates -> proceed with reasonable judgment and document the decision
5. Agent type registers as `<plugin-name>:<agent-name>` (e.g., `visual-design:design-reviewer`)
6. Fix suggestions are categorized as "safe fix" (code-level) or "design/UX change needed" (directive-level); behavior-changing items use **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** — orchestrator must confirm with the user before implementing
7. Tool reliability: retry failed MCP or Playwright bridge calls up to 2 times with 3-second delay; bash commands use timeouts (30s default)

### Key Patterns
- **Never silently fall back** when tools are missing — present options, fixes, workarounds, retry
- **Plain language** in user-facing content (no design jargon without explanation)
- **Artifact-driven modes**: check filesystem for existing files to determine behavior (new vs addendum)
- **Version must be bumped** in both `plugin.json` AND `marketplace.json` for updates to propagate
- **Skills define WHAT/WHY, not HOW**: requirements-gatherer and defect-reporter produce documents, never fix code or suggest architecture
- **Classification patterns**: defect-gatherer classifies reports as defect, story-update, or feature-request; this three-way split is a core convention
- **Functional-change escalation**: design-reviewer and functional-tester (report-only steps) tag **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX** when a suggestion would alter user-visible behavior, API semantics, auth, or business outcomes — **BLOCKING** severity does not authorize silent implementation; the user must approve first

## Versioning

When updating a plugin, bump the version in two places:
1. `plugins/<name>/.claude-plugin/plugin.json`
2. `.claude-plugin/marketplace.json` (the entry for that plugin)

Both must match or updates won't propagate to users. Also keep `keywords` and `description` synced between the two files.

## Installation (for testing)

```
/plugin marketplace add thekostakis/requirements-gatherer
/plugin install requirements-gatherer@functional-design-tools
/plugin install visual-design@functional-design-tools
/plugin install functional-tester@functional-design-tools
/plugin install defect-gatherer@functional-design-tools
/reload-plugins
```
