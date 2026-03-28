---
name: functional-tester
description: >
  Use this skill after completing implementation of a full page, route, or visual flow
  that can be tested end-to-end. Trigger phrases: "write functional tests", "create page
  tests", "playwright tests for this page", "test this page", "functional tests". Also
  fires after implementation steps complete when the work involves a testable page or
  visual flow — similar to how superpowers:code-reviewer fires after major steps.
  Do NOT trigger for individual component work (that's the design-reviewer's job) or
  for non-visual/backend-only code. Includes Lighthouse CI audits for accessibility,
  performance, and SEO.
version: 1.1.0
---

# Functional Tester

Generate Playwright functional tests for pages and visual flows, then run them in a
TDD-style loop: write tests, run them, fix failures, rerun until green (or escalate).

This skill covers page-level and end-to-end functional testing. For unit tests, use
superpowers:test-driven-development. For design system compliance, use the design-reviewer
skill.

---

## Step 1: Tool Check (MANDATORY -- RUN FIRST)

Before doing ANY work, verify all required tools are available.

### Check 1: Playwright Installed

~~~bash
npx playwright --version 2>/dev/null || echo "MISSING"
~~~

If Playwright is NOT installed: auto-install it:

~~~bash
npm init playwright@latest -- --yes
npx playwright install --with-deps chromium
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "Playwright could not be auto-installed."
- "To install manually: `npm init playwright@latest`"
- "Retry: Say 'retry' after installing."
- Do NOT proceed without Playwright.

### Check 2: Dev Server Running

Detect a running dev server on common ports by checking each in order:

~~~bash
for port in 3000 3001 4173 5173 5174 8080; do
  (echo >/dev/tcp/localhost/$port) 2>/dev/null && echo "FOUND on port $port" && break
done
~~~

If no dev server is detected: **STOP.** Tell the user:

- "No dev server detected on ports 3000, 3001, 4173, 5173, 5174, or 8080."
- "Please start your dev server and tell me the URL, or say 'retry' once it is running."
- Do NOT proceed without a confirmed dev server URL.

### Check 3: Lighthouse

~~~bash
npx lighthouse --version 2>/dev/null || echo "MISSING"
~~~

If Lighthouse is NOT installed: auto-install it:

~~~bash
npm install -g lighthouse
~~~

Re-check after install. If the install fails (permissions, network): **STOP.** Tell the user:

- "Lighthouse could not be auto-installed."
- "To install manually: `npm install -g lighthouse` (or with sudo if needed)"
- "Retry: Say 'retry' after installing."
- Do NOT proceed to the Lighthouse audit step without Lighthouse, but functional tests (Steps 2-5) can still run.

**STOP: Checks 1 and 2 must pass before proceeding. Check 3 is needed for the Lighthouse audit in Step 6 but does not block functional tests.**

---

## Step 2: Identify What to Test

1. From the conversation context, determine which page(s), route(s), or visual flow(s)
   were just implemented or are being requested for testing.
2. Read relevant requirements files to understand expected behavior:
   - `requirements.md`
   - `requirements-addendum-*.md`
   - Epic or issue descriptions referenced in conversation
   - Any route definitions or page component files
3. Navigate to the page in the browser using `mcp__claude-in-chrome__navigate` with the
   dev server URL discovered in Step 1.
4. Take a screenshot via `mcp__claude-in-chrome__computer` to confirm the page renders
   correctly.

**STOP gate:** If the page does not render (blank page, error screen, 404), tell the
user and wait for guidance. Do not proceed until the page is visually confirmed.

---

## Step 3: Discover Testable Behaviors

1. Use `mcp__claude-in-chrome__read_page` to get the full page structure.
2. Use `mcp__claude-in-chrome__javascript_tool` to inventory interactive elements:

~~~javascript
(() => {
  const inventory = {
    forms: [...document.querySelectorAll('form')].map(f => ({
      id: f.id, action: f.action,
      fields: [...f.querySelectorAll('input,select,textarea')].map(i => ({
        type: i.type, name: i.name, placeholder: i.placeholder
      }))
    })),
    links: [...document.querySelectorAll('a[href]')].map(a => ({
      text: a.textContent.trim().slice(0, 80), href: a.href
    })),
    buttons: [...document.querySelectorAll('button,[role="button"]')].map(b => ({
      text: b.textContent.trim().slice(0, 80), type: b.type, disabled: b.disabled
    })),
    navigation: [...document.querySelectorAll('nav a, [role="navigation"] a')].map(a => ({
      text: a.textContent.trim().slice(0, 80), href: a.href
    })),
    interactive: [...document.querySelectorAll('[onclick],[data-action],details,dialog,[role="dialog"],[role="tab"],[role="tabpanel"]')].map(el => ({
      tag: el.tagName, role: el.getAttribute('role'), id: el.id
    }))
  };
  return inventory;
})()
~~~

3. Cross-reference the element inventory with the requirements to identify key user flows.
4. Present the test plan to the user:

~~~
## Proposed Test Plan: [Page Name]

### Tests to Write
1. **[Test name]** -- [what it verifies]
2. **[Test name]** -- [what it verifies]
...

### User Flows
1. **[Flow name]** -- [step-by-step]
...

Confirm this test plan? I'll write and run these tests.
~~~

**STOP gate:** Wait for user confirmation before writing any tests. Do not proceed
until the user approves or modifies the test plan.

---

## Step 4: Write Playwright Test File

### Detect Project Conventions

1. Look for existing test files to determine conventions:
   - File extension: `.spec.ts` vs `.spec.js` vs `.test.ts` vs `.test.js`
   - Test directory: `tests/`, `e2e/`, `__tests__/`, `test/`
   - Check for `playwright.config.ts` or `playwright.config.js` for baseURL and other settings

~~~bash
find . -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" | head -5
find . -name "playwright.config.*" | head -3
ls -d tests/ e2e/ __tests__/ test/ 2>/dev/null
~~~

2. If no existing tests are found, default to: `e2e/[page-name].spec.ts`

### Write the Test File

Create `[test-dir]/[page-name].spec.ts` (or `.js` to match project conventions).

The test file must cover these categories:

1. **Page loads successfully** -- navigates to the route, confirms no errors, key heading
   or landmark is visible.
2. **Key elements visible** -- all critical UI elements from the requirements are present
   and visible.
3. **Navigation works** -- links and navigation items route correctly.
4. **Forms submit correctly** -- fill fields, submit, verify success state or redirect.
5. **Interactive elements respond** -- buttons trigger expected behavior, modals open/close,
   tabs switch, accordions expand.
6. **Responsive layout** -- test at key viewports (375, 768, 1024, 1440) to confirm the
   page does not break.

Structure the test file with:

- A configurable `BASE_URL` constant at the top (read from Playwright config if available,
  otherwise use the detected dev server URL).
- Descriptive `test.describe` blocks grouping related tests.
- Standard Playwright patterns: `page.goto()`, `page.click()`, `page.fill()`,
  `expect(locator).toBeVisible()`, `expect(locator).toHaveText()`,
  `expect(page).toHaveURL()`, etc.
- Proper `await` on all Playwright calls.
- Reasonable timeouts for navigation and animations.

Example test structure (adapt to actual page):

~~~typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('[Page Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/route`);
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Expected Heading');
  });

  test('key elements are visible', async ({ page }) => {
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
    // ... more assertions
  });

  test('navigation links work', async ({ page }) => {
    await page.click('a[href="/target"]');
    await expect(page).toHaveURL(/\/target/);
  });

  test('form submits correctly', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('responsive layout at mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('nav')).toBeVisible();
    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('responsive layout at tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('responsive layout at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('main')).toBeVisible();
  });
});
~~~

