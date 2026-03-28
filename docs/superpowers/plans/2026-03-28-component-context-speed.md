# Component Context Speed Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed up the component-context skill by adding a component index file, dispatching a Haiku subagent for lookup, and creating an update-component-index skill.

**Architecture:** The component-context skill becomes a thin dispatcher. It identifies the target component, then launches a Haiku subagent that reads a lightweight index file to narrow candidates before reading full specs. A separate skill regenerates the index when specs change manually.

**Tech Stack:** Claude Code plugin system (SKILL.md markdown files), Haiku subagent dispatch via Agent tool.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `plugins/visual-design/skills/component-context/SKILL.md` | Thin dispatcher: identify component, launch Haiku subagent, present result |
| `plugins/visual-design/skills/update-component-index/SKILL.md` | Regenerate `design/components/index.md` from current spec files |
| `plugins/visual-design/skills/visual-design-consultant/SKILL.md` | Add index.md generation to wrap-up Step 3 |

---

### Task 1: Rewrite component-context skill as thin dispatcher

**Files:**
- Rewrite: `plugins/visual-design/skills/component-context/SKILL.md`

- [ ] **Step 1: Replace the entire SKILL.md with the dispatcher version**

Replace the full contents of `plugins/visual-design/skills/component-context/SKILL.md` with:

```markdown
---
name: component-context
description: >
  Use this skill when implementing frontend components to load the relevant design spec.
  Trigger phrases: "load component spec", "component design spec", "what does the design say
  about [component]", "show me the spec for [component]", "design spec for [component]".
  Also use when: creating or editing files in component directories (components/, ui/, widgets/),
  writing component function/class definitions, creating Storybook stories, or any time you need
  the design system's component specification to guide implementation.
version: 1.3.0
---

# Component Context

Load the relevant component spec from the design compendium so implementation follows
the design system.

## Step 1: Check for Design Compendium

Look for `design/components/` directory. If it doesn't exist:

**STOP.** Tell the user: "No component compendium found at `design/components/`. Run the
visual-design-consultant skill first to establish a design system."

## Step 2: Identify the Component

From the context of what's being implemented, determine which component(s) are relevant.
Look at the current task, file being edited, or user's request.

## Step 3: Dispatch Lookup

Launch a Haiku subagent to perform the spec lookup. Use the Agent tool with:
- `model: "haiku"`
- `description: "Look up [component-name] design spec"`
- `prompt:` the full prompt below, with `{COMPONENT_NAME}` replaced by the actual component name

**Subagent prompt:**

~~~
You are a design spec lookup agent. Find and return the design spec for "{COMPONENT_NAME}".

## Exact Match

1. Try reading `design/components/{COMPONENT_NAME}.md`.
2. If not found, try these variants and check each:
   - Hyphenated: split camelCase or PascalCase on capitals, join with hyphens, lowercase
     (e.g., NotificationBanner -> notification-banner)
   - Singular: remove trailing "s" (e.g., buttons -> button)
   - Plural: add trailing "s" (e.g., button -> buttons)
3. If any variant matches, read that file. Skip to **Load Tokens** below.

## Fuzzy Match (no exact match found)

1. Try reading `design/components/index.md`. If the index exists:
   a. Score each row against "{COMPONENT_NAME}" using these signals:

   | Signal | Weight | How it matches |
   |--------|--------|---------------|
   | Name substring | 3 | "{COMPONENT_NAME}" appears in the Component column or vice versa |
   | Related components | 3 | "{COMPONENT_NAME}" appears in the Related column |
   | Keyword overlap | 2 | "{COMPONENT_NAME}" or words from it appear in the Keywords column |
   | Same category | 1 | The component's likely category matches the row's Category |

   b. Take the top 3 rows with score > 0.
   c. Read the full spec file for each (`design/components/[name].md`).

2. If no index exists, fall back: use Glob to list all `.md` files in `design/components/`,
   read each, and score using the same signals (reading Related components and Usage & Content
   sections from each file instead of the index).

3. If any specs scored > 0, format the response as:

       ## No Exact Spec: {COMPONENT_NAME}

       No spec file found for "{COMPONENT_NAME}". Here are similar components
       that may help as a starting point:

       ### Suggestion 1: [Name] (highest relevance)
       **Why:** [1-2 sentences explaining which signals matched]

       [Full spec content]

       ### Suggestion 2: [Name] (moderate relevance)
       **Why:** [1-2 sentences]

       [Abbreviated: Visual Properties, Data Fields, Usage & Content sections only]

       ### Suggestion 3: [Name] (lower relevance)
       **Why:** [1-2 sentences]

       [Abbreviated: Visual Properties, Data Fields, Usage & Content sections only]

       ---
       To add a dedicated spec for {COMPONENT_NAME}, run the visual-design-consultant skill.

4. If no specs score above 0, return:
   "No spec file found for {COMPONENT_NAME}, and no similar components in the compendium.
   Run the visual-design-consultant skill to add it."

## Load Tokens

Read `design-guidelines.md` and extract the specific tokens referenced by the component
spec: colors, spacing, typography, motion, breakpoints. Keep under 50 lines.

## Format the Response

For exact matches:

    ## Design Spec: [Component Name]

    [Full content of the component spec file]

    ## Relevant Design Tokens

    [Only the tokens from design-guidelines.md that this component uses]

    ## Responsive Tokens (if component spec has Responsive Behavior section)

    [Breakpoints or fluid scales from design-guidelines.md that the component references]

## Context Limits

- At most 3 component specs (under 200 lines each = 600 lines max)
- Tokens section under 50 lines
- For fuzzy suggestions: full spec for suggestion 1 only; abbreviate suggestions 2-3
  to Visual Properties, Data Fields, and Usage & Content sections
~~~

## Step 4: Present Result

Display the subagent's response directly in the conversation. Do not summarize or
reformat it -- present it as-is so the spec is fully visible for reference during
implementation.

If the subagent reports no compendium or no match, relay that message to the user.

## Important Boundaries

- Do NOT modify design files or component specs
- Do NOT make design decisions -- deliver what the spec says
- Do NOT skip loading the spec to "save time" -- the spec exists to prevent implementation drift
```

