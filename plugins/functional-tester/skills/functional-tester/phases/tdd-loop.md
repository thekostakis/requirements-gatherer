# TDD Loop — Steps 2-5

This phase covers test discovery, Playwright test authoring with accessibility-tree
selectors, visual regression, @axe-core/playwright integration, and the fix loop.

**This is the ONLY phase that applies code changes.** Steps 6-8 are report-only.

## Progress log (agent / haiku sub-agent)

If the dispatch context includes **`PROGRESS_LOG`** (absolute path), append **compact**
entries as work proceeds — **sub-agent does most logging** (parent saves tokens). Follow
**`references/agent-progress.md`** for the `printf` pattern, field tags, and minimum append
points (Steps 2–5). Tag lines `| sub | tdd | ...`.

---

## Step 2: Identify What to Test

1. From the conversation context, determine which page(s), route(s), or visual flow(s)
   were just implemented or are being requested for testing.
2. Read relevant requirements files to understand expected behavior:
   - `requirements.md`
   - `requirements-addendum-*.md`
   - Epic or issue descriptions referenced in conversation
   - Any route definitions or page component files
3. Navigate to the page in the browser using `mcp__chrome-devtools-mcp__navigate_page`
   with the dev server URL discovered in Step 1.
4. Take a screenshot via `mcp__chrome-devtools-mcp__take_screenshot` to confirm the page
   renders correctly.

If an MCP call fails, retry up to 2 times with a 3-second delay before escalating.

**STOP gate:** If the page does not render (blank page, error screen, 404), tell the
user and wait for guidance. Do not proceed until the page is visually confirmed.

---

## Step 3: Discover Testable Behaviors

1. Use `mcp__chrome-devtools-mcp__take_snapshot` to get the accessibility tree of the
   page. This returns the full accessibility structure including roles, names, values,
   and states for all elements.

2. From the accessibility tree, build a structured inventory of testable elements:

   - **Headings:** All heading roles with their names and levels
   - **Links:** All link roles with names and targets
   - **Buttons:** All button roles with names and disabled states
   - **Form controls:** All textbox, combobox, checkbox, radio roles with labels
   - **Navigation landmarks:** All navigation, main, banner, contentinfo roles
   - **Interactive widgets:** All tab, tabpanel, dialog, menu roles
   - **Images:** All img roles with alt text presence

   This replaces DOM querySelectorAll inventory — the accessibility tree provides the
   same information through the lens of how users actually interact with the page.

3. If the accessibility tree is insufficient (e.g., custom elements with no ARIA), use
   `mcp__chrome-devtools-mcp__evaluate_script` as a supplement:

~~~javascript
(() => {
  const inventory = {
    forms: [...document.querySelectorAll('form')].map(f => ({
      id: f.id, action: f.action,
      fields: [...f.querySelectorAll('input,select,textarea')].map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label'),
        label: i.labels?.[0]?.textContent?.trim()
      }))
    })),
    customInteractive: [...document.querySelectorAll('[onclick],[data-action]')].map(el => ({
      tag: el.tagName, role: el.getAttribute('role'), id: el.id,
      ariaLabel: el.getAttribute('aria-label')
    }))
  };
  return inventory;
})()
~~~

4. Cross-reference the element inventory with the requirements to identify key user flows.
5. Present the test plan to the user:

~~~
## Proposed Test Plan: [Page Name]

### Tests to Write
1. **[Test name]** -- [what it verifies]
2. **[Test name]** -- [what it verifies]
...

### User Flows
1. **[Flow name]** -- [step-by-step]
...

### Visual Regression Snapshots
- [page-name.png] — full page baseline at 1280x720
- [page-name-mobile.png] — mobile viewport baseline at 375x812

### Accessibility Tests
- WCAG 2.0 Level A and AA audit via @axe-core/playwright

Confirm this test plan? I'll write and run these tests.
~~~

**STOP gate:** Wait for user confirmation before writing any tests. Do not proceed
until the user approves or modifies the test plan.

---

## Step 3b: Read Existing Tests

If existing test files were provided in the dispatch prompt, or if test files are discovered
during the convention detection below, read them BEFORE writing new tests.

### 1. Read Existing Tests to Understand Patterns

~~~bash
timeout 30 find . -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" | head -10
~~~

For each discovered test file, Read it and extract:
- Auth patterns: how tests log in, session setup, fixtures, storage state
- Helper functions and utilities: custom commands, shared setup/teardown, page objects
- Selector conventions: accessibility selectors (getByRole, getByText), data-testid, CSS
- Base URL configuration: hardcoded, env var, Playwright config
- Any shared state or test fixtures (global setup files, auth state files)

### 2. Run Existing Tests Before Writing New Ones