---

## Step 5: Run Tests and Fix Loop (TDD-Style)

### Initial Run

~~~bash
npx playwright test [test-file] --reporter=list
~~~

### If ALL Tests PASS

Proceed to Step 6 (Lighthouse Audit), then Step 7 (Report Results).

### If Tests FAIL

For each failing test, analyze the failure output and determine the root cause:

#### Failure Type A: Test Bug

The test itself has an error -- wrong selector, wrong URL, incorrect expected text,
race condition, or timing issue.

**Signs:**
- `locator.waitFor: Timeout` with a selector that does not match the actual DOM
- Expected text does not match actual text due to a typo in the test
- Test navigates to the wrong route
- Flaky pass/fail on timing-dependent assertions without proper waits

**Action:** Fix the test. Update the selector, URL, expected text, or add proper
`waitFor` / `toBeVisible` guards.

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
2. Re-run: `npx playwright test [test-file] --reporter=list`
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
implementation -- do not remove the assertion. Only modify a test if the test itself
has an actual bug (wrong selector, wrong URL, race condition, typo in expected text).

**Never modify tests that are already passing.**

---

## Step 6: Lighthouse Audit

After the Playwright functional tests complete (pass or escalate), run a Lighthouse audit
on the page for accessibility, performance, and SEO quality.

### 6a: Detect Login State

Use `mcp__claude-in-chrome__javascript_tool` to check if the page is behind authentication:

~~~javascript
(() => {
  const loginSignals = [
    document.querySelector('input[type="password"]'),
    document.querySelector('form[action*="login"]'),
    document.querySelector('form[action*="signin"]'),
    document.querySelector('[data-testid*="login"]'),
    document.querySelector('[data-testid*="signin"]'),
  ].filter(Boolean);
  const urlSignals = /\/(login|signin|sign-in|auth)\b/i.test(window.location.href);
  return {
    behindLogin: loginSignals.length > 0 || urlSignals,
    signals: loginSignals.map(el => el.tagName + (el.type ? '[type=' + el.type + ']' : ''))
  };
})()
~~~

If `behindLogin` is true: exclude the `seo` category from Lighthouse. Search engines cannot
crawl authenticated pages, so SEO results would be misleading.

### 6b: Run Lighthouse

Determine which categories to audit:

~~~bash
# If NOT behind login:
npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance,seo \
  --quiet

# If behind login (no SEO):
npx lighthouse [PAGE_URL] \
  --output=json \
  --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=accessibility,performance \
  --quiet
~~~

Parse the JSON output to extract scores and critical failures:

~~~bash
node -e "
  const r = JSON.parse(require('fs').readFileSync('./lighthouse-report.json', 'utf8'));
  const cats = r.categories;
  const audits = r.audits;
  const critical = Object.values(audits)
    .filter(a => a.score !== null && a.score === 0)
    .map(a => ({ id: a.id, title: a.title, score: a.score, description: a.description }));
  const warnings = Object.values(audits)
    .filter(a => a.score !== null && a.score > 0 && a.score < 0.5)
    .map(a => ({ id: a.id, title: a.title, score: a.score }));
  console.log(JSON.stringify({
    scores: {
      accessibility: Math.round((cats.accessibility?.score || 0) * 100),
      performance: Math.round((cats.performance?.score || 0) * 100),
      seo: cats.seo ? Math.round(cats.seo.score * 100) : 'N/A (behind login)'
    },
    critical: critical.slice(0, 15),
    warnings: warnings.slice(0, 10)
  }, null, 2));
"
~~~

Clean up the report file:

~~~bash
rm -f ./lighthouse-report.json
~~~

### 6c: Best-Effort Fix Loop for Critical Issues

Review all critical Lighthouse audit failures (score = 0) and attempt fixes.

