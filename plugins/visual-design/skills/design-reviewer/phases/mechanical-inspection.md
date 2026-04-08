# Mechanical Inspection — Categories A-E

This phase covers the structured, automatable inspection categories. When running under
the design-reviewer agent, this phase is dispatched to a haiku sub-agent. All browser
interaction uses **headless Playwright** via **`playwright-skill-bridge.mjs`** (ships with
visual-design and functional-tester plugins). **No Chrome DevTools MCP** — CI-safe and
AFK-safe.

## Resolve `BRIDGE` and env

~~~bash
BRIDGE="$(find . -path "*/visual-design/scripts/playwright-skill-bridge.mjs" -print -quit 2>/dev/null)"
test -n "$BRIDGE" || BRIDGE="$(find . -path "*/functional-tester/scripts/playwright-skill-bridge.mjs" -print -quit)"
export PW_IGNORE_HTTPS_ERRORS=1
# Optional: export PW_STORAGE_STATE=/path/to/storage.json
~~~

See `references/playwright-headless.md` in this skill for command summary (`snapshot`,
`screenshot`, `network`, `run`).

## Reliability

- **Playwright retry:** If any bridge `node` command fails, retry up to 2 times with a
  3-second delay before escalating.
- **Bash timeout:** All bash commands must use a 30-second timeout
  (prefix with `timeout 30` or equivalent).

## Progress log (agent / haiku sub-agent)

If dispatch includes **`PROGRESS_LOG`** (absolute path), the **haiku sub-agent** appends
**granular** lines as Categories **A–E** complete **per component or page**. Use
**`references/agent-progress.md`** for the `printf` pattern and responsibilities. The
sub-agent performs **most** appends; the opus parent appends milestones only.

---

## Screenshot Efficiency Rules

These rules apply to ALL categories (A-E):

1. **Capture once, reference many.** Before taking a screenshot, check if an identical
   capture exists (same URL + viewport size + interaction state). Reuse existing files
   instead of recapturing. Use the naming convention: `{page}-{viewport}-{state}.png`
   (e.g., `settings-1280-default.png`, `settings-375-hover.png`).

2. **Viewport-only for mechanical checks.** Use `fullPage: false` for Categories A-E
   screenshots. Full-page captures are unnecessary for CSS property extraction and
   axe scans — they inflate image size by 3-5x.

3. **Single viewport loop.** Categories B (CSS compliance) and E (responsive) MUST share
   a single viewport loop. For each breakpoint (375, 768, 1024, 1440):
   - Take ONE screenshot (viewport-only)
   - Extract computed styles (Category B check)
   - Check overflow and touch targets (Category E check)
   - Save results keyed by viewport width
   Do NOT loop through viewports separately for B and E.

4. **Computed styles: deviations only.** When extracting CSS properties, compare against
   the design token values provided in the dispatch. Only report properties that DIFFER
   from the expected token values. Do not report matching properties.

5. **Axe results: summary + top violations.** Report axe scan results as:
   - Total violation count by severity (critical, serious, moderate, minor)
   - Full details for the top 5 most severe violations only
   - Do NOT serialize the complete axe JSON output

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
   `timeout 90 node "$BRIDGE" snapshot "<URL>"` (or `screenshot`) — expect non-empty tree or
   image. Do NOT scan other ports.
2. **If the dispatch prompt says servers are running** → verify the mentioned URL.
   Do NOT start a new server.
3. **Detect a running dev server** on common ports (3000, 3001, 4173, 5173, 5174, 8080).
4. **If a reverse proxy is in front** → use the proxy URL, not direct backend ports.
5. If no server is found and no URL was provided → ask the user for the dev server URL.

After discovering **`PAGE_URL`**:

1. Capture a headless screenshot:
   `timeout 90 node "$BRIDGE" screenshot "$PAGE_URL" .agent-progress/design-review-load.png 1280 720`
2. Read the image (Read tool) to visually confirm the component is present and rendered.

**STOP gate:** Do not proceed until the component is visible. If the page is blank, shows
an error, or the component cannot be found, tell the user and wait for guidance.

#### Escalation Triggers (early exit)

These patterns indicate an environment issue, not a review issue. Escalate immediately:

- **Page is blank or shows only a loading spinner after 5 seconds** → SPA hydration issue
  or wrong URL. Escalate: "Page at [URL] shows [blank/spinner]. Possible causes: SPA not
  hydrated, wrong route, build not complete."
- **Playwright bridge fails on all navigation attempts** (timeout, net::ERR, browser not
  installed) → environment issue. Escalate: "Headless Playwright cannot load [URL]. Run
  `npx playwright install chromium`, verify BASE_URL, and set `PW_STORAGE_STATE` if auth
  is required."
- **design-guidelines.md exists but contains no tokens** → file is a stub. Escalate:
  "design-guidelines.md found but contains no usable design tokens. Run the
  visual-design-consultant skill first to populate it."

### Step 3: Live Inspection

Run all five inspection categories against each component under review.

#### Category A: Visual Appearance

