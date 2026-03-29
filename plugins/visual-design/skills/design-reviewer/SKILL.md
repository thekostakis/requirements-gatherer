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
version: 3.1.0
---

# Design Reviewer

Senior creative director and UI/UX usability expert quality gate. Verify that implemented
components match the project's design system, look visually appealing, deliver excellent
usability on both desktop and mobile, and meet accessibility standards using live browser
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

#### Server Discovery Priority

Follow this order. Stop at the first successful match:

1. **If the dispatch prompt specifies a URL** → use it directly. Verify with
   `mcp__claude-in-chrome__navigate`. Do NOT scan other ports.
2. **If the dispatch prompt says servers are running** → verify the mentioned URL.
   Do NOT start a new server.
3. **Detect a running dev server** on common ports (3000, 3001, 4173, 5173, 5174, 8080).
4. **If a reverse proxy is in front** → use the proxy URL, not direct backend ports.
5. If no server is found and no URL was provided → ask the user for the dev server URL.

After discovering the server:

1. Navigate to the page via `mcp__claude-in-chrome__navigate`.
2. Take a screenshot via `mcp__claude-in-chrome__computer` to visually confirm the
   component is present and rendered.

**STOP gate:** Do not proceed until the component is visible in the browser. If the page
is blank, shows an error, or the component cannot be found, tell the user and wait for
guidance.

#### Escalation Triggers (early exit)

These patterns indicate an environment issue, not a review issue. Escalate immediately:

- **Page is blank or shows only a loading spinner after 5 seconds** → SPA hydration issue
  or wrong URL. Escalate: "Page at [URL] shows [blank/spinner]. Possible causes: SPA not
  hydrated, wrong route, build not complete."
- **Chrome MCP returns errors on all navigation attempts** → extension issue, not a review
  issue. Escalate: "Chrome MCP tools returning errors on navigation. The Claude in Chrome
  extension may need to be restarted."
- **design-guidelines.md exists but contains no tokens** → file is a stub. Escalate:
  "design-guidelines.md found but contains no usable design tokens. Run the
  visual-design-consultant skill first to populate it."

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

#### Category F: UX and Usability Review

This category is the creative director and UX expert layer. It goes beyond tokens and
checklists to evaluate the actual user experience. Run at both desktop (1280px) and
mobile (375px) viewports.

1. **Visual hierarchy assessment.** Screenshot the page at each viewport. Evaluate whether
   the most important content and actions are visually dominant. Check that the visual
   hierarchy guides the user's eye correctly — heading sizes, contrast, whitespace, and
   color weight should draw attention to primary content first. Flag unclear or competing
   hierarchy as **BLOCKING**.

2. **Information architecture at breakpoints.** At mobile, evaluate whether the content
   reflow makes sense — is important information still accessible without excessive
   scrolling? Are secondary elements appropriately collapsed or hidden? At desktop, is the
   layout using the available space effectively or is it stretched and sparse? Flag poor
   information reflow at mobile as **BLOCKING**.

3. **Navigation and task flow.** Evaluate whether primary actions are easily discoverable.
   On mobile, check that navigation is thumb-friendly and critical CTAs are above the fold.
   On desktop, verify navigation structure is intuitive and follows established patterns.
   Flag buried or hidden primary actions as **BLOCKING**.

4. **Cognitive load.** Assess whether any single screen presents too much information, too
   many choices, or unclear next steps. Look for: walls of text without hierarchy, too many
   equally-weighted buttons, unclear form flows, missing progress indicators in multi-step
   processes. Flag overwhelming screens as **BLOCKING**.

5. **Consistency between breakpoints.** Ensure the visual language — colors, spacing rhythm,
   typography scale, icon style — remains consistent from desktop to mobile even though
   layout changes. Flag jarring visual inconsistencies across breakpoints as **BLOCKING**.

6. **Interaction feedback.** Check that interactive elements provide clear feedback: hover
   states on desktop, press states on mobile, loading states for async actions, error states
   for forms. Use `mcp__claude-in-chrome__computer` to trigger interactions and screenshot
   the feedback. Flag silent interactions (click produces no visible change) as **BLOCKING**.

7. **Content readability.** At each viewport, check font sizes against minimum readability
   standards (16px body minimum on mobile, adequate line length of 45-75 characters). Check
   contrast not just for WCAG compliance but for comfortable extended reading. Flag
   uncomfortable reading experiences at any viewport as **BLOCKING**.

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

### UX and Usability Review

#### Desktop (1280px)
- Visual hierarchy: [assessment]
- Navigation/task flow: [assessment]
- Cognitive load: [assessment]
- Content readability: [assessment]

#### Mobile (375px)
- Visual hierarchy: [assessment]
- Information reflow: [assessment]
- Navigation/task flow: [assessment]
- Cognitive load: [assessment]
- Touch target usability: [assessment]
- Content readability: [assessment]

#### Cross-Breakpoint Consistency
- [assessment]

#### UX Issues
1. **[Severity]:** [Description]
   - Viewport: desktop / mobile / both
   - Impact: [what user experience is affected]
   - Suggestion: [specific improvement with code-level or directive-level detail]
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
- Unclear visual hierarchy at any viewport
- Poor information reflow at mobile
- Primary actions not discoverable
- Overwhelming cognitive load on any screen
- Inconsistent visual language across breakpoints
- Interactive elements with no feedback
- Uncomfortable reading experience at any viewport

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
- Minor visual hierarchy suggestions
- Opportunities for better mobile space utilization
- Navigation improvements not affecting core task completion
- Content organization suggestions

### Step 5: Report with Fix Suggestions

Do NOT apply any fixes. Produce the categorized report from Step 4 with fix suggestions
for every BLOCKING and LOW issue:

- **Code-level suggestions** (for straightforward fixes): include exact file path, line
  number, and the specific change to make. Example: "Change `color: #666` to
  `color: var(--text-primary)` at `src/components/Card.tsx:42`"
- **Directive-level suggestions** (for complex UX/design changes): describe what to change,
  where, why, and what design principles apply. Example: "The mobile navigation buries the
  primary CTA below three levels of menu. Consider promoting it to a persistent bottom bar
  or floating action button, following the thumb-zone accessibility pattern."

The caller will read this report, apply the recommended fixes, and optionally re-dispatch
this skill for a follow-up review.

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
3. If blocking issues are found: report them with specific fix suggestions (code-level
   or directive-level). Do NOT apply fixes directly.
4. Report all findings for each requirement. The caller will apply fixes and optionally
   re-dispatch for follow-up review.
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
3. **NEVER pass a component with blocking issues.** Report all blocking issues with fix suggestions.
4. **ALWAYS run the axe accessibility scan.** Accessibility is not optional.
5. **ALWAYS offer rollback** if partial work was done before a tool was found missing.
6. **ALWAYS restore browser viewport to 1280px** after responsive testing is complete.
7. **ALWAYS evaluate UX at both desktop (1280px) and mobile (375px) viewports.**
8. **Do NOT apply fixes.** This skill produces reports with fix suggestions. The caller applies fixes.
9. **ALWAYS classify fix suggestions** as "safe fix" (code-level, no UX impact) or "design/UX change needed" (directive-level, requires design decisions).