~~~bash
timeout 120 npx playwright test [existing-test-files] --reporter=list
~~~

- If existing tests **PASS** → use them as patterns for new tests. Adopt their auth flow,
  selector strategy, and structural conventions.
- If existing tests **FAIL** → diagnose the environment before writing any new code. See
  the Escalation Triggers in Step 5 — if all existing tests fail at the same step, this is
  an environment issue, not a test issue.
- If existing tests are for a **different page** → still read them for auth/helper patterns.
  Do not run them as part of your validation.

### 3. Adopt Discovered Conventions

When writing new tests in Step 4, match the patterns found in existing tests:
- Same file naming convention and directory structure
- Same `test.describe` / `test.beforeEach` patterns
- Same selector strategy (prefer accessibility-tree selectors; fall back to the project's
  established approach only if existing tests use a different convention consistently)
- Same auth flow (reuse existing auth fixtures or storage state)
- Same base URL configuration approach

---

## Step 4: Write Playwright Test File

### Detect Project Conventions

1. Look for existing test files to determine conventions:
   - File extension: `.spec.ts` vs `.spec.js` vs `.test.ts` vs `.test.js`
   - Test directory: `tests/`, `e2e/`, `__tests__/`, `test/`
   - Check for `playwright.config.ts` or `playwright.config.js` for baseURL and other settings

~~~bash
timeout 30 bash -c 'find . -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" | head -5; find . -name "playwright.config.*" | head -3; ls -d tests/ e2e/ __tests__/ test/ 2>/dev/null'
~~~

2. If no existing tests are found, default to: `e2e/[page-name].spec.ts`

### Write the Test File

Create `[test-dir]/[page-name].spec.ts` (or `.js` to match project conventions).

**Selector strategy:** Use Playwright's accessibility-tree locators as the primary
selector approach. These are resilient to DOM changes and align with how users interact
with the page:

- `page.getByRole('button', { name: 'Submit' })` — buttons, links, headings, etc.
- `page.getByText('Welcome')` — visible text content
- `page.getByLabel('Email address')` — form inputs by their label
- `page.getByPlaceholder('Search...')` — inputs by placeholder
- `page.getByAltText('Logo')` — images by alt text
- `page.getByTitle('Close')` — elements by title attribute

Only fall back to CSS selectors or `data-testid` when an element has no accessible name,
role, or label. If the existing test suite uses `data-testid` consistently, adopt that
convention for consistency but prefer accessibility selectors for new tests.

The test file must cover these categories:

1. **Page loads successfully** — navigates to the route, confirms no errors, key heading
   or landmark is visible.
2. **Key elements visible** — all critical UI elements from the requirements are present
   and visible.
3. **Navigation works** — links and navigation items route correctly.
4. **Forms submit correctly** — fill fields, submit, verify success state or redirect.
5. **Interactive elements respond** — buttons trigger expected behavior, modals open/close,
   tabs switch, accordions expand.
6. **Responsive layout** — test at key viewports (375, 768, 1024, 1440) to confirm the
   page does not break.
7. **Visual regression** — capture baseline screenshots with `toHaveScreenshot`.
8. **Accessibility** — run @axe-core/playwright checks inline.

Structure the test file with:

- A configurable `BASE_URL` constant at the top (read from Playwright config if available,
  otherwise use the detected dev server URL).
- Descriptive `test.describe` blocks grouping related tests.
- Accessibility-tree selectors as the primary locator strategy.
- Proper `await` on all Playwright calls.
- Reasonable timeouts for navigation and animations.

Example test structure (adapt to actual page):

