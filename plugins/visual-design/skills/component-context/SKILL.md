---
name: component-context
description: >
  Use this skill when implementing frontend components to load the relevant design spec.
  Trigger phrases: "load component spec", "component design spec", "what does the design say
  about [component]", "show me the spec for [component]", "design spec for [component]".
  Also use when: creating or editing files in component directories (components/, ui/, widgets/),
  writing component function/class definitions, creating Storybook stories, or any time you need
  the design system's component specification to guide implementation.
version: 1.2.0
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

## Step 3: Search for Exact Match

Look for `design/components/[component-name].md`. Try the component name directly, then
try common variants:
- Hyphenated: `NotificationBanner` -> `notification-banner`
- camelCase split: `notificationBanner` -> `notification-banner`
- Singular/plural: `buttons` -> `button`

If found -> go to Step 5 (Load Tokens).

## Step 4: Fuzzy Match (no exact match found)

If no exact match exists, search all component spec files in `design/components/`:

1. Use Glob to list all `.md` files in `design/components/`.
2. Read each spec file and score it against the target component using these signals:

| Signal | Weight | How it matches |
|--------|--------|---------------|
| Name substring | 3 | Target name appears in spec filename or vice versa |
| Related components field | 3 | Target name listed in spec's "Related components" |
| Usage keyword overlap | 2 | Words from the implementation context match spec's "When to use" / "Common contexts" |
| Data field overlap | 2 | Similar field names or types to what the component likely needs |
| Same category | 1 | Both serve similar purposes (feedback, navigation, data display, etc.) |

3. Rank all specs by total score. Return up to 3 with score > 0.

**Delivery format for suggestions:**

    ## No Exact Spec: [Component Name]

    No spec file found for "[component name]". Here are similar components
    that may help as a starting point:

    ### Suggestion 1: [Name] (highest relevance)
    **Why:** [1-2 sentences explaining the match -- which signals scored]

    [Full spec content of the highest-scoring component]

    ### Suggestion 2: [Name] (moderate relevance)
    **Why:** [1-2 sentences]

    [Abbreviated spec -- Visual Properties, Data Fields, Usage & Content only]

    ### Suggestion 3: [Name] (lower relevance)
    **Why:** [1-2 sentences]

    [Abbreviated spec -- Visual Properties, Data Fields, Usage & Content only]

    ---
    To add a dedicated spec for [component name], run the visual-design-consultant skill.

If no specs score above 0 -> fall back to: "No spec file found for [component name], and
no similar components in the compendium. Run the visual-design-consultant skill to add it."

## Step 5: Load Relevant Tokens

Read `design-guidelines.md` and extract the specific tokens referenced by the component
spec (colors, spacing, typography, motion, breakpoints).

## Step 6: Deliver

Present the component spec and relevant tokens:

    ## Design Spec: [Component Name]

    [Full content of the component spec file]

    ## Relevant Design Tokens

    [Only the tokens from design-guidelines.md that this component uses]

    ## Responsive Tokens (if component spec has Responsive Behavior section)

    [Breakpoints or fluid scales and responsive patterns from design-guidelines.md
    that the component's Responsive Behavior table references]

Then continue with the implementation task using the loaded spec as your guide.

## Context Limits

- Load at most 3 component specs at once (under 200 lines each = 600 lines max)
- If more than 3 components are being worked on simultaneously, load the primary one
  and list the others as available on request
- Always include the relevant tokens section -- keep it under 50 lines by filtering to
  only what's referenced
- For fuzzy match suggestions, include full spec for the top suggestion only; abbreviate
  suggestions 2 and 3 to Visual Properties, Data Fields, and Usage & Content sections

## Important Boundaries

- Do NOT modify design files or component specs
- Do NOT make design decisions -- deliver what the spec says
- Do NOT skip loading the spec to "save time" -- the spec exists to prevent implementation drift