Use **`node "$BRIDGE" run "$PAGE_URL" ./tmp-cat-a.mjs`** (write the module per step). The
default export receives `page` already on `PAGE_URL`.

Before capturing a new screenshot, check if `{page}-{viewport}-{state}.png` already exists
in the screenshots directory. If it does, reference it instead of recapturing.

1. Default state: `await page.screenshot({ path: '.agent-progress/cat-a-default.png' })`.
2. Hover: `await page.hover(selector)` then screenshot to `.agent-progress/cat-a-hover.png`.
3. Focus: `await page.focus(selector)` then screenshot to `.agent-progress/cat-a-focus.png`.
4. Repeat for active/disabled if the spec defines them (use `run` sequences or keyboard
   modifiers as needed).
5. Read each PNG and compare against the component spec.
6. Flag missing interactive states (defined in spec but not implemented) as **BLOCKING**.

#### Category B: CSS/Token Compliance

1. Read `scripts/read-computed-styles.js`. Build a **`run` module** that substitutes the
   real selector for `'SELECTOR'`, then `return await page.evaluate(() => { ... })` with
   that file's IIFE body (browser context), or pass the selector as an argument via
   `page.evaluate(([sel]) => { ... }, [selector])`.
2. Execute: `timeout 90 node "$BRIDGE" run "$PAGE_URL" ./tmp-computed.mjs` and parse JSON
   stdout.
3. Compare returned values against the token tables in `design-guidelines.md`.
4. For hover/focus states: extend the module — `hover`/`focus` the node, then re-run the
   computed-style evaluation.
5. Flag token violations as **BLOCKING**.

#### Category C: Accessibility

1. **Preferred:** If `@axe-core/playwright` is in `package.json`, add a one-off test file
   under the project's test directory that navigates to `PAGE_URL`, runs `AxeBuilder`, and
   `console.log(JSON.stringify(results))`; execute with
   `timeout 120 npx playwright test path/to/tmp-axe.spec.ts --reporter=line`.

2. **Otherwise:** Use **`node "$BRIDGE" run "$PAGE_URL" ./tmp-axe-cdn.mjs`**. The module
   should `addScriptTag` the axe CDN, `waitForFunction(() => window.axe)`, then
   `page.evaluate` an async `axe.run(document.querySelector('SELECTOR') || document, {
   runOnly: ['wcag2a','wcag2aa'] })` and return `{ violations, passes }` trimmed for size.

3. If CDN is blocked: `npm install -D axe-core` and load `axe.min.js` via
   `addScriptTag({ path: 'node_modules/axe-core/axe.min.js' })` inside the same module.

4. If all axe loading fails: **STOP** and present the same alternatives as before (CDN,
   npm install, or explicit user opt-out — accessibility remains a core bar).

5. Flag all WCAG AA violations as **BLOCKING**.

#### Category D: Motion Verification

1. Read `scripts/read-motion-properties.js` and execute it in-page via a **`run` module**
   (`page.evaluate` with the substituted selector), same pattern as Category B.
2. Compare returned values against the Motion System tokens and Custom Motion Catalog
   from `design-guidelines.md`.
3. Use Grep on source files for `prefers-reduced-motion` support.
4. Take screenshots before/after animation triggers inside the `run` module (`page.screenshot`).
5. Flag animation/transition values that contradict motion tokens as **BLOCKING**.
6. Flag missing `prefers-reduced-motion` support on any animated element as **BLOCKING**.

#### Category E: Responsive Behavior

**This category shares a viewport loop with Category B** per the Screenshot Efficiency
Rules above. Do NOT run a separate viewport loop. Consume the per-viewport data (screenshots,
computed styles, overflow/touch-target results) already captured during the shared B+E loop.

If the shared loop has not yet run (e.g., Category B was skipped), run it here using the
combined procedure below.

1. Read the Responsive System section from `design-guidelines.md` to determine breakpoints
   or fluid scale definitions.
2. The shared viewport loop (375, 768, 1024, 1440 or guideline breakpoints) captures for
   each breakpoint: ONE screenshot (viewport-only), computed styles (Category B), and the
   overflow/touch-target `page.evaluate` (Category E). Use results keyed by viewport width:

~~~javascript
// Inside page.evaluate after sizing:
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

3. **ALWAYS** end the module with `setViewportSize({ width: 1280, height: 720 })` (desktop
   baseline for downstream Category F).
4. Flag horizontal overflow as **BLOCKING**.
5. Flag touch targets below 44x44px at mobile viewports as **BLOCKING**.
6. Flag unreadable content (overlapping text, truncation without ellipsis) as **BLOCKING**.

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
2. Load the first page headlessly:
   `timeout 90 node "$BRIDGE" screenshot "$PAGE_URL" .agent-progress/mode-b-load.png 1280 720`
3. Read the PNG to confirm the page has loaded.

**STOP gate:** Do not proceed if the dev server is unreachable or the page fails to load.

### Step 4: Review Each Requirement

For each visual requirement extracted in Step 1:

1. Set `PAGE_URL` for the requirement under test and use the same headless bridge
   commands (`screenshot`, `snapshot`, `run`) as Mode A.
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