- [ ] **Step 2: Verify the file reads correctly**

Read the file back to confirm no markdown formatting issues (especially the nested code fence using `~~~` inside the outer markdown).

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/skills/component-context/SKILL.md
git commit -m "feat: rewrite component-context as Haiku subagent dispatcher"
```

---

### Task 2: Create update-component-index skill

**Files:**
- Create: `plugins/visual-design/skills/update-component-index/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

Create `plugins/visual-design/skills/update-component-index/SKILL.md` with:

```markdown
---
name: update-component-index
description: >
  Use this skill to regenerate the component index after manually adding, editing, or removing
  component spec files. Trigger phrases: "update component index", "rebuild component index",
  "refresh design index", "regenerate component index".
version: 1.0.0
---

# Update Component Index

Regenerate `design/components/index.md` from the current spec files.

## Step 1: Check for Compendium

Look for `design/components/` directory. If it doesn't exist:

**STOP.** Tell the user: "No component compendium found at `design/components/`. Run the
visual-design-consultant skill first to establish a design system."

## Step 2: Read Existing Index

If `design/components/index.md` exists, read it and note the current component list.
If it doesn't exist, note this is a first-time generation.

## Step 3: Scan All Spec Files

Use Glob to list all `.md` files in `design/components/` excluding `index.md`.

For each spec file, read it and extract:
- **Component:** filename without `.md` extension
- **Category:** from the Usage & Content section, classify as one of: feedback, action,
  navigation, layout, overlay, data-display, form, media. If the section is missing or
  unclear, use "uncategorized".
- **Related:** from the "Related components" line in Usage & Content. Comma-separated list.
  If missing, leave empty.
- **Keywords:** from "When to use" and "Common contexts" in Usage & Content. Pick up to 8
  distinctive words. Skip generic words (the, a, for, when, used, this, that, with, from,
  about, into, also, can, will, should, must, any, all, each, both, etc.).

## Step 4: Build the Index

Sort all entries alphabetically by component name.

Write `design/components/index.md`:

```
# Component Index

