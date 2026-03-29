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
- **visual-design** (v2.2.0) — design system establishment, component spec delivery, design quality gate agent
- **functional-tester** (v1.3.0) — Playwright test generation, TDD fix loop, Lighthouse/axe audits, agent
- **defect-gatherer** (v1.1.0) — structured defect intake interview + issue tracker submission

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
1. YAML frontmatter: `name`, `description` (start with "Use when...", triggering conditions only), `tools` (array of tool names), `model` (sonnet/opus/haiku/inherit)
2. **Agents are proxies to skills, not copies.** The agent reads and follows the corresponding SKILL.md at runtime via Glob + Read. This keeps the skill as the single source of truth and prevents drift.
3. The agent body defines only: how to find the skill, how to adapt STOP gates for autonomous operation, and error recovery contracts
4. STOP gates become autonomous decisions: missing dependencies → return error report immediately; user confirmation gates → make reasonable judgment and continue
5. Agent type registers as `<plugin-name>:<agent-name>` (e.g., `visual-design:design-reviewer`)

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

Both must match or updates won't propagate to users.

## Installation (for testing)

```
/plugin marketplace add thekostakis/requirements-gatherer
/plugin install requirements-gatherer@functional-design-tools
/plugin install visual-design@functional-design-tools
/plugin install functional-tester@functional-design-tools
/plugin install defect-gatherer@functional-design-tools
/reload-plugins
```
