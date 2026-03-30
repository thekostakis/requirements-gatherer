# Mechanical Inspection — Categories A-E

This phase covers the structured, automatable inspection categories. When running under
the design-reviewer agent, this phase is dispatched to a haiku sub-agent. All browser
interaction uses chrome-devtools-mcp.

## Reliability

- **MCP retry:** If any `mcp__chrome-devtools-mcp__*` call fails, retry up to 2 times
  with a 3-second delay before escalating the failure.
- **Bash timeout:** All bash commands must use a 30-second timeout
  (prefix with `timeout 30` or equivalent).

---

## Consultant Synergy

If `design/review-checklist.md` exists (produced by the visual-design-consultant skill),
read it before starting the inspection. For each checklist item, verify it against the
live page alongside the standard category checks. Report checklist items as their own
line items in the findings, tagged with `[checklist]`.

---

## Mode A: Post-Implementation Quality Gate

### Step 1: Load Design Context

1. Read `design-guidelines.md` for core tokens and principles.
2. Identify which component(s) were just implemented or changed.
3. Read `design/components/[name].md` for each affected component.
4. If no component spec exists, note it — review against general guidelines only
   and flag the missing spec as a LOW issue.

### Step 2: Locate Component in Browser

#### Server Discovery Priority

Follow this order. Stop at the first successful match:

1. **If the dispatch prompt specifies a URL** → use it directly. Verify with
   `mcp__chrome-devtools-mcp__navigate_page`. Do NOT scan other ports.
2. **If the dispatch prompt says servers are running** → verify the mentioned URL.
   Do NOT start a new server.
3. **Detect a running dev server** on common ports (3000, 3001, 4173, 5173, 5174, 8080).
4. **If a reverse proxy is in front** → use the proxy URL, not direct backend ports.
5. If no server is found and no URL was provided → ask the user for the dev server URL.

After discovering the server:

1. Navigate to the page via `mcp__chrome-devtools-mcp__navigate_page`.
2. Take a screenshot via `mcp__chrome-devtools-mcp__take_screenshot` to visually confirm
   the component is present and rendered.

**STOP gate:** Do not proceed until the component is visible in the browser. If the page
is blank, shows an error, or the component cannot be found, tell the user and wait for
guidance.

#### Escalation Triggers (early exit)

These patterns indicate an environment issue, not a review issue. Escalate immediately:

- **Page is blank or shows only a loading spinner after 5 seconds** → SPA hydration issue
  or wrong URL. Escalate: "Page at [URL] shows [blank/spinner]. Possible causes: SPA not
  hydrated, wrong route, build not complete."
- **chrome-devtools-mcp returns errors on all navigation attempts** → connection issue.
  Escalate: "chrome-devtools-mcp returning errors on navigation. Check that Chrome is
  running with remote debugging enabled and chrome-devtools-mcp is connected."
- **design-guidelines.md exists but contains no tokens** → file is a stub. Escalate:
  "design-guidelines.md found but contains no usable design tokens. Run the
  visual-design-consultant skill first to populate it."

### Step 3: Live Inspection

Run all five inspection categories against each component under review.

#### Category A: Visual Appearance

1. Take a screenshot of the component in its default state via
   `mcp__chrome-devtools-mcp__take_screenshot`.
2. Use `mcp__chrome-devtools-mcp__evaluate_script` to dispatch a mouseover event on the
   component, then take a screenshot of the hover state.
3. Use `mcp__chrome-devtools-mcp__evaluate_script` to dispatch a focus event on the
   component, then take a screenshot of the focus state.
4. Repeat for active and disabled states if the component spec defines them.
5. Visually compare each captured state against the component spec.
6. Flag missing interactive states (defined in spec but not implemented) as **BLOCKING**.

#### Category B: CSS/Token Compliance

1. Read the script at `scripts/read-computed-styles.js` and inject it via
   `mcp__chrome-devtools-mcp__evaluate_script`, substituting the target selector for
   `'SELECTOR'`. For example, to inspect `.card-header`:

~~~javascript
// read-computed-styles.js with selector substituted — see scripts/read-computed-styles.js
~~~

2. Compare returned values against the token tables in `design-guidelines.md`.
3. For hover/focus states: trigger the state first via
   `mcp__chrome-devtools-mcp__evaluate_script` (dispatch the event), then re-run the
   extraction script.
4. Flag token violations as **BLOCKING**.

#### Category C: Accessibility

