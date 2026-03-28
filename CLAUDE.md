# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin marketplace (`functional-design-tools`) containing two plugins for product design and project planning workflows. Plugins are prompt engineering artifacts (markdown + JSON), not application code.

## Repository Layout

- `.claude-plugin/marketplace.json` — marketplace index listing all plugins with versions
- `plugins/<name>/.claude-plugin/plugin.json` — per-plugin manifest (name, version, keywords)
- `plugins/<name>/skills/<skill>/SKILL.md` — interactive skills (run in main conversation)
- `plugins/<name>/scripts/` — supporting files shipped with the plugin

Two plugins:
- **requirements-gatherer** (v1.1.0) — requirements interview + GitHub/Jira issue creation
- **visual-design** (v1.2.0) — design system establishment, component spec delivery, design quality gate

## Plugin Authoring Conventions

### SKILL.md Structure
1. YAML frontmatter: `name`, `description` (with trigger phrases), `version`
2. Mode detection early (check for existing artifacts + user input to branch into modes)
3. Step-by-step numbered workflows with explicit **STOP gates** blocking progression until user confirms
4. Output format templates showing exact markdown structure the skill produces
5. **Hard Rules** / **Important Boundaries** section at the end — immutable constraints

### Key Patterns
- **Never silently fall back** when tools are missing — present options, fixes, workarounds, retry
- **Plain language** in user-facing content (no design jargon without explanation)
- **Artifact-driven modes**: check filesystem for existing files to determine behavior (new vs addendum)
- **Version must be bumped** in both `plugin.json` AND `marketplace.json` for updates to propagate

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
/reload-plugins
```