| Component | Category | Related | Keywords |
|-----------|----------|---------|----------|
| [name] | [category] | [related] | [keywords] |
```

One row per component. If `design/components/` has no spec files, write the file with just
the header and an empty table.

## Step 5: Report Changes

Compare the new index against the previous one (from Step 2):
- **Added:** components in the new index that weren't in the old one
- **Removed:** components in the old index that aren't in the new one
- **Updated:** components present in both but with changed category, related, or keywords

Report to the user:
- "Updated component index: [N] components indexed."
- If changes: "Added: [list]. Removed: [list]. Updated: [list]."
- If first-time: "Created component index with [N] components."

## Important Boundaries

- NEVER modify spec files -- read only
- ALWAYS overwrite the entire index (regenerate, don't append)
- If a spec file can't be parsed, include it with category "uncategorized" and keywords
  from the filename only -- never skip a component
```

- [ ] **Step 2: Commit**

```bash
git add plugins/visual-design/skills/update-component-index/SKILL.md
git commit -m "feat: add update-component-index skill for index regeneration"
```

---

### Task 3: Add index generation to consultant wrap-up

**Files:**
- Modify: `plugins/visual-design/skills/visual-design-consultant/SKILL.md:417-437`

- [ ] **Step 1: Add index generation step between writing component files and updating CLAUDE.md**

In the wrap-up "Step 3: Write Files" section, the current steps are:
```
1. Write design-guidelines.md
2. Create design/components/ directory.
3. Write one file per component identified.
4. Add design context to CLAUDE.md automatically:
```

Insert a new step 4 and renumber the old step 4 to step 5:

Find this text in the SKILL.md:
```
3. Write one file per component identified.
4. Add design context to CLAUDE.md automatically:
```

Replace with:
```
3. Write one file per component identified.
4. Generate `design/components/index.md`:
   - For each component spec just written, extract: component name (filename without .md),
     category (from Usage & Content, one of: feedback, action, navigation, layout, overlay,
     data-display, form, media, or "uncategorized"), related components (from "Related
     components" field, comma-separated), and keywords (up to 8 distinctive words from
     "When to use" and "Common contexts").
   - Sort alphabetically by component name.
   - Write the index file:
     ```
     # Component Index

     | Component | Category | Related | Keywords |
     |-----------|----------|---------|----------|
     | [name] | [category] | [related] | [keywords] |
     ```
   - Tell the user: "Generated component index with [N] components."
5. Add design context to CLAUDE.md automatically:
```

- [ ] **Step 2: Commit**

```bash
git add plugins/visual-design/skills/visual-design-consultant/SKILL.md
git commit -m "feat: add component index generation to consultant wrap-up"
```

---

### Task 4: Version bump and push

**Files:**
- Modify: `plugins/visual-design/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Bump version in plugin.json**

Change `"version": "1.2.0"` to `"version": "1.3.0"` in `plugins/visual-design/.claude-plugin/plugin.json`.

- [ ] **Step 2: Bump version in marketplace.json**

Change `"version": "1.2.0"` to `"version": "1.3.0"` for the visual-design entry in `.claude-plugin/marketplace.json`.

- [ ] **Step 3: Commit**

```bash
git add plugins/visual-design/.claude-plugin/plugin.json .claude-plugin/marketplace.json
git commit -m "chore: bump visual-design plugin to v1.3.0"
```

- [ ] **Step 4: Push**

```bash
git push origin master
```
