# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace (`functional-design-tools`) containing four plugins for product design, project planning, testing, and QA workflows. Plugins are prompt engineering artifacts (markdown + JSON), not application code.

## Repository Layout

- `.claude-plugin/marketplace.json` — marketplace index listing all plugins with versions
- `plugins/<name>/.claude-plugin/plugin.json` — per-plugin manifest (name, version, keywords)
- `plugins/<name>/skills/<skill>/SKILL.md` — interactive skills (run in main conversation)
- `plugins/<name>/agents/<agent>.md` — autonomous subagents (dispatched via Agent tool)
- `plugins/<name>/scripts/` — supporting files shipped with the plugin

Four plugins:
- **requirements-gatherer** (v1.1.0) — requirements interview + GitHub/Jira issue creation
- **visual-design** (v3.1.0) — design system, component specs, design-reviewer agent with UX review
- **functional-tester** (v1.5.0) — Playwright tests, TDD fix loop, Lighthouse/axe/performance audits, agent
- **defect-gatherer** (v1.1.0) — structured defect intake interview + issue tracker submission

## Agent Architecture (opus + haiku)

Both agents (`visual-design:design-reviewer` and `functional-tester:functional-tester`) use a two-tier dispatch pattern:
- **Opus parent** handles judgment-heavy work: UX/usability review (design-reviewer), full-stack performance analysis (functional-tester), and final report synthesis
- **Haiku sub-agent** handles mechanical work: structured CSS inspection (design-reviewer), Playwright TDD test loop (functional-tester)
- Agents are **report-only** for audit/analysis steps — they produce categorized fix suggestions but do not apply changes (only the functional-tester's TDD sub-agent applies code fixes during the test loop)
- Agents are **proxies to skills**: they Glob + Read the corresponding SKILL.md at runtime, keeping the skill as the single source of truth

## Plugin Authoring Conventions

### SKILL.md Structure (interactive, runs in main conversation)
1. YAML frontmatter: `name`, `description`, `version`
   - The `description` field serves double duty: it documents the skill's purpose AND lists trigger phrases that tell Claude Code when to activate the skill. Always include both.
2. Mode detection early (check for existing artifacts + user input to branch into modes)
3. Step-by-step numbered workflows with explicit **STOP gates** blocking progression until user confirms
4. Tool dependency checks at the top of skills that need external tools (Chrome, GitHub CLI, etc.) — check availability, report what's missing, offer alternatives, never silently skip
5. Output format templates showing exact markdown structure the skill produces
6. **Hard Rules** / **Important Boundaries** section at the end — immutable constraints

### Agent .md Structure (autonomous, dispatched as subagent)
1. YAML frontmatter: `name`, `description` (start with "Use when...", triggering conditions only), `tools` (array including MCP tool names), `model` (opus for parent agents)
2. **Agents are proxies to skills, not copies.** The agent reads and follows the corresponding SKILL.md at runtime via Glob + Read. This keeps the skill as the single source of truth and prevents drift.
3. The agent body defines: how to find the skill, which steps to dispatch to a haiku sub-agent vs run itself, how to adapt STOP gates for autonomous operation, and error recovery contracts
4. STOP gates become autonomous decisions: missing dependencies -> return error report immediately; user confirmation gates -> proceed with reasonable judgment and document the decision
5. Agent type registers as `<plugin-name>:<agent-name>` (e.g., `visual-design:design-reviewer`)
6. Fix suggestions are categorized as "safe fix" (code-level) or "design/UX change needed" (directive-level)

### Key Patterns
- **Never silently fall back** when tools are missing — present options, fixes, workarounds, retry
- **Plain language** in user-facing content (no design jargon without explanation)
- **Artifact-driven modes**: check filesystem for existing files to determine behavior (new vs addendum)
- **Version must be bumped** in both `plugin.json` AND `marketplace.json` for updates to propagate
- **Skills define WHAT/WHY, not HOW**: requirements-gatherer and defect-reporter produce documents, never fix code or suggest architecture
- **Classification patterns**: defect-gatherer classifies reports as defect, story-update, or feature-request; this three-way split is a core convention

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
