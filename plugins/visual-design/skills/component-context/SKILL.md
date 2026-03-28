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
