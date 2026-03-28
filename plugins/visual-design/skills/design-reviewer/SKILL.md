---
name: design-reviewer
description: >
  Use this skill after frontend component implementation is completed or modified to run a
  visual quality gate. Trigger phrases: "review component", "design review", "check against
  design system", "visual review", "run design tests", "does this match the design".
  Also use after: finishing a component implementation, modifying component styles or animations,
  updating a component's responsive behavior, or any time you need to verify a component
  matches the design system.
version: 1.2.0
---

# Design Reviewer

Senior creative director quality gate. Verify that implemented components match the project's
design system, look visually appealing, and meet accessibility standards.

## Tool Dependency Check (MANDATORY -- RUN FIRST)

Before doing ANY work, verify all required tools are available. Run these checks in order:

### Check 1: Design Guidelines
```bash
test -f design-guidelines.md && echo "FOUND" || echo "MISSING"
```
If MISSING: STOP. Tell the user: "No design-guidelines.md found. Run the
visual-design-consultant skill first to establish a design system."

### Check 2: Playwright
```bash
npx playwright --version 2>/dev/null || echo "MISSING"
```
If MISSING: STOP. Present options:
- "Playwright is not installed. It's needed for visual testing."
- "To install: `npm init playwright@latest`"
- "Workaround: I can write the test files without running them, and you can run them later."
- "Retry: Say 'retry' after installing."
Do NOT proceed without user decision.

### Check 3: Storybook
```bash
npx storybook --version 2>/dev/null || echo "MISSING"
```
If MISSING: STOP. Present options:
- "Storybook is not installed. It's needed as the visual test harness."
- "To install: `npx storybook@latest init`"
- "This will scaffold Storybook for your framework. Want me to run this?"
- "Retry: Say 'retry' after installing."
Do NOT proceed without user decision.

### Check 4: axe-core
```bash
npm ls @axe-core/playwright 2>/dev/null || echo "MISSING"
```
If MISSING: STOP. Present options:
- "axe-core Playwright integration is not installed. It's needed for accessibility testing."
- "To install: `npm install -D @axe-core/playwright`"
- "Retry: Say 'retry' after installing."
Do NOT proceed without user decision.

**If ANY tool is missing and partial work was done before discovery: offer to rollback.**

**STOP: ALL four checks must pass before proceeding.**

---

## Review Process

### Step 1: Load Design Context

1. Read `design-guidelines.md` for core tokens and principles.
2. Identify which component(s) were just implemented or changed.
3. Read `design/components/[name].md` for each affected component.
4. If no component spec exists, note it -- you'll review against general guidelines only
   and flag the missing spec as a low issue.

### Step 2: Verify or Create Storybook Stories

For each component being reviewed:

1. Check if a Storybook story exists (look in `stories/`, `src/stories/`,
   `[component-dir]/*.stories.*`).
2. If no story exists, create one covering:
   - Default state
   - All variants (primary, secondary, etc.)
   - Interactive states (hover, focus, disabled)
   - Error state (if applicable)
   - Loading state (if applicable)
3. If a story exists but doesn't cover all states from the component spec, update it.

### Step 3: Write Playwright Visual Tests

For each component, create or update a Playwright test file. The test file should cover
these categories:

**Category A: Screenshot Comparison**
- Render each story variant
- Capture screenshot
- Compare against baseline (first run creates the baseline)
- Flag visual differences above threshold

**Category B: CSS Property Assertions**
- Verify design token compliance: colors, spacing, typography, border-radius, shadows
- Assert against values from design-guidelines.md
- Responsive behavior is tested in Category E below

**Category C: Accessibility (axe-core)**
- Run axe-core against each story
- Report all WCAG AA violations
- Include specific element, rule violated, and fix suggestion

**Category D: Motion Verification**
- Read the Motion System section from `design-guidelines.md` (duration tokens, easing
  tokens, animation patterns)
- Read the Custom Motion Catalog from `design-guidelines.md` for non-standard animations
- Read the component's Animations table from its compendium spec
- For each component under review:
  - Assert transition properties match motion tokens (duration, easing)
  - Assert `animation-name` matches the expected keyframe if specified in the spec
  - Assert `animation-duration`, `animation-timing-function` match design tokens
  - If the component has a Custom Motion Catalog entry, verify the animation matches
    the catalog spec
  - Check `prefers-reduced-motion: reduce` -- all animations must be disabled or simplified
  - Check for animations not in the spec (undocumented motion = low issue)