~~~typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('[Page Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/route`);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Expected Heading');
  });

  test('key elements are visible', async ({ page }) => {
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/about/);
  });

  test('form submits correctly', async ({ page }) => {
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });

  test('responsive layout at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('navigation')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('responsive layout at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('responsive layout at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('visual regression — full page', async ({ page }) => {
    await expect(page).toHaveScreenshot('page-name.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('visual regression — mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page).toHaveScreenshot('page-name-mobile.png', {
      maxDiffPixels: 100,
      fullPage: true,
    });
  });

  test('accessibility — no WCAG A or AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
~~~

### Playwright AI Agent Healing

Playwright v1.56+ includes built-in AI agents (Planner, Generator, Healer) that improve
test resilience. When writing tests:

- Prefer accessibility-tree selectors — these are naturally resilient because they match
  user-facing attributes rather than implementation details.
- If a selector breaks during the fix loop, check Playwright's error output first. It
  suggests alternative locators derived from the accessibility tree.
- The Healer agent can auto-fix broken selectors at runtime when enabled in
  `playwright.config.ts` via the `ai` option. Note this in the test plan if the project
  uses Playwright >= 1.56.

---

## Step 5: Run Tests and Fix Loop (TDD-Style)

### Initial Run

~~~bash
timeout 120 npx playwright test [test-file] --reporter=list
~~~

### If ALL Tests PASS

Proceed to Step 6 (Lighthouse Audit), then Step 7 (axe Audit), then Step 8 (Report Results).

### If Tests FAIL

For each failing test, analyze the failure output and determine the root cause:

#### Failure Type A: Test Bug

The test itself has an error — wrong selector, wrong URL, incorrect expected text,
race condition, or timing issue.

**Signs:**
- `locator.waitFor: Timeout` with a selector that does not match the actual DOM
- Expected text does not match actual text due to a typo in the test
- Test navigates to the wrong route
- Flaky pass/fail on timing-dependent assertions without proper waits

**Action:** Fix the test. When fixing selectors, prefer Playwright's built-in locator
suggestions from error messages — these use accessibility-tree selectors (getByRole,
getByText, getByLabel) and are more resilient than CSS selectors. Use Playwright's
auto-retry and locator healing via the accessibility tree before falling back to manual
selector construction.

#### Failure Type B: Implementation Bug

The page or component is genuinely missing something that the requirements specify.

**Signs:**
- Element that should exist per requirements is not in the DOM
- Form submission does not trigger expected behavior
- Navigation link goes to wrong destination or does not exist
- Interactive element is present but non-functional (click does nothing)

**Action:** Fix the source code. Edit the implementation file to add the missing
element, fix the behavior, or correct the routing. Prefer fixing the implementation
over weakening the test.

### Fix Cycle

1. Apply fixes (test fixes or implementation fixes as determined above).
2. Re-run: `timeout 120 npx playwright test [test-file] --reporter=list`
3. Analyze results.
4. Repeat if failures remain.

**Maximum 3 cycles.** After 3 fix-and-rerun cycles, if tests still fail:

- **STOP.** Do not continue fixing.
- Escalate to the user with full context:
  - Which tests are still failing
  - What was tried in each cycle
  - Why the fix did not work
  - Suggested next steps

### Key Principle

Tests define the contract. **Never weaken test assertions to make them pass.** If a
test asserts that a button should exist and it does not, add the button to the
implementation — do not remove the assertion. Only modify a test if the test itself
has an actual bug (wrong selector, wrong URL, race condition, typo in expected text).

**Never modify tests that are already passing.**

### Visual Regression Handling

The `toHaveScreenshot` assertions have special behavior:

- **First run (no baseline exists):** Playwright creates the baseline screenshot. This
  is NOT a failure — it is expected. Note in the report: "Baseline snapshot created for
  [page-name.png]."
- **Subsequent runs:** Playwright compares against the baseline. If the pixel diff
  exceeds `maxDiffPixels`, the test fails and Playwright writes a diff image alongside
  the expected/actual images.
- **Threshold configuration:** The default `maxDiffPixels: 100` can be overridden in
  `playwright.config.ts` under `expect.toHaveScreenshot.maxDiffPixels`.
- **Updating baselines:** If visual changes are intentional (e.g., after a design update),
  update baselines with `npx playwright test --update-snapshots`.
- **Diff output:** When a visual regression test fails, include the diff image path in the
  report so the caller can inspect the visual difference.

### Escalation Triggers (early exit — do not burn fix cycles)

These patterns indicate an environment or configuration issue, not a test or implementation
bug. Stop immediately and escalate to the user or orchestrator — do not attempt test fixes:

- **All tests fail at the same auth/setup step** → environment issue (wrong URL, auth not
  configured, server not running the expected app). Report: "All N tests fail at [step].
  This appears to be an environment/auth configuration issue, not a test bug."

- **Server returns 404/500 for all routes** → wrong server, wrong port, or app not built.
  Report: "Server at [URL] returns [status] for all tested routes."

- **Cannot determine page structure** (`take_snapshot` returns empty or minimal tree) →
  page may need JS hydration time, may be behind auth, or may be a SPA that hasn't loaded.
  Try waiting 3 seconds and re-reading. If still empty after retry, escalate: "Page
  accessibility tree is empty or minimal after retry. Possible causes: SPA not hydrated,
  auth required, wrong URL."

- **Playwright cannot connect to browser** → browser not installed or system dependency
  missing. Do not retry more than once. Report exact error.

- **Server won't start after 2 attempts** → escalate for server details. Do not keep
  retrying.

- **Existing tests (from Step 3b) all fail at the same point** → environment is not
  properly configured for testing. Do not write new tests until the environment is fixed.
  Report: "All existing tests fail at [step]. Environment needs configuration before new
  tests can be written."
