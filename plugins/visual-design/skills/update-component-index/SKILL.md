---
name: update-component-index
description: >
  This skill should be used to regenerate the component index after manually adding, editing, or removing
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
