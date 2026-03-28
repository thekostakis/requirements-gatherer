---
name: design-reviewer
description: >
  Use this skill when a major project step involving visual/UI work has been completed and
  needs to be reviewed against the design system. Examples: "I've finished implementing the
  dashboard page", "the card component is done", "implement epic 3" (when epic involves
  visual output). Also fires on: "review component", "design review", "check against design
  system", "visual review", "run design tests", "implement epic", "implement milestone",
  "implement feature", "perform a design review of [requirements]".
  Do NOT trigger for backend-only, API-only, or CLI work with no visual output.
version: 2.0.0
---

# Design Reviewer

Senior creative director quality gate. Verify that implemented components match the project's
design system, look visually appealing, and meet accessibility standards using live browser
inspection via Chrome MCP tools.

## Tool Dependency Check (MANDATORY -- RUN FIRST)

Before doing ANY work, verify all required tools are available. Run these checks in order:

### Check 1: Design Guidelines

~~~bash
test -f design-guidelines.md && echo "FOUND" || echo "MISSING"
~~~

If MISSING: **STOP.** Tell the user: "No design-guidelines.md found. Run the
visual-design-consultant skill first to establish a design system."

### Check 2: Chrome Browser Tools

Call `mcp__claude-in-chrome__tabs_context_mcp` to verify the Chrome MCP connection is active.

If the call fails or returns an error: **STOP.** Tell the user:
- "Chrome browser tools are not available. The Claude in Chrome extension is required for live inspection."
- "To set up: Install the Claude in Chrome extension and ensure it is enabled in your browser."
- "Once enabled, say 'retry' and I will check again."

Do NOT proceed without user confirmation that Chrome tools are working.

**If ANY tool is missing and partial work was done before discovery: offer to rollback.**

**STOP: BOTH checks must pass before proceeding.**

---

## Mode Detection

After both tool checks pass, determine which review mode to use:

- **Mode B (Requirements-Driven Review)** -- if the user's trigger includes a reference to
  tickets, epics, issues, requirements, milestones, or a requirements file path. Examples:
  "perform a design review of the login requirements", "design review epic 3",
  "review against requirements.md", "implement milestone 2".

- **Mode A (Post-Implementation Quality Gate)** -- otherwise. This is the standard flow
  when the user says something like "review component", "the card is done", or "design review".

---

## Mode A: Post-Implementation Quality Gate

### Step 1: Load Design Context

1. Read `design-guidelines.md` for core tokens and principles.
2. Identify which component(s) were just implemented or changed.
3. Read `design/components/[name].md` for each affected component.
4. If no component spec exists, note it -- review against general guidelines only
   and flag the missing spec as a LOW issue.

### Step 2: Locate Component in Browser

1. Ask the user for a dev server URL, or detect a running dev server on common ports
   (3000, 3001, 4173, 5173, 5174, 8080).
2. Navigate to the page via `mcp__claude-in-chrome__navigate`.
3. Take a screenshot via `mcp__claude-in-chrome__computer` to visually confirm the
   component is present and rendered.

**STOP gate:** Do not proceed until the component is visible in the browser. If the page
is blank, shows an error, or the component cannot be found, tell the user and wait for
guidance.

### Step 3: Live Inspection

Run all five inspection categories against each component under review.

#### Category A: Visual Appearance

1. Screenshot the component in its default state.
2. Use `mcp__claude-in-chrome__computer` to hover over the component, then screenshot
   the hover state.
3. Use `mcp__claude-in-chrome__computer` to click/focus the component, then screenshot
   the focus state.
4. Repeat for active and disabled states if the component spec defines them.
5. Visually compare each captured state against the component spec.
6. Flag missing interactive states (defined in spec but not implemented) as **BLOCKING**.

#### Category B: CSS/Token Compliance

1. Use `mcp__claude-in-chrome__javascript_tool` to read computed styles from the component:

~~~javascript
(() => {
  const el = document.querySelector('SELECTOR');
  if (!el) return { error: 'Element not found' };
  const cs = getComputedStyle(el);
  return {
    color: cs.color, backgroundColor: cs.backgroundColor,
    padding: cs.padding, margin: cs.margin,
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily,
    lineHeight: cs.lineHeight, borderRadius: cs.borderRadius,
    boxShadow: cs.boxShadow, gap: cs.gap, display: cs.display
  };
})()
~~~