**Accessibility fixes:**
- Missing `lang` attribute on `<html>` → add it
- Missing meta viewport → add `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Missing document title → add `<title>` tag
- Broken heading hierarchy (skipped levels) → fix heading levels
- Missing image alt text → add descriptive `alt` attributes
- Missing form labels → add `<label>` elements or `aria-label` attributes
- Low contrast text → adjust colors (reference design-guidelines.md tokens if available)

**Performance fixes:**
- Images missing width/height → add explicit dimensions
- Below-fold images without lazy loading → add `loading="lazy"`
- Render-blocking scripts → add `defer` or `async` attributes
- Missing meta viewport (also performance) → add the tag
- Large uncompressed assets → note in report (cannot fix at source level)

**SEO fixes (only if NOT behind login):**
- Missing meta description → add `<meta name="description" content="...">`
- Missing canonical link → add `<link rel="canonical" href="...">`
- Non-crawlable links → fix `href` attributes
- Bad heading hierarchy → fix structure (same fix as accessibility)

**Fix cycle:**
1. Apply all fixable issues in one batch.
2. Re-run Lighthouse with the same categories.
3. Compare scores — note improvements.
4. If new critical issues emerged or fixes broke something, apply another round.

**Maximum 2 fix cycles** for Lighthouse issues. This is a separate budget from the
Playwright test loop's 3 cycles. After 2 cycles, include remaining issues in the report
as "noted — remediation needed" with specific instructions.

**NEVER fix issues by removing content or functionality.** Only add missing attributes,
tags, meta elements, or optimizations.

---

## Step 7: Report Results

Present the final report using this format:

~~~
## Functional Test Results: [Page Name]

### Status: PASS (X/X tests) | PARTIAL (X/Y passing, Z escalated) | FAIL (escalated)

### Test File: [path to test file]

### Results
| Test | Status | Notes |
|------|--------|-------|
| [test name] | PASS | |
| [test name] | FIXED | [what was changed] |
| [test name] | FAIL | [why it failed, what was tried] |

### Fixes Applied
- [file:line] -- [what was changed and why]

### Escalated (if any)
- **[test name]:** [what failed, what was tried across cycles, why it is stuck]

### Next Steps
- [any follow-up actions needed]

### Lighthouse Audit

| Category | Score | Status |
|----------|-------|--------|
| Accessibility | XX/100 | PASS (≥90) / WARN (50-89) / FAIL (<50) |
| Performance | XX/100 | PASS / WARN / FAIL |
| SEO | XX/100 or N/A | PASS / WARN / FAIL / Skipped (behind login) |

#### Critical Issues Fixed
- [file:line] — [what was changed and why]

#### Issues Not Fixed (remediation needed)
- **[audit-id]:** [description] — [remediation instructions]
~~~

---

## Important Boundaries

1. **NEVER skip the tool check.** Playwright must be installed and a dev server must be
   running before any work begins.
2. **NEVER write tests without confirming the test plan with the user first.** The STOP
   gate after Step 3 is mandatory.
3. **NEVER weaken test assertions to make them pass.** Fix the implementation instead.
   Only modify a test if the test itself has an actual bug.
4. **NEVER loop more than 3 times.** After 3 fix-and-rerun cycles, escalate to the user
   with full context.
5. **NEVER modify tests that are already passing.**
6. **NEVER silently fall back** when tools are missing. Present options, fixes,
   workarounds, and wait for user decision.
7. This skill writes **FUNCTIONAL tests** (page-level, end-to-end). For unit tests, use
   superpowers:test-driven-development. For design system compliance, use the
   design-reviewer skill.
8. **NEVER run SEO audits on pages behind authentication.** Search engines cannot crawl
   authenticated pages, making SEO scores misleading.
9. **NEVER fix Lighthouse issues by removing content or functionality.** Only add missing
   attributes, tags, meta elements, or optimizations.
10. **Lighthouse fix cycles (max 2) are separate from Playwright test fix cycles (max 3).**
    Each has its own budget.