- For custom components not in the hardcoded compendium:
  - If the component has any transition/animation AND no compendium entry, flag as LOW:
    "Custom component [selector] has animation but no design spec -- consider adding to
    component compendium"
  - If the component has animation that contradicts the motion token system (e.g., 800ms
    duration when design system max is 400ms), flag as BLOCKING

**Category E: Responsive Behavior**
- Read the Responsive System section from `design-guidelines.md`.
- Determine which approach the project uses:
  - **Fluid:** Look for a "Fluid Scales" section. Test by verifying that font sizes and
    spacing change continuously across viewports (not in discrete jumps). At each test
    viewport, assert that computed font-size/padding values fall within the min/max range
    defined in the Fluid Scales table.
  - **Breakpoint-based:** Look for a "Breakpoints" section with discrete values. Test
    layout changes at each defined breakpoint.
  - If no responsive section exists, use default test viewports: 375px, 768px, 1024px,
    1440px.
- Read the component's Responsive Behavior table from its compendium spec.
- For each test viewport, set the Playwright viewport and verify:
  - Layout changes match the spec (e.g., columns collapse, sidebar hides)
  - No horizontal overflow or content clipping at any viewport
  - Touch targets are at least 44x44px at mobile viewports
  - Text remains readable (no truncation without ellipsis, no overlap)
  - Navigation adapts as specified (hamburger appears, horizontal nav collapses)
  - **Fluid-specific:** If the project uses fluid responsive, verify that computed
    values at 375px and 1440px fall within the min/max bounds of the Fluid Scales table.
    Flag as BLOCKING if a value exceeds its defined range.
- Playwright viewport setting:
  ```typescript
  await page.setViewportSize({ width: 375, height: 812 });
  ```
- Take a screenshot at each viewport for visual comparison
- Assert CSS property values at each viewport match what the design system specifies

### Step 4: Run Tests

```bash
npx playwright test [test-file] --reporter=list
```

Capture output. Parse results into blocking and low issues.

### Step 5: Categorize and Report

**BLOCKING issues (must fix):**
- Design token violations (wrong colors, spacing, typography)
- Accessibility failures (axe violations)
- Missing states that are in the component spec
- Broken animations or transitions
- Missing keyboard navigation
- Contrast ratio failures
- Horizontal overflow at any defined breakpoint
- Component not adapting as specified in the responsive behavior spec
- Touch targets below 44x44px at mobile breakpoints
- Content unreadable (overlapping text, truncated without ellipsis) at any breakpoint
- Animation duration/easing contradicts design system motion tokens
- Missing `prefers-reduced-motion` support on any animated element
- Fluid scale value outside defined min/max range at any tested viewport

**LOW issues (reported, don't block):**
- Subjective visual appeal suggestions (with explanation)
- Minor inconsistencies not covered by explicit tokens
- Missing component spec file (suggest creating one)
- Opportunities for better animation or polish
- Responsive behavior not specified in component compendium (suggest adding it)
- Layout works but could be optimized for a specific breakpoint
- Inconsistent spacing scaling across breakpoints
- Custom component has animation but no compendium entry documenting it
- Undocumented animation on a component (works but not in spec)
- Animation that could use a reusable motion pattern instead of one-off values
- Fluid scales defined but component uses fixed pixel values instead of clamp()

Report format:
```
## Design Review: [Component Name]

### Status: FAIL (X blocking, Y low) | PASS (Y low)

### Blocking Issues
1. **[Category]:** [Description]
   - Expected: [what the design system says]
   - Actual: [what was found]
   - Location: [file:line or element selector]
   - Fix: [specific suggestion]

### Low Issues
1. **[Category]:** [Description]
   - Suggestion: [what could be improved]

### Passed Checks
- [List of checks that passed, for confidence]
```

### Step 6: Loop or Pass

**If blocking issues exist:**
- Fix the blocking issues directly (you have Write/Edit/Bash access)
- Re-run Steps 4-5
- Maximum 3 cycles before escalation

**If only low issues remain (or zero issues):**
- Mark as PASS
- Report low issues for awareness

**On escalation (3 cycles exceeded):**
- Report all remaining issues to the user with full context
- Include: what was tried, what changed, why it still fails
- Ask user to decide: fix manually, accept as-is, or adjust the guideline

---

## Hard Rules

1. **NEVER skip tool checks.** Run all 4 checks before any work.
2. **NEVER silently degrade.** Missing tool = stop, present options, wait.
3. **NEVER loop more than 3 times.** Escalate to user.
4. **NEVER pass a component with blocking issues.**
5. **ALWAYS run axe accessibility checks.** Accessibility is not optional.
6. **ALWAYS offer rollback** if partial work was done before a tool was found missing.