2. Compare returned values against the token tables in `design-guidelines.md`.
3. For hover/focus states: trigger the state first via `mcp__claude-in-chrome__computer`,
   then re-run the extraction script above.
4. Flag token violations as **BLOCKING**.

#### Category C: Accessibility

1. Use `mcp__claude-in-chrome__javascript_tool` to inject axe-core from CDN:

~~~javascript
(() => {
  if (window.axe) return 'already loaded';
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
    s.onload = () => resolve('loaded');
    s.onerror = () => reject('CDN blocked');
    document.head.appendChild(s);
  });
})()
~~~

2. Run the accessibility scan:

~~~javascript
axe.run(document.querySelector('SELECTOR') || document, {
  runOnly: ['wcag2a', 'wcag2aa']
}).then(r => ({
  violations: r.violations.map(v => ({
    id: v.id, impact: v.impact, description: v.description,
    nodes: v.nodes.slice(0, 5).map(n => ({ html: n.html.slice(0, 200), target: n.target }))
  })),
  passes: r.passes.length
}))
~~~

3. If CDN injection fails: auto-install axe-core from npm and load locally:

~~~bash
npm install -D axe-core
~~~

   Then read the axe-core source and inject it inline:

   - Use the Read tool to read `node_modules/axe-core/axe.min.js`
   - Use `mcp__claude-in-chrome__javascript_tool` to inject the contents directly:

~~~javascript
(() => {
  if (window.axe) return 'already loaded';
  // [paste axe.min.js contents here — the Read tool output]
  return 'loaded from local install';
})()
~~~

   If npm install also fails: **STOP.** Present alternatives:
   - "axe-core could not be loaded from CDN or installed via npm."
   - "1. Allow CDN access to cdnjs.cloudflare.com and retry."
   - "2. Install manually: `npm install -D axe-core` and retry."
   - "3. Skip accessibility scan (NOT recommended -- accessibility is a core quality requirement)."
   - Do NOT proceed without the user's decision.

4. Flag all WCAG AA violations as **BLOCKING**.

#### Category D: Motion Verification

1. Use `mcp__claude-in-chrome__javascript_tool` to read transition and animation properties
   on the component and its children:

~~~javascript
(() => {
  const results = [];
  const els = document.querySelectorAll('SELECTOR, SELECTOR *');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.transition !== 'all 0s ease 0s' || cs.animationName !== 'none') {
      results.push({
        selector: el.tagName + (el.className ? '.' + el.className.split(' ').join('.') : ''),
        transition: cs.transition,
        transitionDuration: cs.transitionDuration,
        transitionTimingFunction: cs.transitionTimingFunction,
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        animationTimingFunction: cs.animationTimingFunction
      });
    }
  }
  return results;
})()
~~~

2. Compare returned values against the Motion System tokens and Custom Motion Catalog
   from `design-guidelines.md`.
3. Use Grep on source files for `prefers-reduced-motion` support.
4. Optionally, use `mcp__claude-in-chrome__gif_creator` to capture animations for
   visual review.
5. Flag animation/transition values that contradict motion tokens as **BLOCKING**.
6. Flag missing `prefers-reduced-motion` support on any animated element as **BLOCKING**.

#### Category E: Responsive Behavior

1. Read the Responsive System section from `design-guidelines.md` to determine breakpoints
   or fluid scale definitions.
2. Use `mcp__claude-in-chrome__resize_window` to test at viewports:
   375, 768, 1024, 1440 (or use breakpoints from the guidelines if defined).
3. At each viewport:
   - Take a screenshot.
   - Re-run the computed style extraction from Category B.
   - Run the overflow and touch-target check:

~~~javascript
(() => {
  const vw = window.innerWidth;
  const issues = [];
  if (document.documentElement.scrollWidth > vw)
    issues.push({ type: 'horizontal-overflow' });
  if (vw <= 768) {
    for (const el of document.querySelectorAll('a,button,input,[role="button"]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.width < 44 || r.height < 44))
        issues.push({ type: 'small-touch-target', selector: el.tagName, width: r.width, height: r.height });
    }
  }
  return { viewport: vw, issues };
})()
~~~

4. **ALWAYS** restore the browser viewport to 1280px when responsive testing is complete:
   use `mcp__claude-in-chrome__resize_window` to set width back to 1280.
5. Flag horizontal overflow as **BLOCKING**.
6. Flag touch targets below 44x44px at mobile viewports as **BLOCKING**.
7. Flag unreadable content (overlapping text, truncation without ellipsis) as **BLOCKING**.

### Step 4: Categorize and Report

Present findings using this report format:

~~~
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
~~~

**Blocking issues** (must fix before passing):
- Design token violations (wrong colors, spacing, typography)
- Accessibility failures (axe WCAG AA violations)
- Missing interactive states that are defined in the component spec
- Broken animations or transitions
- Missing keyboard navigation
- Contrast ratio failures
- Horizontal overflow at any tested viewport
- Component not adapting per responsive spec
- Touch targets below 44x44px at mobile viewports
- Content unreadable at any breakpoint
- Animation contradicts motion tokens
- Missing `prefers-reduced-motion` support on any animated element
- Fluid scale value outside defined min/max range

**Low issues** (reported, do not block):
- Subjective visual suggestions
- Minor inconsistencies not covered by explicit tokens
- Missing component spec file (suggest creating one)
- Opportunities for animation polish
- Responsive behavior not specified in component compendium
- Inconsistent spacing scaling across breakpoints
- Custom component animation not documented in compendium
- Undocumented animation (works but not in spec)
- Fluid scales defined but component uses fixed pixel values

### Step 5: Fix Loop

1. Fix blocking issues directly using Write, Edit, or Bash.
2. Reload the page in the browser via `mcp__claude-in-chrome__navigate`.
3. Re-inspect ONLY the previously failing categories -- do not re-run passing checks.
4. **Maximum 3 fix cycles.** If blocking issues remain after 3 cycles, escalate to the
   user with full context: what was tried, what changed, why it still fails.

---

## Mode B: Requirements-Driven Review

### Step 1: Parse Requirements

1. Read the referenced tickets, epics, issues, milestones, or requirements file.
2. Extract every visual/UI requirement (skip pure backend items).
3. List the components and pages to review.

### Step 2: Load Design Context

Same as Mode A Step 1, but for ALL components identified in the requirements:

1. Read `design-guidelines.md` for core tokens and principles.
2. For each component, read `design/components/[name].md`.
3. If no component spec exists for a given component, note it and flag as LOW.

### Step 3: Locate in Browser

1. Same dev server discovery as Mode A Step 2 -- ask the user or detect on common ports.
2. Navigate to the first page or component via `mcp__claude-in-chrome__navigate`.
3. Screenshot to confirm the page has loaded.

**STOP gate:** Do not proceed if the dev server is unreachable or the page fails to load.

### Step 4: Review Each Requirement

For each visual requirement extracted in Step 1:

1. Navigate to the relevant page or component in the browser using
   `mcp__claude-in-chrome__navigate`.
2. Run the full 5-category inspection (same as Mode A Step 3: Visual Appearance,
   CSS/Token Compliance, Accessibility, Motion Verification, Responsive Behavior).
3. If blocking issues are found: fix them directly using Write/Edit on source files,
   reload the page, and re-inspect only the failing categories.
4. **Maximum 3 fix cycles per component.** If issues persist, mark the requirement as
   ESCALATED and move on.
5. If no visual implementation is found for a requirement, mark it as MISSING.

### Step 5: Summary Report

After all requirements have been reviewed, present:

~~~
## Design Review Summary

### Requirements Reviewed: N
### Passed: X | Fixed: Y | Escalated: Z | Missing: W

### Per-Requirement Results
1. **[Requirement]:** PASS | FIXED | ESCALATED | MISSING
   - Component: [name]
   - Issues found: [count]
   - Issues fixed: [count]
   - Issues escalated: [list, if any]

### Missing Implementations
- [Requirements with no visual implementation found]

### Escalated Issues
- [Issues that could not be fixed in 3 cycles, with full context]
~~~

---

## Hard Rules

1. **NEVER skip tool checks.** Both checks must pass before any work begins.
2. **NEVER silently degrade.** Chrome tools missing or axe CDN blocked = STOP, present options, wait for user decision.
3. **NEVER loop more than 3 times per component.** Escalate to the user after 3 fix cycles.
4. **NEVER pass a component with blocking issues.**
5. **ALWAYS run the axe accessibility scan.** Accessibility is not optional.
6. **ALWAYS offer rollback** if partial work was done before a tool was found missing.
7. **ALWAYS restore browser viewport to 1280px** after responsive testing is complete.