1. Use `mcp__chrome-devtools-mcp__evaluate_script` to inject axe-core from CDN:

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
timeout 30 npm install -D axe-core
~~~

   Then read the axe-core source and inject it inline:

   - Use the Read tool to read `node_modules/axe-core/axe.min.js`
   - Use `mcp__chrome-devtools-mcp__evaluate_script` to inject the contents directly:

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
   - "3. Skip accessibility scan (NOT recommended — accessibility is a core quality requirement)."
   - Do NOT proceed without the user's decision.

4. **Alternative:** If Playwright is available in the project, `@axe-core/playwright` can
   be used as an alternative to CDN injection. Check for `@axe-core/playwright` in
   `package.json` before attempting CDN injection. If present, note it in the report as an
   available alternative but still proceed with the CDN approach for live browser review.

5. Flag all WCAG AA violations as **BLOCKING**.

#### Category D: Motion Verification

1. Read the script at `scripts/read-motion-properties.js` and inject it via
   `mcp__chrome-devtools-mcp__evaluate_script`, substituting the target selector for
   `'SELECTOR'`.

2. Compare returned values against the Motion System tokens and Custom Motion Catalog
   from `design-guidelines.md`.
3. Use Grep on source files for `prefers-reduced-motion` support.
4. Take screenshots before and after triggering animations via
   `mcp__chrome-devtools-mcp__take_screenshot` for visual review.
5. Flag animation/transition values that contradict motion tokens as **BLOCKING**.
6. Flag missing `prefers-reduced-motion` support on any animated element as **BLOCKING**.

#### Category E: Responsive Behavior

1. Read the Responsive System section from `design-guidelines.md` to determine breakpoints
   or fluid scale definitions.
2. Use `mcp__chrome-devtools-mcp__resize_page` to test at viewports:
   375, 768, 1024, 1440 (or use breakpoints from the guidelines if defined).
3. At each viewport:
   - Take a screenshot via `mcp__chrome-devtools-mcp__take_screenshot`.
   - Re-run the computed style extraction from Category B.
   - Run the overflow and touch-target check via
     `mcp__chrome-devtools-mcp__evaluate_script`:

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
   use `mcp__chrome-devtools-mcp__resize_page` to set width back to 1280.
5. Flag horizontal overflow as **BLOCKING**.
6. Flag touch targets below 44x44px at mobile viewports as **BLOCKING**.
7. Flag unreadable content (overlapping text, truncation without ellipsis) as **BLOCKING**.

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

1. Same dev server discovery as Mode A Step 2 — ask the user or detect on common ports.
2. Navigate to the first page or component via `mcp__chrome-devtools-mcp__navigate_page`.
3. Take a screenshot via `mcp__chrome-devtools-mcp__take_screenshot` to confirm the page
   has loaded.

**STOP gate:** Do not proceed if the dev server is unreachable or the page fails to load.

### Step 4: Review Each Requirement

For each visual requirement extracted in Step 1:

1. Navigate to the relevant page or component in the browser using
   `mcp__chrome-devtools-mcp__navigate_page`.
2. Run the full 5-category inspection (same as Mode A Step 3: Visual Appearance,
   CSS/Token Compliance, Accessibility, Motion Verification, Responsive Behavior).
3. If blocking issues are found: report them with specific fix suggestions (code-level
   or directive-level). Do NOT apply fixes directly.
4. Report all findings for each requirement. The caller will apply fixes and optionally
   re-dispatch for follow-up review.
5. If no visual implementation is found for a requirement, mark it as MISSING.

### Step 5: Compile Mode B summary (for final report)

Assemble the structured summary the main skill's **Mode B Report** template expects:

1. **Requirements Reviewed:** total count from Step 1.
2. **Passed / Escalated / Missing:** counts from Step 4 (PASS = no blocking issues for that requirement; ESCALATED = blocking issues remain; MISSING = no UI found).
3. **Per-requirement results:** one row per requirement — name, PASS | ESCALATED | MISSING, component, issue counts, short issue list for escalated items.
4. **UX Score and Nielsen heuristic table:** not produced in this phase — the opus parent fills Category F (`phases/ux-heuristics.md`) and merges into the final report. Leave explicit placeholders in your handoff if you are the haiku sub-agent: "Category F pending (opus)."

---

## Issue Classification

**Functional / behavior change (caller escalation):** Any fix that would change how users complete tasks — add/remove confirmations, change validation timing, alter navigation or IA, change auth or session behavior, remove or hide capabilities, or change error outcomes — MUST be labeled **FUNCTIONAL / BEHAVIOR CHANGE — ESCALATE BEFORE FIX**. The orchestrator MUST obtain explicit user approval before implementing; do not treat BLOCKING severity as permission to auto-apply product-changing fixes.

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
